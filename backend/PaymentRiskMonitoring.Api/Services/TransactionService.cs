using System.Data;
using Microsoft.EntityFrameworkCore;
using PaymentRiskMonitoring.Api.Data;
using PaymentRiskMonitoring.Api.DTOs.Transactions;
using PaymentRiskMonitoring.Api.Entities;
using PaymentRiskMonitoring.Api.Enums;
using PaymentRiskMonitoring.Api.Exceptions;
using PaymentRiskMonitoring.Api.Models.Responses;

namespace PaymentRiskMonitoring.Api.Services;

public class TransactionService
{
    public static readonly TimeSpan DuplicateWindow = TimeSpan.FromSeconds(30);

    private readonly AppDbContext _dbContext;

    public TransactionService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<PagedResult<TransactionDto>> GetTransactionsAsync(
        TransactionListQuery query,
        CancellationToken cancellationToken = default)
    {
        var transactionsQuery = _dbContext.Transactions
            .AsNoTracking()
            .Include(transaction => transaction.Merchant)
            .Include(transaction => transaction.Card)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLowerInvariant();
            transactionsQuery = transactionsQuery.Where(transaction =>
                transaction.TransactionCode.ToLower().Contains(search) ||
                transaction.Merchant.MerchantCode.ToLower().Contains(search) ||
                transaction.Merchant.Name.ToLower().Contains(search) ||
                transaction.Card.MaskedCardNumber.ToLower().Contains(search) ||
                transaction.Card.CardToken.ToLower().Contains(search));
        }

        if (query.Status.HasValue)
        {
            transactionsQuery = transactionsQuery.Where(transaction => transaction.Status == query.Status.Value);
        }

        if (query.MerchantId.HasValue)
        {
            transactionsQuery = transactionsQuery.Where(transaction => transaction.MerchantId == query.MerchantId.Value);
        }

        if (query.CardId.HasValue)
        {
            transactionsQuery = transactionsQuery.Where(transaction => transaction.CardId == query.CardId.Value);
        }

        var totalCount = await transactionsQuery.CountAsync(cancellationToken);

        var transactions = await transactionsQuery
            .OrderByDescending(transaction => transaction.CreatedAt)
            .ThenByDescending(transaction => transaction.TransactionCode)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<TransactionDto>
        {
            Items = transactions.Select(transaction => MapTransaction(transaction)).ToList(),
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = totalCount
        };
    }

    public async Task<TransactionDto> GetTransactionByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var transaction = await _dbContext.Transactions
            .AsNoTracking()
            .Include(item => item.Merchant)
            .Include(item => item.Card)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (transaction is null)
        {
            throw new NotFoundException("Transaction", id);
        }

        return MapTransaction(transaction);
    }

    public async Task<CreateTransactionResult> CreateTransactionAsync(
        CreateTransactionRequest request,
        string? idempotencyKeyFromHeader = null,
        CancellationToken cancellationToken = default)
    {
        var currency = request.Currency.Trim().ToUpperInvariant();
        var amount = decimal.Round(request.Amount, 2, MidpointRounding.AwayFromZero);
        var idempotencyKey = NormalizeIdempotencyKey(
            request.IdempotencyKey ?? idempotencyKeyFromHeader);

        await using var dbTransaction = await _dbContext.Database.BeginTransactionAsync(
            IsolationLevel.ReadCommitted,
            cancellationToken);

        try
        {
            if (idempotencyKey is not null)
            {
                var existingByKey = await FindByIdempotencyKeyAsync(idempotencyKey, cancellationToken);
                if (existingByKey is not null)
                {
                    EnsureIdempotentPayloadMatches(existingByKey, request, currency, amount);
                    await dbTransaction.CommitAsync(cancellationToken);
                    return new CreateTransactionResult
                    {
                        Transaction = MapTransaction(existingByKey, isReplay: true),
                        WasCreated = false
                    };
                }
            }
            else
            {
                var recentDuplicate = await FindRecentDuplicateAsync(
                    request,
                    currency,
                    amount,
                    cancellationToken);

                if (recentDuplicate is not null)
                {
                    await dbTransaction.CommitAsync(cancellationToken);
                    return new CreateTransactionResult
                    {
                        Transaction = MapTransaction(recentDuplicate, isReplay: true),
                        WasCreated = false
                    };
                }
            }

            var merchant = await _dbContext.Merchants
                .FirstOrDefaultAsync(item => item.Id == request.MerchantId, cancellationToken);

            if (merchant is null)
            {
                throw new NotFoundException("Merchant", request.MerchantId);
            }

            // Lock the card row so concurrent approvals cannot double-spend the same limit.
            await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                $"""SELECT 1 FROM "Cards" WHERE "Id" = {request.CardId} FOR UPDATE""",
                cancellationToken);

            var card = await _dbContext.Cards
                .FirstOrDefaultAsync(item => item.Id == request.CardId, cancellationToken);

            if (card is null)
            {
                throw new NotFoundException("Card", request.CardId);
            }

            var decision = EvaluatePayment(merchant, card, amount);

            if (decision.Status == TransactionStatus.Approved)
            {
                // Re-check after lock; never reduce limit on declines.
                if (amount > card.AvailableLimit)
                {
                    decision = new PaymentDecision(
                        TransactionStatus.Declined,
                        RiskScore: 70,
                        RiskLevel.High,
                        "Declined: insufficient available limit.");
                }
                else
                {
                    card.AvailableLimit -= amount;
                    card.UpdatedAt = DateTime.UtcNow;
                }
            }

            var now = DateTime.UtcNow;
            var transaction = new Transaction
            {
                Id = Guid.NewGuid(),
                TransactionCode = GenerateTransactionCode(),
                MerchantId = merchant.Id,
                CardId = card.Id,
                Amount = amount,
                Currency = currency,
                Status = decision.Status,
                PaymentType = request.PaymentType,
                RiskScore = decision.RiskScore,
                RiskLevel = decision.RiskLevel,
                DecisionReason = decision.Message,
                DeclineReason = decision.Status == TransactionStatus.Declined
                    ? decision.Message
                    : null,
                IdempotencyKey = idempotencyKey,
                CreatedAt = now,
                Merchant = merchant,
                Card = card
            };

            _dbContext.Transactions.Add(transaction);

            try
            {
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException) when (idempotencyKey is not null)
            {
                // Concurrent retry with the same key: return the winner instead of failing.
                _dbContext.ChangeTracker.Clear();
                await dbTransaction.RollbackAsync(cancellationToken);

                var concurrent = await FindByIdempotencyKeyAsync(idempotencyKey, cancellationToken);
                if (concurrent is not null)
                {
                    EnsureIdempotentPayloadMatches(concurrent, request, currency, amount);
                    return new CreateTransactionResult
                    {
                        Transaction = MapTransaction(concurrent, isReplay: true),
                        WasCreated = false
                    };
                }

                throw;
            }

            await dbTransaction.CommitAsync(cancellationToken);

            return new CreateTransactionResult
            {
                Transaction = MapTransaction(transaction),
                WasCreated = true
            };
        }
        catch
        {
            if (_dbContext.Database.CurrentTransaction is not null)
            {
                await dbTransaction.RollbackAsync(cancellationToken);
            }

            throw;
        }
    }

    private async Task<Transaction?> FindByIdempotencyKeyAsync(
        string idempotencyKey,
        CancellationToken cancellationToken)
    {
        return await _dbContext.Transactions
            .Include(transaction => transaction.Merchant)
            .Include(transaction => transaction.Card)
            .FirstOrDefaultAsync(
                transaction => transaction.IdempotencyKey == idempotencyKey,
                cancellationToken);
    }

    private async Task<Transaction?> FindRecentDuplicateAsync(
        CreateTransactionRequest request,
        string currency,
        decimal amount,
        CancellationToken cancellationToken)
    {
        var windowStart = DateTime.UtcNow.Subtract(DuplicateWindow);

        return await _dbContext.Transactions
            .Include(transaction => transaction.Merchant)
            .Include(transaction => transaction.Card)
            .Where(transaction =>
                transaction.MerchantId == request.MerchantId &&
                transaction.CardId == request.CardId &&
                transaction.Amount == amount &&
                transaction.Currency == currency &&
                transaction.PaymentType == request.PaymentType &&
                transaction.CreatedAt >= windowStart)
            .OrderByDescending(transaction => transaction.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static void EnsureIdempotentPayloadMatches(
        Transaction existing,
        CreateTransactionRequest request,
        string currency,
        decimal amount)
    {
        var matches =
            existing.MerchantId == request.MerchantId &&
            existing.CardId == request.CardId &&
            existing.Amount == amount &&
            existing.Currency == currency &&
            existing.PaymentType == request.PaymentType;

        if (!matches)
        {
            throw new AppException(
                "Idempotency key was already used with a different payment payload.",
                StatusCodes.Status409Conflict,
                [
                    "Reuse the original merchant, card, amount, currency, and payment type for this idempotency key."
                ]);
        }
    }

    private static string? NormalizeIdempotencyKey(string? key)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            return null;
        }

        return key.Trim();
    }

    private static PaymentDecision EvaluatePayment(Merchant merchant, Card card, decimal amount)
    {
        if (!merchant.IsActive)
        {
            return new PaymentDecision(
                TransactionStatus.Declined,
                RiskScore: 75,
                RiskLevel.High,
                "Declined: merchant is inactive.");
        }

        if (card.Status != CardStatus.Active)
        {
            return new PaymentDecision(
                TransactionStatus.Declined,
                RiskScore: 80,
                RiskLevel.High,
                $"Declined: card status is {card.Status}.");
        }

        if (amount > card.AvailableLimit)
        {
            return new PaymentDecision(
                TransactionStatus.Declined,
                RiskScore: 70,
                RiskLevel.High,
                "Declined: insufficient available limit.");
        }

        // Basic placeholder risk signal only — full risk engine comes later (PR-020+).
        var usageRatio = card.CreditLimit <= 0
            ? 0
            : (card.CreditLimit - card.AvailableLimit + amount) / card.CreditLimit;

        if (amount >= 10000m || usageRatio >= 0.8m)
        {
            return new PaymentDecision(
                TransactionStatus.Approved,
                RiskScore: 45,
                RiskLevel.Medium,
                "Approved with elevated basic risk signal.");
        }

        return new PaymentDecision(
            TransactionStatus.Approved,
            RiskScore: 15,
            RiskLevel.Low,
            "Approved.");
    }

    private static string GenerateTransactionCode()
    {
        return $"TXN_{Guid.NewGuid():N}".ToUpperInvariant();
    }

    private static TransactionDto MapTransaction(Transaction transaction, bool isReplay = false)
    {
        var decisionMessage = !string.IsNullOrWhiteSpace(transaction.DecisionReason)
            ? transaction.DecisionReason
            : transaction.Status switch
            {
                TransactionStatus.Approved => "Approved.",
                TransactionStatus.Declined => "Declined.",
                _ => null
            };

        return new TransactionDto
        {
            Id = transaction.Id,
            TransactionCode = transaction.TransactionCode,
            MerchantId = transaction.MerchantId,
            MerchantCode = transaction.Merchant.MerchantCode,
            MerchantName = transaction.Merchant.Name,
            CardId = transaction.CardId,
            CardToken = transaction.Card.CardToken,
            MaskedCardNumber = transaction.Card.MaskedCardNumber,
            Amount = transaction.Amount,
            Currency = transaction.Currency,
            Status = transaction.Status,
            PaymentType = transaction.PaymentType,
            RiskScore = transaction.RiskScore,
            RiskLevel = transaction.RiskLevel,
            CreatedAt = transaction.CreatedAt,
            DecisionMessage = decisionMessage,
            DeclineReason = transaction.DeclineReason
                ?? (transaction.Status == TransactionStatus.Declined ? decisionMessage : null),
            IdempotencyKey = transaction.IdempotencyKey,
            IsReplay = isReplay
        };
    }

    private sealed record PaymentDecision(
        TransactionStatus Status,
        int RiskScore,
        RiskLevel RiskLevel,
        string Message);
}
