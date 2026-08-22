using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VehicleTrackingSystem.Auth;
using VehicleTrackingSystem.DTOs.Auth;
using VehicleTrackingSystem.DTOs.Errors;
using VehicleTrackingSystem.Interfaces;

namespace VehicleTrackingSystem.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<LoginResponse>> Login(
        LoginRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _authService.LoginAsync(request, cancellationToken);

        if (response is null)
        {
            return Unauthorized(new ErrorResponse("Username or password is incorrect."));
        }

        return Ok(response);
    }

    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(AuthUserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthUserDto>> Me(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();

        if (!userId.HasValue)
        {
            return Unauthorized(new ErrorResponse("User token is invalid."));
        }

        var user = await _authService.GetCurrentUserAsync(userId.Value, cancellationToken);

        if (user is null || !user.IsActive)
        {
            return Unauthorized(new ErrorResponse("User is inactive or no longer exists."));
        }

        return Ok(user);
    }
}
