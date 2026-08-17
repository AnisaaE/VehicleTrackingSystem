using Microsoft.EntityFrameworkCore;
using VehicleTrackingSystem.Data;
using VehicleTrackingSystem.DTOs.Vehicles;
using VehicleTrackingSystem.Interfaces;

namespace VehicleTrackingSystem.Services;

public sealed class VehicleLocationService : IVehicleLocationService
{
    private const string FireTruckVehicleTypeCode = "FIRE_TRUCK";

    private readonly VehicleTrackingDbContext _dbContext;
    private readonly IVehicleTrackingProviderResolver _providerResolver;
    private readonly IVehicleLocationMapper _vehicleLocationMapper;

    public VehicleLocationService(
        VehicleTrackingDbContext dbContext,
        IVehicleTrackingProviderResolver providerResolver,
        IVehicleLocationMapper vehicleLocationMapper)
    {
        _dbContext = dbContext;
        _providerResolver = providerResolver;
        _vehicleLocationMapper = vehicleLocationMapper;
    }

    public async Task<IReadOnlyList<VehicleLocationDto>> GetCurrentLocationsAsync(
        CancellationToken cancellationToken = default)
    {
        var providerCode = await GetActiveProviderCodeAsync(cancellationToken);

        if (providerCode is null)
        {
            return [];
        }

        var provider = _providerResolver.Resolve(providerCode);

        if (provider is null)
        {
            return [];
        }

        var rawLocations = await provider.GetRawLocationsAsync(cancellationToken);

        return await _vehicleLocationMapper.MapAsync(
            providerCode,
            rawLocations,
            cancellationToken);
    }

    public async Task<IReadOnlyList<VehicleLocationDto>> GetCurrentLocationsAsync(
        string providerCode,
        CancellationToken cancellationToken = default)
    {
        var activeProviderCode = await GetActiveProviderCodeAsync(
            providerCode,
            cancellationToken);

        if (activeProviderCode is null)
        {
            return [];
        }

        var provider = _providerResolver.Resolve(activeProviderCode);

        if (provider is null)
        {
            return [];
        }

        var rawLocations = await provider.GetRawLocationsAsync(cancellationToken);

        return await _vehicleLocationMapper.MapAsync(
            activeProviderCode,
            rawLocations,
            cancellationToken);
    }

    public async Task<VehicleLocationDto?> GetCurrentLocationByPlateAsync(
        string plate,
        CancellationToken cancellationToken = default)
    {
        var normalizedPlate = NormalizePlate(plate);

        var vehicles = await GetCurrentLocationsAsync(cancellationToken);

        return vehicles.FirstOrDefault(vehicle =>
            NormalizePlate(vehicle.Plate) == normalizedPlate);
    }

    public async Task<VehicleLocationDto?> GetCurrentLocationByPlateAsync(
        string providerCode,
        string plate,
        CancellationToken cancellationToken = default)
    {
        var normalizedPlate = NormalizePlate(plate);

        var vehicles = await GetCurrentLocationsAsync(providerCode, cancellationToken);

        return vehicles.FirstOrDefault(vehicle =>
            NormalizePlate(vehicle.Plate) == normalizedPlate);
    }

    private async Task<string?> GetActiveProviderCodeAsync(
        CancellationToken cancellationToken)
    {
        return await _dbContext.VehicleTypes
            .AsNoTracking()
            .Where(vehicleType =>
                vehicleType.Code == FireTruckVehicleTypeCode &&
                vehicleType.Provider.IsActive)
            .Select(vehicleType => vehicleType.Provider.Code)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private async Task<string?> GetActiveProviderCodeAsync(
        string providerCode,
        CancellationToken cancellationToken)
    {
        var normalizedProviderCode = providerCode.Trim().ToUpperInvariant();

        return await _dbContext.Providers
            .AsNoTracking()
            .Where(provider =>
                provider.Code == normalizedProviderCode &&
                provider.IsActive)
            .Select(provider => provider.Code)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static string NormalizePlate(string plate) =>
        plate.Replace(" ", string.Empty, StringComparison.Ordinal)
            .Replace("-", string.Empty, StringComparison.Ordinal)
            .Trim()
            .ToUpperInvariant();
}
