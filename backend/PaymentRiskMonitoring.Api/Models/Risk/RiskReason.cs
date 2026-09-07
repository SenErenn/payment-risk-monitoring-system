namespace PaymentRiskMonitoring.Api.Models.Risk;

public sealed class RiskReason
{
    public string Code { get; init; } = string.Empty;

    public string Message { get; init; } = string.Empty;
}
