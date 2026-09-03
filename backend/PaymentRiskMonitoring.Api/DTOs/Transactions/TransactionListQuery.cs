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

    public PaymentType? PaymentType { get; set; }

    public DateTime? CreatedFrom { get; set; }

    public DateTime? CreatedTo { get; set; }

    public decimal? MinAmount { get; set; }

    public decimal? MaxAmount { get; set; }

    /// <summary>
    /// createdAt | amount | status | riskScore | riskLevel | transactionCode | paymentType
    /// </summary>
    public string SortBy { get; set; } = "createdAt";

    /// <summary>
    /// asc | desc
    /// </summary>
    public string SortDirection { get; set; } = "desc";
}
