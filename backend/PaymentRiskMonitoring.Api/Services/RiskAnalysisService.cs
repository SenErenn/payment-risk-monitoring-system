using Microsoft.EntityFrameworkCore;
using PaymentRiskMonitoring.Api.Data;
using PaymentRiskMonitoring.Api.Entities;
using PaymentRiskMonitoring.Api.Enums;
using PaymentRiskMonitoring.Api.Models.Risk;

namespace PaymentRiskMonitoring.Api.Services;

/// <summary>
/// Central risk analysis engine with foundation declines and advanced additive rules (PR-021).
/// </summary>
public class RiskAnalysisService
{
    public const int LowMaxScore = 39;
    public const int MediumMaxScore = 69;
    public const int MaxScore = 100;
    public const int BaselineApprovedScore = 15;

    public const decimal HighAmountThreshold = 10_000m;
    public const decimal HighUsageRatioThreshold = 0.8m;
    public const decimal NightHighAmountThreshold = 5_000m;
    public const decimal SuddenIncreaseMultiplier = 3m;

    public const int VelocityWindowMinutes = 5;
    public const int VelocityPriorCountThreshold = 2;
    public const int MultipleDeclinesWindowHours = 24;
    public const int MultipleDeclinesThreshold = 2;
    public const int SuddenIncreaseLookbackCount = 5;
    public const int SuddenIncreaseMinHistory = 3;

    public const int HighAmountPoints = 45;
    public const int HighLimitUsagePoints = 20;
    public const int VelocityPoints = 25;
    public const int MultipleDeclinesPoints = 25;
    public const int NightHighAmountPoints = 20;
    public const int SuddenAmountIncreasePoints = 20;

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

        Apply(EvaluateHighAmount(amount));
        Apply(EvaluateHighLimitUsage(card, amount));
        Apply(EvaluateVelocity(history, utcNow));
        Apply(EvaluateMultipleDeclines(history, utcNow));
        Apply(EvaluateNightHighAmount(amount, utcNow));
        Apply(EvaluateSuddenAmountIncrease(amount, history));

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

    public static RiskReason? EvaluateHighAmount(decimal amount)
    {
        if (amount < HighAmountThreshold)
        {
            return null;
        }

        return new RiskReason
        {
            Code = "HIGH_AMOUNT",
            Message = $"Amount is at or above {HighAmountThreshold:0}.",
            Points = HighAmountPoints
        };
    }

    public static RiskReason? EvaluateHighLimitUsage(Card card, decimal amount)
    {
        var usageRatio = card.CreditLimit <= 0
            ? 0m
            : (card.CreditLimit - card.AvailableLimit + amount) / card.CreditLimit;

        if (usageRatio < HighUsageRatioThreshold)
        {
            return null;
        }

        return new RiskReason
        {
            Code = "HIGH_LIMIT_USAGE",
            Message = $"Projected credit usage is at or above {HighUsageRatioThreshold:P0}.",
            Points = HighLimitUsagePoints
        };
    }

    public static RiskReason? EvaluateVelocity(
        IReadOnlyList<Transaction> history,
        DateTime utcNow)
    {
        var windowStart = utcNow.AddMinutes(-VelocityWindowMinutes);
        var priorCount = history.Count(transaction => transaction.CreatedAt >= windowStart);

        if (priorCount < VelocityPriorCountThreshold)
        {
            return null;
        }

        return new RiskReason
        {
            Code = "VELOCITY",
            Message =
                $"Card has {priorCount} transactions in the last {VelocityWindowMinutes} minutes.",
            Points = VelocityPoints
        };
    }

    public static RiskReason? EvaluateMultipleDeclines(
        IReadOnlyList<Transaction> history,
        DateTime utcNow)
    {
        var windowStart = utcNow.AddHours(-MultipleDeclinesWindowHours);
        var declineCount = history.Count(transaction =>
            transaction.Status == TransactionStatus.Declined &&
            transaction.CreatedAt >= windowStart);

        if (declineCount < MultipleDeclinesThreshold)
        {
            return null;
        }

        return new RiskReason
        {
            Code = "MULTIPLE_DECLINES",
            Message =
                $"Card has {declineCount} declines in the last {MultipleDeclinesWindowHours} hours.",
            Points = MultipleDeclinesPoints
        };
    }

    public static RiskReason? EvaluateNightHighAmount(decimal amount, DateTime utcNow)
    {
        if (!IsNightUtc(utcNow) || amount < NightHighAmountThreshold)
        {
            return null;
        }

        return new RiskReason
        {
            Code = "NIGHT_HIGH_AMOUNT",
            Message =
                $"High amount ({amount:0.##}) during night hours (UTC 22:00–05:59).",
            Points = NightHighAmountPoints
        };
    }

    public static RiskReason? EvaluateSuddenAmountIncrease(
        decimal amount,
        IReadOnlyList<Transaction> history)
    {
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

        var threshold = average * SuddenIncreaseMultiplier;
        if (amount < threshold)
        {
            return null;
        }

        return new RiskReason
        {
            Code = "SUDDEN_AMOUNT_INCREASE",
            Message =
                $"Amount {amount:0.##} is at least {SuddenIncreaseMultiplier:0}× the recent approved average ({average:0.##}).",
            Points = SuddenAmountIncreasePoints
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
}
