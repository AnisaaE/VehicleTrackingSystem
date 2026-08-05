using Microsoft.EntityFrameworkCore;
using VehicleTrackingSystem.Data;
using VehicleTrackingSystem.DTOs.Providers;
using VehicleTrackingSystem.DTOs.VehicleTypes;
using VehicleTrackingSystem.Entities;
using VehicleTrackingSystem.Interfaces;

namespace VehicleTrackingSystem.Services;

public sealed class VehicleTypeService : IVehicleTypeService
{
    private readonly VehicleTrackingDbContext _dbContext;
    private readonly IVehicleTrackingProviderResolver _providerResolver;

    public VehicleTypeService(
        VehicleTrackingDbContext dbContext,
        IVehicleTrackingProviderResolver providerResolver)
    {
        _dbContext = dbContext;
        _providerResolver = providerResolver;
    }

    public async Task<IReadOnlyList<VehicleTypeDto>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.VehicleTypes
            .AsNoTracking()
            .Include(vehicleType => vehicleType.Provider)
            .OrderBy(vehicleType => vehicleType.Name)
            .Select(vehicleType => new VehicleTypeDto(
                vehicleType.Id,
                vehicleType.Name,
                vehicleType.Code,
                vehicleType.ProviderId,
                vehicleType.Provider.Code))
            .ToListAsync(cancellationToken);
    }

    public async Task<VehicleTypeDetailDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.VehicleTypes
            .AsNoTracking()
            .Include(vehicleType => vehicleType.Provider)
            .Where(vehicleType => vehicleType.Id == id)
            .Select(vehicleType => new VehicleTypeDetailDto(
                vehicleType.Id,
                vehicleType.Name,
                vehicleType.Code,
                new ProviderDto(
                    vehicleType.Provider.Id,
                    vehicleType.Provider.Name,
                    vehicleType.Provider.Code,
                    vehicleType.Provider.ServiceUrl,
                    vehicleType.Provider.IsActive)))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<ProviderResolutionResult> GetProviderByVehicleTypeCodeAsync(
        string vehicleTypeCode,
        CancellationToken cancellationToken = default)
    {
        var normalizedCode = vehicleTypeCode.Trim().ToUpperInvariant();

        var provider = await _dbContext.VehicleTypes
            .AsNoTracking()
            .Where(vehicleType => vehicleType.Code == normalizedCode)
            .Select(vehicleType => new ProviderDto(
                vehicleType.Provider.Id,
                vehicleType.Provider.Name,
                vehicleType.Provider.Code,
                vehicleType.Provider.ServiceUrl,
                vehicleType.Provider.IsActive))
            .FirstOrDefaultAsync(cancellationToken);

        if (provider is null)
        {
            return ProviderResolutionResult.NotFound(normalizedCode);
        }

        if (!provider.IsActive)
        {
            return ProviderResolutionResult.Inactive(provider);
        }

        var implementation = _providerResolver.Resolve(provider.Code);

        if (implementation is null)
        {
            return ProviderResolutionResult.ImplementationMissing(provider);
        }

        return ProviderResolutionResult.Found(provider);
    }

    public async Task<VehicleTypeDto?> CreateAsync(
        CreateVehicleTypeRequest request,
        CancellationToken cancellationToken = default)
    {
        var providerCode = await _dbContext.Providers
            .AsNoTracking()
            .Where(provider => provider.Id == request.ProviderId)
            .Select(provider => provider.Code)
            .FirstOrDefaultAsync(cancellationToken);

        if (providerCode is null)
        {
            return null;
        }

        var vehicleType = new VehicleType
        {
            Name = request.Name.Trim(),
            Code = request.Code.Trim().ToUpperInvariant(),
            ProviderId = request.ProviderId
        };

        _dbContext.VehicleTypes.Add(vehicleType);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(vehicleType, providerCode);
    }

    public async Task<VehicleTypeDto?> UpdateAsync(
        int id,
        UpdateVehicleTypeRequest request,
        CancellationToken cancellationToken = default)
    {
        var providerCode = await _dbContext.Providers
            .AsNoTracking()
            .Where(provider => provider.Id == request.ProviderId)
            .Select(provider => provider.Code)
            .FirstOrDefaultAsync(cancellationToken);

        if (providerCode is null)
        {
            return null;
        }

        var vehicleType = await _dbContext.VehicleTypes
            .FirstOrDefaultAsync(vehicleType => vehicleType.Id == id, cancellationToken);

        if (vehicleType is null)
        {
            return null;
        }

        vehicleType.Name = request.Name.Trim();
        vehicleType.Code = request.Code.Trim().ToUpperInvariant();
        vehicleType.ProviderId = request.ProviderId;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(vehicleType, providerCode);
    }

    public async Task<bool> DeleteAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var vehicleType = await _dbContext.VehicleTypes
            .FirstOrDefaultAsync(vehicleType => vehicleType.Id == id, cancellationToken);

        if (vehicleType is null)
        {
            return false;
        }

        _dbContext.VehicleTypes.Remove(vehicleType);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }

    private static VehicleTypeDto ToDto(VehicleType vehicleType, string providerCode)
    {
        return new VehicleTypeDto(
            vehicleType.Id,
            vehicleType.Name,
            vehicleType.Code,
            vehicleType.ProviderId,
            providerCode);
    }
}
