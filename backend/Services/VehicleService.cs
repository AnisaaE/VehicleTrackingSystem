using Microsoft.EntityFrameworkCore;
using VehicleTrackingSystem.Data;
using VehicleTrackingSystem.DTOs.Vehicles;
using VehicleTrackingSystem.Entities;
using VehicleTrackingSystem.Interfaces;

namespace VehicleTrackingSystem.Services;

public sealed class VehicleService : IVehicleService
{
    private readonly VehicleTrackingDbContext _dbContext;

    public VehicleService(VehicleTrackingDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<VehicleDto>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.Vehicles
            .AsNoTracking()
            .Include(vehicle => vehicle.Provider)
            .Include(vehicle => vehicle.VehicleType)
            .OrderBy(vehicle => vehicle.Provider.Code)
            .ThenBy(vehicle => vehicle.Plate)
            .Select(vehicle => ToDto(vehicle))
            .ToListAsync(cancellationToken);
    }

    public async Task<VehicleDto?> GetByProviderAndPlateAsync(
        string providerCode,
        string plate,
        CancellationToken cancellationToken = default)
    {
        var normalizedProviderCode = NormalizeCode(providerCode);
        var normalizedPlate = NormalizePlate(plate);

        var vehicle = await _dbContext.Vehicles
            .AsNoTracking()
            .Include(currentVehicle => currentVehicle.Provider)
            .Include(currentVehicle => currentVehicle.VehicleType)
            .FirstOrDefaultAsync(currentVehicle =>
                currentVehicle.Provider.Code == normalizedProviderCode &&
                currentVehicle.Plate == normalizedPlate,
                cancellationToken);

        return vehicle is null ? null : ToDto(vehicle);
    }

    public async Task<VehicleDto> EnsureFromLocationAsync(
        VehicleLocationDto location,
        CancellationToken cancellationToken = default)
    {
        var vehicles = await EnsureFromLocationsAsync([location], cancellationToken);
        return vehicles[0];
    }

    public async Task<IReadOnlyList<VehicleDto>> EnsureFromLocationsAsync(
        IReadOnlyList<VehicleLocationDto> locations,
        CancellationToken cancellationToken = default)
    {
        var result = new List<VehicleDto>();

        foreach (var location in locations)
        {
            var normalizedProviderCode = NormalizeCode(location.Provider);
            var normalizedPlate = NormalizePlate(location.Plate);
            var provider = await _dbContext.Providers
                .FirstOrDefaultAsync(currentProvider =>
                    currentProvider.Code == normalizedProviderCode,
                    cancellationToken);

            if (provider is null)
            {
                continue;
            }

            var vehicleTypeCode = NormalizeVehicleType(location.VehicleType);
            var vehicleType = await _dbContext.VehicleTypes
                .FirstOrDefaultAsync(currentType =>
                    currentType.Code == vehicleTypeCode,
                    cancellationToken);

            var vehicle = await _dbContext.Vehicles
                .Include(currentVehicle => currentVehicle.Provider)
                .Include(currentVehicle => currentVehicle.VehicleType)
                .FirstOrDefaultAsync(currentVehicle =>
                    currentVehicle.ProviderId == provider.Id &&
                    currentVehicle.Plate == normalizedPlate,
                    cancellationToken);

            var now = DateTimeOffset.UtcNow;

            if (vehicle is null)
            {
                vehicle = new Vehicle
                {
                    Plate = normalizedPlate,
                    Name = string.IsNullOrWhiteSpace(location.VehicleName)
                        ? normalizedPlate
                        : location.VehicleName.Trim(),
                    ProviderId = provider.Id,
                    Provider = provider,
                    VehicleTypeId = vehicleType?.Id,
                    VehicleType = vehicleType,
                    IsActive = true,
                    CreatedAt = now,
                    UpdatedAt = now
                };

                _dbContext.Vehicles.Add(vehicle);
            }
            else
            {
                var nextName = string.IsNullOrWhiteSpace(location.VehicleName)
                    ? vehicle.Name
                    : location.VehicleName.Trim();
                var nextVehicleTypeId = vehicleType?.Id ?? vehicle.VehicleTypeId;

                if (vehicle.Name != nextName ||
                    vehicle.VehicleTypeId != nextVehicleTypeId ||
                    !vehicle.IsActive)
                {
                    vehicle.Name = nextName;
                    vehicle.VehicleTypeId = nextVehicleTypeId;
                    vehicle.IsActive = true;
                    vehicle.UpdatedAt = now;
                }
            }

            await _dbContext.SaveChangesAsync(cancellationToken);
            await UpdateProviderSeenAsync(
                vehicle,
                provider,
                location.LastLocationTime,
                now,
                cancellationToken);
            result.Add(ToDto(vehicle));
        }

        return result;
    }

    private static VehicleDto ToDto(Vehicle vehicle) =>
        new(
            vehicle.Id,
            vehicle.Plate,
            vehicle.Name,
            vehicle.ProviderId,
            vehicle.Provider.Code,
            vehicle.VehicleTypeId,
            vehicle.VehicleType?.Code,
            vehicle.VehicleType?.Name,
            vehicle.IsActive);

    private async Task UpdateProviderSeenAsync(
        Vehicle vehicle,
        Provider provider,
        DateTimeOffset providerTimestamp,
        DateTimeOffset seenAt,
        CancellationToken cancellationToken)
    {
        var seen = await _dbContext.VehicleProviderSeen
            .FirstOrDefaultAsync(currentSeen =>
                currentSeen.VehicleId == vehicle.Id &&
                currentSeen.ProviderId == provider.Id,
                cancellationToken);

        if (seen is null)
        {
            _dbContext.VehicleProviderSeen.Add(new VehicleProviderSeen
            {
                VehicleId = vehicle.Id,
                Vehicle = vehicle,
                ProviderId = provider.Id,
                Provider = provider,
                LastSeenAt = seenAt,
                LastProviderTimestamp = providerTimestamp
            });
        }
        else
        {
            seen.LastSeenAt = seenAt;
            seen.LastProviderTimestamp = providerTimestamp;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private static string NormalizeCode(string value) =>
        value.Trim().ToUpperInvariant();

    private static string NormalizePlate(string value) =>
        value.Replace(" ", string.Empty, StringComparison.Ordinal)
            .Replace("-", string.Empty, StringComparison.Ordinal)
            .Trim()
            .ToUpperInvariant();

    private static string NormalizeVehicleType(string value) =>
        value.Trim()
            .Replace(" ", "_", StringComparison.Ordinal)
            .Replace("-", "_", StringComparison.Ordinal)
            .ToUpperInvariant();
}
