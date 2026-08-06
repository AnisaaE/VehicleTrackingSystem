using Microsoft.EntityFrameworkCore;
using VehicleTrackingSystem.Entities;

namespace VehicleTrackingSystem.Data;

public sealed class VehicleTrackingDbContext : DbContext
{
    public VehicleTrackingDbContext(DbContextOptions<VehicleTrackingDbContext> options)
        : base(options)
    {
    }

    public DbSet<Provider> Providers => Set<Provider>();

    public DbSet<VehicleType> VehicleTypes => Set<VehicleType>();

    public DbSet<FieldMapping> FieldMappings => Set<FieldMapping>();

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
    }
}
