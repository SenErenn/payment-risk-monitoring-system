using PaymentRiskMonitoring.Api.Enums;

namespace PaymentRiskMonitoring.Api.DTOs.Transactions;

public class TransactionDto
{
    public Guid Id { get; init; }

    public string TransactionCode { get; init; } = string.Empty;

    public Guid MerchantId { get; init; }

    public string MerchantCode { get; init; } = string.Empty;

    public string MerchantName { get; init; } = string.Empty;

    public Guid CardId { get; init; }

    public string CardToken { get; init; } = string.Empty;

    public string MaskedCardNumber { get; init; } = string.Empty;

    public decimal Amount { get; init; }

    public string Currency { get; init; } = string.Empty;

    public TransactionStatus Status { get; init; }

    public PaymentType PaymentType { get; init; }

    public int RiskScore { get; init; }

    public RiskLevel RiskLevel { get; init; }

    public DateTime CreatedAt { get; init; }

    public string? DecisionMessage { get; init; }
}
