using PaymentRiskMonitoring.Api.Enums;

namespace PaymentRiskMonitoring.Api.DTOs.RiskRules;

public class RiskRuleDto
{
    public Guid Id { get; init; }

    public string Code { get; init; } = string.Empty;

    public string Name { get; init; } = string.Empty;

    public string Description { get; init; } = string.Empty;

    public decimal Threshold { get; init; }

    public RiskRuleThresholdUnit ThresholdUnit { get; init; }

    public int Points { get; init; }

    public bool IsEnabled { get; init; }

    public int SortOrder { get; init; }

    public DateTime CreatedAt { get; init; }

    public DateTime UpdatedAt { get; init; }
}
