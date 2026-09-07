namespace PaymentRiskMonitoring.Api.DTOs.Refunds;

public class RefundDto
{
    public Guid Id { get; init; }

    public string RefundCode { get; init; } = string.Empty;

    public Guid TransactionId { get; init; }

    public string TransactionCode { get; init; } = string.Empty;

    public decimal Amount { get; init; }

    public string Currency { get; init; } = string.Empty;

    public string? Reason { get; init; }

    public DateTime CreatedAt { get; init; }
}
