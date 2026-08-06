using Microsoft.EntityFrameworkCore;

namespace VehicleTrackingSystem.Data;

public sealed class PostgreSqlVehicleTrackingDbContext : VehicleTrackingDbContext
{
    public PostgreSqlVehicleTrackingDbContext(DbContextOptions<PostgreSqlVehicleTrackingDbContext> options)
        : base(options)
    {
    }
}
