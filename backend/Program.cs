using Microsoft.EntityFrameworkCore;
using VehicleTrackingSystem.Data;
using VehicleTrackingSystem.Hubs;
using VehicleTrackingSystem.Interfaces;
using VehicleTrackingSystem.Services;
using VehicleTrackingSystem.TrackingProviders;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSignalR();
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins(
                "http://localhost:5173",
                "https://localhost:5173",
                "http://127.0.0.1:5173",
                "https://127.0.0.1:5173")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());
});

builder.Services.AddDbContext<VehicleTrackingDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IProviderService, ProviderService>();
builder.Services.AddScoped<IVehicleTypeService, VehicleTypeService>();
builder.Services.AddScoped<IVehicleLocationService, VehicleLocationService>();
builder.Services.AddScoped<IVehicleTrackingProviderResolver, VehicleTrackingProviderResolver>();
builder.Services.AddHostedService<VehicleLocationBroadcastService>();

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
app.MapHub<VehicleLocationHub>("/vehicle-location-hub");

app.Run();
