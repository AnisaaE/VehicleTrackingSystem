using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VehicleTrackingSystem.DTOs.Destinations;
using VehicleTrackingSystem.DTOs.Errors;
using VehicleTrackingSystem.Interfaces;

namespace VehicleTrackingSystem.Controllers;

[ApiController]
[Route("api/destinations")]
public sealed class DestinationsController : ControllerBase
{
    private readonly IDestinationService _destinationService;

    public DestinationsController(IDestinationService destinationService)
    {
        _destinationService = destinationService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<DestinationDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<DestinationDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        return Ok(await _destinationService.GetAllAsync(cancellationToken));
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(DestinationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DestinationDto>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        var destination = await _destinationService.GetByIdAsync(id, cancellationToken);

        if (destination is null)
        {
            return NotFound(new ErrorResponse($"Destination with id '{id}' was not found."));
        }

        return Ok(destination);
    }

    [HttpPost]
    [ProducesResponseType(typeof(DestinationDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<DestinationDto>> Create(
        CreateDestinationRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var destination = await _destinationService.CreateAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = destination.Id }, destination);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new ErrorResponse(exception.Message));
        }
        catch (Exception exception)
        {
            return Conflict(new ErrorResponse(exception.Message));
        }
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(DestinationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<DestinationDto>> Update(
        int id,
        UpdateDestinationRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var destination = await _destinationService.UpdateAsync(id, request, cancellationToken);

            if (destination is null)
            {
                return NotFound(new ErrorResponse($"Destination with id '{id}' was not found."));
            }

            return Ok(destination);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new ErrorResponse(exception.Message));
        }
        catch (Exception exception)
        {
            return Conflict(new ErrorResponse(exception.Message));
        }
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(
        int id,
        CancellationToken cancellationToken)
    {
        try
        {
            var deleted = await _destinationService.DeleteAsync(id, cancellationToken);

            if (!deleted)
            {
                return NotFound(new ErrorResponse($"Destination with id '{id}' was not found."));
            }

            return NoContent();
        }
        catch (DbUpdateException)
        {
            return Conflict(new ErrorResponse(
                "Destination cannot be deleted because it is used by route requests."));
        }
        catch (Exception exception)
        {
            return Conflict(new ErrorResponse(exception.Message));
        }
    }
}
