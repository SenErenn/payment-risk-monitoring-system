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

    public async Task<TransactionDto> CreateTransactionAsync(
        CreateTransactionRequest request,
        CancellationToken cancellationToken = default)
    {
        var merchant = await _dbContext.Merchants
            .FirstOrDefaultAsync(item => item.Id == request.MerchantId, cancellationToken);

        if (merchant is null)
        {
            throw new NotFoundException("Merchant", request.MerchantId);
        }

        var card = await _dbContext.Cards
            .FirstOrDefaultAsync(item => item.Id == request.CardId, cancellationToken);

        if (card is null)
        {
            throw new NotFoundException("Card", request.CardId);
        }

        var currency = request.Currency.Trim().ToUpperInvariant();
        var decision = EvaluatePayment(merchant, card, request.Amount);

        if (decision.Status == TransactionStatus.Approved)
        {
            card.AvailableLimit -= request.Amount;
            card.UpdatedAt = DateTime.UtcNow;
        }

        var now = DateTime.UtcNow;
        var transaction = new Transaction
        {
            Id = Guid.NewGuid(),
            TransactionCode = GenerateTransactionCode(),
            MerchantId = merchant.Id,
            CardId = card.Id,
            Amount = request.Amount,
            Currency = currency,
            Status = decision.Status,
            PaymentType = request.PaymentType,
            RiskScore = decision.RiskScore,
            RiskLevel = decision.RiskLevel,
            CreatedAt = now,
            Merchant = merchant,
            Card = card
        };

        _dbContext.Transactions.Add(transaction);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return MapTransaction(transaction, decision.Message);
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

        // Basic placeholder risk signal only — full risk engine comes later.
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

    private static TransactionDto MapTransaction(Transaction transaction, string? decisionMessage = null)
    {
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
            DecisionMessage = decisionMessage ?? (
                transaction.Status == TransactionStatus.Approved
                    ? "Approved."
                    : transaction.Status == TransactionStatus.Declined
                        ? "Declined."
                        : null)
        };
    }

    private sealed record PaymentDecision(
        TransactionStatus Status,
        int RiskScore,
        RiskLevel RiskLevel,
        string Message);
}
