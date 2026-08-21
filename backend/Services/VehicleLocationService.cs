using Microsoft.EntityFrameworkCore;
using VehicleTrackingSystem.Data;
using VehicleTrackingSystem.DTOs.Vehicles;
using VehicleTrackingSystem.Interfaces;

namespace VehicleTrackingSystem.Services;

public sealed class VehicleLocationService : IVehicleLocationService
{
    private readonly VehicleTrackingDbContext _dbContext;
    private readonly IVehicleTrackingProviderResolver _providerResolver;
    private readonly IVehicleLocationMapper _vehicleLocationMapper;
    private readonly IVehicleService _vehicleService;

    public VehicleLocationService(
        VehicleTrackingDbContext dbContext,
        IVehicleTrackingProviderResolver providerResolver,
        IVehicleLocationMapper vehicleLocationMapper,
        IVehicleService vehicleService)
    {
        _dbContext = dbContext;
        _providerResolver = providerResolver;
        _vehicleLocationMapper = vehicleLocationMapper;
        _vehicleService = vehicleService;
    }

    public async Task<IReadOnlyList<VehicleLocationDto>> GetCurrentLocationsAsync(
        CancellationToken cancellationToken = default)
    {
        var providerCodes = await GetActiveProviderCodesAsync(cancellationToken);
        var vehicles = new List<VehicleLocationDto>();

        foreach (var providerCode in providerCodes)
        {
            var providerVehicles = await GetProviderLocationsAsync(
                providerCode,
                cancellationToken);

            vehicles.AddRange(providerVehicles);
        }

        return vehicles
            .OrderBy(vehicle => vehicle.Provider)
            .ThenBy(vehicle => vehicle.Plate)
            .ToList();
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

        return await GetProviderLocationsAsync(
            activeProviderCode,
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

    private async Task<IReadOnlyList<string>> GetActiveProviderCodesAsync(
        CancellationToken cancellationToken)
    {
        return await _dbContext.Providers
            .AsNoTracking()
            .Where(provider => provider.IsActive)
            .OrderBy(provider => provider.Code)
            .Select(provider => provider.Code)
            .ToListAsync(cancellationToken);
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

    private async Task<IReadOnlyList<VehicleLocationDto>> GetProviderLocationsAsync(
        string providerCode,
        CancellationToken cancellationToken)
    {
        var provider = _providerResolver.Resolve(providerCode);

        if (provider is null)
        {
            return [];
        }

        var rawLocations = await provider.GetRawLocationsAsync(cancellationToken);

        var vehicles = await _vehicleLocationMapper.MapAsync(
            providerCode,
            rawLocations,
            cancellationToken);

        await _vehicleService.EnsureFromLocationsAsync(vehicles, cancellationToken);

        return vehicles;
    }

    private static string NormalizePlate(string plate) =>
        plate.Replace(" ", string.Empty, StringComparison.Ordinal)
            .Replace("-", string.Empty, StringComparison.Ordinal)
            .Trim()
            .ToUpperInvariant();
}
