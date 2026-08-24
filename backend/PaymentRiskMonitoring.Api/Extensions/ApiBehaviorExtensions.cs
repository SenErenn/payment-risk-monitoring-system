using Microsoft.AspNetCore.Mvc;
using PaymentRiskMonitoring.Api.Models.Responses;

namespace PaymentRiskMonitoring.Api.Extensions;

public static class ApiBehaviorExtensions
{
    public static IServiceCollection ConfigureApiBehavior(this IServiceCollection services)
    {
        services.Configure<ApiBehaviorOptions>(options =>
        {
            options.InvalidModelStateResponseFactory = context =>
            {
                var errors = context.ModelState
                    .Where(entry => entry.Value?.Errors.Count > 0)
                    .SelectMany(entry => entry.Value!.Errors.Select(error =>
                        string.IsNullOrWhiteSpace(error.ErrorMessage)
                            ? $"{entry.Key} is invalid."
                            : error.ErrorMessage))
                    .ToList();

                var response = ApiResponse.Fail("Validation failed.", errors);
                return new BadRequestObjectResult(response);
            };
        });

        return services;
    }
}
