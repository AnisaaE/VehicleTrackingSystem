using System.ComponentModel.DataAnnotations;

namespace VehicleTrackingSystem.DTOs.Destinations;

public sealed record CreateDestinationRequest(
    [Required, MaxLength(200)] string Name,
    [Required] string Location);
