using PaymentRiskMonitoring.Api.Enums;

namespace PaymentRiskMonitoring.Api.DTOs.RiskAlerts;

public class RiskAlertListQuery
{
    public int Page { get; set; } = 1;

    public int PageSize { get; set; } = 10;

    public string? Search { get; set; }

    public AlertStatus? Status { get; set; }

    public RiskLevel? RiskLevel { get; set; }

    public Guid? MerchantId { get; set; }

    public Guid? CardId { get; set; }

    public Guid? TransactionId { get; set; }

    public DateTime? CreatedFrom { get; set; }

    public DateTime? CreatedTo { get; set; }

    /// <summary>
    /// createdAt | riskScore | riskLevel | status | alertCode
    /// </summary>
    public string SortBy { get; set; } = "createdAt";

    /// <summary>
    /// asc | desc
    /// </summary>
    public string SortDirection { get; set; } = "desc";
}
