namespace VehicleTrackingSystem.DTOs.Users;

public sealed record UserAccountDto(
    int Id,
    int EmployeeId,
    string FullName,
    string? Phone,
    string? Email,
    string Username,
    string Role,
    bool IsActive,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
