using System.Security.Claims;
using System.Text.Json;

namespace PaymentRiskMonitoring.Api.Audit;

public static class AuditHttpExtensions
{
    public static Guid? GetOptionalUserId(this ClaimsPrincipal user)
    {
        var userIdValue = user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? user.FindFirstValue("sub");

        return Guid.TryParse(userIdValue, out var userId) ? userId : null;
    }

    public static string? GetOptionalEmail(this ClaimsPrincipal user)
    {
        return user.FindFirstValue(ClaimTypes.Email)
            ?? user.FindFirstValue("email");
    }

    public static string? GetOptionalDisplayName(this ClaimsPrincipal user)
    {
        var given = user.FindFirstValue(ClaimTypes.GivenName);
        var surname = user.FindFirstValue(ClaimTypes.Surname);
        var combined = $"{given} {surname}".Trim();
        if (!string.IsNullOrWhiteSpace(combined))
        {
            return combined;
        }

        return user.FindFirstValue(ClaimTypes.Name)
            ?? user.FindFirstValue("name");
    }

    public static string? GetClientIpAddress(this HttpContext httpContext)
    {
        var forwarded = httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(forwarded))
        {
            return forwarded.Split(',')[0].Trim();
        }

        return httpContext.Connection.RemoteIpAddress?.ToString();
    }

    public static string? ToAuditJson(object value)
    {
        return JsonSerializer.Serialize(value, AuditJsonOptions);
    }

    private static readonly JsonSerializerOptions AuditJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };
}
