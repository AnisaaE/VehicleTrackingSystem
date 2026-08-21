namespace VehicleTrackingSystem.DTOs.Employees;

public sealed record EmployeeDto(
    int Id,
    string FullName,
    string? Phone,
    string? Email,
    string Role,
    bool IsActive);
