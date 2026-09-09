namespace PaymentRiskMonitoring.Api.DTOs.Analytics;

public class CardAnalyticsDto
{
    public Guid CardId { get; init; }

    public DateTime FromUtc { get; init; }

    public DateTime ToUtc { get; init; }

    public decimal Spending { get; init; }

    public string Currency { get; init; } = "TRY";

    public int TransactionCount { get; init; }

    public int DeclinedCount { get; init; }

    public int RiskAlertCount { get; init; }

    public decimal AvailableLimit { get; init; }

    public decimal CreditLimit { get; init; }
}
