using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using VehicleTrackingSystem.DTOs.Errors;
using VehicleTrackingSystem.DTOs.Geocoding;
using VehicleTrackingSystem.Interfaces;

namespace VehicleTrackingSystem.Controllers;

[ApiController]
[Authorize(Roles = "ADMIN,DISPATCHER")]
[Route("api/geocode")]
public sealed class GeocodeController : ControllerBase
{
    private readonly IGeocodingService _geocodingService;

    public GeocodeController(IGeocodingService geocodingService)
    {
        _geocodingService = geocodingService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<GeocodeResultDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<IReadOnlyList<GeocodeResultDto>>> Search(
        [FromQuery] string q,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _geocodingService.SearchAsync(q, cancellationToken));
        }
        catch (HttpRequestException exception)
        {
            return StatusCode(
                StatusCodes.Status502BadGateway,
                new ErrorResponse($"Geocoding provider could not be reached: {exception.Message}"));
        }
    }
}
