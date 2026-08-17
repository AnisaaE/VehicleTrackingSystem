using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using VehicleTrackingSystem.Data;
using VehicleTrackingSystem.DTOs.Vehicles;
using VehicleTrackingSystem.Interfaces;

namespace VehicleTrackingSystem.Services;

public sealed class VehicleLocationMapper : IVehicleLocationMapper
{
    private const string PlateField = "Plate";
    private const string VehicleNameField = "VehicleName";
    private const string VehicleTypeField = "VehicleType";
    private const string LatitudeField = "Latitude";
    private const string LongitudeField = "Longitude";
    private const string SpeedField = "Speed";
    private const string IgnitionOnField = "IgnitionOn";
    private const string TimestampField = "Timestamp";

    private readonly VehicleTrackingDbContext _dbContext;

    public VehicleLocationMapper(VehicleTrackingDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<VehicleLocationDto>> MapAsync(
        string providerCode,
        IReadOnlyList<JsonElement> rawLocations,
        CancellationToken cancellationToken = default)
    {
        var normalizedProviderCode = providerCode.Trim().ToUpperInvariant();

        var mappings = await _dbContext.FieldMappings
            .AsNoTracking()
            .Where(fieldMapping => fieldMapping.Provider.Code == normalizedProviderCode)
            .ToDictionaryAsync(
                fieldMapping => fieldMapping.SystemField,
                fieldMapping => fieldMapping.ProviderField,
                StringComparer.OrdinalIgnoreCase,
                cancellationToken);

        if (!HasRequiredMappings(mappings))
        {
            return [];
        }

        var vehicles = new List<VehicleLocationDto>();

        foreach (var rawLocation in rawLocations)
        {
            if (!TryMap(rawLocation, mappings, normalizedProviderCode, out var vehicle))
            {
                continue;
            }

            vehicles.Add(vehicle);
        }

        return vehicles;
    }

    private static bool HasRequiredMappings(IReadOnlyDictionary<string, string> mappings)
    {
        return mappings.ContainsKey(PlateField)
            && mappings.ContainsKey(LatitudeField)
            && mappings.ContainsKey(LongitudeField)
            && mappings.ContainsKey(SpeedField)
            && mappings.ContainsKey(IgnitionOnField)
            && mappings.ContainsKey(TimestampField);
    }

    private static bool TryMap(
        JsonElement rawLocation,
        IReadOnlyDictionary<string, string> mappings,
        string providerCode,
        out VehicleLocationDto vehicle)
    {
        vehicle = null!;

        if (!TryGetString(rawLocation, mappings, PlateField, out var plate)
            || !TryGetDecimal(rawLocation, mappings, LatitudeField, out var latitude)
            || !TryGetDecimal(rawLocation, mappings, LongitudeField, out var longitude)
            || !TryGetInt(rawLocation, mappings, SpeedField, out var speed)
            || !TryGetBool(rawLocation, mappings, IgnitionOnField, out var ignitionOn)
            || !TryGetDateTimeOffset(rawLocation, mappings, TimestampField, out var timestamp))
        {
            return false;
        }

        var vehicleName = TryGetString(rawLocation, mappings, VehicleNameField, out var mappedVehicleName)
            ? mappedVehicleName
            : plate;

        var vehicleType = TryGetString(rawLocation, mappings, VehicleTypeField, out var mappedVehicleType)
            ? mappedVehicleType
            : string.Empty;

        vehicle = new VehicleLocationDto(
            plate,
            vehicleName,
            vehicleType,
            providerCode,
            latitude,
            longitude,
            speed,
            ignitionOn,
            timestamp);

        return true;
    }

    private static bool TryGetElement(
        JsonElement rawLocation,
        IReadOnlyDictionary<string, string> mappings,
        string systemField,
        out JsonElement element)
    {
        element = default;

        return mappings.TryGetValue(systemField, out var providerField)
            && rawLocation.ValueKind == JsonValueKind.Object
            && rawLocation.TryGetProperty(providerField, out element);
    }

    private static bool TryGetString(
        JsonElement rawLocation,
        IReadOnlyDictionary<string, string> mappings,
        string systemField,
        out string value)
    {
        value = string.Empty;

        if (!TryGetElement(rawLocation, mappings, systemField, out var element))
        {
            return false;
        }

        value = element.ValueKind == JsonValueKind.String
            ? element.GetString() ?? string.Empty
            : element.ToString();

        return !string.IsNullOrWhiteSpace(value);
    }

    private static bool TryGetDecimal(
        JsonElement rawLocation,
        IReadOnlyDictionary<string, string> mappings,
        string systemField,
        out decimal value)
    {
        value = default;

        if (!TryGetElement(rawLocation, mappings, systemField, out var element))
        {
            return false;
        }

        return element.ValueKind switch
        {
            JsonValueKind.Number => element.TryGetDecimal(out value),
            JsonValueKind.String => decimal.TryParse(
                element.GetString(),
                NumberStyles.Number,
                CultureInfo.InvariantCulture,
                out value),
            _ => false
        };
    }

    private static bool TryGetInt(
        JsonElement rawLocation,
        IReadOnlyDictionary<string, string> mappings,
        string systemField,
        out int value)
    {
        value = default;

        if (!TryGetElement(rawLocation, mappings, systemField, out var element))
        {
            return false;
        }

        return element.ValueKind switch
        {
            JsonValueKind.Number => element.TryGetInt32(out value),
            JsonValueKind.String => int.TryParse(
                element.GetString(),
                NumberStyles.Integer,
                CultureInfo.InvariantCulture,
                out value),
            _ => false
        };
    }

    private static bool TryGetBool(
        JsonElement rawLocation,
        IReadOnlyDictionary<string, string> mappings,
        string systemField,
        out bool value)
    {
        value = default;

        if (!TryGetElement(rawLocation, mappings, systemField, out var element))
        {
            return false;
        }

        if (element.ValueKind is JsonValueKind.True or JsonValueKind.False)
        {
            value = element.GetBoolean();
            return true;
        }

        return element.ValueKind == JsonValueKind.String
            && bool.TryParse(element.GetString(), out value);
    }

    private static bool TryGetDateTimeOffset(
        JsonElement rawLocation,
        IReadOnlyDictionary<string, string> mappings,
        string systemField,
        out DateTimeOffset value)
    {
        value = default;

        if (!TryGetElement(rawLocation, mappings, systemField, out var element))
        {
            return false;
        }

        return element.ValueKind == JsonValueKind.String
            && DateTimeOffset.TryParse(
                element.GetString(),
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal,
                out value);
    }
}
