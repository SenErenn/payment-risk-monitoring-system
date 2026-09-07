using PaymentRiskMonitoring.Api.Entities;
using PaymentRiskMonitoring.Api.Enums;
using PaymentRiskMonitoring.Api.Models.Risk;

namespace PaymentRiskMonitoring.Api.Services;

/// <summary>
/// Central risk analysis engine. PR-020 establishes score bands, reasons, and foundation signals.
/// Advanced rules (velocity, night patterns, etc.) arrive in PR-021.
/// </summary>
public class RiskAnalysisService
{
    public const int LowMaxScore = 39;
    public const int MediumMaxScore = 69;

    public const decimal HighAmountThreshold = 10_000m;
    public const decimal HighUsageRatioThreshold = 0.8m;

    public const int BaselineApprovedScore = 15;
    public const int ElevatedApprovedScore = 45;
    public const int InsufficientLimitScore = 70;
    public const int InactiveMerchantScore = 75;
    public const int InactiveCardScore = 80;

    public RiskAnalysisResult AnalyzePayment(Merchant merchant, Card card, decimal amount)
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

        return AnalyzeApprovedPayment(card, amount);
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

    private RiskAnalysisResult AnalyzeApprovedPayment(Card card, decimal amount)
    {
        var reasons = new List<RiskReason>();
        var elevated = false;

        if (amount >= HighAmountThreshold)
        {
            elevated = true;
            reasons.Add(new RiskReason
            {
                Code = "HIGH_AMOUNT",
                Message = $"Amount is at or above {HighAmountThreshold:0}."
            });
        }

        var usageRatio = card.CreditLimit <= 0
            ? 0m
            : (card.CreditLimit - card.AvailableLimit + amount) / card.CreditLimit;

        if (usageRatio >= HighUsageRatioThreshold)
        {
            elevated = true;
            reasons.Add(new RiskReason
            {
                Code = "HIGH_LIMIT_USAGE",
                Message = $"Projected credit usage is at or above {HighUsageRatioThreshold:P0}."
            });
        }

        if (!elevated)
        {
            reasons.Add(new RiskReason
            {
                Code = "BASELINE",
                Message = "No elevated foundation risk signals."
            });
        }

        var score = elevated ? ElevatedApprovedScore : BaselineApprovedScore;
        var level = ResolveRiskLevel(score);
        var message = elevated
            ? "Approved with elevated basic risk signal."
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
                    Message = reasonMessage
                }
            ],
            DecisionMessage = decisionMessage
        };
    }
}
