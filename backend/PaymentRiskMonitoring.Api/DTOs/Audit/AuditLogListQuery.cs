namespace PaymentRiskMonitoring.Api.DTOs.Audit;

public class AuditLogListQuery
{
    public int Page { get; set; } = 1;

    public int PageSize { get; set; } = 20;

    public string? Search { get; set; }

    public string? Action { get; set; }

    public string? EntityType { get; set; }

    public Guid? UserId { get; set; }

    public DateTime? CreatedFrom { get; set; }

    public DateTime? CreatedTo { get; set; }
}
