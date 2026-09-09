using Microsoft.EntityFrameworkCore;
using PaymentRiskMonitoring.Api.Entities;

namespace PaymentRiskMonitoring.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();

    public DbSet<Merchant> Merchants => Set<Merchant>();

    public DbSet<Card> Cards => Set<Card>();

    public DbSet<Transaction> Transactions => Set<Transaction>();

    public DbSet<Refund> Refunds => Set<Refund>();

    public DbSet<RiskAlert> RiskAlerts => Set<RiskAlert>();

    public DbSet<RiskRule> RiskRules => Set<RiskRule>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
