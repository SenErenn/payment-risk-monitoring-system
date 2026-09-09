using PaymentRiskMonitoring.Api.Enums;

namespace PaymentRiskMonitoring.Api.DTOs.RiskAlerts;

public class ReviewRiskAlertRequest
{
    public AlertStatus Status { get; set; }

    public string? AnalystNotes { get; set; }
}
