using Microsoft.EntityFrameworkCore;
using VehicleTrackingSystem.Data;
using VehicleTrackingSystem.DTOs.FieldMappings;
using VehicleTrackingSystem.DTOs.Providers;
using VehicleTrackingSystem.DTOs.VehicleTypes;
using VehicleTrackingSystem.Entities;
using VehicleTrackingSystem.Interfaces;

namespace VehicleTrackingSystem.Services;

public sealed class ProviderService : IProviderService
{
    private readonly VehicleTrackingDbContext _dbContext;

    public ProviderService(VehicleTrackingDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ProviderDto>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.Providers
            .AsNoTracking()
            .OrderBy(provider => provider.Name)
            .Select(provider => new ProviderDto(
                provider.Id,
                provider.Name,
                provider.Code,
                provider.ServiceUrl,
                provider.IsActive))
            .ToListAsync(cancellationToken);
    }

    public async Task<ProviderDetailDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.Providers
            .AsNoTracking()
            .Where(provider => provider.Id == id)
            .Select(provider => new ProviderDetailDto(
                provider.Id,
                provider.Name,
                provider.Code,
                provider.ServiceUrl,
                provider.IsActive,
                provider.VehicleTypes
                    .OrderBy(vehicleType => vehicleType.Name)
                    .Select(vehicleType => new VehicleTypeDto(
                        vehicleType.Id,
                        vehicleType.Name,
                        vehicleType.Code,
                        vehicleType.ProviderId,
                        provider.Code))
                    .ToList(),
                provider.FieldMappings
                    .OrderBy(fieldMapping => fieldMapping.SystemField)
                    .Select(fieldMapping => new FieldMappingDto(
                        fieldMapping.Id,
                        fieldMapping.SystemField,
                        fieldMapping.ProviderField))
                    .ToList()))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<FieldMappingDto>?> GetFieldMappingsAsync(
        int providerId,
        CancellationToken cancellationToken = default)
    {
        var providerExists = await _dbContext.Providers
            .AsNoTracking()
            .AnyAsync(provider => provider.Id == providerId, cancellationToken);

        if (!providerExists)
        {
            return null;
        }

        return await _dbContext.FieldMappings
            .AsNoTracking()
            .Where(fieldMapping => fieldMapping.ProviderId == providerId)
            .OrderBy(fieldMapping => fieldMapping.SystemField)
            .Select(fieldMapping => new FieldMappingDto(
                fieldMapping.Id,
                fieldMapping.SystemField,
                fieldMapping.ProviderField))
            .ToListAsync(cancellationToken);
    }

    public async Task<ProviderDto> CreateAsync(
        CreateProviderRequest request,
        CancellationToken cancellationToken = default)
    {
        var provider = new Provider
        {
            Name = request.Name.Trim(),
            Code = request.Code.Trim().ToUpperInvariant(),
            ServiceUrl = request.ServiceUrl.Trim(),
            IsActive = request.IsActive
        };

        _dbContext.Providers.Add(provider);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(provider);
    }

    public async Task<ProviderDto?> UpdateAsync(
        int id,
        UpdateProviderRequest request,
        CancellationToken cancellationToken = default)
    {
        var provider = await _dbContext.Providers
            .FirstOrDefaultAsync(provider => provider.Id == id, cancellationToken);

        if (provider is null)
        {
            return null;
        }

        provider.Name = request.Name.Trim();
        provider.Code = request.Code.Trim().ToUpperInvariant();
        provider.ServiceUrl = request.ServiceUrl.Trim();
        provider.IsActive = request.IsActive;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(provider);
    }

    public async Task<bool> DeleteAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var provider = await _dbContext.Providers
            .FirstOrDefaultAsync(provider => provider.Id == id, cancellationToken);

        if (provider is null)
        {
            return false;
        }

        _dbContext.Providers.Remove(provider);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }

    private static ProviderDto ToDto(Provider provider)
    {
        return new ProviderDto(
            provider.Id,
            provider.Name,
            provider.Code,
            provider.ServiceUrl,
            provider.IsActive);
    }
}
