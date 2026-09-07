using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PaymentRiskMonitoring.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTransactionRiskReasons : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RiskReasons",
                table: "Transactions",
                type: "jsonb",
                nullable: false,
                defaultValue: "[]");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RiskReasons",
                table: "Transactions");
        }
    }
}
