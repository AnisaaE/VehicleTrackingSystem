using System.Collections.Concurrent;
using NetTopologySuite;
using NetTopologySuite.Geometries;
using VehicleTrackingSystem.DTOs.Geofencing;
using VehicleTrackingSystem.DTOs.Vehicles;
using VehicleTrackingSystem.Interfaces;

namespace VehicleTrackingSystem.Services;

public sealed class FacilityGeofenceService : IFacilityGeofenceService
{
    private static readonly GeometryFactory GeometryFactory =
        NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ConcurrentDictionary<string, bool> _insideStates = new();

    public FacilityGeofenceService(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    public async Task<IReadOnlyList<VehicleLeftFacilityDto>> DetectDeparturesAsync(
        IReadOnlyList<VehicleLocationDto> vehicles,
        CancellationToken cancellationToken = default)
    {
        using var scope = _scopeFactory.CreateScope();
        var facilityService = scope.ServiceProvider.GetRequiredService<IFacilityService>();
        var facilities = await facilityService.GetRecordsWithBoundariesAsync(cancellationToken);
        var departures = new List<VehicleLeftFacilityDto>();

        foreach (var vehicle in vehicles)
        {
            var point = GeometryFactory.CreatePoint(new Coordinate(
                (double)vehicle.Longitude,
                (double)vehicle.Latitude));

            foreach (var facility in facilities)
            {
                if (facility.Boundary is null)
                {
                    continue;
                }

                var boundary = GeometryJson.ParsePolygon(facility.Boundary);
                var key = $"{vehicle.Provider}:{vehicle.Plate}:{facility.Id}";
                var isInside = boundary.Contains(point);
                var wasInside = _insideStates.GetOrAdd(key, isInside);

                if (wasInside && !isInside)
                {
                    departures.Add(new VehicleLeftFacilityDto(
                        vehicle.Plate,
                        vehicle.Provider,
                        facility.Id,
                        facility.Name,
                        vehicle.Latitude,
                        vehicle.Longitude,
                        DateTimeOffset.UtcNow));
                }

                _insideStates[key] = isInside;
            }
        }

        return departures;
    }
}
