using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PaymentRiskMonitoring.Api.Entities;

namespace PaymentRiskMonitoring.Api.Data.Configurations;

public class RiskAlertConfiguration : IEntityTypeConfiguration<RiskAlert>
{
    public void Configure(EntityTypeBuilder<RiskAlert> builder)
    {
        builder.ToTable("RiskAlerts");

        builder.HasKey(alert => alert.Id);

        builder.Property(alert => alert.AlertCode)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(alert => alert.RiskLevel)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(alert => alert.Status)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(alert => alert.AnalystNotes)
            .HasMaxLength(1000);

        builder.HasIndex(alert => alert.AlertCode)
            .IsUnique();

        builder.HasIndex(alert => alert.TransactionId)
            .IsUnique();

        builder.HasIndex(alert => alert.Status);
        builder.HasIndex(alert => alert.RiskLevel);
        builder.HasIndex(alert => alert.CreatedAt);
        builder.HasIndex(alert => alert.ReviewedByUserId);

        builder.HasOne(alert => alert.Transaction)
            .WithOne(transaction => transaction.RiskAlert)
            .HasForeignKey<RiskAlert>(alert => alert.TransactionId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(alert => alert.ReviewedByUser)
            .WithMany()
            .HasForeignKey(alert => alert.ReviewedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
