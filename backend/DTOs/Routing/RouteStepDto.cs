namespace VehicleTrackingSystem.DTOs.Routing;

public sealed record RouteStepDto(
    string Instruction,
    string ManeuverType,
    double DistanceMeters,
    double DurationSeconds);
