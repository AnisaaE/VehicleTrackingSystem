using Microsoft.EntityFrameworkCore;
using VehicleTrackingSystem.Data;
using VehicleTrackingSystem.DTOs.VehicleTrips;
using VehicleTrackingSystem.DTOs.Vehicles;
using VehicleTrackingSystem.Entities;
using VehicleTrackingSystem.Interfaces;

namespace VehicleTrackingSystem.Services;

public sealed class VehicleTripService : IVehicleTripService
{
    private const double CompletionRadiusMeters = 75;

    private static readonly string[] ActiveStatuses = ["ASSIGNED", "IN_PROGRESS"];

    private readonly VehicleTrackingDbContext _dbContext;
    private readonly IVehicleLocationService _vehicleLocationService;
    private readonly IVehicleService _vehicleService;
    private readonly IFacilityService _facilityService;
    private readonly IDestinationService _destinationService;
    private readonly IRoutingService _routingService;

    public VehicleTripService(
        VehicleTrackingDbContext dbContext,
        IVehicleLocationService vehicleLocationService,
        IVehicleService vehicleService,
        IFacilityService facilityService,
        IDestinationService destinationService,
        IRoutingService routingService)
    {
        _dbContext = dbContext;
        _vehicleLocationService = vehicleLocationService;
        _vehicleService = vehicleService;
        _facilityService = facilityService;
        _destinationService = destinationService;
        _routingService = routingService;
    }

    public async Task<IReadOnlyList<VehicleTripDto>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        var trips = await QueryTrips()
            .OrderByDescending(trip => trip.AssignedAt)
            .Take(200)
            .ToListAsync(cancellationToken);

        return await ToDtosAsync(trips, cancellationToken);
    }

    public async Task<IReadOnlyList<VehicleTripDto>> GetActiveAsync(
        CancellationToken cancellationToken = default)
    {
        var trips = await QueryTrips()
            .Where(trip => ActiveStatuses.Contains(trip.Status))
            .OrderByDescending(trip => trip.AssignedAt)
            .ToListAsync(cancellationToken);

        return await ToDtosAsync(trips, cancellationToken);
    }

    public async Task<IReadOnlyList<VehicleTripDto>> GetActiveForProviderAsync(
        string providerCode,
        CancellationToken cancellationToken = default)
    {
        var normalizedProviderCode = NormalizeCode(providerCode);
        var trips = await QueryTrips()
            .Where(trip =>
                ActiveStatuses.Contains(trip.Status) &&
                trip.Vehicle.Provider.Code == normalizedProviderCode)
            .OrderByDescending(trip => trip.AssignedAt)
            .ToListAsync(cancellationToken);

        return await ToDtosAsync(trips, cancellationToken);
    }

    public async Task<VehicleTripDto?> GetActiveForVehicleAsync(
        string providerCode,
        string plate,
        CancellationToken cancellationToken = default)
    {
        var normalizedProviderCode = NormalizeCode(providerCode);
        var normalizedPlate = NormalizePlate(plate);

        var trip = await QueryTrips()
            .Where(currentTrip =>
                ActiveStatuses.Contains(currentTrip.Status) &&
                currentTrip.Vehicle.Provider.Code == normalizedProviderCode &&
                currentTrip.Vehicle.Plate == normalizedPlate)
            .OrderByDescending(currentTrip => currentTrip.AssignedAt)
            .FirstOrDefaultAsync(cancellationToken);

        return trip is null ? null : await ToDtoAsync(trip, cancellationToken);
    }

    public async Task<IReadOnlyList<VehicleTripDto>> GetForDriverAsync(
        int driverId,
        CancellationToken cancellationToken = default)
    {
        var trips = await QueryTrips()
            .Where(trip => trip.DriverId == driverId)
            .OrderByDescending(trip => trip.AssignedAt)
            .Take(50)
            .ToListAsync(cancellationToken);

        return await ToDtosAsync(trips, cancellationToken);
    }

    public async Task<VehicleTripDto> CreateAsync(
        CreateVehicleTripRequest request,
        CancellationToken cancellationToken = default)
    {
        var currentLocation = await _vehicleLocationService.GetCurrentLocationByPlateAsync(
            request.ProviderCode,
            request.VehiclePlate,
            cancellationToken);

        VehicleDto vehicle;

        if (currentLocation is null)
        {
            vehicle = await _vehicleService.GetByProviderAndPlateAsync(
                    request.ProviderCode,
                    request.VehiclePlate,
                    cancellationToken)
                ?? throw new InvalidOperationException(
                    $"Vehicle '{request.VehiclePlate}' was not found for provider '{request.ProviderCode}'.");
        }
        else
        {
            vehicle = await _vehicleService.EnsureFromLocationAsync(currentLocation, cancellationToken);
        }

        var hasActiveTrip = await _dbContext.VehicleTrips.AnyAsync(
            trip => trip.VehicleId == vehicle.Id && ActiveStatuses.Contains(trip.Status),
            cancellationToken);

        if (hasActiveTrip)
        {
            throw new InvalidOperationException(
                $"Vehicle '{vehicle.Plate}' already has an active trip.");
        }

        var destination = await ResolveDestinationAsync(request, cancellationToken);
        var route = await ResolveInitialRouteAsync(
            request,
            currentLocation,
            destination.Latitude,
            destination.Longitude,
            cancellationToken);
        var now = DateTimeOffset.UtcNow;
        var trip = new VehicleTrip
        {
            VehicleId = vehicle.Id,
            DriverId = request.DriverId,
            AssignedByEmployeeId = request.AssignedByEmployeeId,
            OriginFacilityId = request.OriginFacilityId,
            DestinationId = request.DestinationId,
            DestinationLatitude = destination.Latitude,
            DestinationLongitude = destination.Longitude,
            Status = currentLocation is null ? "ASSIGNED" : "IN_PROGRESS",
            AssignedAt = now,
            StartedAt = currentLocation is null ? null : now,
            EstimatedDistanceMeters = route?.DistanceMeters,
            EstimatedDurationSeconds = route?.DurationSeconds,
            RouteGeometry = route?.Geometry,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim()
        };

        _dbContext.VehicleTrips.Add(trip);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var created = await QueryTrips()
            .FirstAsync(currentTrip => currentTrip.Id == trip.Id, cancellationToken);

        return await ToDtoAsync(created, cancellationToken);
    }

    public async Task<VehicleTripDto?> CompleteAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var trip = await _dbContext.VehicleTrips
            .FirstOrDefaultAsync(currentTrip => currentTrip.Id == id, cancellationToken);

        if (trip is null)
        {
            return null;
        }

        CompleteTrip(trip, DateTimeOffset.UtcNow);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var updated = await QueryTrips()
            .FirstAsync(currentTrip => currentTrip.Id == id, cancellationToken);

        return await ToDtoAsync(updated, cancellationToken);
    }

    public async Task<VehicleTripDto?> CompleteForDriverAsync(
        int id,
        int driverId,
        CancellationToken cancellationToken = default)
    {
        var trip = await _dbContext.VehicleTrips
            .FirstOrDefaultAsync(
                currentTrip => currentTrip.Id == id && currentTrip.DriverId == driverId,
                cancellationToken);

        if (trip is null)
        {
            return null;
        }

        CompleteTrip(trip, DateTimeOffset.UtcNow);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var updated = await QueryTrips()
            .FirstAsync(currentTrip => currentTrip.Id == id, cancellationToken);

        return await ToDtoAsync(updated, cancellationToken);
    }

    public async Task<VehicleTripDto?> CancelAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var trip = await _dbContext.VehicleTrips
            .FirstOrDefaultAsync(currentTrip => currentTrip.Id == id, cancellationToken);

        if (trip is null)
        {
            return null;
        }

        trip.Status = "CANCELLED";
        trip.CancelledAt = DateTimeOffset.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        var updated = await QueryTrips()
            .FirstAsync(currentTrip => currentTrip.Id == id, cancellationToken);

        return await ToDtoAsync(updated, cancellationToken);
    }

    public async Task UpdateProgressFromLocationsAsync(
        IReadOnlyList<VehicleLocationDto> locations,
        CancellationToken cancellationToken = default)
    {
        if (locations.Count == 0)
        {
            return;
        }

        var activeTrips = await QueryTrips()
            .Where(trip => ActiveStatuses.Contains(trip.Status))
            .ToListAsync(cancellationToken);

        foreach (var trip in activeTrips)
        {
            var location = locations.FirstOrDefault(currentLocation =>
                NormalizeCode(currentLocation.Provider) == trip.Vehicle.Provider.Code &&
                NormalizePlate(currentLocation.Plate) == trip.Vehicle.Plate);

            if (location is null)
            {
                continue;
            }

            if (trip.Status == "ASSIGNED")
            {
                trip.Status = "IN_PROGRESS";
                trip.StartedAt = DateTimeOffset.UtcNow;
            }

            var distanceToDestination = DistanceMeters(
                (double)location.Latitude,
                (double)location.Longitude,
                trip.DestinationLatitude,
                trip.DestinationLongitude);

            if (distanceToDestination <= CompletionRadiusMeters && location.Speed <= 10)
            {
                CompleteTrip(trip, DateTimeOffset.UtcNow);
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private IQueryable<VehicleTrip> QueryTrips() =>
        _dbContext.VehicleTrips
            .Include(trip => trip.Vehicle)
            .ThenInclude(vehicle => vehicle.Provider)
            .Include(trip => trip.Vehicle)
            .ThenInclude(vehicle => vehicle.VehicleType)
            .Include(trip => trip.Driver)
            .Include(trip => trip.AssignedByEmployee);

    private async Task<(double Latitude, double Longitude)> ResolveDestinationAsync(
        CreateVehicleTripRequest request,
        CancellationToken cancellationToken)
    {
        if (request.DestinationId.HasValue)
        {
            var destination = await _destinationService.GetRecordByIdAsync(
                request.DestinationId.Value,
                cancellationToken);

            if (destination is null)
            {
                throw new InvalidOperationException(
                    $"Destination with id '{request.DestinationId}' was not found.");
            }

            var point = GeometryJson.ParsePoint(destination.Location);
            return (point.Y, point.X);
        }

        if (request.DestinationLatitude.HasValue && request.DestinationLongitude.HasValue)
        {
            return (request.DestinationLatitude.Value, request.DestinationLongitude.Value);
        }

        throw new InvalidOperationException(
            "Provide either destinationId or both destinationLatitude and destinationLongitude.");
    }

    private async Task<DTOs.Routing.RouteResponseDto?> ResolveInitialRouteAsync(
        CreateVehicleTripRequest request,
        VehicleLocationDto? currentLocation,
        double destinationLatitude,
        double destinationLongitude,
        CancellationToken cancellationToken)
    {
        if (request.OriginFacilityId.HasValue)
        {
            var facility = await _facilityService.GetRecordByIdAsync(
                request.OriginFacilityId.Value,
                cancellationToken);

            if (facility is null)
            {
                throw new InvalidOperationException(
                    $"Origin facility with id '{request.OriginFacilityId}' was not found.");
            }

            var point = GeometryJson.ParsePoint(facility.Location);

            return await _routingService.GetRouteAsync(
                point.Y,
                point.X,
                destinationLatitude,
                destinationLongitude,
                cancellationToken);
        }

        if (currentLocation is null)
        {
            return null;
        }

        return await _routingService.GetRouteAsync(
            (double)currentLocation.Latitude,
            (double)currentLocation.Longitude,
            destinationLatitude,
            destinationLongitude,
            cancellationToken);
    }

    private async Task<IReadOnlyList<VehicleTripDto>> ToDtosAsync(
        IReadOnlyList<VehicleTrip> trips,
        CancellationToken cancellationToken)
    {
        var result = new List<VehicleTripDto>();

        foreach (var trip in trips)
        {
            result.Add(await ToDtoAsync(trip, cancellationToken));
        }

        return result;
    }

    private async Task<VehicleTripDto> ToDtoAsync(
        VehicleTrip trip,
        CancellationToken cancellationToken)
    {
        var originName = trip.OriginFacilityId.HasValue
            ? (await _facilityService.GetByIdAsync(trip.OriginFacilityId.Value, cancellationToken))?.Name
            : null;
        var destinationName = trip.DestinationId.HasValue
            ? (await _destinationService.GetByIdAsync(trip.DestinationId.Value, cancellationToken))?.Name
            : null;

        return new VehicleTripDto(
            trip.Id,
            trip.VehicleId,
            trip.Vehicle.Plate,
            trip.Vehicle.Name,
            trip.Vehicle.VehicleType?.Code,
            trip.Vehicle.VehicleType?.Name,
            trip.Vehicle.Provider.Code,
            trip.DriverId,
            trip.Driver?.FullName,
            trip.OriginFacilityId,
            originName,
            trip.DestinationId,
            destinationName,
            trip.DestinationLatitude,
            trip.DestinationLongitude,
            trip.Status,
            trip.AssignedAt,
            trip.StartedAt,
            trip.CompletedAt,
            trip.CancelledAt,
            trip.EstimatedDistanceMeters,
            trip.EstimatedDurationSeconds,
            trip.ActualDistanceMeters,
            trip.ActualDurationSeconds,
            trip.RouteGeometry,
            trip.Notes);
    }

    private static void CompleteTrip(VehicleTrip trip, DateTimeOffset completedAt)
    {
        trip.Status = "COMPLETED";
        trip.CompletedAt = completedAt;
        trip.ActualDistanceMeters ??= trip.EstimatedDistanceMeters;

        trip.ActualDurationSeconds ??= Math.Max(
            0,
            (completedAt - trip.AssignedAt).TotalSeconds);
    }

    private static double DistanceMeters(
        double fromLatitude,
        double fromLongitude,
        double toLatitude,
        double toLongitude)
    {
        const double earthRadiusMeters = 6371000;
        var latitudeDelta = DegreesToRadians(toLatitude - fromLatitude);
        var longitudeDelta = DegreesToRadians(toLongitude - fromLongitude);
        var startLatitude = DegreesToRadians(fromLatitude);
        var endLatitude = DegreesToRadians(toLatitude);

        var haversine = Math.Sin(latitudeDelta / 2) * Math.Sin(latitudeDelta / 2) +
            Math.Cos(startLatitude) * Math.Cos(endLatitude) *
            Math.Sin(longitudeDelta / 2) * Math.Sin(longitudeDelta / 2);

        return earthRadiusMeters * 2 * Math.Atan2(Math.Sqrt(haversine), Math.Sqrt(1 - haversine));
    }

    private static double DegreesToRadians(double degrees) =>
        degrees * Math.PI / 180;

    private static string NormalizeCode(string value) =>
        value.Trim().ToUpperInvariant();

    private static string NormalizePlate(string value) =>
        value.Replace(" ", string.Empty, StringComparison.Ordinal)
            .Replace("-", string.Empty, StringComparison.Ordinal)
            .Trim()
            .ToUpperInvariant();
}
