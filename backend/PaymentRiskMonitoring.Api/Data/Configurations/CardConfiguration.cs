using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PaymentRiskMonitoring.Api.Entities;

namespace PaymentRiskMonitoring.Api.Data.Configurations;

public class CardConfiguration : IEntityTypeConfiguration<Card>
{
    public void Configure(EntityTypeBuilder<Card> builder)
    {
        builder.ToTable("Cards");

        builder.HasKey(card => card.Id);

        builder.Property(card => card.CardToken)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(card => card.MaskedCardNumber)
            .HasMaxLength(32)
            .IsRequired();

        builder.Property(card => card.CardType)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(card => card.Status)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(card => card.CreditLimit)
            .HasPrecision(18, 2);

        builder.Property(card => card.AvailableLimit)
            .HasPrecision(18, 2);

        builder.HasIndex(card => card.CardToken)
            .IsUnique();

        builder.HasMany(card => card.Transactions)
            .WithOne(transaction => transaction.Card)
            .HasForeignKey(transaction => transaction.CardId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
