using System.Data;
using VehicleTrackingSystem.Data;
using VehicleTrackingSystem.DTOs.Destinations;
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

    public async Task<IReadOnlyList<DestinationDto>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        var records = await QueryRecordsAsync(null, cancellationToken);
        return records.Select(ToDto).ToList();
    }

    public async Task<DestinationDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var record = await GetRecordByIdAsync(id, cancellationToken);
        return record is null ? null : ToDto(record);
    }

    public async Task<DestinationRecord?> GetRecordByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var records = await QueryRecordsAsync(id, cancellationToken);
        return records.FirstOrDefault();
    }

    public async Task<DestinationDto> CreateAsync(
        CreateDestinationRequest request,
        CancellationToken cancellationToken = default)
    {
        GeometryJson.ParsePoint(request.Location);

        var isOracle = SpatialCommand.IsOracle(_configuration);
        var connection = await SpatialCommand.OpenConnectionAsync(_dbContext, cancellationToken);
        await using var command = connection.CreateCommand();

        int id;

        if (isOracle)
        {
            command.CommandText = """
                INSERT INTO destinations (name, location)
                VALUES (:name, SDO_UTIL.FROM_GEOJSON(:location))
                RETURNING id INTO :id_out
                """;

            command.AddParameter(":name", request.Name.Trim(), DbType.String);
            command.AddParameter(":location", request.Location, DbType.String);

            var idParameter = command.AddParameter(":id_out", null, DbType.Int32);
            idParameter.Direction = ParameterDirection.Output;

            await command.ExecuteNonQueryAsync(cancellationToken);
            id = Convert.ToInt32(idParameter.Value);
        }
        else
        {
            command.CommandText = """
                INSERT INTO destinations (name, location)
                VALUES (@name, ST_SetSRID(ST_GeomFromGeoJSON(@location), 4326))
                RETURNING id
                """;

            command.AddParameter("@name", request.Name.Trim(), DbType.String);
            command.AddParameter("@location", request.Location, DbType.String);

            id = Convert.ToInt32(await command.ExecuteScalarAsync(cancellationToken));
        }

        var created = await GetByIdAsync(id, cancellationToken);
        return created ?? throw new InvalidOperationException("Destination could not be loaded after create.");
    }

    public async Task<DestinationDto?> UpdateAsync(
        int id,
        UpdateDestinationRequest request,
        CancellationToken cancellationToken = default)
    {
        GeometryJson.ParsePoint(request.Location);

        var existing = await GetRecordByIdAsync(id, cancellationToken);

        if (existing is null)
        {
            return null;
        }

        var isOracle = SpatialCommand.IsOracle(_configuration);
        var connection = await SpatialCommand.OpenConnectionAsync(_dbContext, cancellationToken);
        await using var command = connection.CreateCommand();

        command.CommandText = isOracle
            ? """
              UPDATE destinations
              SET name = :name,
                  location = SDO_UTIL.FROM_GEOJSON(:location)
              WHERE id = :id
              """
            : """
              UPDATE destinations
              SET name = @name,
                  location = ST_SetSRID(ST_GeomFromGeoJSON(@location), 4326)
              WHERE id = @id
              """;

        command.AddParameter(Parameter("name", isOracle), request.Name.Trim(), DbType.String);
        command.AddParameter(Parameter("location", isOracle), request.Location, DbType.String);
        command.AddParameter(Parameter("id", isOracle), id, DbType.Int32);

        await command.ExecuteNonQueryAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<bool> DeleteAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var isOracle = SpatialCommand.IsOracle(_configuration);
        var connection = await SpatialCommand.OpenConnectionAsync(_dbContext, cancellationToken);
        await using var command = connection.CreateCommand();

        command.CommandText = isOracle
            ? "DELETE FROM destinations WHERE id = :id"
            : "DELETE FROM destinations WHERE id = @id";

        command.AddParameter(Parameter("id", isOracle), id, DbType.Int32);

        return await command.ExecuteNonQueryAsync(cancellationToken) > 0;
    }

    private async Task<IReadOnlyList<DestinationRecord>> QueryRecordsAsync(
        int? id,
        CancellationToken cancellationToken)
    {
        var isOracle = SpatialCommand.IsOracle(_configuration);
        var connection = await SpatialCommand.OpenConnectionAsync(_dbContext, cancellationToken);
        await using var command = connection.CreateCommand();

        var whereSql = string.Empty;

        if (id.HasValue)
        {
            whereSql = isOracle ? "WHERE id = :id" : "WHERE id = @id";
            command.AddParameter(Parameter("id", isOracle), id.Value, DbType.Int32);
        }

        command.CommandText = isOracle
            ? """
              SELECT id, name, SDO_UTIL.TO_GEOJSON(location) AS location_geojson
              FROM destinations
              {0}
              ORDER BY name
              """
            : """
              SELECT id, name, ST_AsGeoJSON(location) AS location_geojson
              FROM destinations
              {0}
              ORDER BY name
              """;
        command.CommandText = string.Format(command.CommandText, whereSql);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var records = new List<DestinationRecord>();

        while (await reader.ReadAsync(cancellationToken))
        {
            records.Add(new DestinationRecord(
                reader.GetInt32(0),
                reader.GetString(1),
                reader.GetString(2)));
        }

        return records;
    }

    private static string Parameter(string name, bool isOracle) =>
        isOracle ? $":{name}" : $"@{name}";

    private static DestinationDto ToDto(DestinationRecord record) =>
        new(record.Id, record.Name, record.Location);
}
