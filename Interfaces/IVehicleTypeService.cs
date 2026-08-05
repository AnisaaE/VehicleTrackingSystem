using VehicleTrackingSystem.DTOs.VehicleTypes;
using VehicleTrackingSystem.Services;

namespace VehicleTrackingSystem.Interfaces;

public interface IVehicleTypeService
{
    Task<IReadOnlyList<VehicleTypeDto>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<VehicleTypeDetailDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<ProviderResolutionResult> GetProviderByVehicleTypeCodeAsync(
        string vehicleTypeCode,
        CancellationToken cancellationToken = default);

    Task<VehicleTypeDto?> CreateAsync(
        CreateVehicleTypeRequest request,
        CancellationToken cancellationToken = default);

    Task<VehicleTypeDto?> UpdateAsync(
        int id,
        UpdateVehicleTypeRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(
        int id,
        CancellationToken cancellationToken = default);
}
