using VehicleTrackingSystem.DTOs.FieldMappings;
using VehicleTrackingSystem.DTOs.Providers;

namespace VehicleTrackingSystem.Interfaces;

public interface IProviderService
{
    Task<IReadOnlyList<ProviderDto>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<ProviderDetailDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<FieldMappingDto>?> GetFieldMappingsAsync(
        int providerId,
        CancellationToken cancellationToken = default);

    Task<ProviderDto> CreateAsync(
        CreateProviderRequest request,
        CancellationToken cancellationToken = default);

    Task<ProviderDto?> UpdateAsync(
        int id,
        UpdateProviderRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(
        int id,
        CancellationToken cancellationToken = default);
}
