namespace PaymentRiskMonitoring.Api.Entities;

public class AuditLog
{
    public Guid Id { get; set; }

    public Guid? UserId { get; set; }

    public string? UserEmail { get; set; }

    public string? UserName { get; set; }

    public string Action { get; set; } = string.Empty;

    public string EntityType { get; set; } = string.Empty;

    public string? EntityId { get; set; }

    public string Summary { get; set; } = string.Empty;

    public string? Details { get; set; }

    public string? IpAddress { get; set; }

    public DateTime CreatedAt { get; set; }

    public User? User { get; set; }
}
