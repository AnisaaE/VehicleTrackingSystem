namespace VehicleTrackingSystem.DTOs.Routing;

public sealed record RouteResponseDto(
    string Geometry,
    double DistanceMeters,
    double DurationSeconds,
    IReadOnlyList<RouteStepDto> Steps);
