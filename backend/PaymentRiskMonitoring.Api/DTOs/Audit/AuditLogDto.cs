namespace PaymentRiskMonitoring.Api.DTOs.Audit;

public class AuditLogDto
{
    public Guid Id { get; init; }

    public Guid? UserId { get; init; }

    public string? UserEmail { get; init; }

    public string? UserName { get; init; }

    public string Action { get; init; } = string.Empty;

    public string EntityType { get; init; } = string.Empty;

    public string? EntityId { get; init; }

    public string Summary { get; init; } = string.Empty;

    public string? Details { get; init; }

    public string? IpAddress { get; init; }

    public DateTime CreatedAt { get; init; }
}
