using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using VehicleTrackingSystem.Auth;
using VehicleTrackingSystem.DTOs.Errors;
using VehicleTrackingSystem.DTOs.Providers;
using VehicleTrackingSystem.DTOs.VehicleTypes;
using VehicleTrackingSystem.Interfaces;
using VehicleTrackingSystem.Services;

namespace VehicleTrackingSystem.Controllers;

[ApiController]
[Authorize]
[Route("api/vehicle-types")]
public sealed class VehicleTypesController : ControllerBase
{
    private readonly IVehicleTypeService _vehicleTypeService;

    public VehicleTypesController(IVehicleTypeService vehicleTypeService)
    {
        _vehicleTypeService = vehicleTypeService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<VehicleTypeDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<VehicleTypeDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        var vehicleTypes = await _vehicleTypeService.GetAllAsync(cancellationToken);

        return Ok(vehicleTypes);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(VehicleTypeDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<VehicleTypeDetailDto>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        var vehicleType = await _vehicleTypeService.GetByIdAsync(id, cancellationToken);

        if (vehicleType is null)
        {
            return NotFound(new ErrorResponse($"Vehicle type with id '{id}' was not found."));
        }

        return Ok(vehicleType);
    }

    [HttpGet("{code}/provider")]
    [ProducesResponseType(typeof(ProviderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ProviderDto>> GetProviderByVehicleTypeCode(
        string code,
        CancellationToken cancellationToken)
    {
        var result = await _vehicleTypeService.GetProviderByVehicleTypeCodeAsync(
            code,
            cancellationToken);

        return result.Status switch
        {
            ProviderResolutionStatus.Found => Ok(result.Provider),
            ProviderResolutionStatus.VehicleTypeNotFound => NotFound(new ErrorResponse(result.Message!)),
            ProviderResolutionStatus.ProviderInactive => Conflict(new ErrorResponse(result.Message!)),
            ProviderResolutionStatus.ProviderImplementationNotFound => Conflict(new ErrorResponse(result.Message!)),
            _ => Conflict(new ErrorResponse("The provider could not be resolved."))
        };
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.Admin)]
    [ProducesResponseType(typeof(VehicleTypeDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<VehicleTypeDto>> Create(
        CreateVehicleTypeRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var vehicleType = await _vehicleTypeService.CreateAsync(request, cancellationToken);

            if (vehicleType is null)
            {
                return NotFound(new ErrorResponse(
                    $"Provider with id '{request.ProviderId}' was not found."));
            }

            return CreatedAtAction(nameof(GetById), new { id = vehicleType.Id }, vehicleType);
        }
        catch (DbUpdateException)
        {
            return Conflict(new ErrorResponse(
                $"Vehicle type with code '{request.Code}' already exists or cannot be saved."));
        }
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = AppRoles.Admin)]
    [ProducesResponseType(typeof(VehicleTypeDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<VehicleTypeDto>> Update(
        int id,
        UpdateVehicleTypeRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var vehicleType = await _vehicleTypeService.UpdateAsync(id, request, cancellationToken);

            if (vehicleType is null)
            {
                return NotFound(new ErrorResponse(
                    $"Vehicle type with id '{id}' or provider with id '{request.ProviderId}' was not found."));
            }

            return Ok(vehicleType);
        }
        catch (DbUpdateException)
        {
            return Conflict(new ErrorResponse(
                $"Vehicle type with code '{request.Code}' already exists or cannot be saved."));
        }
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = AppRoles.Admin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(
        int id,
        CancellationToken cancellationToken)
    {
        var deleted = await _vehicleTypeService.DeleteAsync(id, cancellationToken);

        if (!deleted)
        {
            return NotFound(new ErrorResponse($"Vehicle type with id '{id}' was not found."));
        }

        return NoContent();
    }
}
