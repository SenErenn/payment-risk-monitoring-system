using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PaymentRiskMonitoring.Api.Entities;

namespace PaymentRiskMonitoring.Api.Data.Configurations;

public class RiskRuleConfiguration : IEntityTypeConfiguration<RiskRule>
{
    public void Configure(EntityTypeBuilder<RiskRule> builder)
    {
        builder.ToTable("RiskRules");

        builder.HasKey(rule => rule.Id);

        builder.Property(rule => rule.Code)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(rule => rule.Name)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(rule => rule.Description)
            .HasMaxLength(500)
            .IsRequired();

        builder.Property(rule => rule.Threshold)
            .HasPrecision(18, 4)
            .IsRequired();

        builder.Property(rule => rule.ThresholdUnit)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(rule => rule.Points)
            .IsRequired();

        builder.HasIndex(rule => rule.Code)
            .IsUnique();

        builder.HasIndex(rule => rule.SortOrder);
    }
}
