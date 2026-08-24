namespace PaymentRiskMonitoring.Api.Exceptions;

public class AppException : Exception
{
    public int StatusCode { get; }

    public IReadOnlyList<string> Errors { get; }

    public AppException(
        string message,
        int statusCode = StatusCodes.Status400BadRequest,
        IEnumerable<string>? errors = null)
        : base(message)
    {
        StatusCode = statusCode;
        Errors = errors?.ToList() ?? [];
    }
}
