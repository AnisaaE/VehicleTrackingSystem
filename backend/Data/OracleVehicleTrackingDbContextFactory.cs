using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace VehicleTrackingSystem.Data;

public sealed class OracleVehicleTrackingDbContextFactory
    : IDesignTimeDbContextFactory<OracleVehicleTrackingDbContext>
{
    public OracleVehicleTrackingDbContext CreateDbContext(string[] args)
    {
        var configuration = BuildConfiguration();
        var connectionString = configuration.GetConnectionString("OracleConnection")
            ?? configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Oracle connection string is missing.");

        var optionsBuilder = new DbContextOptionsBuilder<OracleVehicleTrackingDbContext>();
        optionsBuilder.UseOracle(connectionString);

        return new OracleVehicleTrackingDbContext(optionsBuilder.Options);
    }

    private static IConfiguration BuildConfiguration()
    {
        var currentDirectory = Directory.GetCurrentDirectory();
        var basePath = File.Exists(Path.Combine(currentDirectory, "appsettings.json"))
            ? currentDirectory
            : Path.Combine(currentDirectory, "backend");

        return new ConfigurationBuilder()
            .SetBasePath(basePath)
            .AddJsonFile("appsettings.json", optional: false)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddJsonFile("appsettings.Local.json", optional: true)
            .Build();
    }
}
