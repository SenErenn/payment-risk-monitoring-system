using Microsoft.EntityFrameworkCore;
using PaymentRiskMonitoring.Api.Data;
using PaymentRiskMonitoring.Api.DTOs.Analytics;
using PaymentRiskMonitoring.Api.Enums;
using PaymentRiskMonitoring.Api.Exceptions;

namespace PaymentRiskMonitoring.Api.Services;

public class EntityAnalyticsService
{
    private const int DefaultLookbackHours = 24;

    private readonly AppDbContext _dbContext;
    private readonly TimeProvider _timeProvider;

    public EntityAnalyticsService(AppDbContext dbContext, TimeProvider? timeProvider = null)
    {
        _dbContext = dbContext;
        _timeProvider = timeProvider ?? TimeProvider.System;
    }

    public async Task<MerchantAnalyticsDto> GetMerchantAnalyticsAsync(
        Guid merchantId,
        AnalyticsRangeQuery query,
        CancellationToken cancellationToken = default)
    {
        var exists = await _dbContext.Merchants
            .AsNoTracking()
            .AnyAsync(merchant => merchant.Id == merchantId, cancellationToken);

        if (!exists)
        {
            throw new NotFoundException("Merchant", merchantId);
        }

        var (fromUtc, toUtc) = ResolveRange(query);

        var transactions = await _dbContext.Transactions
            .AsNoTracking()
            .Where(transaction =>
                transaction.MerchantId == merchantId &&
                transaction.CreatedAt >= fromUtc &&
                transaction.CreatedAt <= toUtc)
            .Select(transaction => new
            {
                transaction.Amount,
                transaction.Status,
                transaction.RiskLevel
            })
            .ToListAsync(cancellationToken);

        var riskAlertCount = await _dbContext.RiskAlerts
            .AsNoTracking()
            .CountAsync(
                alert =>
                    alert.Transaction.MerchantId == merchantId &&
                    alert.CreatedAt >= fromUtc &&
                    alert.CreatedAt <= toUtc,
                cancellationToken);

        var total = transactions.Count;
        var volume = transactions.Sum(transaction => transaction.Amount);
        var approved = transactions.Count(transaction =>
            transaction.Status == TransactionStatus.Approved);
        var declined = transactions.Count(transaction =>
            transaction.Status == TransactionStatus.Declined);
        var highRisk = transactions.Count(transaction =>
            transaction.RiskLevel == RiskLevel.High);
        var decided = approved + declined;

        return new MerchantAnalyticsDto
        {
            MerchantId = merchantId,
            FromUtc = fromUtc,
            ToUtc = toUtc,
            Volume = volume,
            Currency = "TRY",
            TransactionCount = total,
            ApprovedCount = approved,
            DeclinedCount = declined,
            ApprovalRate = decided == 0
                ? 0m
                : Math.Round((decimal)approved / decided, 4, MidpointRounding.AwayFromZero),
            HighRiskCount = highRisk,
            RiskAlertCount = riskAlertCount
        };
    }

    public async Task<CardAnalyticsDto> GetCardAnalyticsAsync(
        Guid cardId,
        AnalyticsRangeQuery query,
        CancellationToken cancellationToken = default)
    {
        var card = await _dbContext.Cards
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == cardId, cancellationToken);

        if (card is null)
        {
            throw new NotFoundException("Card", cardId);
        }

        var (fromUtc, toUtc) = ResolveRange(query);

        var transactions = await _dbContext.Transactions
            .AsNoTracking()
            .Where(transaction =>
                transaction.CardId == cardId &&
                transaction.CreatedAt >= fromUtc &&
                transaction.CreatedAt <= toUtc)
            .Select(transaction => new
            {
                transaction.Amount,
                transaction.Status,
                RefundedAmount = transaction.Refunds.Sum(refund => (decimal?)refund.Amount) ?? 0m
            })
            .ToListAsync(cancellationToken);

        var riskAlertCount = await _dbContext.RiskAlerts
            .AsNoTracking()
            .CountAsync(
                alert =>
                    alert.Transaction.CardId == cardId &&
                    alert.CreatedAt >= fromUtc &&
                    alert.CreatedAt <= toUtc,
                cancellationToken);

        var spending = transactions
            .Where(transaction =>
                transaction.Status is TransactionStatus.Approved
                    or TransactionStatus.PartiallyRefunded
                    or TransactionStatus.Refunded)
            .Sum(transaction => Math.Max(0m, transaction.Amount - transaction.RefundedAmount));

        return new CardAnalyticsDto
        {
            CardId = cardId,
            FromUtc = fromUtc,
            ToUtc = toUtc,
            Spending = spending,
            Currency = "TRY",
            TransactionCount = transactions.Count,
            DeclinedCount = transactions.Count(transaction =>
                transaction.Status == TransactionStatus.Declined),
            RiskAlertCount = riskAlertCount,
            AvailableLimit = card.AvailableLimit,
            CreditLimit = card.CreditLimit
        };
    }

    private (DateTime FromUtc, DateTime ToUtc) ResolveRange(AnalyticsRangeQuery query)
    {
        var utcNow = _timeProvider.GetUtcNow().UtcDateTime;
        var toUtc = query.To.HasValue ? NormalizeToUtc(query.To.Value) : utcNow;
        var fromUtc = query.From.HasValue
            ? NormalizeToUtc(query.From.Value)
            : toUtc.AddHours(-DefaultLookbackHours);

        if (fromUtc > toUtc)
        {
            (fromUtc, toUtc) = (toUtc, fromUtc);
        }

        return (fromUtc, toUtc);
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
}
