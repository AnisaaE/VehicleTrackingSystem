using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using VehicleTrackingSystem.Auth;
using VehicleTrackingSystem.DTOs.Errors;
using VehicleTrackingSystem.DTOs.Facilities;
using VehicleTrackingSystem.Interfaces;

namespace VehicleTrackingSystem.Controllers;

[ApiController]
[Authorize]
[Route("api/facilities")]
public sealed class FacilitiesController : ControllerBase
{
    private readonly IFacilityService _facilityService;

    public FacilitiesController(IFacilityService facilityService)
    {
        _facilityService = facilityService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<FacilityDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<FacilityDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        return Ok(await _facilityService.GetAllAsync(cancellationToken));
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(FacilityDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FacilityDto>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        var facility = await _facilityService.GetByIdAsync(id, cancellationToken);

        if (facility is null)
        {
            return NotFound(new ErrorResponse($"Facility with id '{id}' was not found."));
        }

        return Ok(facility);
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.AdminOrDispatcher)]
    [ProducesResponseType(typeof(FacilityDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<FacilityDto>> Create(
        CreateFacilityRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var facility = await _facilityService.CreateAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = facility.Id }, facility);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new ErrorResponse(exception.Message));
        }
        catch (DbUpdateException)
        {
            return Conflict(new ErrorResponse(
                $"Facility with code '{request.Code}' already exists or cannot be saved."));
        }
        catch (Exception exception)
        {
            return Conflict(new ErrorResponse(exception.Message));
        }
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = AppRoles.Admin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(
        int id,
        CancellationToken cancellationToken)
    {
        try
        {
            var deleted = await _facilityService.DeleteAsync(id, cancellationToken);

            if (!deleted)
            {
                return NotFound(new ErrorResponse($"Facility with id '{id}' was not found."));
            }

            return NoContent();
        }
        catch (Exception exception)
        {
            return Conflict(new ErrorResponse(
                $"Facility cannot be deleted because it is used by route requests or another database constraint. Details: {exception.Message}"));
        }
    }
}
