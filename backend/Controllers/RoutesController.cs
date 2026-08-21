using Microsoft.AspNetCore.Mvc;
using VehicleTrackingSystem.DTOs.Errors;
using VehicleTrackingSystem.DTOs.Routing;
using VehicleTrackingSystem.Interfaces;
using VehicleTrackingSystem.Services;

namespace VehicleTrackingSystem.Controllers;

[ApiController]
[Route("api/routes")]
public sealed class RoutesController : ControllerBase
{
    private readonly IFacilityService _facilityService;
    private readonly IDestinationService _destinationService;
    private readonly IRoutingService _routingService;

    public RoutesController(
        IFacilityService facilityService,
        IDestinationService destinationService,
        IRoutingService routingService)
    {
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
        [FromQuery] int? fromFacilityId,
        [FromQuery] double? fromLat,
        [FromQuery] double? fromLon,
        [FromQuery] double? toLat,
        [FromQuery] double? toLon,
        [FromQuery] int? toDestinationId,
        [FromQuery] string? vehiclePlate,
        [FromQuery] string? providerCode,
        CancellationToken cancellationToken)
    {
        double fromLatitude;
        double fromLongitude;

        if (fromLat.HasValue && fromLon.HasValue)
        {
            fromLatitude = fromLat.Value;
            fromLongitude = fromLon.Value;
        }
        else if (fromFacilityId.HasValue)
        {
            var facility = await _facilityService.GetRecordByIdAsync(fromFacilityId.Value, cancellationToken);

            if (facility is null)
            {
                return NotFound(new ErrorResponse($"Facility with id '{fromFacilityId}' was not found."));
            }

            var fromPoint = GeometryJson.ParsePoint(facility.Location);
            fromLatitude = fromPoint.Y;
            fromLongitude = fromPoint.X;
        }
        else
        {
            return BadRequest(new ErrorResponse(
                "Provide either fromFacilityId or both fromLat and fromLon."));
        }

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
                fromLatitude,
                fromLongitude,
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

        return Ok(route);
    }
}
