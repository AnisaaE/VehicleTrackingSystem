using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using VehicleTrackingSystem.Auth;
using VehicleTrackingSystem.DTOs.Errors;
using VehicleTrackingSystem.DTOs.FieldMappings;
using VehicleTrackingSystem.DTOs.Providers;
using VehicleTrackingSystem.Interfaces;

namespace VehicleTrackingSystem.Controllers;

[ApiController]
[Authorize]
[Route("api/providers")]
public sealed class ProvidersController : ControllerBase
{
    private readonly IProviderService _providerService;

    public ProvidersController(IProviderService providerService)
    {
        _providerService = providerService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ProviderDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ProviderDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        var providers = await _providerService.GetAllAsync(cancellationToken);

        return Ok(providers);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ProviderDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProviderDetailDto>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        var provider = await _providerService.GetByIdAsync(id, cancellationToken);

        if (provider is null)
        {
            return NotFound(new ErrorResponse($"Provider with id '{id}' was not found."));
        }

        return Ok(provider);
    }

    [HttpGet("{id:int}/field-mappings")]
    [Authorize(Roles = AppRoles.Admin)]
    [ProducesResponseType(typeof(IReadOnlyList<FieldMappingDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<FieldMappingDto>>> GetFieldMappings(
        int id,
        CancellationToken cancellationToken)
    {
        var mappings = await _providerService.GetFieldMappingsAsync(id, cancellationToken);

        if (mappings is null)
        {
            return NotFound(new ErrorResponse($"Provider with id '{id}' was not found."));
        }

        return Ok(mappings);
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.Admin)]
    [ProducesResponseType(typeof(ProviderDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ProviderDto>> Create(
        CreateProviderRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var provider = await _providerService.CreateAsync(request, cancellationToken);

            return CreatedAtAction(nameof(GetById), new { id = provider.Id }, provider);
        }
        catch (DbUpdateException)
        {
            return Conflict(new ErrorResponse(
                $"Provider with code '{request.Code}' already exists or cannot be saved."));
        }
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = AppRoles.Admin)]
    [ProducesResponseType(typeof(ProviderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ProviderDto>> Update(
        int id,
        UpdateProviderRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var provider = await _providerService.UpdateAsync(id, request, cancellationToken);

            if (provider is null)
            {
                return NotFound(new ErrorResponse($"Provider with id '{id}' was not found."));
            }

            return Ok(provider);
        }
        catch (DbUpdateException)
        {
            return Conflict(new ErrorResponse(
                $"Provider with code '{request.Code}' already exists or cannot be saved."));
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
            var deleted = await _providerService.DeleteAsync(id, cancellationToken);

            if (!deleted)
            {
                return NotFound(new ErrorResponse($"Provider with id '{id}' was not found."));
            }

            return NoContent();
        }
        catch (DbUpdateException)
        {
            return Conflict(new ErrorResponse(
                "Provider cannot be deleted because it is used by vehicle types or field mappings."));
        }
    }
}
