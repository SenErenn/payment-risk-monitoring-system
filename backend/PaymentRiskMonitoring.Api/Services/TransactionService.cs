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
    private readonly RiskAnalysisService _riskAnalysisService;
    private readonly IRealtimeEventPublisher _realtimeEventPublisher;

    public TransactionService(
        AppDbContext dbContext,
        RiskAnalysisService riskAnalysisService,
        IRealtimeEventPublisher realtimeEventPublisher)
    {
        _dbContext = dbContext;
        _riskAnalysisService = riskAnalysisService;
        _realtimeEventPublisher = realtimeEventPublisher;
    }

    public async Task<PagedResult<TransactionDto>> GetTransactionsAsync(
        TransactionListQuery query,
        CancellationToken cancellationToken = default)
    {
        var transactionsQuery = _dbContext.Transactions
            .AsNoTracking()
            .Include(transaction => transaction.Merchant)
            .Include(transaction => transaction.Card)
            .Include(transaction => transaction.Refunds)
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

        if (query.PaymentType.HasValue)
        {
            transactionsQuery = transactionsQuery.Where(transaction =>
                transaction.PaymentType == query.PaymentType.Value);
        }

        if (query.CreatedFrom.HasValue)
        {
            var createdFrom = NormalizeToUtc(query.CreatedFrom.Value);
            transactionsQuery = transactionsQuery.Where(transaction => transaction.CreatedAt >= createdFrom);
        }

        if (query.CreatedTo.HasValue)
        {
            var createdTo = NormalizeToUtc(query.CreatedTo.Value);
            transactionsQuery = transactionsQuery.Where(transaction => transaction.CreatedAt <= createdTo);
        }

        if (query.MinAmount.HasValue)
        {
            transactionsQuery = transactionsQuery.Where(transaction =>
                transaction.Amount >= query.MinAmount.Value);
        }

        if (query.MaxAmount.HasValue)
        {
            transactionsQuery = transactionsQuery.Where(transaction =>
                transaction.Amount <= query.MaxAmount.Value);
        }

        var totalCount = await transactionsQuery.CountAsync(cancellationToken);

        transactionsQuery = ApplySorting(transactionsQuery, query.SortBy, query.SortDirection);

        var transactions = await transactionsQuery
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
            .Include(item => item.Refunds)
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

            var decision = await _riskAnalysisService.AnalyzePaymentAsync(
                merchant,
                card,
                amount,
                cancellationToken);

            if (decision.Status == TransactionStatus.Approved)
            {
                // Re-check after lock; never reduce limit on declines.
                if (amount > card.AvailableLimit)
                {
                    decision = _riskAnalysisService.CreateInsufficientLimitResult();
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
                RiskReasons = decision.RiskReasons.ToList(),
                DecisionReason = decision.DecisionMessage,
                DeclineReason = decision.Status == TransactionStatus.Declined
                    ? decision.DecisionMessage
                    : null,
                IdempotencyKey = idempotencyKey,
                CreatedAt = now,
                Merchant = merchant,
                Card = card
            };

            _dbContext.Transactions.Add(transaction);

            RiskAlert? riskAlert = null;
            if (transaction.RiskLevel == RiskLevel.High)
            {
                riskAlert = RiskAlertService.CreateOpenAlertForTransaction(transaction, now);
                _dbContext.RiskAlerts.Add(riskAlert);
            }

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

            var createdDto = MapTransaction(transaction);
            await _realtimeEventPublisher.PublishTransactionCreatedAsync(createdDto, cancellationToken);

            if (riskAlert is not null)
            {
                await _realtimeEventPublisher.PublishRiskAlertCreatedAsync(
                    RiskAlertService.ToDto(riskAlert),
                    cancellationToken);
            }

            return new CreateTransactionResult
            {
                Transaction = createdDto,
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

    private static DateTime NormalizeToUtc(DateTime value)
    {
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };
    }

    private static IQueryable<Transaction> ApplySorting(
        IQueryable<Transaction> query,
        string sortBy,
        string sortDirection)
    {
        var ascending = string.Equals(sortDirection.Trim(), "asc", StringComparison.OrdinalIgnoreCase);
        var field = sortBy.Trim().ToLowerInvariant();

        return field switch
        {
            "amount" => ascending
                ? query.OrderBy(transaction => transaction.Amount)
                    .ThenByDescending(transaction => transaction.TransactionCode)
                : query.OrderByDescending(transaction => transaction.Amount)
                    .ThenByDescending(transaction => transaction.TransactionCode),
            "status" => ascending
                ? query.OrderBy(transaction => transaction.Status)
                    .ThenByDescending(transaction => transaction.CreatedAt)
                : query.OrderByDescending(transaction => transaction.Status)
                    .ThenByDescending(transaction => transaction.CreatedAt),
            "riskscore" => ascending
                ? query.OrderBy(transaction => transaction.RiskScore)
                    .ThenByDescending(transaction => transaction.CreatedAt)
                : query.OrderByDescending(transaction => transaction.RiskScore)
                    .ThenByDescending(transaction => transaction.CreatedAt),
            "risklevel" => ascending
                ? query.OrderBy(transaction => transaction.RiskLevel)
                    .ThenByDescending(transaction => transaction.CreatedAt)
                : query.OrderByDescending(transaction => transaction.RiskLevel)
                    .ThenByDescending(transaction => transaction.CreatedAt),
            "transactioncode" => ascending
                ? query.OrderBy(transaction => transaction.TransactionCode)
                : query.OrderByDescending(transaction => transaction.TransactionCode),
            "paymenttype" => ascending
                ? query.OrderBy(transaction => transaction.PaymentType)
                    .ThenByDescending(transaction => transaction.CreatedAt)
                : query.OrderByDescending(transaction => transaction.PaymentType)
                    .ThenByDescending(transaction => transaction.CreatedAt),
            _ => ascending
                ? query.OrderBy(transaction => transaction.CreatedAt)
                    .ThenByDescending(transaction => transaction.TransactionCode)
                : query.OrderByDescending(transaction => transaction.CreatedAt)
                    .ThenByDescending(transaction => transaction.TransactionCode)
        };
    }

    private async Task<Transaction?> FindByIdempotencyKeyAsync(
        string idempotencyKey,
        CancellationToken cancellationToken)
    {
        return await _dbContext.Transactions
            .Include(transaction => transaction.Merchant)
            .Include(transaction => transaction.Card)
            .Include(transaction => transaction.Refunds)
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
            .Include(transaction => transaction.Refunds)
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

        var refunds = transaction.Refunds?
            .OrderByDescending(refund => refund.CreatedAt)
            .Select(refund => new DTOs.Refunds.RefundDto
            {
                Id = refund.Id,
                RefundCode = refund.RefundCode,
                TransactionId = transaction.Id,
                TransactionCode = transaction.TransactionCode,
                Amount = refund.Amount,
                Currency = refund.Currency,
                Reason = refund.Reason,
                CreatedAt = refund.CreatedAt
            })
            .ToList()
            ?? [];

        var refundedAmount = refunds.Sum(refund => refund.Amount);
        var refundableAmount = Math.Max(0, transaction.Amount - refundedAmount);
        var canRefund =
            (transaction.Status is TransactionStatus.Approved or TransactionStatus.PartiallyRefunded)
            && refundableAmount > 0;

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
            RiskReasons = transaction.RiskReasons?.ToList() ?? [],
            CreatedAt = transaction.CreatedAt,
            DecisionMessage = decisionMessage,
            DeclineReason = transaction.DeclineReason
                ?? (transaction.Status == TransactionStatus.Declined ? decisionMessage : null),
            IdempotencyKey = transaction.IdempotencyKey,
            IsReplay = isReplay,
            RefundedAmount = refundedAmount,
            RefundableAmount = refundableAmount,
            CanRefund = canRefund,
            Refunds = refunds
        };
    }
}
