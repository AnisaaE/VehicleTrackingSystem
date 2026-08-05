using Microsoft.EntityFrameworkCore;
using VehicleTrackingSystem.Data;
using VehicleTrackingSystem.Interfaces;
using VehicleTrackingSystem.Services;
using VehicleTrackingSystem.TrackingProviders;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod());
});

builder.Services.AddDbContext<VehicleTrackingDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IProviderService, ProviderService>();
builder.Services.AddScoped<IVehicleTypeService, VehicleTypeService>();
builder.Services.AddScoped<IVehicleLocationService, VehicleLocationService>();
builder.Services.AddScoped<IVehicleTrackingProviderResolver, VehicleTrackingProviderResolver>();

builder.Services.AddScoped<IVehicleTrackingProvider, ArventoTrackingProvider>();
builder.Services.AddScoped<IVehicleTrackingProvider, SampasTrackingProvider>();
builder.Services.AddScoped<IVehicleTrackingProvider, MobilizTrackingProvider>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("Frontend");

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<VehicleTrackingDbContext>();

    await dbContext.Database.MigrateAsync();
    await DatabaseSeeder.SeedAsync(dbContext);
}

app.MapControllers();

app.Run();
