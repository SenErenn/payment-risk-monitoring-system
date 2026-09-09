using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PaymentRiskMonitoring.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRiskAlertReviewFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AnalystNotes",
                table: "RiskAlerts",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReviewedAt",
                table: "RiskAlerts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ReviewedByUserId",
                table: "RiskAlerts",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_RiskAlerts_ReviewedByUserId",
                table: "RiskAlerts",
                column: "ReviewedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_RiskAlerts_Users_ReviewedByUserId",
                table: "RiskAlerts",
                column: "ReviewedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RiskAlerts_Users_ReviewedByUserId",
                table: "RiskAlerts");

            migrationBuilder.DropIndex(
                name: "IX_RiskAlerts_ReviewedByUserId",
                table: "RiskAlerts");

            migrationBuilder.DropColumn(
                name: "AnalystNotes",
                table: "RiskAlerts");

            migrationBuilder.DropColumn(
                name: "ReviewedAt",
                table: "RiskAlerts");

            migrationBuilder.DropColumn(
                name: "ReviewedByUserId",
                table: "RiskAlerts");
        }
    }
}
