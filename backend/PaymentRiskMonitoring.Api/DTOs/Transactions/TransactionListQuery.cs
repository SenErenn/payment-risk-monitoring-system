using PaymentRiskMonitoring.Api.Enums;

namespace PaymentRiskMonitoring.Api.DTOs.Transactions;

public class TransactionListQuery
{
    public int Page { get; set; } = 1;

    public int PageSize { get; set; } = 10;

    public string? Search { get; set; }

    public TransactionStatus? Status { get; set; }

    public Guid? MerchantId { get; set; }

    public Guid? CardId { get; set; }
}
