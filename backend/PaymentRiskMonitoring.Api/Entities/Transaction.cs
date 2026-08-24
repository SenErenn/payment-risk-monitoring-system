using PaymentRiskMonitoring.Api.Enums;

namespace PaymentRiskMonitoring.Api.Entities;

public class Transaction
{
    public Guid Id { get; set; }

    public string TransactionCode { get; set; } = string.Empty;

    public Guid MerchantId { get; set; }

    public Guid CardId { get; set; }

    public decimal Amount { get; set; }

    public string Currency { get; set; } = "TRY";

    public TransactionStatus Status { get; set; }

    public PaymentType PaymentType { get; set; }

    public int RiskScore { get; set; }

    public RiskLevel RiskLevel { get; set; }

    public DateTime CreatedAt { get; set; }

    public Merchant Merchant { get; set; } = null!;

    public Card Card { get; set; } = null!;
}
