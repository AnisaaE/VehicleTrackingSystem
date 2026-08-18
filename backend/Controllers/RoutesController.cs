using System.Data;
using Microsoft.AspNetCore.Mvc;
using VehicleTrackingSystem.Data;
using VehicleTrackingSystem.DTOs.Errors;
using VehicleTrackingSystem.DTOs.Routing;
using VehicleTrackingSystem.Interfaces;
using VehicleTrackingSystem.Services;

namespace VehicleTrackingSystem.Controllers;

[ApiController]
[Route("api/routes")]
public sealed class RoutesController : ControllerBase
{
    private readonly VehicleTrackingDbContext _dbContext;
    private readonly IConfiguration _configuration;
    private readonly IFacilityService _facilityService;
    private readonly IDestinationService _destinationService;
    private readonly IRoutingService _routingService;

    public RoutesController(
        VehicleTrackingDbContext dbContext,
        IConfiguration configuration,
        IFacilityService facilityService,
        IDestinationService destinationService,
        IRoutingService routingService)
    {
        _dbContext = dbContext;
        _configuration = configuration;
        _facilityService = facilityService;
        _destinationService = destinationService;
        _routingService = routingService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(RouteResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<RouteResponseDto>> GetRoute(
        [FromQuery] int fromFacilityId,
        [FromQuery] double? toLat,
        [FromQuery] double? toLon,
        [FromQuery] int? toDestinationId,
        [FromQuery] string? vehiclePlate,
        [FromQuery] string? providerCode,
        CancellationToken cancellationToken)
    {
        var facility = await _facilityService.GetRecordByIdAsync(fromFacilityId, cancellationToken);

        if (facility is null)
        {
            return NotFound(new ErrorResponse($"Facility with id '{fromFacilityId}' was not found."));
        }

        var fromPoint = GeometryJson.ParsePoint(facility.Location);
        double destinationLatitude;
        double destinationLongitude;

        if (toDestinationId.HasValue)
        {
            var destination = await _destinationService.GetRecordByIdAsync(
                toDestinationId.Value,
                cancellationToken);

            if (destination is null)
            {
                return NotFound(new ErrorResponse($"Destination with id '{toDestinationId}' was not found."));
            }

            var destinationPoint = GeometryJson.ParsePoint(destination.Location);
            destinationLatitude = destinationPoint.Y;
            destinationLongitude = destinationPoint.X;
        }
        else if (toLat.HasValue && toLon.HasValue)
        {
            destinationLatitude = toLat.Value;
            destinationLongitude = toLon.Value;
        }
        else
        {
            return BadRequest(new ErrorResponse(
                "Provide either toDestinationId or both toLat and toLon."));
        }

        RouteResponseDto route;

        try
        {
            route = await _routingService.GetRouteAsync(
                fromPoint.Y,
                fromPoint.X,
                destinationLatitude,
                destinationLongitude,
                cancellationToken);
        }
        catch (HttpRequestException exception)
        {
            return StatusCode(
                StatusCodes.Status502BadGateway,
                new ErrorResponse($"Routing provider could not be reached: {exception.Message}"));
        }

        await LogRouteRequestAsync(
            fromFacilityId,
            toDestinationId,
            destinationLatitude,
            destinationLongitude,
            vehiclePlate,
            providerCode,
            cancellationToken);

        return Ok(route);
    }

    private async Task LogRouteRequestAsync(
        int fromFacilityId,
        int? toDestinationId,
        double toLatitude,
        double toLongitude,
        string? vehiclePlate,
        string? providerCode,
        CancellationToken cancellationToken)
    {
        var isOracle = SpatialCommand.IsOracle(_configuration);
        var connection = await SpatialCommand.OpenConnectionAsync(_dbContext, cancellationToken);
        await using var command = connection.CreateCommand();

        command.CommandText = isOracle
            ? """
              INSERT INTO route_requests
                (vehicle_plate, provider_code, from_facility_id, to_destination_id, to_latitude, to_longitude, requested_at)
              VALUES
                (:vehicle_plate, :provider_code, :from_facility_id, :to_destination_id, :to_latitude, :to_longitude, SYSTIMESTAMP)
              """
            : """
              INSERT INTO route_requests
                (vehicle_plate, provider_code, from_facility_id, to_destination_id, to_latitude, to_longitude, requested_at)
              VALUES
                (@vehicle_plate, @provider_code, @from_facility_id, @to_destination_id, @to_latitude, @to_longitude, NOW())
              """;

        command.AddParameter(isOracle ? ":vehicle_plate" : "@vehicle_plate", vehiclePlate?.Trim(), DbType.String);
        command.AddParameter(isOracle ? ":provider_code" : "@provider_code", providerCode?.Trim().ToUpperInvariant(), DbType.String);
        command.AddParameter(isOracle ? ":from_facility_id" : "@from_facility_id", fromFacilityId, DbType.Int32);
        command.AddParameter(isOracle ? ":to_destination_id" : "@to_destination_id", toDestinationId, DbType.Int32);
        command.AddParameter(isOracle ? ":to_latitude" : "@to_latitude", toLatitude, DbType.Double);
        command.AddParameter(isOracle ? ":to_longitude" : "@to_longitude", toLongitude, DbType.Double);

        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}
