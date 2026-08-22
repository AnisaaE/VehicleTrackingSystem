namespace VehicleTrackingSystem.DTOs.Auth;

public sealed record AuthUserDto(
    int Id,
    int EmployeeId,
    string FullName,
    string Username,
    string Role,
    bool IsActive);
