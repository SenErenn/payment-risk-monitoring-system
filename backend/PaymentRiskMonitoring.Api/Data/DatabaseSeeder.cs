using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using PaymentRiskMonitoring.Api.Entities;
using PaymentRiskMonitoring.Api.Enums;

namespace PaymentRiskMonitoring.Api.Data;

public static class DatabaseSeeder
{
    public static async Task InitializeAsync(
        AppDbContext dbContext,
        IPasswordHasher<User> passwordHasher,
        ILogger logger)
    {
        await dbContext.Database.MigrateAsync();
        logger.LogInformation("Database migrations applied successfully.");

        await SeedUsersAsync(dbContext, passwordHasher, logger);
    }

    private static async Task SeedUsersAsync(
        AppDbContext dbContext,
        IPasswordHasher<User> passwordHasher,
        ILogger logger)
    {
        if (await dbContext.Users.AnyAsync())
        {
            logger.LogInformation("User seed skipped because users already exist.");
            return;
        }

        var now = DateTime.UtcNow;

        var users = new List<User>
        {
            CreateUser(
                passwordHasher,
                id: Guid.Parse("11111111-1111-1111-1111-111111111111"),
                firstName: "System",
                lastName: "Admin",
                email: "admin@payscope.local",
                password: "Admin123!",
                role: UserRole.Admin,
                now),
            CreateUser(
                passwordHasher,
                id: Guid.Parse("22222222-2222-2222-2222-222222222222"),
                firstName: "Risk",
                lastName: "Analyst",
                email: "analyst@payscope.local",
                password: "Analyst123!",
                role: UserRole.Analyst,
                now),
            CreateUser(
                passwordHasher,
                id: Guid.Parse("33333333-3333-3333-3333-333333333333"),
                firstName: "Read",
                lastName: "Viewer",
                email: "viewer@payscope.local",
                password: "Viewer123!",
                role: UserRole.Viewer,
                now)
        };

        dbContext.Users.AddRange(users);
        await dbContext.SaveChangesAsync();

        logger.LogInformation("Seeded {UserCount} development users.", users.Count);
    }

    private static User CreateUser(
        IPasswordHasher<User> passwordHasher,
        Guid id,
        string firstName,
        string lastName,
        string email,
        string password,
        UserRole role,
        DateTime timestamp)
    {
        var user = new User
        {
            Id = id,
            FirstName = firstName,
            LastName = lastName,
            Email = email.ToLowerInvariant(),
            Role = role,
            IsActive = true,
            CreatedAt = timestamp,
            UpdatedAt = timestamp
        };

        user.PasswordHash = passwordHasher.HashPassword(user, password);
        return user;
    }
}
