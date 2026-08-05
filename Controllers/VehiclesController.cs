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
        CancellationToken cancellationToken)
    {
        var vehicles = await _vehicleLocationService.GetCurrentLocationsAsync(cancellationToken);

        return Ok(vehicles);
    }

    [HttpGet("{plate}")]
    [ProducesResponseType(typeof(VehicleLocationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<VehicleLocationDto>> GetCurrentLocationByPlate(
        string plate,
        CancellationToken cancellationToken)
    {
        var vehicle = await _vehicleLocationService.GetCurrentLocationByPlateAsync(
            plate,
            cancellationToken);

        if (vehicle is null)
        {
            return NotFound(new ErrorResponse($"Vehicle with plate '{plate}' was not found."));
        }

        return Ok(vehicle);
    }
}
