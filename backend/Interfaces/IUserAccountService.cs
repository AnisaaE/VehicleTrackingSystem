using VehicleTrackingSystem.DTOs.Users;

namespace VehicleTrackingSystem.Interfaces;

public interface IUserAccountService
{
    Task<IReadOnlyList<UserAccountDto>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<UserAccountDto> CreateAsync(
        CreateUserRequest request,
        CancellationToken cancellationToken = default);

    Task<UserAccountDto?> UpdateRoleAsync(
        int id,
        UpdateUserRoleRequest request,
        CancellationToken cancellationToken = default);

    Task<UserAccountDto?> UpdateStatusAsync(
        int id,
        UpdateUserStatusRequest request,
        CancellationToken cancellationToken = default);
}
