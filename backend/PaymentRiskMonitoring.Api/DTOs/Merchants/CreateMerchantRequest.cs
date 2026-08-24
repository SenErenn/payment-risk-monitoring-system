namespace PaymentRiskMonitoring.Api.DTOs.Merchants;

public class CreateMerchantRequest
{
    public string MerchantCode { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}
