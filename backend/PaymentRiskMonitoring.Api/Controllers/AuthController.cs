using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PaymentRiskMonitoring.Api.DTOs.Auth;
using PaymentRiskMonitoring.Api.Exceptions;
using PaymentRiskMonitoring.Api.Models.Responses;
using PaymentRiskMonitoring.Api.Services;

namespace PaymentRiskMonitoring.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<LoginResponse>>> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _authService.LoginAsync(request, cancellationToken);
        return Ok(ApiResponse<LoginResponse>.Ok(result, "Login successful."));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<ApiResponse<AuthenticatedUserDto>>> Me(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        var user = await _authService.GetCurrentUserAsync(userId, cancellationToken);
        return Ok(ApiResponse<AuthenticatedUserDto>.Ok(user, "Current user retrieved."));
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("admin-check")]
    public ActionResult<ApiResponse<object>> AdminCheck()
    {
        var payload = new
        {
            message = "Admin access confirmed.",
            role = User.FindFirstValue(ClaimTypes.Role),
            checkedAtUtc = DateTime.UtcNow
        };

        return Ok(ApiResponse<object>.Ok(payload, "Admin authorization succeeded."));
    }

    private Guid GetCurrentUserId()
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");

        if (!Guid.TryParse(userIdValue, out var userId))
        {
            throw new UnauthorizedException("Invalid authentication token.");
        }

        return userId;
    }
}
