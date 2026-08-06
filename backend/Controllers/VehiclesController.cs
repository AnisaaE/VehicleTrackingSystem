using Microsoft.AspNetCore.Mvc;
using VehicleTrackingSystem.DTOs.Errors;
using VehicleTrackingSystem.DTOs.Vehicles;
using VehicleTrackingSystem.Interfaces;

namespace VehicleTrackingSystem.Controllers;

[ApiController]
[Route("api/vehicles")]
public sealed class VehiclesController : ControllerBase
{
    private readonly IVehicleLocationService _vehicleLocationService;

    public VehiclesController(IVehicleLocationService vehicleLocationService)
    {
        _vehicleLocationService = vehicleLocationService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<VehicleLocationDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<VehicleLocationDto>>> GetCurrentLocations(
        [FromQuery] string? providerCode,
        CancellationToken cancellationToken)
    {
        var vehicles = string.IsNullOrWhiteSpace(providerCode)
            ? await _vehicleLocationService.GetCurrentLocationsAsync(cancellationToken)
            : await _vehicleLocationService.GetCurrentLocationsAsync(providerCode, cancellationToken);

        return Ok(vehicles);
    }

    [HttpGet("{plate}")]
    [ProducesResponseType(typeof(VehicleLocationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<VehicleLocationDto>> GetCurrentLocationByPlate(
        string plate,
        [FromQuery] string? providerCode,
        CancellationToken cancellationToken)
    {
        var vehicle = string.IsNullOrWhiteSpace(providerCode)
            ? await _vehicleLocationService.GetCurrentLocationByPlateAsync(plate, cancellationToken)
            : await _vehicleLocationService.GetCurrentLocationByPlateAsync(
                providerCode,
                plate,
                cancellationToken);

        if (vehicle is null)
        {
            return NotFound(new ErrorResponse($"Vehicle with plate '{plate}' was not found."));
        }

        return Ok(vehicle);
    }
}
