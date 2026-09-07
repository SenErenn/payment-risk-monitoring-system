namespace PaymentRiskMonitoring.Api.Entities;

public class Refund
{
    public Guid Id { get; set; }

    public string RefundCode { get; set; } = string.Empty;

    public Guid TransactionId { get; set; }

    public decimal Amount { get; set; }

    public string Currency { get; set; } = "TRY";

    public string? Reason { get; set; }

    public DateTime CreatedAt { get; set; }

    public Transaction Transaction { get; set; } = null!;
}
