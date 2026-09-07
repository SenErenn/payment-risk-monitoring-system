using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PaymentRiskMonitoring.Api.Entities;
using PaymentRiskMonitoring.Api.Models.Risk;

namespace PaymentRiskMonitoring.Api.Data.Configurations;

public class TransactionConfiguration : IEntityTypeConfiguration<Transaction>
{
    private static readonly JsonSerializerOptions RiskReasonsJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

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

        builder.Property(transaction => transaction.RiskReasons)
            .HasColumnType("jsonb")
            .HasConversion(
                reasons => JsonSerializer.Serialize(reasons, RiskReasonsJsonOptions),
                json => DeserializeRiskReasons(json))
            .Metadata.SetValueComparer(CreateRiskReasonsComparer());

        builder.Property(transaction => transaction.DecisionReason)
            .HasMaxLength(500)
            .IsRequired();

        builder.Property(transaction => transaction.DeclineReason)
            .HasMaxLength(500);

        builder.Property(transaction => transaction.IdempotencyKey)
            .HasMaxLength(100);

        builder.HasIndex(transaction => transaction.TransactionCode)
            .IsUnique();

        builder.HasIndex(transaction => transaction.IdempotencyKey)
            .IsUnique()
            .HasFilter("\"IdempotencyKey\" IS NOT NULL");

        builder.HasIndex(transaction => transaction.CreatedAt);
        builder.HasIndex(transaction => transaction.MerchantId);
        builder.HasIndex(transaction => transaction.CardId);
        builder.HasIndex(transaction => transaction.Status);
        builder.HasIndex(transaction => transaction.RiskLevel);
        builder.HasIndex(transaction => new
        {
            transaction.CardId,
            transaction.MerchantId,
            transaction.Amount,
            transaction.Currency,
            transaction.PaymentType,
            transaction.CreatedAt
        });
    }

    private static List<RiskReason> DeserializeRiskReasons(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return new List<RiskReason>();
        }

        return JsonSerializer.Deserialize<List<RiskReason>>(json, RiskReasonsJsonOptions)
            ?? new List<RiskReason>();
    }

    private static ValueComparer<List<RiskReason>> CreateRiskReasonsComparer()
    {
        return new ValueComparer<List<RiskReason>>(
            (left, right) =>
                JsonSerializer.Serialize(left, RiskReasonsJsonOptions)
                == JsonSerializer.Serialize(right, RiskReasonsJsonOptions),
            value => JsonSerializer.Serialize(value, RiskReasonsJsonOptions).GetHashCode(),
            value => DeserializeRiskReasons(
                JsonSerializer.Serialize(value, RiskReasonsJsonOptions)));
    }
}
