namespace VehicleTrackingSystem.Auth;

public sealed record AuthTokenPayload(
    int UserId,
    int EmployeeId,
    string Username,
    string FullName,
    string Role,
    DateTimeOffset ExpiresAt);
