using Microsoft.AspNetCore.Mvc;
using VehicleTrackingSystem.DTOs.Errors;
using VehicleTrackingSystem.DTOs.VehicleTrips;
using VehicleTrackingSystem.Interfaces;

namespace VehicleTrackingSystem.Controllers;

[ApiController]
[Route("api/vehicle-trips")]
public sealed class VehicleTripsController : ControllerBase
{
    private readonly IVehicleTripService _vehicleTripService;

    public VehicleTripsController(IVehicleTripService vehicleTripService)
    {
        _vehicleTripService = vehicleTripService;
    }

    [HttpGet("active")]
    [ProducesResponseType(typeof(IReadOnlyList<VehicleTripDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<VehicleTripDto>>> GetActive(
        [FromQuery] string? providerCode,
        [FromQuery] string? plate,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(providerCode) && !string.IsNullOrWhiteSpace(plate))
        {
            var activeTrip = await _vehicleTripService.GetActiveForVehicleAsync(
                providerCode,
                plate,
                cancellationToken);

            return Ok(activeTrip is null ? [] : new[] { activeTrip });
        }

        return Ok(await _vehicleTripService.GetActiveAsync(cancellationToken));
    }

    [HttpPost]
    [ProducesResponseType(typeof(VehicleTripDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<VehicleTripDto>> Create(
        CreateVehicleTripRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var trip = await _vehicleTripService.CreateAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetActive), new { id = trip.Id }, trip);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new ErrorResponse(exception.Message));
        }
        catch (HttpRequestException exception)
        {
            return StatusCode(
                StatusCodes.Status502BadGateway,
                new ErrorResponse($"Routing provider could not be reached: {exception.Message}"));
        }
    }

    [HttpPost("{id:int}/complete")]
    [ProducesResponseType(typeof(VehicleTripDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<VehicleTripDto>> Complete(
        int id,
        CancellationToken cancellationToken)
    {
        var trip = await _vehicleTripService.CompleteAsync(id, cancellationToken);

        if (trip is null)
        {
            return NotFound(new ErrorResponse($"Vehicle trip with id '{id}' was not found."));
        }

        return Ok(trip);
    }

    [HttpPost("{id:int}/cancel")]
    [ProducesResponseType(typeof(VehicleTripDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<VehicleTripDto>> Cancel(
        int id,
        CancellationToken cancellationToken)
    {
        var trip = await _vehicleTripService.CancelAsync(id, cancellationToken);

        if (trip is null)
        {
            return NotFound(new ErrorResponse($"Vehicle trip with id '{id}' was not found."));
        }

        return Ok(trip);
    }
}
