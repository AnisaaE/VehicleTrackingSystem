using System.Data;
using VehicleTrackingSystem.Data;
using VehicleTrackingSystem.Interfaces;

namespace VehicleTrackingSystem.Services;

public sealed class DestinationService : IDestinationService
{
    private readonly VehicleTrackingDbContext _dbContext;
    private readonly IConfiguration _configuration;

    public DestinationService(
        VehicleTrackingDbContext dbContext,
        IConfiguration configuration)
    {
        _dbContext = dbContext;
        _configuration = configuration;
    }

    public async Task<DestinationRecord?> GetRecordByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var isOracle = SpatialCommand.IsOracle(_configuration);
        var connection = await SpatialCommand.OpenConnectionAsync(_dbContext, cancellationToken);
        await using var command = connection.CreateCommand();

        command.CommandText = isOracle
            ? """
              SELECT id, name, SDO_UTIL.TO_GEOJSON(location) AS location_geojson
              FROM destinations
              WHERE id = :id
              """
            : """
              SELECT id, name, ST_AsGeoJSON(location) AS location_geojson
              FROM destinations
              WHERE id = @id
              """;

        command.AddParameter(isOracle ? ":id" : "@id", id, DbType.Int32);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return new DestinationRecord(
            reader.GetInt32(0),
            reader.GetString(1),
            reader.GetString(2));
    }
}
