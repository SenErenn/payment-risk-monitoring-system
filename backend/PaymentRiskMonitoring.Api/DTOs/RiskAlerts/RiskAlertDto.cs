using PaymentRiskMonitoring.Api.Enums;
using PaymentRiskMonitoring.Api.Models.Risk;

namespace PaymentRiskMonitoring.Api.DTOs.RiskAlerts;

public class RiskAlertDto
{
    public Guid Id { get; init; }

    public string AlertCode { get; init; } = string.Empty;

    public Guid TransactionId { get; init; }

    public string TransactionCode { get; init; } = string.Empty;

    public Guid MerchantId { get; init; }

    public string MerchantCode { get; init; } = string.Empty;

    public string MerchantName { get; init; } = string.Empty;

    public Guid CardId { get; init; }

    public string MaskedCardNumber { get; init; } = string.Empty;

    public decimal Amount { get; init; }

    public string Currency { get; init; } = string.Empty;

    public TransactionStatus TransactionStatus { get; init; }

    public RiskLevel RiskLevel { get; init; }

    public int RiskScore { get; init; }

    public IReadOnlyList<RiskReason> RiskReasons { get; init; } = Array.Empty<RiskReason>();

    public AlertStatus Status { get; init; }

    public DateTime CreatedAt { get; init; }

    public DateTime UpdatedAt { get; init; }
}
