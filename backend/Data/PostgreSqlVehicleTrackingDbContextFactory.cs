using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace VehicleTrackingSystem.Data;

public sealed class PostgreSqlVehicleTrackingDbContextFactory
    : IDesignTimeDbContextFactory<PostgreSqlVehicleTrackingDbContext>
{
    public PostgreSqlVehicleTrackingDbContext CreateDbContext(string[] args)
    {
        var configuration = BuildConfiguration();
        var connectionString = configuration.GetConnectionString("PostgreSqlConnection")
            ?? configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("PostgreSQL connection string is missing.");

        var optionsBuilder = new DbContextOptionsBuilder<PostgreSqlVehicleTrackingDbContext>();
        optionsBuilder.UseNpgsql(connectionString);

        return new PostgreSqlVehicleTrackingDbContext(optionsBuilder.Options);
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
