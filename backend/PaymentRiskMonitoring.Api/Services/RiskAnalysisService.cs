using Microsoft.EntityFrameworkCore;
using PaymentRiskMonitoring.Api.Data;
using PaymentRiskMonitoring.Api.Entities;
using PaymentRiskMonitoring.Api.Enums;
using PaymentRiskMonitoring.Api.Models.Risk;

namespace PaymentRiskMonitoring.Api.Services;

/// <summary>
/// Central risk analysis engine. Additive rule thresholds/points come from RiskRules (PR-025).
/// </summary>
public class RiskAnalysisService
{
    public const string HighAmountCode = "HIGH_AMOUNT";
    public const string HighLimitUsageCode = "HIGH_LIMIT_USAGE";
    public const string VelocityCode = "VELOCITY";
    public const string MultipleDeclinesCode = "MULTIPLE_DECLINES";
    public const string NightHighAmountCode = "NIGHT_HIGH_AMOUNT";
    public const string SuddenAmountIncreaseCode = "SUDDEN_AMOUNT_INCREASE";

    public const int LowMaxScore = 39;
    public const int MediumMaxScore = 69;
    public const int MaxScore = 100;
    public const int BaselineApprovedScore = 15;

    public const decimal DefaultHighAmountThreshold = 10_000m;
    public const decimal DefaultHighUsageRatioThreshold = 0.8m;
    public const decimal DefaultNightHighAmountThreshold = 5_000m;
    public const decimal DefaultSuddenIncreaseMultiplier = 3m;

    public const int VelocityWindowMinutes = 5;
    public const int DefaultVelocityPriorCountThreshold = 2;
    public const int MultipleDeclinesWindowHours = 24;
    public const int DefaultMultipleDeclinesThreshold = 2;
    public const int SuddenIncreaseLookbackCount = 5;
    public const int SuddenIncreaseMinHistory = 3;

    public const int DefaultHighAmountPoints = 45;
    public const int DefaultHighLimitUsagePoints = 20;
    public const int DefaultVelocityPoints = 25;
    public const int DefaultMultipleDeclinesPoints = 25;
    public const int DefaultNightHighAmountPoints = 20;
    public const int DefaultSuddenAmountIncreasePoints = 20;

    public const int InsufficientLimitScore = 70;
    public const int InactiveMerchantScore = 75;
    public const int InactiveCardScore = 80;

    private readonly AppDbContext _dbContext;
    private readonly TimeProvider _timeProvider;

    public RiskAnalysisService(AppDbContext dbContext, TimeProvider? timeProvider = null)
    {
        _dbContext = dbContext;
        _timeProvider = timeProvider ?? TimeProvider.System;
    }

    public async Task<RiskAnalysisResult> AnalyzePaymentAsync(
        Merchant merchant,
        Card card,
        decimal amount,
        CancellationToken cancellationToken = default)
    {
        if (!merchant.IsActive)
        {
            return Decline(
                InactiveMerchantScore,
                "MERCHANT_INACTIVE",
                "Merchant is inactive.",
                "Declined: merchant is inactive.");
        }

        if (card.Status != CardStatus.Active)
        {
            return Decline(
                InactiveCardScore,
                "CARD_NOT_ACTIVE",
                $"Card status is {card.Status}.",
                $"Declined: card status is {card.Status}.");
        }

        if (amount > card.AvailableLimit)
        {
            return CreateInsufficientLimitResult();
        }

        var utcNow = _timeProvider.GetUtcNow().UtcDateTime;
        return await AnalyzeApprovedPaymentAsync(card, amount, utcNow, cancellationToken);
    }

    public RiskAnalysisResult CreateInsufficientLimitResult()
    {
        return Decline(
            InsufficientLimitScore,
            "INSUFFICIENT_LIMIT",
            "Insufficient available limit.",
            "Declined: insufficient available limit.");
    }

    public static RiskLevel ResolveRiskLevel(int riskScore)
    {
        if (riskScore <= LowMaxScore)
        {
            return RiskLevel.Low;
        }

        if (riskScore <= MediumMaxScore)
        {
            return RiskLevel.Medium;
        }

        return RiskLevel.High;
    }

    public static bool IsNightUtc(DateTime utcNow)
    {
        var hour = utcNow.Hour;
        return hour >= 22 || hour <= 5;
    }

    private async Task<RiskAnalysisResult> AnalyzeApprovedPaymentAsync(
        Card card,
        decimal amount,
        DateTime utcNow,
        CancellationToken cancellationToken)
    {
        var rules = await LoadRuleSettingsAsync(cancellationToken);
        var history = await LoadCardHistoryAsync(card.Id, utcNow, cancellationToken);
        var reasons = new List<RiskReason>();
        var score = 0;

        void Apply(RiskReason? reason)
        {
            if (reason is null)
            {
                return;
            }

            reasons.Add(reason);
            score += reason.Points;
        }

        Apply(EvaluateHighAmount(amount, ResolveRule(
            rules,
            HighAmountCode,
            DefaultHighAmountThreshold,
            DefaultHighAmountPoints)));
        Apply(EvaluateHighLimitUsage(card, amount, ResolveRule(
            rules,
            HighLimitUsageCode,
            DefaultHighUsageRatioThreshold,
            DefaultHighLimitUsagePoints)));
        Apply(EvaluateVelocity(history, utcNow, ResolveRule(
            rules,
            VelocityCode,
            DefaultVelocityPriorCountThreshold,
            DefaultVelocityPoints)));
        Apply(EvaluateMultipleDeclines(history, utcNow, ResolveRule(
            rules,
            MultipleDeclinesCode,
            DefaultMultipleDeclinesThreshold,
            DefaultMultipleDeclinesPoints)));
        Apply(EvaluateNightHighAmount(amount, utcNow, ResolveRule(
            rules,
            NightHighAmountCode,
            DefaultNightHighAmountThreshold,
            DefaultNightHighAmountPoints)));
        Apply(EvaluateSuddenAmountIncrease(amount, history, ResolveRule(
            rules,
            SuddenAmountIncreaseCode,
            DefaultSuddenIncreaseMultiplier,
            DefaultSuddenAmountIncreasePoints)));

        if (reasons.Count == 0)
        {
            score = BaselineApprovedScore;
            reasons.Add(new RiskReason
            {
                Code = "BASELINE",
                Message = "No elevated risk signals.",
                Points = 0
            });
        }

        score = Math.Clamp(score, 0, MaxScore);

        var level = ResolveRiskLevel(score);
        var message = reasons.Exists(reason => reason.Code != "BASELINE")
            ? $"Approved with risk score {score} ({level})."
            : "Approved.";

        return new RiskAnalysisResult
        {
            Status = TransactionStatus.Approved,
            RiskScore = score,
            RiskLevel = level,
            RiskReasons = reasons,
            DecisionMessage = message
        };
    }

    private async Task<Dictionary<string, RuleSettings>> LoadRuleSettingsAsync(
        CancellationToken cancellationToken)
    {
        var rules = await _dbContext.RiskRules
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        return rules.ToDictionary(
            rule => rule.Code,
            rule => new RuleSettings(rule.IsEnabled, rule.Threshold, rule.Points),
            StringComparer.OrdinalIgnoreCase);
    }

    private static RuleSettings ResolveRule(
        IReadOnlyDictionary<string, RuleSettings> rules,
        string code,
        decimal defaultThreshold,
        int defaultPoints)
    {
        if (rules.TryGetValue(code, out var settings))
        {
            return settings;
        }

        return new RuleSettings(true, defaultThreshold, defaultPoints);
    }

    private async Task<List<Transaction>> LoadCardHistoryAsync(
        Guid cardId,
        DateTime utcNow,
        CancellationToken cancellationToken)
    {
        var lookbackStart = utcNow.AddHours(-MultipleDeclinesWindowHours);

        return await _dbContext.Transactions
            .AsNoTracking()
            .Where(transaction =>
                transaction.CardId == cardId &&
                transaction.CreatedAt >= lookbackStart)
            .OrderByDescending(transaction => transaction.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public static RiskReason? EvaluateHighAmount(decimal amount, RuleSettings rule)
    {
        if (!rule.IsEnabled || amount < rule.Threshold)
        {
            return null;
        }

        return new RiskReason
        {
            Code = HighAmountCode,
            Message = $"Amount is at or above {rule.Threshold:0.##}.",
            Points = rule.Points
        };
    }

    public static RiskReason? EvaluateHighLimitUsage(
        Card card,
        decimal amount,
        RuleSettings rule)
    {
        if (!rule.IsEnabled)
        {
            return null;
        }

        var usageRatio = card.CreditLimit <= 0
            ? 0m
            : (card.CreditLimit - card.AvailableLimit + amount) / card.CreditLimit;

        if (usageRatio < rule.Threshold)
        {
            return null;
        }

        return new RiskReason
        {
            Code = HighLimitUsageCode,
            Message = $"Projected credit usage is at or above {rule.Threshold:P0}.",
            Points = rule.Points
        };
    }

    public static RiskReason? EvaluateVelocity(
        IReadOnlyList<Transaction> history,
        DateTime utcNow,
        RuleSettings rule)
    {
        if (!rule.IsEnabled)
        {
            return null;
        }

        var windowStart = utcNow.AddMinutes(-VelocityWindowMinutes);
        var priorCount = history.Count(transaction => transaction.CreatedAt >= windowStart);
        var threshold = (int)decimal.Truncate(rule.Threshold);

        if (priorCount < threshold)
        {
            return null;
        }

        return new RiskReason
        {
            Code = VelocityCode,
            Message =
                $"Card has {priorCount} transactions in the last {VelocityWindowMinutes} minutes.",
            Points = rule.Points
        };
    }

    public static RiskReason? EvaluateMultipleDeclines(
        IReadOnlyList<Transaction> history,
        DateTime utcNow,
        RuleSettings rule)
    {
        if (!rule.IsEnabled)
        {
            return null;
        }

        var windowStart = utcNow.AddHours(-MultipleDeclinesWindowHours);
        var declineCount = history.Count(transaction =>
            transaction.Status == TransactionStatus.Declined &&
            transaction.CreatedAt >= windowStart);
        var threshold = (int)decimal.Truncate(rule.Threshold);

        if (declineCount < threshold)
        {
            return null;
        }

        return new RiskReason
        {
            Code = MultipleDeclinesCode,
            Message =
                $"Card has {declineCount} declines in the last {MultipleDeclinesWindowHours} hours.",
            Points = rule.Points
        };
    }

    public static RiskReason? EvaluateNightHighAmount(
        decimal amount,
        DateTime utcNow,
        RuleSettings rule)
    {
        if (!rule.IsEnabled || !IsNightUtc(utcNow) || amount < rule.Threshold)
        {
            return null;
        }

        return new RiskReason
        {
            Code = NightHighAmountCode,
            Message =
                $"High amount ({amount:0.##}) during night hours (UTC 22:00–05:59).",
            Points = rule.Points
        };
    }

    public static RiskReason? EvaluateSuddenAmountIncrease(
        decimal amount,
        IReadOnlyList<Transaction> history,
        RuleSettings rule)
    {
        if (!rule.IsEnabled)
        {
            return null;
        }

        var recentApproved = history
            .Where(transaction => transaction.Status == TransactionStatus.Approved)
            .Take(SuddenIncreaseLookbackCount)
            .Select(transaction => transaction.Amount)
            .ToList();

        if (recentApproved.Count < SuddenIncreaseMinHistory)
        {
            return null;
        }

        var average = recentApproved.Average();
        if (average <= 0)
        {
            return null;
        }

        var threshold = average * rule.Threshold;
        if (amount < threshold)
        {
            return null;
        }

        return new RiskReason
        {
            Code = SuddenAmountIncreaseCode,
            Message =
                $"Amount {amount:0.##} is at least {rule.Threshold:0.##}× the recent approved average ({average:0.##}).",
            Points = rule.Points
        };
    }

    private static RiskAnalysisResult Decline(
        int score,
        string code,
        string reasonMessage,
        string decisionMessage)
    {
        return new RiskAnalysisResult
        {
            Status = TransactionStatus.Declined,
            RiskScore = score,
            RiskLevel = ResolveRiskLevel(score),
            RiskReasons =
            [
                new RiskReason
                {
                    Code = code,
                    Message = reasonMessage,
                    Points = score
                }
            ],
            DecisionMessage = decisionMessage
        };
    }

    public readonly record struct RuleSettings(bool IsEnabled, decimal Threshold, int Points);
}
