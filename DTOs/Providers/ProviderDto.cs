namespace VehicleTrackingSystem.DTOs.Providers;

public sealed record ProviderDto(
    int Id,
    string Name,
    string Code,
    string ServiceUrl,
    bool IsActive);
