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

    /// <summary>
    /// Persisted approve/decline explanation shown on detail screens.
    /// </summary>
    public string DecisionReason { get; set; } = string.Empty;

    /// <summary>
    /// Declined-only copy of <see cref="DecisionReason"/> for explicit decline reporting.
    /// </summary>
    public string? DeclineReason { get; set; }

    /// <summary>
    /// Client-supplied key to prevent duplicate payment processing.
    /// </summary>
    public string? IdempotencyKey { get; set; }

    public DateTime CreatedAt { get; set; }

    public Merchant Merchant { get; set; } = null!;

    public Card Card { get; set; } = null!;

    public ICollection<Refund> Refunds { get; set; } = new List<Refund>();
}
