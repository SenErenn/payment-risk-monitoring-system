namespace PaymentRiskMonitoring.Api.DTOs.RiskRules;

public class UpdateRiskRuleRequest
{
    public decimal Threshold { get; set; }

    public int Points { get; set; }

    public bool IsEnabled { get; set; }
}
