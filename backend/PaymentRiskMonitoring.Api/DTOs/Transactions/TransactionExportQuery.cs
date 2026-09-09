using PaymentRiskMonitoring.Api.Enums;

namespace PaymentRiskMonitoring.Api.DTOs.Transactions;

public class TransactionExportQuery
{
    public string? Search { get; set; }

    public TransactionStatus? Status { get; set; }

    public Guid? MerchantId { get; set; }

    public Guid? CardId { get; set; }

    public PaymentType? PaymentType { get; set; }

    public DateTime? CreatedFrom { get; set; }

    public DateTime? CreatedTo { get; set; }

    public decimal? MinAmount { get; set; }

    public decimal? MaxAmount { get; set; }

    public string SortBy { get; set; } = "createdAt";

    public string SortDirection { get; set; } = "desc";

    /// <summary>
    /// csv | excel
    /// </summary>
    public string Format { get; set; } = "csv";
}
