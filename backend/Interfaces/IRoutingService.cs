using VehicleTrackingSystem.DTOs.Routing;

namespace VehicleTrackingSystem.Interfaces;

public interface IRoutingService
{
    Task<RouteResponseDto> GetRouteAsync(
        double fromLatitude,
        double fromLongitude,
        double toLatitude,
        double toLongitude,
        CancellationToken cancellationToken = default);
}
