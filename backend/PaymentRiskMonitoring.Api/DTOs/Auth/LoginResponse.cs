namespace PaymentRiskMonitoring.Api.DTOs.Auth;

public class LoginResponse
{
    public string AccessToken { get; init; } = string.Empty;

    public DateTime ExpiresAtUtc { get; init; }

    public AuthenticatedUserDto User { get; init; } = null!;
}
