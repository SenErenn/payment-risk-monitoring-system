using PaymentRiskMonitoring.Api.Enums;

namespace PaymentRiskMonitoring.Api.Entities;

public class RiskAlert
{
    public Guid Id { get; set; }

    public string AlertCode { get; set; } = string.Empty;

    public Guid TransactionId { get; set; }

    public RiskLevel RiskLevel { get; set; }

    public int RiskScore { get; set; }

    public AlertStatus Status { get; set; } = AlertStatus.Open;

    public string? AnalystNotes { get; set; }

    public Guid? ReviewedByUserId { get; set; }

    public DateTime? ReviewedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public Transaction Transaction { get; set; } = null!;

    public User? ReviewedByUser { get; set; }
}
