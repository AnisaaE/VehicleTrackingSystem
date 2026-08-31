using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using VehicleTrackingSystem.Auth;
using VehicleTrackingSystem.DTOs.Errors;
using VehicleTrackingSystem.DTOs.VehicleTrips;
using VehicleTrackingSystem.Interfaces;

namespace VehicleTrackingSystem.Controllers;

[ApiController]
[Authorize]
[Route("api/vehicle-trips")]
public sealed class VehicleTripsController : ControllerBase
{
    private readonly IVehicleTripService _vehicleTripService;

    public VehicleTripsController(IVehicleTripService vehicleTripService)
    {
        _vehicleTripService = vehicleTripService;
    }

    [HttpGet]
    [Authorize(Roles = AppRoles.AdminOrDispatcher)]
    [ProducesResponseType(typeof(IReadOnlyList<VehicleTripDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<VehicleTripDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        return Ok(await _vehicleTripService.GetAllAsync(cancellationToken));
    }

    [HttpGet("driver/{driverId:int}")]
    [Authorize(Roles = AppRoles.AdminOrDispatcher)]
    [ProducesResponseType(typeof(IReadOnlyList<VehicleTripDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<VehicleTripDto>>> GetForDriver(
        int driverId,
        CancellationToken cancellationToken)
    {
        return Ok(await _vehicleTripService.GetForDriverAsync(driverId, cancellationToken));
    }

    [HttpGet("{id:int}")]
    [Authorize(Roles = AppRoles.All)]
    [ProducesResponseType(typeof(VehicleTripDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<VehicleTripDto>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        VehicleTripDto? trip;

        if (User.IsInRole(AppRoles.Driver) &&
            !User.IsInRole(AppRoles.Admin) &&
            !User.IsInRole(AppRoles.Dispatcher))
        {
            var employeeId = User.GetEmployeeId();

            if (!employeeId.HasValue)
            {
                return Unauthorized(new ErrorResponse("User token does not include an employee id."));
            }

            trip = await _vehicleTripService.GetForDriverByIdAsync(id, employeeId.Value, cancellationToken);
        }
        else
        {
            trip = await _vehicleTripService.GetByIdAsync(id, cancellationToken);
        }

        if (trip is null)
        {
            return NotFound(new ErrorResponse($"Vehicle trip with id '{id}' was not found."));
        }

        return Ok(trip);
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

    [HttpGet("my")]
    [Authorize(Roles = AppRoles.Driver)]
    [ProducesResponseType(typeof(IReadOnlyList<VehicleTripDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IReadOnlyList<VehicleTripDto>>> GetMine(
        CancellationToken cancellationToken)
    {
        var employeeId = User.GetEmployeeId();

        if (!employeeId.HasValue)
        {
            return Unauthorized(new ErrorResponse("User token does not include an employee id."));
        }

        return Ok(await _vehicleTripService.GetForDriverAsync(employeeId.Value, cancellationToken));
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.AdminOrDispatcher)]
    [ProducesResponseType(typeof(VehicleTripDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<VehicleTripDto>> Create(
        CreateVehicleTripRequest request,
        CancellationToken cancellationToken)
    {
        var employeeId = User.GetEmployeeId();

        if (!employeeId.HasValue)
        {
            return Unauthorized(new ErrorResponse("User token does not include an employee id."));
        }

        try
        {
            var trip = await _vehicleTripService.CreateAsync(request, employeeId.Value, cancellationToken);
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
    [Authorize(Roles = AppRoles.All)]
    [ProducesResponseType(typeof(VehicleTripDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<VehicleTripDto>> Complete(
        int id,
        CancellationToken cancellationToken)
    {
        VehicleTripDto? trip;

        if (User.IsInRole(AppRoles.Driver) &&
            !User.IsInRole(AppRoles.Admin) &&
            !User.IsInRole(AppRoles.Dispatcher))
        {
            var employeeId = User.GetEmployeeId();

            if (!employeeId.HasValue)
            {
                return Unauthorized(new ErrorResponse("User token does not include an employee id."));
            }

            trip = await _vehicleTripService.CompleteForDriverAsync(id, employeeId.Value, cancellationToken);
        }
        else
        {
            trip = await _vehicleTripService.CompleteAsync(id, User.GetEmployeeId(), cancellationToken);
        }

        if (trip is null)
        {
            return NotFound(new ErrorResponse($"Vehicle trip with id '{id}' was not found."));
        }

        return Ok(trip);
    }

    [HttpPost("{id:int}/cancel")]
    [Authorize(Roles = AppRoles.AdminOrDispatcher)]
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
