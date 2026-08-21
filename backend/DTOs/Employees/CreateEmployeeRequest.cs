namespace VehicleTrackingSystem.DTOs.Employees;

public sealed record CreateEmployeeRequest(
    string FullName,
    string? Phone,
    string? Email,
    string Role);
