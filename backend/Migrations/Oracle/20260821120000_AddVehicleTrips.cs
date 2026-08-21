using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using VehicleTrackingSystem.Data;

#nullable disable

namespace VehicleTrackingSystem.Migrations.Oracle
{
    [DbContext(typeof(OracleVehicleTrackingDbContext))]
    [Migration("20260821120000_AddVehicleTrips")]
    public partial class AddVehicleTrips : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "employees",
                columns: table => new
                {
                    Id = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    FullName = table.Column<string>(type: "NVARCHAR2(150)", maxLength: 150, nullable: false),
                    Phone = table.Column<string>(type: "NVARCHAR2(50)", maxLength: 50, nullable: true),
                    Email = table.Column<string>(type: "NVARCHAR2(200)", maxLength: 200, nullable: true),
                    Role = table.Column<string>(type: "NVARCHAR2(50)", maxLength: 50, nullable: false),
                    IsActive = table.Column<bool>(type: "BOOLEAN", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "TIMESTAMP(7) WITH TIME ZONE", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "TIMESTAMP(7) WITH TIME ZONE", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_employees", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "vehicles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    Plate = table.Column<string>(type: "NVARCHAR2(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "NVARCHAR2(150)", maxLength: 150, nullable: false),
                    ProviderId = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    VehicleTypeId = table.Column<int>(type: "NUMBER(10)", nullable: true),
                    IsActive = table.Column<bool>(type: "BOOLEAN", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "TIMESTAMP(7) WITH TIME ZONE", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "TIMESTAMP(7) WITH TIME ZONE", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vehicles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_vehicles_providers_ProviderId",
                        column: x => x.ProviderId,
                        principalTable: "providers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_vehicles_vehicle_types_VehicleTypeId",
                        column: x => x.VehicleTypeId,
                        principalTable: "vehicle_types",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "vehicle_trips",
                columns: table => new
                {
                    Id = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    VehicleId = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    DriverId = table.Column<int>(type: "NUMBER(10)", nullable: true),
                    AssignedByEmployeeId = table.Column<int>(type: "NUMBER(10)", nullable: true),
                    OriginFacilityId = table.Column<int>(type: "NUMBER(10)", nullable: true),
                    DestinationId = table.Column<int>(type: "NUMBER(10)", nullable: true),
                    DestinationLatitude = table.Column<double>(type: "BINARY_DOUBLE", nullable: false),
                    DestinationLongitude = table.Column<double>(type: "BINARY_DOUBLE", nullable: false),
                    Status = table.Column<string>(type: "NVARCHAR2(50)", maxLength: 50, nullable: false),
                    AssignedAt = table.Column<DateTimeOffset>(type: "TIMESTAMP(7) WITH TIME ZONE", nullable: false),
                    StartedAt = table.Column<DateTimeOffset>(type: "TIMESTAMP(7) WITH TIME ZONE", nullable: true),
                    CompletedAt = table.Column<DateTimeOffset>(type: "TIMESTAMP(7) WITH TIME ZONE", nullable: true),
                    CancelledAt = table.Column<DateTimeOffset>(type: "TIMESTAMP(7) WITH TIME ZONE", nullable: true),
                    EstimatedDistanceMeters = table.Column<double>(type: "BINARY_DOUBLE", nullable: true),
                    EstimatedDurationSeconds = table.Column<double>(type: "BINARY_DOUBLE", nullable: true),
                    ActualDistanceMeters = table.Column<double>(type: "BINARY_DOUBLE", nullable: true),
                    ActualDurationSeconds = table.Column<double>(type: "BINARY_DOUBLE", nullable: true),
                    RouteGeometry = table.Column<string>(type: "NCLOB", nullable: true),
                    Notes = table.Column<string>(type: "NVARCHAR2(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vehicle_trips", x => x.Id);
                    table.ForeignKey(
                        name: "FK_vehicle_trips_employees_AssignedByEmployeeId",
                        column: x => x.AssignedByEmployeeId,
                        principalTable: "employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_vehicle_trips_employees_DriverId",
                        column: x => x.DriverId,
                        principalTable: "employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_vehicle_trips_vehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "vehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "vehicle_provider_seen",
                columns: table => new
                {
                    Id = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    VehicleId = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    ProviderId = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    LastSeenAt = table.Column<DateTimeOffset>(type: "TIMESTAMP(7) WITH TIME ZONE", nullable: false),
                    LastProviderTimestamp = table.Column<DateTimeOffset>(type: "TIMESTAMP(7) WITH TIME ZONE", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vehicle_provider_seen", x => x.Id);
                    table.ForeignKey(
                        name: "FK_vehicle_provider_seen_providers_ProviderId",
                        column: x => x.ProviderId,
                        principalTable: "providers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_vehicle_provider_seen_vehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "vehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_vehicles_ProviderId_Plate",
                table: "vehicles",
                columns: new[] { "ProviderId", "Plate" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_vehicles_VehicleTypeId",
                table: "vehicles",
                column: "VehicleTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_vehicle_trips_AssignedByEmployeeId",
                table: "vehicle_trips",
                column: "AssignedByEmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_vehicle_trips_DriverId",
                table: "vehicle_trips",
                column: "DriverId");

            migrationBuilder.CreateIndex(
                name: "IX_vehicle_trips_VehicleId_Status",
                table: "vehicle_trips",
                columns: new[] { "VehicleId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_vehicle_provider_seen_ProviderId",
                table: "vehicle_provider_seen",
                column: "ProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_vehicle_provider_seen_VehicleId_ProviderId",
                table: "vehicle_provider_seen",
                columns: new[] { "VehicleId", "ProviderId" },
                unique: true);

            migrationBuilder.Sql("""
                ALTER TABLE vehicle_trips
                ADD CONSTRAINT fk_vehicle_trips_facilities
                FOREIGN KEY ("OriginFacilityId") REFERENCES facilities(id)
                """);

            migrationBuilder.Sql("""
                ALTER TABLE vehicle_trips
                ADD CONSTRAINT fk_vehicle_trips_destinations
                FOREIGN KEY ("DestinationId") REFERENCES destinations(id) ON DELETE SET NULL
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "vehicle_provider_seen");
            migrationBuilder.DropTable(name: "vehicle_trips");
            migrationBuilder.DropTable(name: "vehicles");
            migrationBuilder.DropTable(name: "employees");
        }
    }
}
