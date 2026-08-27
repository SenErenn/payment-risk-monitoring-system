using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PaymentRiskMonitoring.Api.Authorization;
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

    [Authorize(Policy = AuthorizationPolicies.StaffRead)]
    [HttpGet("me")]
    public async Task<ActionResult<ApiResponse<AuthenticatedUserDto>>> Me(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        var user = await _authService.GetCurrentUserAsync(userId, cancellationToken);
        return Ok(ApiResponse<AuthenticatedUserDto>.Ok(user, "Current user retrieved."));
    }

    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    [HttpGet("admin-check")]
    public ActionResult<ApiResponse<object>> AdminCheck()
    {
        return Ok(ApiResponse<object>.Ok(
            CreateRolePayload("Admin access confirmed."),
            "Admin authorization succeeded."));
    }

    [Authorize(Policy = AuthorizationPolicies.AnalystOrAdmin)]
    [HttpGet("analyst-check")]
    public ActionResult<ApiResponse<object>> AnalystCheck()
    {
        return Ok(ApiResponse<object>.Ok(
            CreateRolePayload("Analyst access confirmed."),
            "Analyst authorization succeeded."));
    }

    [Authorize(Policy = AuthorizationPolicies.StaffRead)]
    [HttpGet("access")]
    public ActionResult<ApiResponse<object>> Access()
    {
        var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

        var payload = new
        {
            role,
            canManageUsers = role == AppRoles.Admin,
            canManageRiskRules = role == AppRoles.Admin,
            canManageCards = role == AppRoles.Admin,
            canViewCards = role == AppRoles.Admin,
            canManageMerchants = role == AppRoles.Admin,
            canReviewRiskAlerts = role is AppRoles.Admin or AppRoles.Analyst,
            canCreateTransactions = role is AppRoles.Admin or AppRoles.Analyst,
            canViewTransactions = role is AppRoles.Admin or AppRoles.Analyst or AppRoles.Viewer,
            canViewMerchants = role is AppRoles.Admin or AppRoles.Viewer,
            checkedAtUtc = DateTime.UtcNow
        };

        return Ok(ApiResponse<object>.Ok(payload, "Access profile retrieved."));
    }

    private object CreateRolePayload(string message)
    {
        return new
        {
            message,
            role = User.FindFirstValue(ClaimTypes.Role),
            checkedAtUtc = DateTime.UtcNow
        };
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
