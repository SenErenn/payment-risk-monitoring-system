using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PaymentRiskMonitoring.Api.Entities;

namespace PaymentRiskMonitoring.Api.Data.Configurations;

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("AuditLogs");

        builder.HasKey(log => log.Id);

        builder.Property(log => log.UserEmail)
            .HasMaxLength(256);

        builder.Property(log => log.UserName)
            .HasMaxLength(200);

        builder.Property(log => log.Action)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(log => log.EntityType)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(log => log.EntityId)
            .HasMaxLength(100);

        builder.Property(log => log.Summary)
            .HasMaxLength(500)
            .IsRequired();

        builder.Property(log => log.Details)
            .HasMaxLength(4000);

        builder.Property(log => log.IpAddress)
            .HasMaxLength(64);

        builder.HasIndex(log => log.CreatedAt);
        builder.HasIndex(log => log.Action);
        builder.HasIndex(log => log.UserId);

        builder.HasOne(log => log.User)
            .WithMany()
            .HasForeignKey(log => log.UserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
