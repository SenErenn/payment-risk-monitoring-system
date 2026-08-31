using PaymentRiskMonitoring.Api.Enums;

namespace PaymentRiskMonitoring.Api.DTOs.Transactions;

public class CreateTransactionRequest
{
    public Guid MerchantId { get; set; }

    public Guid CardId { get; set; }

    public decimal Amount { get; set; }

    public string Currency { get; set; } = "TRY";

    public PaymentType PaymentType { get; set; }

    /// <summary>
    /// Optional client key. Replaying the same key returns the original transaction
    /// without charging the card again. Can also be sent via Idempotency-Key header.
    /// </summary>
    public string? IdempotencyKey { get; set; }
}
