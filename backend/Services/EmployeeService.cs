using Microsoft.EntityFrameworkCore;
using VehicleTrackingSystem.Data;
using VehicleTrackingSystem.DTOs.Employees;
using VehicleTrackingSystem.Entities;
using VehicleTrackingSystem.Interfaces;

namespace VehicleTrackingSystem.Services;

public sealed class EmployeeService : IEmployeeService
{
    private readonly VehicleTrackingDbContext _dbContext;

    public EmployeeService(VehicleTrackingDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<EmployeeDto>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.Employees
            .AsNoTracking()
            .OrderBy(employee => employee.FullName)
            .Select(employee => ToDto(employee))
            .ToListAsync(cancellationToken);
    }

    public async Task<EmployeeDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var employee = await _dbContext.Employees
            .AsNoTracking()
            .FirstOrDefaultAsync(currentEmployee => currentEmployee.Id == id, cancellationToken);

        return employee is null ? null : ToDto(employee);
    }

    public async Task<EmployeeDto> CreateAsync(
        CreateEmployeeRequest request,
        CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;
        var employee = new Employee
        {
            FullName = request.FullName.Trim(),
            Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim(),
            Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim(),
            Role = NormalizeRole(request.Role),
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };

        _dbContext.Employees.Add(employee);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(employee);
    }

    private static string NormalizeRole(string role) =>
        string.IsNullOrWhiteSpace(role)
            ? "DRIVER"
            : role.Trim().ToUpperInvariant();

    private static EmployeeDto ToDto(Employee employee) =>
        new(
            employee.Id,
            employee.FullName,
            employee.Phone,
            employee.Email,
            employee.Role,
            employee.IsActive);
}
