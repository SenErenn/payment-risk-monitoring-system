using Microsoft.EntityFrameworkCore;
using PaymentRiskMonitoring.Api.Data;

namespace PaymentRiskMonitoring.Api.Tests;

public static class TestDbContextFactory
{
    public static AppDbContext Create(string? name = null)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(name ?? $"tests-{Guid.NewGuid():N}")
            .Options;

        return new AppDbContext(options);
    }
}
