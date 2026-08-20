using Microsoft.AspNetCore.Mvc;
using VehicleTrackingSystem.DTOs.AppConfig;

namespace VehicleTrackingSystem.Controllers;

[ApiController]
[Route("api/app-config")]
public sealed class AppConfigController : ControllerBase
{
    private readonly IConfiguration _configuration;

    public AppConfigController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PublicAppConfigDto), StatusCodes.Status200OK)]
    public ActionResult<PublicAppConfigDto> Get()
    {
        return Ok(new PublicAppConfigDto(
            _configuration.GetValue<string>("Application:MunicipalityName") ?? "Municipality",
            _configuration.GetValue<string>("Application:AppTitle") ?? "Vehicle Tracking System"));
    }
}
