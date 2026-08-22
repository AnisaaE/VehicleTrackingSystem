using VehicleTrackingSystem.DTOs.Auth;

namespace VehicleTrackingSystem.Interfaces;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(
        LoginRequest request,
        CancellationToken cancellationToken = default);

    Task<AuthUserDto?> GetCurrentUserAsync(
        int userId,
        CancellationToken cancellationToken = default);

    Task<AuthUserDto?> UpdateProfileAsync(
        int userId,
        UpdateProfileRequest request,
        CancellationToken cancellationToken = default);
}
