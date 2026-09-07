namespace PaymentRiskMonitoring.Api.Models.Risk;

public sealed class RiskReason
{
    public string Code { get; init; } = string.Empty;

    public string Message { get; init; } = string.Empty;

    /// <summary>
    /// Score points contributed by this reason (0 for baseline / informational).
    /// </summary>
    public int Points { get; init; }
}
