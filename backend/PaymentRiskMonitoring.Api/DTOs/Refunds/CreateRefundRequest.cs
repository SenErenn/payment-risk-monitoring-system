namespace PaymentRiskMonitoring.Api.DTOs.Refunds;

public class CreateRefundRequest
{
    /// <summary>
    /// Optional. When omitted, refunds the remaining refundable amount (full remaining).
    /// </summary>
    public decimal? Amount { get; set; }

    public string? Reason { get; set; }
}
