using VehicleTrackingSystem.DTOs.Facilities;
using VehicleTrackingSystem.Services;

namespace VehicleTrackingSystem.Interfaces;

public interface IFacilityService
{
    Task<IReadOnlyList<FacilityDto>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<FacilityDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<FacilityRecord?> GetRecordByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<FacilityRecord>> GetRecordsWithBoundariesAsync(CancellationToken cancellationToken = default);

    Task<FacilityDto> CreateAsync(CreateFacilityRequest request, CancellationToken cancellationToken = default);
}
