namespace PaymentRiskMonitoring.Api.DTOs.Analytics;

public class MerchantAnalyticsDto
{
    public Guid MerchantId { get; init; }

    public DateTime FromUtc { get; init; }

    public DateTime ToUtc { get; init; }

    public decimal Volume { get; init; }

    public string Currency { get; init; } = "TRY";

    public int TransactionCount { get; init; }

    public int ApprovedCount { get; init; }

    public int DeclinedCount { get; init; }

    /// <summary>Approved / (Approved + Declined), 0–1.</summary>
    public decimal ApprovalRate { get; init; }

    public int HighRiskCount { get; init; }

    public int RiskAlertCount { get; init; }
}
