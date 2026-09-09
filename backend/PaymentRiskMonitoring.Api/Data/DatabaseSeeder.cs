using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using PaymentRiskMonitoring.Api.Entities;
using PaymentRiskMonitoring.Api.Enums;
using PaymentRiskMonitoring.Api.Services;

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
        await SeedTransactionsAsync(dbContext, logger);
        await SeedRiskRulesAsync(dbContext, logger);
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

    private static async Task SeedTransactionsAsync(AppDbContext dbContext, ILogger logger)
    {
        if (await dbContext.Transactions.AnyAsync())
        {
            logger.LogInformation("Transaction seed skipped because transactions already exist.");
            return;
        }

        var merchantExists = await dbContext.Merchants.AnyAsync(merchant =>
            merchant.Id == Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"));
        var cardExists = await dbContext.Cards.AnyAsync(card =>
            card.Id == Guid.Parse("e1111111-1111-1111-1111-111111111111"));

        if (!merchantExists || !cardExists)
        {
            logger.LogInformation("Transaction seed skipped because required merchant/card seeds are missing.");
            return;
        }

        var now = DateTime.UtcNow;

        var transactions = new List<Transaction>
        {
            new()
            {
                Id = Guid.Parse("f1111111-1111-1111-1111-111111111111"),
                TransactionCode = "TXN_SEED_APPROVED_0001",
                MerchantId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                CardId = Guid.Parse("e1111111-1111-1111-1111-111111111111"),
                Amount = 185.75m,
                Currency = "TRY",
                Status = TransactionStatus.Approved,
                PaymentType = PaymentType.Contactless,
                RiskScore = 15,
                RiskLevel = RiskLevel.Low,
                DecisionReason = "Approved.",
                DeclineReason = null,
                CreatedAt = now.AddMinutes(-30)
            },
            new()
            {
                Id = Guid.Parse("f2222222-2222-2222-2222-222222222222"),
                TransactionCode = "TXN_SEED_DECLINED_0002",
                MerchantId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                CardId = Guid.Parse("e4444444-4444-4444-4444-444444444444"),
                Amount = 500m,
                Currency = "TRY",
                Status = TransactionStatus.Declined,
                PaymentType = PaymentType.Online,
                RiskScore = 80,
                RiskLevel = RiskLevel.High,
                DecisionReason = "Declined: card status is Blocked.",
                DeclineReason = "Declined: card status is Blocked.",
                CreatedAt = now.AddMinutes(-10)
            }
        };

        dbContext.Transactions.AddRange(transactions);
        await dbContext.SaveChangesAsync();

        logger.LogInformation("Seeded {TransactionCount} development transactions.", transactions.Count);
    }

    private static async Task SeedRiskRulesAsync(AppDbContext dbContext, ILogger logger)
    {
        var now = DateTime.UtcNow;
        var defaults = new List<RiskRule>
        {
            CreateRiskRule(
                id: Guid.Parse("a1111111-1111-1111-1111-111111111111"),
                code: RiskAnalysisService.HighAmountCode,
                name: "High amount",
                description: "Flags payments at or above the configured amount threshold.",
                threshold: RiskAnalysisService.DefaultHighAmountThreshold,
                unit: RiskRuleThresholdUnit.Amount,
                points: RiskAnalysisService.DefaultHighAmountPoints,
                sortOrder: 1,
                now),
            CreateRiskRule(
                id: Guid.Parse("a2222222-2222-2222-2222-222222222222"),
                code: RiskAnalysisService.HighLimitUsageCode,
                name: "High limit usage",
                description: "Flags payments that push projected credit usage to the ratio threshold.",
                threshold: RiskAnalysisService.DefaultHighUsageRatioThreshold,
                unit: RiskRuleThresholdUnit.Ratio,
                points: RiskAnalysisService.DefaultHighLimitUsagePoints,
                sortOrder: 2,
                now),
            CreateRiskRule(
                id: Guid.Parse("a3333333-3333-3333-3333-333333333333"),
                code: RiskAnalysisService.VelocityCode,
                name: "Velocity",
                description: "Flags cards with too many transactions in a short time window.",
                threshold: RiskAnalysisService.DefaultVelocityPriorCountThreshold,
                unit: RiskRuleThresholdUnit.Count,
                points: RiskAnalysisService.DefaultVelocityPoints,
                sortOrder: 3,
                now),
            CreateRiskRule(
                id: Guid.Parse("a4444444-4444-4444-4444-444444444444"),
                code: RiskAnalysisService.MultipleDeclinesCode,
                name: "Multiple declines",
                description: "Flags cards with repeated declines in the lookback window.",
                threshold: RiskAnalysisService.DefaultMultipleDeclinesThreshold,
                unit: RiskRuleThresholdUnit.Count,
                points: RiskAnalysisService.DefaultMultipleDeclinesPoints,
                sortOrder: 4,
                now),
            CreateRiskRule(
                id: Guid.Parse("a5555555-5555-5555-5555-555555555555"),
                code: RiskAnalysisService.NightHighAmountCode,
                name: "Night high amount",
                description: "Flags high-amount payments during night hours (UTC 22:00–05:59).",
                threshold: RiskAnalysisService.DefaultNightHighAmountThreshold,
                unit: RiskRuleThresholdUnit.Amount,
                points: RiskAnalysisService.DefaultNightHighAmountPoints,
                sortOrder: 5,
                now),
            CreateRiskRule(
                id: Guid.Parse("a6666666-6666-6666-6666-666666666666"),
                code: RiskAnalysisService.SuddenAmountIncreaseCode,
                name: "Sudden amount increase",
                description: "Flags amounts that jump above the recent approved average by the multiplier.",
                threshold: RiskAnalysisService.DefaultSuddenIncreaseMultiplier,
                unit: RiskRuleThresholdUnit.Multiplier,
                points: RiskAnalysisService.DefaultSuddenAmountIncreasePoints,
                sortOrder: 6,
                now)
        };

        var existingCodes = await dbContext.RiskRules
            .Select(rule => rule.Code)
            .ToListAsync();

        var missing = defaults
            .Where(rule => !existingCodes.Contains(rule.Code, StringComparer.OrdinalIgnoreCase))
            .ToList();

        if (missing.Count == 0)
        {
            logger.LogInformation("Risk rule seed skipped because all default rules already exist.");
            return;
        }

        dbContext.RiskRules.AddRange(missing);
        await dbContext.SaveChangesAsync();

        logger.LogInformation("Seeded {RuleCount} risk rules.", missing.Count);
    }

    private static RiskRule CreateRiskRule(
        Guid id,
        string code,
        string name,
        string description,
        decimal threshold,
        RiskRuleThresholdUnit unit,
        int points,
        int sortOrder,
        DateTime timestamp)
    {
        return new RiskRule
        {
            Id = id,
            Code = code,
            Name = name,
            Description = description,
            Threshold = threshold,
            ThresholdUnit = unit,
            Points = points,
            IsEnabled = true,
            SortOrder = sortOrder,
            CreatedAt = timestamp,
            UpdatedAt = timestamp
        };
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
