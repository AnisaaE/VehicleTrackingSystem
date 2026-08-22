namespace VehicleTrackingSystem.DTOs.Auth;

public sealed record UpdateProfileRequest(
    string FullName,
    string? Phone,
    string? Email);
