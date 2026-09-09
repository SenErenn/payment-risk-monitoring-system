namespace PaymentRiskMonitoring.Api.Audit;

public sealed class AuditEntry
{
    public Guid? UserId { get; init; }

    public string? UserEmail { get; init; }

    public string? UserName { get; init; }

    public required string Action { get; init; }

    public required string EntityType { get; init; }

    public string? EntityId { get; init; }

    public required string Summary { get; init; }

    public string? Details { get; init; }

    public string? IpAddress { get; init; }
}
