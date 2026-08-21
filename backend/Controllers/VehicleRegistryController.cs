using Microsoft.AspNetCore.Mvc;
using VehicleTrackingSystem.DTOs.Vehicles;
using VehicleTrackingSystem.Interfaces;

namespace VehicleTrackingSystem.Controllers;

[ApiController]
[Route("api/vehicle-registry")]
public sealed class VehicleRegistryController : ControllerBase
{
    private readonly IVehicleService _vehicleService;

    public VehicleRegistryController(IVehicleService vehicleService)
    {
        _vehicleService = vehicleService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<VehicleDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<VehicleDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        return Ok(await _vehicleService.GetAllAsync(cancellationToken));
    }
}
