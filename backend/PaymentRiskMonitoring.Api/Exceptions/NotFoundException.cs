namespace PaymentRiskMonitoring.Api.Exceptions;

public class NotFoundException : AppException
{
    public NotFoundException(string message)
        : base(message, StatusCodes.Status404NotFound)
    {
    }

    public NotFoundException(string entityName, object key)
        : base($"{entityName} with key '{key}' was not found.", StatusCodes.Status404NotFound)
    {
    }
}
