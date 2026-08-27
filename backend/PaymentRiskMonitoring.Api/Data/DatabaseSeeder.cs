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
        await SeedMerchantsAsync(dbContext, logger);
        await SeedCardsAsync(dbContext, logger);
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

    private static async Task SeedMerchantsAsync(AppDbContext dbContext, ILogger logger)
    {
        if (await dbContext.Merchants.AnyAsync())
        {
            logger.LogInformation("Merchant seed skipped because merchants already exist.");
            return;
        }

        var now = DateTime.UtcNow;

        var merchants = new List<Merchant>
        {
            new()
            {
                Id = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                MerchantCode = "MCH-MARKET-01",
                Name = "PayScope Market Istanbul",
                Category = "Grocery",
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now
            },
            new()
            {
                Id = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
                MerchantCode = "MCH-CAFE-01",
                Name = "Bosphorus Cafe",
                Category = "Restaurant",
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now
            },
            new()
            {
                Id = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc"),
                MerchantCode = "MCH-TECH-01",
                Name = "Anatolia Electronics",
                Category = "Electronics",
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now
            },
            new()
            {
                Id = Guid.Parse("dddddddd-dddd-dddd-dddd-dddddddddddd"),
                MerchantCode = "MCH-TRAVEL-01",
                Name = "Aegean Travel Desk",
                Category = "Travel",
                IsActive = false,
                CreatedAt = now,
                UpdatedAt = now
            }
        };

        dbContext.Merchants.AddRange(merchants);
        await dbContext.SaveChangesAsync();

        logger.LogInformation("Seeded {MerchantCount} development merchants.", merchants.Count);
    }

    private static async Task SeedCardsAsync(AppDbContext dbContext, ILogger logger)
    {
        if (await dbContext.Cards.AnyAsync())
        {
            logger.LogInformation("Card seed skipped because cards already exist.");
            return;
        }

        var now = DateTime.UtcNow;

        var cards = new List<Card>
        {
            new()
            {
                Id = Guid.Parse("e1111111-1111-1111-1111-111111111111"),
                CardToken = "tok_demo_visa_active_01",
                MaskedCardNumber = "**** **** **** 4242",
                CardType = CardType.Credit,
                Status = CardStatus.Active,
                CreditLimit = 25000m,
                AvailableLimit = 18750.50m,
                CreatedAt = now,
                UpdatedAt = now
            },
            new()
            {
                Id = Guid.Parse("e2222222-2222-2222-2222-222222222222"),
                CardToken = "tok_demo_mastercard_active_02",
                MaskedCardNumber = "**** **** **** 5510",
                CardType = CardType.Credit,
                Status = CardStatus.Active,
                CreditLimit = 10000m,
                AvailableLimit = 10000m,
                CreatedAt = now,
                UpdatedAt = now
            },
            new()
            {
                Id = Guid.Parse("e3333333-3333-3333-3333-333333333333"),
                CardToken = "tok_demo_debit_passive_03",
                MaskedCardNumber = "**** **** **** 1001",
                CardType = CardType.Debit,
                Status = CardStatus.Passive,
                CreditLimit = 5000m,
                AvailableLimit = 3200m,
                CreatedAt = now,
                UpdatedAt = now
            },
            new()
            {
                Id = Guid.Parse("e4444444-4444-4444-4444-444444444444"),
                CardToken = "tok_demo_credit_blocked_04",
                MaskedCardNumber = "**** **** **** 8888",
                CardType = CardType.Credit,
                Status = CardStatus.Blocked,
                CreditLimit = 15000m,
                AvailableLimit = 0m,
                CreatedAt = now,
                UpdatedAt = now
            }
        };

        dbContext.Cards.AddRange(cards);
        await dbContext.SaveChangesAsync();

        logger.LogInformation("Seeded {CardCount} development cards.", cards.Count);
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
