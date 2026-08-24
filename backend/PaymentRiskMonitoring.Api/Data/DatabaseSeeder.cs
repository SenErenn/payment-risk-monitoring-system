using Microsoft.EntityFrameworkCore;

namespace PaymentRiskMonitoring.Api.Data;

public static class DatabaseSeeder
{
    public static async Task InitializeAsync(AppDbContext dbContext, ILogger logger)
    {
        await dbContext.Database.MigrateAsync();
        logger.LogInformation("Database migrations applied successfully.");

        // Demo seed data will be added in later PRs (users, merchants, cards, transactions).
        await Task.CompletedTask;
    }
}
