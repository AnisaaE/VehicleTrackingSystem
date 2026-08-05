namespace VehicleTrackingSystem.DTOs.Providers;

public sealed record UpdateProviderRequest(
    string Name,
    string Code,
    string ServiceUrl,
    bool IsActive);
