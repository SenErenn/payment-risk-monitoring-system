using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PaymentRiskMonitoring.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTransactionProcessingRules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DecisionReason",
                table: "Transactions",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DeclineReason",
                table: "Transactions",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IdempotencyKey",
                table: "Transactions",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE "Transactions"
                SET "DecisionReason" = CASE
                    WHEN "Status" = 'Declined' THEN 'Declined.'
                    WHEN "Status" = 'Approved' THEN 'Approved.'
                    ELSE 'Processed.'
                END
                WHERE "DecisionReason" = '';

                UPDATE "Transactions"
                SET "DeclineReason" = "DecisionReason"
                WHERE "Status" = 'Declined' AND "DeclineReason" IS NULL;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_CardId_MerchantId_Amount_Currency_PaymentType_~",
                table: "Transactions",
                columns: new[] { "CardId", "MerchantId", "Amount", "Currency", "PaymentType", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_IdempotencyKey",
                table: "Transactions",
                column: "IdempotencyKey",
                unique: true,
                filter: "\"IdempotencyKey\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Transactions_CardId_MerchantId_Amount_Currency_PaymentType_~",
                table: "Transactions");

            migrationBuilder.DropIndex(
                name: "IX_Transactions_IdempotencyKey",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "DecisionReason",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "DeclineReason",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "IdempotencyKey",
                table: "Transactions");
        }
    }
}
