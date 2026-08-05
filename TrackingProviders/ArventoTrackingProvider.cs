using VehicleTrackingSystem.Interfaces;
using VehicleTrackingSystem.DTOs.Vehicles;

namespace VehicleTrackingSystem.TrackingProviders;

public sealed class ArventoTrackingProvider : IVehicleTrackingProvider
{
    private static readonly IReadOnlyList<VehicleSeed> Vehicles =
    [
        new("34 ITF 101", "Fire Engine 1", 41.015137, 28.979530, 38, true, 0.00090, 0.00050),
        new("34 ITF 102", "Fire Engine 2", 41.025420, 28.974250, 24, true, -0.00070, 0.00055),
        new("34 ITF 103", "Ladder Truck", 41.008610, 28.986910, 0, false, 0.00000, 0.00000),
        new("34 ITF 104", "Rescue Truck", 41.032180, 28.963420, 46, true, 0.00065, -0.00045),
        new("34 ITF 105", "Water Tanker", 41.018780, 28.993260, 31, true, -0.00040, -0.00065)
    ];

    public string ProviderCode => "ARVENTO";

    public Task<IReadOnlyList<VehicleLocationDto>> GetCurrentLocationsAsync(
        CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;
        var tick = now.ToUnixTimeSeconds() / 5d;

        var locations = Vehicles
            .Select((vehicle, index) =>
            {
                var movementFactor = Math.Sin((tick + index) / 6d);
                var latitude = vehicle.Latitude + vehicle.LatitudeStep * movementFactor;
                var longitude = vehicle.Longitude + vehicle.LongitudeStep * movementFactor;
                var speed = vehicle.IgnitionOn
                    ? Math.Max(0, vehicle.BaseSpeed + (int)Math.Round(Math.Cos((tick + index) / 4d) * 6))
                    : 0;

                return new VehicleLocationDto(
                    vehicle.Plate,
                    vehicle.Name,
                    "Fire Truck",
                    ProviderCode,
                    Math.Round((decimal)latitude, 6),
                    Math.Round((decimal)longitude, 6),
                    speed,
                    vehicle.IgnitionOn,
                    now);
            })
            .ToList();

        return Task.FromResult<IReadOnlyList<VehicleLocationDto>>(locations);
    }

    private sealed record VehicleSeed(
        string Plate,
        string Name,
        double Latitude,
        double Longitude,
        int BaseSpeed,
        bool IgnitionOn,
        double LatitudeStep,
        double LongitudeStep);
}
