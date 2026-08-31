using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using VehicleTrackingSystem.Data;

#nullable disable

namespace VehicleTrackingSystem.Migrations.Oracle
{
    [DbContext(typeof(OracleVehicleTrackingDbContext))]
    [Migration("20260901100000_AddTripActualRouteGeometry")]
    public partial class AddTripActualRouteGeometry : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ActualRouteGeometry",
                table: "vehicle_trips",
                type: "NCLOB",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ActualRouteGeometry",
                table: "vehicle_trips");
        }
    }
}
