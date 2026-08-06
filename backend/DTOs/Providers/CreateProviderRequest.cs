namespace VehicleTrackingSystem.DTOs.Providers;

public sealed record CreateProviderRequest(
    string Name,
    string Code,
    string ServiceUrl,
    bool IsActive);
