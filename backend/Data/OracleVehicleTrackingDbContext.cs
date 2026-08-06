using Microsoft.EntityFrameworkCore;

namespace VehicleTrackingSystem.Data;

public sealed class OracleVehicleTrackingDbContext : VehicleTrackingDbContext
{
    public OracleVehicleTrackingDbContext(DbContextOptions<OracleVehicleTrackingDbContext> options)
        : base(options)
    {
    }
}
