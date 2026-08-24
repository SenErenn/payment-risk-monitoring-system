using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PaymentRiskMonitoring.Api.Entities;

namespace PaymentRiskMonitoring.Api.Data.Configurations;

public class TransactionConfiguration : IEntityTypeConfiguration<Transaction>
{
    public void Configure(EntityTypeBuilder<Transaction> builder)
    {
        builder.ToTable("Transactions");

        builder.HasKey(transaction => transaction.Id);

        builder.Property(transaction => transaction.TransactionCode)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(transaction => transaction.Amount)
            .HasPrecision(18, 2);

        builder.Property(transaction => transaction.Currency)
            .HasMaxLength(3)
            .IsRequired();

        builder.Property(transaction => transaction.Status)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(transaction => transaction.PaymentType)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(transaction => transaction.RiskLevel)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.HasIndex(transaction => transaction.TransactionCode)
            .IsUnique();

        builder.HasIndex(transaction => transaction.CreatedAt);
        builder.HasIndex(transaction => transaction.MerchantId);
        builder.HasIndex(transaction => transaction.CardId);
        builder.HasIndex(transaction => transaction.Status);
        builder.HasIndex(transaction => transaction.RiskLevel);
    }
}
