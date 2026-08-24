namespace PaymentRiskMonitoring.Api.DTOs.Merchants;

public class MerchantDto
{
    public Guid Id { get; init; }

    public string MerchantCode { get; init; } = string.Empty;

    public string Name { get; init; } = string.Empty;

    public string Category { get; init; } = string.Empty;

    public bool IsActive { get; init; }

    public DateTime CreatedAt { get; init; }

    public DateTime UpdatedAt { get; init; }
}
