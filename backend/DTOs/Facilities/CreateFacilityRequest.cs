using System.ComponentModel.DataAnnotations;

namespace VehicleTrackingSystem.DTOs.Facilities;

public sealed record CreateFacilityRequest(
    [Required, MaxLength(150)] string Name,
    [Required, MaxLength(50)] string Code,
    [Required, MaxLength(50)] string FacilityType,
    [Required] string Location,
    string? Boundary);
