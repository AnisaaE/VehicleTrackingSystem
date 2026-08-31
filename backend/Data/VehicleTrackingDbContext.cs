using Microsoft.EntityFrameworkCore;
using VehicleTrackingSystem.Entities;

namespace VehicleTrackingSystem.Data;

public class VehicleTrackingDbContext : DbContext
{
    public VehicleTrackingDbContext(DbContextOptions options)
        : base(options)
    {
    }

    public DbSet<Provider> Providers => Set<Provider>();

    public DbSet<VehicleType> VehicleTypes => Set<VehicleType>();

    public DbSet<FieldMapping> FieldMappings => Set<FieldMapping>();

    public DbSet<Vehicle> Vehicles => Set<Vehicle>();

    public DbSet<Employee> Employees => Set<Employee>();

    public DbSet<UserAccount> UserAccounts => Set<UserAccount>();

    public DbSet<VehicleTrip> VehicleTrips => Set<VehicleTrip>();

    public DbSet<VehicleProviderSeen> VehicleProviderSeen => Set<VehicleProviderSeen>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Provider>(entity =>
        {
            entity.ToTable("providers");

            entity.HasKey(provider => provider.Id);

            entity.Property(provider => provider.Name)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(provider => provider.Code)
                .HasMaxLength(50)
                .IsRequired();

            entity.HasIndex(provider => provider.Code)
                .IsUnique();

            entity.Property(provider => provider.ServiceUrl)
                .HasMaxLength(500)
                .IsRequired();

            entity.Property(provider => provider.IsActive)
                .IsRequired();

            entity.HasMany(provider => provider.VehicleTypes)
                .WithOne(vehicleType => vehicleType.Provider)
                .HasForeignKey(vehicleType => vehicleType.ProviderId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(provider => provider.FieldMappings)
                .WithOne(fieldMapping => fieldMapping.Provider)
                .HasForeignKey(fieldMapping => fieldMapping.ProviderId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<VehicleType>(entity =>
        {
            entity.ToTable("vehicle_types");

            entity.HasKey(vehicleType => vehicleType.Id);

            entity.Property(vehicleType => vehicleType.Name)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(vehicleType => vehicleType.Code)
                .HasMaxLength(50)
                .IsRequired();

            entity.HasIndex(vehicleType => vehicleType.Code)
                .IsUnique();
        });

        modelBuilder.Entity<FieldMapping>(entity =>
        {
            entity.ToTable("field_mappings");

            entity.HasKey(fieldMapping => fieldMapping.Id);

            entity.Property(fieldMapping => fieldMapping.SystemField)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(fieldMapping => fieldMapping.ProviderField)
                .HasMaxLength(100)
                .IsRequired();

            entity.HasIndex(fieldMapping => new
                {
                    fieldMapping.ProviderId,
                    fieldMapping.SystemField
                })
                .IsUnique();
        });

        modelBuilder.Entity<Vehicle>(entity =>
        {
            entity.ToTable("vehicles");

            entity.HasKey(vehicle => vehicle.Id);

            entity.Property(vehicle => vehicle.Plate)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(vehicle => vehicle.Name)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(vehicle => vehicle.IsActive)
                .IsRequired();

            entity.Property(vehicle => vehicle.CreatedAt)
                .IsRequired();

            entity.Property(vehicle => vehicle.UpdatedAt)
                .IsRequired();

            entity.HasIndex(vehicle => new
                {
                    vehicle.ProviderId,
                    vehicle.Plate
                })
                .IsUnique();

            entity.HasOne(vehicle => vehicle.Provider)
                .WithMany()
                .HasForeignKey(vehicle => vehicle.ProviderId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(vehicle => vehicle.VehicleType)
                .WithMany()
                .HasForeignKey(vehicle => vehicle.VehicleTypeId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Employee>(entity =>
        {
            entity.ToTable("employees");

            entity.HasKey(employee => employee.Id);

            entity.Property(employee => employee.FullName)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(employee => employee.Phone)
                .HasMaxLength(50);

            entity.Property(employee => employee.Email)
                .HasMaxLength(200);

            entity.Property(employee => employee.Role)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(employee => employee.IsActive)
                .IsRequired();

            entity.Property(employee => employee.CreatedAt)
                .IsRequired();

            entity.Property(employee => employee.UpdatedAt)
                .IsRequired();
        });

        modelBuilder.Entity<UserAccount>(entity =>
        {
            entity.ToTable("user_accounts");

            entity.HasKey(user => user.Id);

            entity.Property(user => user.Username)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(user => user.PasswordHash)
                .HasMaxLength(500)
                .IsRequired();

            entity.Property(user => user.Role)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(user => user.IsActive)
                .IsRequired();

            entity.Property(user => user.CreatedAt)
                .IsRequired();

            entity.Property(user => user.UpdatedAt)
                .IsRequired();

            entity.HasIndex(user => user.Username)
                .IsUnique();

            entity.HasOne(user => user.Employee)
                .WithMany()
                .HasForeignKey(user => user.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<VehicleTrip>(entity =>
        {
            entity.ToTable("vehicle_trips");

            entity.HasKey(trip => trip.Id);

            entity.Property(trip => trip.Status)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(trip => trip.AssignedAt)
                .IsRequired();

            entity.Property(trip => trip.Notes)
                .HasMaxLength(1000);

            entity.Property(trip => trip.RouteGeometry);

            entity.Property(trip => trip.ActualRouteGeometry);

            entity.HasIndex(trip => new
            {
                trip.VehicleId,
                trip.Status
            });

            entity.HasOne(trip => trip.Vehicle)
                .WithMany()
                .HasForeignKey(trip => trip.VehicleId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(trip => trip.Driver)
                .WithMany()
                .HasForeignKey(trip => trip.DriverId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(trip => trip.AssignedByEmployee)
                .WithMany()
                .HasForeignKey(trip => trip.AssignedByEmployeeId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(trip => trip.CompletedByEmployee)
                .WithMany()
                .HasForeignKey(trip => trip.CompletedByEmployeeId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<VehicleProviderSeen>(entity =>
        {
            entity.ToTable("vehicle_provider_seen");

            entity.HasKey(seen => seen.Id);

            entity.Property(seen => seen.LastSeenAt)
                .IsRequired();

            entity.Property(seen => seen.LastProviderTimestamp)
                .IsRequired();

            entity.HasIndex(seen => new
                {
                    seen.VehicleId,
                    seen.ProviderId
                })
                .IsUnique();

            entity.HasOne(seen => seen.Vehicle)
                .WithMany()
                .HasForeignKey(seen => seen.VehicleId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(seen => seen.Provider)
                .WithMany()
                .HasForeignKey(seen => seen.ProviderId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
