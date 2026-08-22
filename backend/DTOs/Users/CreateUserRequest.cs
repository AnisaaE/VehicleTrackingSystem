namespace VehicleTrackingSystem.DTOs.Users;

public sealed record CreateUserRequest(
    string Username,
    string Password,
    string FullName,
    string? Phone,
    string? Email,
    string Role);
