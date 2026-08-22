using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using VehicleTrackingSystem.Auth;
using VehicleTrackingSystem.DTOs.Employees;
using VehicleTrackingSystem.DTOs.Errors;
using VehicleTrackingSystem.Interfaces;

namespace VehicleTrackingSystem.Controllers;

[ApiController]
[Authorize(Roles = AppRoles.AdminOrDispatcher)]
[Route("api/employees")]
public sealed class EmployeesController : ControllerBase
{
    private readonly IEmployeeService _employeeService;

    public EmployeesController(IEmployeeService employeeService)
    {
        _employeeService = employeeService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<EmployeeDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<EmployeeDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        return Ok(await _employeeService.GetAllAsync(cancellationToken));
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.Admin)]
    [ProducesResponseType(typeof(EmployeeDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<EmployeeDto>> Create(
        CreateEmployeeRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            return BadRequest(new ErrorResponse("Employee full name is required."));
        }

        var employee = await _employeeService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetAll), new { id = employee.Id }, employee);
    }
}
