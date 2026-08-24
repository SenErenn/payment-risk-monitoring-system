namespace PaymentRiskMonitoring.Api.Exceptions;

public class ValidationException : AppException
{
    public ValidationException(string message, IEnumerable<string> errors)
        : base(message, StatusCodes.Status400BadRequest, errors)
    {
    }
}
