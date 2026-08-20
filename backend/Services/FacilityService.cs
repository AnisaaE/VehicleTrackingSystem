using System.Data;
using Microsoft.EntityFrameworkCore;
using VehicleTrackingSystem.Data;
using VehicleTrackingSystem.DTOs.Facilities;
using VehicleTrackingSystem.Interfaces;

namespace VehicleTrackingSystem.Services;

public sealed class FacilityService : IFacilityService
{
    private readonly VehicleTrackingDbContext _dbContext;
    private readonly IConfiguration _configuration;

    public FacilityService(
        VehicleTrackingDbContext dbContext,
        IConfiguration configuration)
    {
        _dbContext = dbContext;
        _configuration = configuration;
    }

    public async Task<IReadOnlyList<FacilityDto>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        var records = await QueryRecordsAsync(null, false, cancellationToken);
        return records.Select(ToDto).ToList();
    }

    public async Task<FacilityDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var record = await GetRecordByIdAsync(id, cancellationToken);
        return record is null ? null : ToDto(record);
    }

    public async Task<FacilityRecord?> GetRecordByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var records = await QueryRecordsAsync(id, false, cancellationToken);
        return records.FirstOrDefault();
    }

    public async Task<IReadOnlyList<FacilityRecord>> GetRecordsWithBoundariesAsync(
        CancellationToken cancellationToken = default)
    {
        var records = await QueryRecordsAsync(null, true, cancellationToken);
        return records.Where(record => !string.IsNullOrWhiteSpace(record.Boundary)).ToList();
    }

    public async Task<FacilityDto> CreateAsync(
        CreateFacilityRequest request,
        CancellationToken cancellationToken = default)
    {
        GeometryJson.ParsePoint(request.Location);

        if (!string.IsNullOrWhiteSpace(request.Boundary))
        {
            GeometryJson.ParsePolygon(request.Boundary);
        }

        var isOracle = SpatialCommand.IsOracle(_configuration);
        var connection = await SpatialCommand.OpenConnectionAsync(_dbContext, cancellationToken);
        await using var command = connection.CreateCommand();

        command.CommandText = isOracle
            ? string.IsNullOrWhiteSpace(request.Boundary)
                ? """
                  INSERT INTO facilities (name, code, facility_type, location, boundary)
                  VALUES (:name, :code, :facilityType, SDO_UTIL.FROM_GEOJSON(:location), NULL)
                  """
                : """
                  INSERT INTO facilities (name, code, facility_type, location, boundary)
                  VALUES (:name, :code, :facilityType, SDO_UTIL.FROM_GEOJSON(:location), SDO_UTIL.FROM_GEOJSON(:boundary))
                  """
            : """
              INSERT INTO facilities (name, code, facility_type, location, boundary)
              VALUES (@name, @code, @facilityType, ST_SetSRID(ST_GeomFromGeoJSON(@location), 4326), ST_SetSRID(ST_GeomFromGeoJSON(@boundary), 4326))
              """;

        command.AddParameter(Parameter("name", isOracle), request.Name.Trim(), DbType.String);
        command.AddParameter(Parameter("code", isOracle), request.Code.Trim().ToUpperInvariant(), DbType.String);
        command.AddParameter(Parameter("facilityType", isOracle), request.FacilityType.Trim().ToUpperInvariant(), DbType.String);
        command.AddParameter(Parameter("location", isOracle), request.Location, DbType.String);
        if (!isOracle || !string.IsNullOrWhiteSpace(request.Boundary))
        {
            command.AddParameter(Parameter("boundary", isOracle), string.IsNullOrWhiteSpace(request.Boundary) ? null : request.Boundary, DbType.String);
        }

        try
        {
            await command.ExecuteNonQueryAsync(cancellationToken);
        }
        catch (Exception exception) when (exception is DbUpdateException or InvalidOperationException)
        {
            throw;
        }

        var created = await QueryRecordByCodeAsync(
            request.Code.Trim().ToUpperInvariant(),
            cancellationToken);

        return ToDto(created ?? throw new InvalidOperationException("Facility could not be loaded after create."));
    }

    public async Task<bool> DeleteAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var isOracle = SpatialCommand.IsOracle(_configuration);
        var connection = await SpatialCommand.OpenConnectionAsync(_dbContext, cancellationToken);
        await using var command = connection.CreateCommand();

        command.CommandText = isOracle
            ? "DELETE FROM facilities WHERE id = :id"
            : "DELETE FROM facilities WHERE id = @id";

        command.AddParameter(Parameter("id", isOracle), id, DbType.Int32);

        return await command.ExecuteNonQueryAsync(cancellationToken) > 0;
    }

    private async Task<FacilityRecord?> QueryRecordByCodeAsync(
        string code,
        CancellationToken cancellationToken)
    {
        var records = await QueryRecordsAsync(null, false, cancellationToken, code);
        return records.FirstOrDefault();
    }

    private async Task<IReadOnlyList<FacilityRecord>> QueryRecordsAsync(
        int? id,
        bool withBoundaryOnly,
        CancellationToken cancellationToken,
        string? code = null)
    {
        var isOracle = SpatialCommand.IsOracle(_configuration);
        var connection = await SpatialCommand.OpenConnectionAsync(_dbContext, cancellationToken);
        await using var command = connection.CreateCommand();

        var whereClauses = new List<string>();

        if (id.HasValue)
        {
            whereClauses.Add(isOracle ? "id = :id_filter" : "id = @id_filter");
            command.AddParameter(Parameter("id_filter", isOracle), id, DbType.Int32);
        }

        if (!string.IsNullOrWhiteSpace(code))
        {
            whereClauses.Add(isOracle ? "code = :code_filter" : "code = @code_filter");
            command.AddParameter(Parameter("code_filter", isOracle), code, DbType.String);
        }

        if (withBoundaryOnly)
        {
            whereClauses.Add("boundary IS NOT NULL");
        }

        var whereSql = whereClauses.Count == 0
            ? string.Empty
            : $"WHERE {string.Join(" AND ", whereClauses)}";

        command.CommandText = isOracle
            ? """
              SELECT id, name, code, facility_type,
                     SDO_UTIL.TO_GEOJSON(location) AS location_geojson,
                     CASE WHEN boundary IS NULL THEN NULL ELSE SDO_UTIL.TO_GEOJSON(boundary) END AS boundary_geojson
              FROM facilities
              {0}
              ORDER BY name
              """
            : """
              SELECT id, name, code, facility_type,
                     ST_AsGeoJSON(location) AS location_geojson,
                     ST_AsGeoJSON(boundary) AS boundary_geojson
              FROM facilities
              {0}
              ORDER BY name
              """;
        command.CommandText = string.Format(command.CommandText, whereSql);

        var records = new List<FacilityRecord>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            records.Add(new FacilityRecord(
                reader.GetInt32(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetString(3),
                reader.GetString(4),
                reader.IsDBNull(5) ? null : reader.GetString(5)));
        }

        return records;
    }

    private static string Parameter(string name, bool isOracle) =>
        isOracle ? $":{name}" : $"@{name}";

    private static FacilityDto ToDto(FacilityRecord record) =>
        new(
            record.Id,
            record.Name,
            record.Code,
            record.FacilityType,
            record.Location,
            record.Boundary);
}
