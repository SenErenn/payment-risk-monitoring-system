using PaymentRiskMonitoring.Api.Enums;

namespace PaymentRiskMonitoring.Api.Authorization;

public static class AppRoles
{
    public const string Admin = nameof(UserRole.Admin);
    public const string Analyst = nameof(UserRole.Analyst);
    public const string Viewer = nameof(UserRole.Viewer);
}

public static class AuthorizationPolicies
{
    public const string AdminOnly = "AdminOnly";
    public const string AnalystOrAdmin = "AnalystOrAdmin";
    public const string StaffRead = "StaffRead";
}
