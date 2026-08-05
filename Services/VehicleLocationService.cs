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

    public VehicleLocationService(
        VehicleTrackingDbContext dbContext,
        IVehicleTrackingProviderResolver providerResolver)
    {
        _dbContext = dbContext;
        _providerResolver = providerResolver;
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

        return await provider.GetCurrentLocationsAsync(cancellationToken);
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

    private static string NormalizePlate(string plate) =>
        plate.Replace(" ", string.Empty, StringComparison.Ordinal)
            .Replace("-", string.Empty, StringComparison.Ordinal)
            .Trim()
            .ToUpperInvariant();
}
