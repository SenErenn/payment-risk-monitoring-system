using PaymentRiskMonitoring.Api.Enums;

namespace PaymentRiskMonitoring.Api.Models.Risk;

public sealed class RiskAnalysisResult
{
    public required TransactionStatus Status { get; init; }

    public required int RiskScore { get; init; }

    public required RiskLevel RiskLevel { get; init; }

    public required IReadOnlyList<RiskReason> RiskReasons { get; init; }

    public required string DecisionMessage { get; init; }
}
