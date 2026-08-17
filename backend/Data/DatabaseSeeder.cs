using Microsoft.EntityFrameworkCore;
using VehicleTrackingSystem.Entities;

namespace VehicleTrackingSystem.Data;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(
        VehicleTrackingDbContext dbContext,
        CancellationToken cancellationToken = default)
    {
        var providersByCode = await EnsureProvidersAsync(dbContext, cancellationToken);

        await EnsureVehicleTypesAsync(dbContext, providersByCode, cancellationToken);
        await EnsureFieldMappingsAsync(dbContext, providersByCode, cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static async Task<Dictionary<string, Provider>> EnsureProvidersAsync(
        VehicleTrackingDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var providersByCode = await dbContext.Providers
            .ToDictionaryAsync(provider => provider.Code, cancellationToken);

        AddProviderIfMissing(
            providersByCode,
            "Arvento",
            "ARVENTO",
            "https://api.arvento.example");

        AddProviderIfMissing(
            providersByCode,
            "Sampas",
            "SAMPAS",
            "https://api.sampas.example");

        AddProviderIfMissing(
            providersByCode,
            "Mobiliz",
            "MOBILIZ",
            "https://api.mobiliz.example");

        dbContext.Providers.AddRange(
            providersByCode.Values.Where(provider => provider.Id == 0));

        await dbContext.SaveChangesAsync(cancellationToken);

        return providersByCode;
    }

    private static async Task EnsureVehicleTypesAsync(
        VehicleTrackingDbContext dbContext,
        IReadOnlyDictionary<string, Provider> providersByCode,
        CancellationToken cancellationToken)
    {
        await AddOrUpdateVehicleTypeAsync(
            dbContext,
            "Ambulance",
            "AMBULANCE",
            providersByCode["ARVENTO"],
            cancellationToken);

        await AddOrUpdateVehicleTypeAsync(
            dbContext,
            "Garbage Truck",
            "GARBAGE_TRUCK",
            providersByCode["SAMPAS"],
            cancellationToken);

        await AddOrUpdateVehicleTypeAsync(
            dbContext,
            "Fire Truck",
            "FIRE_TRUCK",
            providersByCode["ARVENTO"],
            cancellationToken);

        await AddOrUpdateVehicleTypeAsync(
            dbContext,
            "Work Machine",
            "WORK_MACHINE",
            providersByCode["SAMPAS"],
            cancellationToken);

        await AddOrUpdateVehicleTypeAsync(
            dbContext,
            "Street Sweeper",
            "SWEEPER",
            providersByCode["ARVENTO"],
            cancellationToken);
    }

    private static async Task EnsureFieldMappingsAsync(
        VehicleTrackingDbContext dbContext,
        IReadOnlyDictionary<string, Provider> providersByCode,
        CancellationToken cancellationToken)
    {
        var existingMappings = await dbContext.FieldMappings
            .Select(fieldMapping => new
            {
                fieldMapping.ProviderId,
                fieldMapping.SystemField
            })
            .ToListAsync(cancellationToken);

        var existingKeys = existingMappings
            .Select(mapping => MappingKey(mapping.ProviderId, mapping.SystemField))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        AddFieldMappingIfMissing(existingKeys, dbContext, providersByCode["ARVENTO"], "Plate", "Vehicle");
        AddFieldMappingIfMissing(existingKeys, dbContext, providersByCode["ARVENTO"], "VehicleName", "VehicleName");
        AddFieldMappingIfMissing(existingKeys, dbContext, providersByCode["ARVENTO"], "VehicleType", "VehicleType");
        AddFieldMappingIfMissing(existingKeys, dbContext, providersByCode["ARVENTO"], "Latitude", "Lat");
        AddFieldMappingIfMissing(existingKeys, dbContext, providersByCode["ARVENTO"], "Longitude", "Lon");
        AddFieldMappingIfMissing(existingKeys, dbContext, providersByCode["ARVENTO"], "Speed", "VehicleSpeed");
        AddFieldMappingIfMissing(existingKeys, dbContext, providersByCode["ARVENTO"], "IgnitionOn", "Ignition");
        AddFieldMappingIfMissing(existingKeys, dbContext, providersByCode["ARVENTO"], "Timestamp", "RecordTime");

        AddFieldMappingIfMissing(existingKeys, dbContext, providersByCode["SAMPAS"], "Plate", "PlateNo");
        AddFieldMappingIfMissing(existingKeys, dbContext, providersByCode["SAMPAS"], "VehicleName", "VehicleName");
        AddFieldMappingIfMissing(existingKeys, dbContext, providersByCode["SAMPAS"], "VehicleType", "VehicleType");
        AddFieldMappingIfMissing(existingKeys, dbContext, providersByCode["SAMPAS"], "Latitude", "Latitude");
        AddFieldMappingIfMissing(existingKeys, dbContext, providersByCode["SAMPAS"], "Longitude", "Longitude");
        AddFieldMappingIfMissing(existingKeys, dbContext, providersByCode["SAMPAS"], "Speed", "Speed");
        AddFieldMappingIfMissing(existingKeys, dbContext, providersByCode["SAMPAS"], "IgnitionOn", "IgnitionStatus");
        AddFieldMappingIfMissing(existingKeys, dbContext, providersByCode["SAMPAS"], "Timestamp", "DateTime");

        AddFieldMappingIfMissing(existingKeys, dbContext, providersByCode["MOBILIZ"], "Plate", "LicensePlate");
        AddFieldMappingIfMissing(existingKeys, dbContext, providersByCode["MOBILIZ"], "VehicleName", "VehicleName");
        AddFieldMappingIfMissing(existingKeys, dbContext, providersByCode["MOBILIZ"], "VehicleType", "VehicleType");
        AddFieldMappingIfMissing(existingKeys, dbContext, providersByCode["MOBILIZ"], "Latitude", "Y");
        AddFieldMappingIfMissing(existingKeys, dbContext, providersByCode["MOBILIZ"], "Longitude", "X");
        AddFieldMappingIfMissing(existingKeys, dbContext, providersByCode["MOBILIZ"], "Speed", "CurrentSpeed");
        AddFieldMappingIfMissing(existingKeys, dbContext, providersByCode["MOBILIZ"], "IgnitionOn", "IgnitionState");
        AddFieldMappingIfMissing(existingKeys, dbContext, providersByCode["MOBILIZ"], "Timestamp", "GpsTime");
    }

    private static void AddProviderIfMissing(
        IDictionary<string, Provider> providersByCode,
        string name,
        string code,
        string serviceUrl)
    {
        var normalizedCode = NormalizeCode(code);

        if (providersByCode.ContainsKey(normalizedCode))
        {
            return;
        }

        providersByCode[normalizedCode] = new Provider
        {
            Name = name,
            Code = normalizedCode,
            ServiceUrl = serviceUrl,
            IsActive = true
        };
    }

    private static async Task AddOrUpdateVehicleTypeAsync(
        VehicleTrackingDbContext dbContext,
        string name,
        string code,
        Provider provider,
        CancellationToken cancellationToken)
    {
        var normalizedCode = NormalizeCode(code);

        var existingVehicleType = await dbContext.VehicleTypes
            .FirstOrDefaultAsync(vehicleType => vehicleType.Code == normalizedCode, cancellationToken);

        if (existingVehicleType is null)
        {
            dbContext.VehicleTypes.Add(new VehicleType
            {
                Name = name,
                Code = normalizedCode,
                ProviderId = provider.Id
            });

            return;
        }

        existingVehicleType.Name = name;
        existingVehicleType.ProviderId = provider.Id;
    }

    private static void AddFieldMappingIfMissing(
        ISet<string> existingKeys,
        VehicleTrackingDbContext dbContext,
        Provider provider,
        string systemField,
        string providerField)
    {
        if (!existingKeys.Add(MappingKey(provider.Id, systemField)))
        {
            return;
        }

        dbContext.FieldMappings.Add(new FieldMapping
        {
            ProviderId = provider.Id,
            SystemField = systemField,
            ProviderField = providerField
        });
    }

    private static string MappingKey(int providerId, string systemField) =>
        $"{providerId}:{systemField}";

    private static string NormalizeCode(string code) =>
        code.Trim().ToUpperInvariant();
}
