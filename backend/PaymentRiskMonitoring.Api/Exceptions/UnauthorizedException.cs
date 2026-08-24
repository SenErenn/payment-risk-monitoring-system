namespace PaymentRiskMonitoring.Api.Exceptions;

public class UnauthorizedException : AppException
{
    public UnauthorizedException(string message = "Invalid email or password.")
        : base(message, StatusCodes.Status401Unauthorized)
    {
    }
}
