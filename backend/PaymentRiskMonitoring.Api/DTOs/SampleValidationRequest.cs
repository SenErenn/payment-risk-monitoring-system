namespace PaymentRiskMonitoring.Api.DTOs;

public class SampleValidationRequest
{
    public string Name { get; set; } = string.Empty;

    public decimal Amount { get; set; }
}
