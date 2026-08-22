namespace VehicleTrackingSystem.DTOs.Auth;

public sealed record LoginResponse(
    string Token,
    DateTimeOffset ExpiresAt,
    AuthUserDto User);
