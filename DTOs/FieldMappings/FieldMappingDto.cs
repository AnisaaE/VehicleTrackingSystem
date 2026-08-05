namespace VehicleTrackingSystem.DTOs.FieldMappings;

public sealed record FieldMappingDto(
    int Id,
    string SystemField,
    string ProviderField);
