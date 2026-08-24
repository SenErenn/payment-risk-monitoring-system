using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PaymentRiskMonitoring.Api.Entities;

namespace PaymentRiskMonitoring.Api.Data.Configurations;

public class MerchantConfiguration : IEntityTypeConfiguration<Merchant>
{
    public void Configure(EntityTypeBuilder<Merchant> builder)
    {
        builder.ToTable("Merchants");

        builder.HasKey(merchant => merchant.Id);

        builder.Property(merchant => merchant.MerchantCode)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(merchant => merchant.Name)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(merchant => merchant.Category)
            .HasMaxLength(100)
            .IsRequired();

        builder.HasIndex(merchant => merchant.MerchantCode)
            .IsUnique();

        builder.HasMany(merchant => merchant.Transactions)
            .WithOne(transaction => transaction.Merchant)
            .HasForeignKey(transaction => transaction.MerchantId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
