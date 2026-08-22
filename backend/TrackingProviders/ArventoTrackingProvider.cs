using VehicleTrackingSystem.Interfaces;
using System.Text.Json;
using VehicleTrackingSystem.DTOs.VehicleTrips;

namespace VehicleTrackingSystem.TrackingProviders;

public sealed class ArventoTrackingProvider : IVehicleTrackingProvider
{
    private const string RouteDirectory = "TrackingProviders/osrm-routes";
    private const int RouteCycleSeconds = 420;

    private static readonly IReadOnlyList<VehicleSeed> VehicleSeeds =
    [
        new("34 ITF 101", "Fire Engine 1", "Fire Truck", 0),
        new("34 ITF 102", "Fire Engine 2", "Fire Truck", 55),
        new("34 ITF 103", "Ladder Truck", "Fire Truck", 110),
        new("34 ITF 104", "Rescue Truck", "Fire Truck", 165),
        new("34 ITF 105", "Water Tanker", "Fire Truck", 220),
        new("34 CEV 201", "Garbage Truck 1", "Garbage Truck", 35),
        new("34 CEV 202", "Garbage Truck 2", "Garbage Truck", 145),
        new("34 CEV 203", "Garbage Truck 3", "Garbage Truck", 255)
    ];

    private readonly Lazy<IReadOnlyList<RouteData>> _routes;
    private readonly ITrackingProviderCredentialService _credentialService;
    private readonly IServiceScopeFactory _serviceScopeFactory;

    public ArventoTrackingProvider(
        IWebHostEnvironment environment,
        ITrackingProviderCredentialService credentialService,
        IServiceScopeFactory serviceScopeFactory)
    {
        _credentialService = credentialService;
        _serviceScopeFactory = serviceScopeFactory;
        _routes = new Lazy<IReadOnlyList<RouteData>>(
            () => LoadRoutes(environment.ContentRootPath));
    }

    public string ProviderCode => "ARVENTO";

    public async Task<IReadOnlyList<JsonElement>> GetRawLocationsAsync(
        CancellationToken cancellationToken = default)
    {
        var credentials = _credentialService.GetCredentials(ProviderCode);
        var routes = _routes.Value;
        var now = DateTimeOffset.UtcNow;
        var activeTripRoutes = await GetActiveTripRoutesAsync(cancellationToken);

        if (routes.Count == 0 && activeTripRoutes.Count == 0)
        {
            return [];
        }

        var locations = VehicleSeeds
            .Select((vehicle, index) =>
            {
                // DEMO-ONLY SIMULATOR BEHAVIOR:
                // Real tracking providers should NOT read our vehicle_trips table to decide where a vehicle is.
                // A real provider only reports actual GPS positions from the external system. This override exists
                // only so the local fake Arvento provider can visually follow an assigned route during demos.
                var route = activeTripRoutes.TryGetValue(NormalizePlate(vehicle.Plate), out var assignedTripRoute)
                    ? assignedTripRoute.Route
                    : routes[index % routes.Count];
                var isAssignedRoute = assignedTripRoute is not null;
                var routeCycleSeconds = isAssignedRoute
                    ? Math.Max(90, (int)Math.Round(route.TotalDistanceKm / Math.Max(route.EstimatedSpeedKmh, 15) * 3600))
                    : RouteCycleSeconds;
                var elapsedSeconds = isAssignedRoute
                    ? Math.Min(routeCycleSeconds, (int)Math.Max(0, (now - assignedTripRoute!.AssignedAt).TotalSeconds))
                    : (now.ToUnixTimeSeconds() + vehicle.StartOffsetSeconds) % routeCycleSeconds;
                var progress = elapsedSeconds / (double)routeCycleSeconds;
                var point = route.GetPointAt(progress);
                var speed = isAssignedRoute && elapsedSeconds >= routeCycleSeconds
                    ? 0
                    : route.EstimatedSpeedKmh;

                return JsonSerializer.SerializeToElement(new
                {
                    Vehicle = vehicle.Plate,
                    VehicleName = vehicle.Name,
                    VehicleType = vehicle.VehicleType,
                    Lat = Math.Round((decimal)point.Latitude, 6),
                    Lon = Math.Round((decimal)point.Longitude, 6),
                    VehicleSpeed = speed,
                    Ignition = true,
                    RecordTime = now,
                    HasCredentials = HasAnyCredential(credentials)
                });
            })
            .ToList();

        return locations;
    }

    private async Task<IReadOnlyDictionary<string, SimulatedTripRoute>> GetActiveTripRoutesAsync(
        CancellationToken cancellationToken)
    {
        using var scope = _serviceScopeFactory.CreateScope();
        var vehicleTripService = scope.ServiceProvider.GetRequiredService<IVehicleTripService>();
        var activeTrips = await vehicleTripService.GetActiveForProviderAsync(
            ProviderCode,
            cancellationToken);

        return activeTrips
            .Where(trip => !string.IsNullOrWhiteSpace(trip.RouteGeometry))
            .Select(trip => new
            {
                Plate = NormalizePlate(trip.VehiclePlate),
                Route = ParseRouteGeometry(trip.RouteGeometry!),
                trip.AssignedAt
            })
            .Where(tripRoute => tripRoute.Route.Points.Count > 1)
            .GroupBy(tripRoute => tripRoute.Plate)
            .ToDictionary(
                group => group.Key,
                group =>
                {
                    var tripRoute = group.First();
                    return new SimulatedTripRoute(tripRoute.Route, tripRoute.AssignedAt);
                },
                StringComparer.OrdinalIgnoreCase);
    }

    private static bool HasAnyCredential(Options.TrackingProviderCredentials credentials)
    {
        return !string.IsNullOrWhiteSpace(credentials.Username)
            || !string.IsNullOrWhiteSpace(credentials.Password)
            || !string.IsNullOrWhiteSpace(credentials.ApiKey);
    }

    private sealed record VehicleSeed(
        string Plate,
        string Name,
        string VehicleType,
        int StartOffsetSeconds);

    private sealed record SimulatedTripRoute(
        RouteData Route,
        DateTimeOffset AssignedAt);

    private static IReadOnlyList<RouteData> LoadRoutes(string contentRootPath)
    {
        var routePath = Path.Combine(
            contentRootPath,
            RouteDirectory.Replace('/', Path.DirectorySeparatorChar));

        if (!Directory.Exists(routePath))
        {
            return [];
        }

        return Directory.GetFiles(routePath, "*.json")
            .OrderBy(file => file, StringComparer.OrdinalIgnoreCase)
            .Select(ParseRoute)
            .Where(route => route.Points.Count > 1)
            .ToList();
    }

    private static RouteData ParseRoute(string filePath)
    {
        using var document = JsonDocument.Parse(File.ReadAllText(filePath));

        var features = document.RootElement.GetProperty("features").EnumerateArray();

        foreach (var feature in features)
        {
            if (!feature.TryGetProperty("geometry", out var geometry))
            {
                continue;
            }

            if (geometry.GetProperty("type").GetString() != "LineString")
            {
                continue;
            }

            var points = geometry.GetProperty("coordinates")
                .EnumerateArray()
                .Select(coordinate => new RoutePoint(
                    coordinate[1].GetDouble(),
                    coordinate[0].GetDouble()))
                .ToList();

            return new RouteData(points);
        }

        return new RouteData([]);
    }

    private static RouteData ParseRouteGeometry(string geometryJson)
    {
        using var document = JsonDocument.Parse(geometryJson);
        var root = document.RootElement;

        if (root.GetProperty("type").GetString() != "LineString")
        {
            return new RouteData([]);
        }

        var points = root.GetProperty("coordinates")
            .EnumerateArray()
            .Select(coordinate => new RoutePoint(
                coordinate[1].GetDouble(),
                coordinate[0].GetDouble()))
            .ToList();

        return new RouteData(points);
    }

    private static string NormalizePlate(string value) =>
        value.Replace(" ", string.Empty, StringComparison.Ordinal)
            .Replace("-", string.Empty, StringComparison.Ordinal)
            .Trim()
            .ToUpperInvariant();

    private sealed class RouteData
    {
        private readonly IReadOnlyList<double> _cumulativeDistances;

        public RouteData(IReadOnlyList<RoutePoint> points)
        {
            Points = points;
            _cumulativeDistances = BuildCumulativeDistances(points);
            TotalDistanceKm = _cumulativeDistances.Count == 0 ? 0 : _cumulativeDistances[^1];
            EstimatedSpeedKmh = TotalDistanceKm <= 0
                ? 0
                : Math.Clamp((int)Math.Round(TotalDistanceKm / RouteCycleSeconds * 3600), 15, 80);
        }

        public IReadOnlyList<RoutePoint> Points { get; }

        public double TotalDistanceKm { get; }

        public int EstimatedSpeedKmh { get; }

        public RoutePoint GetPointAt(double progress)
        {
            if (Points.Count == 0)
            {
                return new RoutePoint(0, 0);
            }

            if (Points.Count == 1 || TotalDistanceKm <= 0)
            {
                return Points[0];
            }

            var targetDistance = TotalDistanceKm * progress;

            for (var index = 1; index < _cumulativeDistances.Count; index++)
            {
                if (_cumulativeDistances[index] < targetDistance)
                {
                    continue;
                }

                var previousDistance = _cumulativeDistances[index - 1];
                var segmentDistance = _cumulativeDistances[index] - previousDistance;
                var segmentProgress = segmentDistance == 0
                    ? 0
                    : (targetDistance - previousDistance) / segmentDistance;

                return Interpolate(Points[index - 1], Points[index], segmentProgress);
            }

            return Points[^1];
        }

        private static IReadOnlyList<double> BuildCumulativeDistances(IReadOnlyList<RoutePoint> points)
        {
            if (points.Count == 0)
            {
                return [];
            }

            var distances = new List<double> { 0 };

            for (var index = 1; index < points.Count; index++)
            {
                distances.Add(distances[^1] + DistanceKm(points[index - 1], points[index]));
            }

            return distances;
        }

        private static RoutePoint Interpolate(RoutePoint start, RoutePoint end, double progress)
        {
            return new RoutePoint(
                start.Latitude + (end.Latitude - start.Latitude) * progress,
                start.Longitude + (end.Longitude - start.Longitude) * progress);
        }

        private static double DistanceKm(RoutePoint start, RoutePoint end)
        {
            const double earthRadiusKm = 6371;

            var latitudeDelta = DegreesToRadians(end.Latitude - start.Latitude);
            var longitudeDelta = DegreesToRadians(end.Longitude - start.Longitude);
            var startLatitude = DegreesToRadians(start.Latitude);
            var endLatitude = DegreesToRadians(end.Latitude);

            var haversine = Math.Sin(latitudeDelta / 2) * Math.Sin(latitudeDelta / 2) +
                Math.Cos(startLatitude) * Math.Cos(endLatitude) *
                Math.Sin(longitudeDelta / 2) * Math.Sin(longitudeDelta / 2);

            return earthRadiusKm * 2 * Math.Atan2(Math.Sqrt(haversine), Math.Sqrt(1 - haversine));
        }

        private static double DegreesToRadians(double degrees) =>
            degrees * Math.PI / 180;
    }

    private sealed record RoutePoint(double Latitude, double Longitude);
}
