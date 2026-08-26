using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using VehicleTrackingSystem.Data;

#nullable disable

namespace VehicleTrackingSystem.Migrations.Oracle
{
    [DbContext(typeof(OracleVehicleTrackingDbContext))]
    [Migration("20260826120000_AddTripCompletionAudit")]
    public partial class AddTripCompletionAudit : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CompletedByEmployeeId",
                table: "vehicle_trips",
                type: "NUMBER(10)",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "CompletionLatitude",
                table: "vehicle_trips",
                type: "BINARY_DOUBLE",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "CompletionLongitude",
                table: "vehicle_trips",
                type: "BINARY_DOUBLE",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_vehicle_trips_CompletedByEmployeeId",
                table: "vehicle_trips",
                column: "CompletedByEmployeeId");

            migrationBuilder.AddForeignKey(
                name: "FK_vehicle_trips_employees_CompletedByEmployeeId",
                table: "vehicle_trips",
                column: "CompletedByEmployeeId",
                principalTable: "employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_vehicle_trips_employees_CompletedByEmployeeId",
                table: "vehicle_trips");

            migrationBuilder.DropIndex(
                name: "IX_vehicle_trips_CompletedByEmployeeId",
                table: "vehicle_trips");

            migrationBuilder.DropColumn(
                name: "CompletedByEmployeeId",
                table: "vehicle_trips");

            migrationBuilder.DropColumn(
                name: "CompletionLatitude",
                table: "vehicle_trips");

            migrationBuilder.DropColumn(
                name: "CompletionLongitude",
                table: "vehicle_trips");
        }
    }
}
