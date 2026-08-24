namespace PaymentRiskMonitoring.Api.Exceptions;

public class ForbiddenException : AppException
{
    public ForbiddenException(string message = "You do not have permission to access this resource.")
        : base(message, StatusCodes.Status403Forbidden)
    {
    }
}
