using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using VehicleTrackingSystem.Data;

#nullable disable

namespace VehicleTrackingSystem.Migrations.PostgreSql
{
    [DbContext(typeof(PostgreSqlVehicleTrackingDbContext))]
    [Migration("20260901100000_AddTripActualRouteGeometry")]
    public partial class AddTripActualRouteGeometry : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ActualRouteGeometry",
                table: "vehicle_trips",
                type: "text",
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
