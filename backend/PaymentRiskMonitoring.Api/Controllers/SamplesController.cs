using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PaymentRiskMonitoring.Api.DTOs;
using PaymentRiskMonitoring.Api.Exceptions;
using PaymentRiskMonitoring.Api.Models.Responses;

namespace PaymentRiskMonitoring.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SamplesController : ControllerBase
{
    private readonly ILogger<SamplesController> _logger;

    public SamplesController(ILogger<SamplesController> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Demonstrates FluentValidation and the standard success response format.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("validate")]
    public ActionResult<ApiResponse<object>> Validate([FromBody] SampleValidationRequest request)
    {
        _logger.LogInformation("Sample validation request received for {Name}", request.Name);

        var payload = new
        {
            request.Name,
            request.Amount,
            validatedAt = DateTime.UtcNow
        };

        return Ok(ApiResponse<object>.Ok(payload, "Validation succeeded."));
    }

    /// <summary>
    /// Demonstrates global exception handling with a NotFoundException.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("not-found-demo")]
    public ActionResult<ApiResponse<object>> NotFoundDemo()
    {
        throw new NotFoundException("Sample resource", "demo-id");
    }

    /// <summary>
    /// Demonstrates JWT authorization on a protected endpoint.
    /// </summary>
    [Authorize]
    [HttpGet("protected")]
    public ActionResult<ApiResponse<object>> Protected()
    {
        var payload = new
        {
            message = "You are authenticated.",
            email = User.FindFirstValue(ClaimTypes.Email),
            role = User.FindFirstValue(ClaimTypes.Role),
            checkedAtUtc = DateTime.UtcNow
        };

        return Ok(ApiResponse<object>.Ok(payload, "Protected sample endpoint accessed."));
    }
}
