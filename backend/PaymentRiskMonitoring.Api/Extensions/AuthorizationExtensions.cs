using Microsoft.AspNetCore.Authorization;
using PaymentRiskMonitoring.Api.Authorization;

namespace PaymentRiskMonitoring.Api.Extensions;

public static class AuthorizationExtensions
{
    public static IServiceCollection AddApplicationAuthorization(this IServiceCollection services)
    {
        services.AddAuthorization(options =>
        {
            options.AddPolicy(AuthorizationPolicies.AdminOnly, policy =>
                policy.RequireRole(AppRoles.Admin));

            options.AddPolicy(AuthorizationPolicies.AnalystOrAdmin, policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.Analyst));

            options.AddPolicy(AuthorizationPolicies.StaffRead, policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.Analyst, AppRoles.Viewer));
        });

        return services;
    }
}
