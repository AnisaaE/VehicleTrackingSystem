using VehicleTrackingSystem.Services;

namespace VehicleTrackingSystem.Interfaces;

public interface IDestinationService
{
    Task<DestinationRecord?> GetRecordByIdAsync(int id, CancellationToken cancellationToken = default);
}
