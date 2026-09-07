using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PaymentRiskMonitoring.Api.Entities;

namespace PaymentRiskMonitoring.Api.Data.Configurations;

public class RefundConfiguration : IEntityTypeConfiguration<Refund>
{
    public void Configure(EntityTypeBuilder<Refund> builder)
    {
        builder.ToTable("Refunds");

        builder.HasKey(refund => refund.Id);

        builder.Property(refund => refund.RefundCode)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(refund => refund.Amount)
            .HasPrecision(18, 2);

        builder.Property(refund => refund.Currency)
            .HasMaxLength(3)
            .IsRequired();

        builder.Property(refund => refund.Reason)
            .HasMaxLength(500);

        builder.HasIndex(refund => refund.RefundCode)
            .IsUnique();

        builder.HasIndex(refund => refund.TransactionId);

        builder.HasIndex(refund => refund.CreatedAt);

        builder.HasOne(refund => refund.Transaction)
            .WithMany(transaction => transaction.Refunds)
            .HasForeignKey(refund => refund.TransactionId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
