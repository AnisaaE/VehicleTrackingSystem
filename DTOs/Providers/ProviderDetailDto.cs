using VehicleTrackingSystem.DTOs.FieldMappings;
using VehicleTrackingSystem.DTOs.VehicleTypes;

namespace VehicleTrackingSystem.DTOs.Providers;

public sealed record ProviderDetailDto(
    int Id,
    string Name,
    string Code,
    string ServiceUrl,
    bool IsActive,
    IReadOnlyList<VehicleTypeDto> VehicleTypes,
    IReadOnlyList<FieldMappingDto> FieldMappings);
