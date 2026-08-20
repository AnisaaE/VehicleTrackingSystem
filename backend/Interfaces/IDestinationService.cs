using VehicleTrackingSystem.Services;
using VehicleTrackingSystem.DTOs.Destinations;

namespace VehicleTrackingSystem.Interfaces;

public interface IDestinationService
{
    Task<IReadOnlyList<DestinationDto>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<DestinationDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<DestinationRecord?> GetRecordByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<DestinationDto> CreateAsync(CreateDestinationRequest request, CancellationToken cancellationToken = default);

    Task<DestinationDto?> UpdateAsync(int id, UpdateDestinationRequest request, CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default);
}
