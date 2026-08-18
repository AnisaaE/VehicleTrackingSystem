using VehicleTrackingSystem.DTOs.Geocoding;

namespace VehicleTrackingSystem.Interfaces;

public interface IGeocodingService
{
    Task<IReadOnlyList<GeocodeResultDto>> SearchAsync(string query, CancellationToken cancellationToken = default);
}
