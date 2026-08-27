using PaymentRiskMonitoring.Api.Enums;

namespace PaymentRiskMonitoring.Api.DTOs.Transactions;

public class CreateTransactionRequest
{
    public Guid MerchantId { get; set; }

    public Guid CardId { get; set; }

    public decimal Amount { get; set; }

    public string Currency { get; set; } = "TRY";

    public PaymentType PaymentType { get; set; }
}
