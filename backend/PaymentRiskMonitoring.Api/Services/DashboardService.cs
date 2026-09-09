using Microsoft.EntityFrameworkCore;
using PaymentRiskMonitoring.Api.Data;
using PaymentRiskMonitoring.Api.DTOs.Dashboard;
using PaymentRiskMonitoring.Api.Enums;

namespace PaymentRiskMonitoring.Api.Services;

public class DashboardService
{
    private const int DefaultLookbackHours = 24;
    private const int TopMerchantLimit = 5;

    private readonly AppDbContext _dbContext;
    private readonly TimeProvider _timeProvider;

    public DashboardService(AppDbContext dbContext, TimeProvider? timeProvider = null)
    {
        _dbContext = dbContext;
        _timeProvider = timeProvider ?? TimeProvider.System;
    }

    public async Task<DashboardSummaryDto> GetSummaryAsync(
        DashboardSummaryQuery query,
        CancellationToken cancellationToken = default)
    {
        var utcNow = _timeProvider.GetUtcNow().UtcDateTime;
        var toUtc = query.To.HasValue
            ? NormalizeToUtc(query.To.Value)
            : utcNow;
        var fromUtc = query.From.HasValue
            ? NormalizeToUtc(query.From.Value)
            : toUtc.AddHours(-DefaultLookbackHours);

        if (fromUtc > toUtc)
        {
            (fromUtc, toUtc) = (toUtc, fromUtc);
        }

        var transactions = await _dbContext.Transactions
            .AsNoTracking()
            .Include(transaction => transaction.Merchant)
            .Where(transaction =>
                transaction.CreatedAt >= fromUtc &&
                transaction.CreatedAt <= toUtc)
            .ToListAsync(cancellationToken);

        var openAlertsCount = await _dbContext.RiskAlerts
            .AsNoTracking()
            .CountAsync(
                alert =>
                    alert.Status == AlertStatus.Open &&
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
        var approvalRate = decided == 0
            ? 0m
            : Math.Round((decimal)approved / decided, 4, MidpointRounding.AwayFromZero);
        var averageAmount = total == 0
            ? 0m
            : Math.Round(volume / total, 2, MidpointRounding.AwayFromZero);

        var statusDistribution = Enum.GetValues<TransactionStatus>()
            .Select(status => new NamedCountDto
            {
                Key = status.ToString(),
                Count = transactions.Count(transaction => transaction.Status == status)
            })
            .Where(item => item.Count > 0 || IsPrimaryStatus(item.Key))
            .OrderByDescending(item => item.Count)
            .ThenBy(item => item.Key)
            .ToList();

        var riskDistribution = Enum.GetValues<RiskLevel>()
            .Select(level => new NamedCountDto
            {
                Key = level.ToString(),
                Count = transactions.Count(transaction => transaction.RiskLevel == level)
            })
            .OrderBy(item => item.Key switch
            {
                nameof(RiskLevel.Low) => 0,
                nameof(RiskLevel.Medium) => 1,
                nameof(RiskLevel.High) => 2,
                _ => 3
            })
            .ToList();

        var topMerchants = transactions
            .GroupBy(transaction => new
            {
                transaction.MerchantId,
                transaction.Merchant.MerchantCode,
                transaction.Merchant.Name
            })
            .Select(group => new TopMerchantDto
            {
                MerchantId = group.Key.MerchantId,
                MerchantCode = group.Key.MerchantCode,
                Name = group.Key.Name,
                TransactionCount = group.Count(),
                Volume = group.Sum(transaction => transaction.Amount)
            })
            .OrderByDescending(item => item.Volume)
            .ThenByDescending(item => item.TransactionCount)
            .Take(TopMerchantLimit)
            .ToList();

        var hourly = BuildHourlyBuckets(transactions, fromUtc, toUtc);

        return new DashboardSummaryDto
        {
            FromUtc = fromUtc,
            ToUtc = toUtc,
            Kpis = new DashboardKpisDto
            {
                TotalTransactions = total,
                TransactionVolume = volume,
                Currency = "TRY",
                ApprovedCount = approved,
                DeclinedCount = declined,
                HighRiskCount = highRisk,
                OpenAlertsCount = openAlertsCount,
                ApprovalRate = approvalRate,
                AverageAmount = averageAmount
            },
            HourlyTransactions = hourly,
            StatusDistribution = statusDistribution,
            RiskDistribution = riskDistribution,
            TopMerchants = topMerchants
        };
    }

    private static IReadOnlyList<HourlyBucketDto> BuildHourlyBuckets(
        IReadOnlyList<Entities.Transaction> transactions,
        DateTime fromUtc,
        DateTime toUtc)
    {
        var startHour = new DateTime(
            fromUtc.Year,
            fromUtc.Month,
            fromUtc.Day,
            fromUtc.Hour,
            0,
            0,
            DateTimeKind.Utc);
        var endHour = new DateTime(
            toUtc.Year,
            toUtc.Month,
            toUtc.Day,
            toUtc.Hour,
            0,
            0,
            DateTimeKind.Utc);

        var counts = transactions
            .GroupBy(transaction => new DateTime(
                transaction.CreatedAt.Year,
                transaction.CreatedAt.Month,
                transaction.CreatedAt.Day,
                transaction.CreatedAt.Hour,
                0,
                0,
                DateTimeKind.Utc))
            .ToDictionary(group => group.Key, group => group.Count());

        var buckets = new List<HourlyBucketDto>();
        for (var hour = startHour; hour <= endHour; hour = hour.AddHours(1))
        {
            buckets.Add(new HourlyBucketDto
            {
                HourUtc = hour,
                Count = counts.GetValueOrDefault(hour)
            });
        }

        return buckets;
    }

    private static bool IsPrimaryStatus(string key)
    {
        return key is nameof(TransactionStatus.Approved)
            or nameof(TransactionStatus.Declined)
            or nameof(TransactionStatus.Pending);
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
