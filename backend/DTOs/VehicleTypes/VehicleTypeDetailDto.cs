using VehicleTrackingSystem.DTOs.Providers;

namespace VehicleTrackingSystem.DTOs.VehicleTypes;

public sealed record VehicleTypeDetailDto(
    int Id,
    string Name,
    string Code,
    ProviderDto Provider);
