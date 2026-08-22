using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VehicleTrackingSystem.Auth;
using VehicleTrackingSystem.DTOs.Errors;
using VehicleTrackingSystem.DTOs.Users;
using VehicleTrackingSystem.Interfaces;

namespace VehicleTrackingSystem.Controllers;

[ApiController]
[Authorize(Roles = AppRoles.Admin)]
[Route("api/users")]
public sealed class UserAccountsController : ControllerBase
{
    private readonly IUserAccountService _userAccountService;

    public UserAccountsController(IUserAccountService userAccountService)
    {
        _userAccountService = userAccountService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<UserAccountDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<UserAccountDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        return Ok(await _userAccountService.GetAllAsync(cancellationToken));
    }

    [HttpPost]
    [ProducesResponseType(typeof(UserAccountDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<UserAccountDto>> Create(
        CreateUserRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var user = await _userAccountService.CreateAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetAll), new { id = user.Id }, user);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new ErrorResponse(exception.Message));
        }
    }

    [HttpPut("{id:int}/role")]
    [ProducesResponseType(typeof(UserAccountDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserAccountDto>> UpdateRole(
        int id,
        UpdateUserRoleRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var user = await _userAccountService.UpdateRoleAsync(id, request, cancellationToken);

            if (user is null)
            {
                return NotFound(new ErrorResponse($"User with id '{id}' was not found."));
            }

            return Ok(user);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new ErrorResponse(exception.Message));
        }
    }

    [HttpPut("{id:int}/status")]
    [ProducesResponseType(typeof(UserAccountDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserAccountDto>> UpdateStatus(
        int id,
        UpdateUserStatusRequest request,
        CancellationToken cancellationToken)
    {
        var user = await _userAccountService.UpdateStatusAsync(id, request, cancellationToken);

        if (user is null)
        {
            return NotFound(new ErrorResponse($"User with id '{id}' was not found."));
        }

        return Ok(user);
    }
}
