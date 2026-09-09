using PaymentRiskMonitoring.Api.Enums;

namespace PaymentRiskMonitoring.Api.Entities;

public class RiskRule
{
    public Guid Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public decimal Threshold { get; set; }

    public RiskRuleThresholdUnit ThresholdUnit { get; set; }

    public int Points { get; set; }

    public bool IsEnabled { get; set; } = true;

    public int SortOrder { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}
