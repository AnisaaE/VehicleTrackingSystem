# Vehicle Tracking System Backend Documentation

## Overview

The backend is a .NET 8 ASP.NET Core Web API for a municipal vehicle tracking system. It stores provider configuration, maps vehicle types to GPS providers, exposes current vehicle locations, serves facility and destination data, calculates routes, and broadcasts live updates through SignalR.

The application currently runs with Oracle by default, but it also contains PostgreSQL support through a second EF Core context and migration set.

## Database Schema

The Oracle database is built from the migrations in `Migrations/Oracle`. The schema contains six application tables:

```text
providers
vehicle_types
field_mappings
facilities
destinations
route_requests
```

### Table: providers

Stores GPS tracking provider definitions.

| Column | Oracle type | Nullable | Description |
| --- | --- | --- | --- |
| Id | NUMBER(10) identity | No | Primary key. |
| Name | NVARCHAR2(100) | No | Human-readable provider name. |
| Code | NVARCHAR2(50) | No | Unique provider code used by the application, for example `ARVENTO`. |
| ServiceUrl | NVARCHAR2(500) | No | Provider service URL or placeholder URL. |
| IsActive | BOOLEAN | No | Controls whether the provider can be resolved and used. |

Indexes and constraints:

| Name | Type | Columns |
| --- | --- | --- |
| PK_providers | Primary key | Id |
| IX_providers_Code | Unique index | Code |

### Table: vehicle_types

Stores vehicle categories and assigns each category to one provider.

| Column | Oracle type | Nullable | Description |
| --- | --- | --- | --- |
| Id | NUMBER(10) identity | No | Primary key. |
| Name | NVARCHAR2(100) | No | Display name, for example `Fire Truck`. |
| Code | NVARCHAR2(50) | No | Unique vehicle type code, for example `FIRE_TRUCK`. |
| ProviderId | NUMBER(10) | No | Foreign key to `providers.Id`. |

Indexes and constraints:

| Name | Type | Columns |
| --- | --- | --- |
| PK_vehicle_types | Primary key | Id |
| FK_vehicle_types_providers_ProviderId | Foreign key | ProviderId -> providers.Id |
| IX_vehicle_types_Code | Unique index | Code |
| IX_vehicle_types_ProviderId | Non-unique index | ProviderId |

Delete behavior:

`ProviderId` uses restricted delete behavior. A provider cannot be deleted while vehicle types reference it.

### Table: field_mappings

Stores mappings between the application's normalized vehicle-location fields and each provider's external field names.

| Column | Oracle type | Nullable | Description |
| --- | --- | --- | --- |
| Id | NUMBER(10) identity | No | Primary key. |
| ProviderId | NUMBER(10) | No | Foreign key to `providers.Id`. |
| SystemField | NVARCHAR2(100) | No | Internal field name used by this application. |
| ProviderField | NVARCHAR2(100) | No | Field name used by the external provider payload. |

Indexes and constraints:

| Name | Type | Columns |
| --- | --- | --- |
| PK_field_mappings | Primary key | Id |
| FK_field_mappings_providers_ProviderId | Foreign key | ProviderId -> providers.Id |
| IX_field_mappings_ProviderId_SystemField | Unique index | ProviderId, SystemField |

Delete behavior:

`ProviderId` uses restricted delete behavior. A provider cannot be deleted while field mappings reference it.

### Table: facilities

Stores spatial facilities such as fire stations and hospitals. This table is created with raw SQL because it uses Oracle Spatial `SDO_GEOMETRY`.

| Column | Oracle type | Nullable | Description |
| --- | --- | --- | --- |
| id | NUMBER(10) identity | No | Primary key. |
| name | NVARCHAR2(150) | No | Facility display name. |
| code | NVARCHAR2(50) | No | Unique facility code. Seeded OSM records use codes such as `OSM_WAY_...` and `OSM_HOSPITAL_...`. |
| facility_type | NVARCHAR2(50) | No | Facility category, currently `FIRE_STATION` or `HOSPITAL`. |
| location | SDO_GEOMETRY | No | Point geometry stored with SRID 4326. |
| boundary | SDO_GEOMETRY | Yes | Optional polygon geometry stored with SRID 4326. |

Indexes and spatial metadata:

| Name | Type | Columns |
| --- | --- | --- |
| ix_facilities_code | Unique index | code |
| ix_facilities_location_spatial | Oracle Spatial index | location |
| ix_facilities_boundary_spatial | Oracle Spatial index | boundary |

The migration registers `FACILITIES.LOCATION` and `FACILITIES.BOUNDARY` in `USER_SDO_GEOM_METADATA` with longitude and latitude dimensions and SRID `4326`.

### Table: destinations

Stores predefined route destinations.

| Column | Oracle type | Nullable | Description |
| --- | --- | --- | --- |
| id | NUMBER(10) identity | No | Primary key. |
| name | NVARCHAR2(200) | No | Destination display name. |
| location | SDO_GEOMETRY | No | Point geometry stored with SRID 4326. |

Indexes and spatial metadata:

| Name | Type | Columns |
| --- | --- | --- |
| ix_destinations_location_spatial | Oracle Spatial index | location |

The migration registers `DESTINATIONS.LOCATION` in `USER_SDO_GEOM_METADATA` with longitude and latitude dimensions and SRID `4326`.

### Table: route_requests

Logs route calculations requested through the API.

| Column | Oracle type | Nullable | Description |
| --- | --- | --- | --- |
| id | NUMBER(10) identity | No | Primary key. |
| vehicle_plate | NVARCHAR2(50) | Yes | Optional vehicle plate attached to the route request. |
| provider_code | NVARCHAR2(50) | Yes | Optional provider code attached to the request. |
| from_facility_id | NUMBER(10) | No | Origin facility foreign key. |
| to_destination_id | NUMBER(10) | Yes | Optional predefined destination foreign key. |
| to_latitude | BINARY_DOUBLE | No | Destination latitude used for the route. |
| to_longitude | BINARY_DOUBLE | No | Destination longitude used for the route. |
| requested_at | TIMESTAMP WITH TIME ZONE | No | Request timestamp. Oracle inserts `SYSTIMESTAMP`. |

Indexes and constraints:

| Name | Type | Columns |
| --- | --- | --- |
| Primary key | Primary key | id |
| fk_route_requests_facilities | Foreign key | from_facility_id -> facilities.id |
| fk_route_requests_destinations | Foreign key | to_destination_id -> destinations.id |

## Database Relationships

```text
providers
|-- many vehicle_types
`-- many field_mappings

facilities
`-- many route_requests as route origin

destinations
`-- many route_requests as optional saved destination
```

Provider relationships are modeled with Entity Framework Core. Spatial tables are accessed with raw SQL because EF Core does not map the Oracle Spatial operations used by this project.

## Seed Data

`DatabaseSeeder` runs on application startup after migrations are applied. It is idempotent and checks existing rows before inserting default providers, vehicle types, and field mappings.

Seeded providers:

| Name | Code | ServiceUrl | Active |
| --- | --- | --- | --- |
| Arvento | ARVENTO | https://api.arvento.example | Yes |
| Sampas | SAMPAS | https://api.sampas.example | Yes |
| Mobiliz | MOBILIZ | https://api.mobiliz.example | Yes |

Seeded vehicle types:

| Vehicle type | Code | Provider |
| --- | --- | --- |
| Ambulance | AMBULANCE | ARVENTO |
| Garbage Truck | GARBAGE_TRUCK | SAMPAS |
| Fire Truck | FIRE_TRUCK | ARVENTO |
| Work Machine | WORK_MACHINE | SAMPAS |
| Street Sweeper | SWEEPER | ARVENTO |

Provider field mappings:

| System field | ARVENTO | SAMPAS | MOBILIZ |
| --- | --- | --- | --- |
| Plate | Vehicle | PlateNo | LicensePlate |
| VehicleName | VehicleName | VehicleName | VehicleName |
| VehicleType | VehicleType | VehicleType | VehicleType |
| Latitude | Lat | Latitude | Y |
| Longitude | Lon | Longitude | X |
| Speed | VehicleSpeed | Speed | CurrentSpeed |
| IgnitionOn | Ignition | IgnitionStatus | IgnitionState |
| Timestamp | RecordTime | DateTime | GpsTime |

Spatial seed data:

| Migration | Data inserted |
| --- | --- |
| `AddFacilitiesRoutingGeometry` | 1 initial fire station and 3 sample destinations. |
| `AddOsmKocaeliFireStations` | 13 Kocaeli fire station facilities from OpenStreetMap-style records. |
| `AddOsmKocaeliHospitals` | 46 Kocaeli hospital or health facility records from OpenStreetMap-style records. |

Total seeded facilities after all Oracle migrations: 60.

## Oracle Spatial Model

The project stores map data as Oracle Spatial geometries:

| Concept | Geometry | API format |
| --- | --- | --- |
| Facility location | `SDO_GEOMETRY` point | GeoJSON point |
| Facility boundary | `SDO_GEOMETRY` polygon | GeoJSON polygon |
| Destination location | `SDO_GEOMETRY` point | GeoJSON point |

When data is returned to the API, Oracle geometries are converted with `SDO_UTIL.TO_GEOJSON`. When new facilities are created, incoming GeoJSON is converted with `SDO_UTIL.FROM_GEOJSON`.

Coordinates use SRID `4326`, which means WGS 84 longitude/latitude coordinates.

Example point:

```json
{
  "type": "Point",
  "coordinates": [29.955, 40.772]
}
```

Example polygon:

```json
{
  "type": "Polygon",
  "coordinates": [
    [
      [29.936, 40.762],
      [29.944, 40.762],
      [29.944, 40.768],
      [29.936, 40.768],
      [29.936, 40.762]
    ]
  ]
}
```

## Application Architecture

```text
Controllers
|-- receive HTTP requests
|-- validate route/query/body values
`-- return DTO responses

Services
|-- contain business logic
|-- query EF Core entities or spatial SQL
`-- call routing/geocoding/provider abstractions

Data
|-- VehicleTrackingDbContext
|-- OracleVehicleTrackingDbContext
`-- PostgreSqlVehicleTrackingDbContext

TrackingProviders
|-- ArventoTrackingProvider
|-- SampasTrackingProvider
`-- MobilizTrackingProvider
```

Main runtime behavior:

1. `Program.cs` loads `appsettings.json` and optional `appsettings.Local.json`.
2. The configured `DatabaseProvider` decides whether Oracle or PostgreSQL EF Core is used.
3. EF Core migrations are applied automatically on startup.
4. `DatabaseSeeder` inserts default providers, vehicle types, and field mappings.
5. Controllers expose REST endpoints.
6. `VehicleLocationBroadcastService` broadcasts vehicle locations every 3 seconds through SignalR.

## API Endpoints

### Providers

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/providers` | Returns all providers. |
| GET | `/api/providers/{id}` | Returns provider details by id. |
| GET | `/api/providers/{id}/field-mappings` | Returns field mappings for one provider. |
| POST | `/api/providers` | Creates a provider. |
| PUT | `/api/providers/{id}` | Updates a provider. |
| DELETE | `/api/providers/{id}` | Deletes a provider if it is not referenced. |

### Vehicle Types

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/vehicle-types` | Returns all vehicle types. |
| GET | `/api/vehicle-types/{id}` | Returns vehicle type details by id. |
| GET | `/api/vehicle-types/{code}/provider` | Resolves the provider configured for a vehicle type code. |
| POST | `/api/vehicle-types` | Creates a vehicle type. |
| PUT | `/api/vehicle-types/{id}` | Updates a vehicle type. |
| DELETE | `/api/vehicle-types/{id}` | Deletes a vehicle type. |

### Vehicles

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/vehicles` | Returns current vehicle locations from all providers. |
| GET | `/api/vehicles?providerCode=ARVENTO` | Returns current vehicle locations for one provider. |
| GET | `/api/vehicles/{plate}` | Returns the current location for one vehicle plate. |
| GET | `/api/vehicles/{plate}?providerCode=ARVENTO` | Searches for a plate inside one provider. |

Vehicle location response shape:

```json
{
  "plate": "34 ITF 101",
  "vehicleName": "Fire Truck 1",
  "vehicleType": "FIRE_TRUCK",
  "provider": "ARVENTO",
  "latitude": 40.765,
  "longitude": 29.94,
  "speed": 45,
  "ignitionOn": true,
  "lastLocationTime": "2026-08-19T10:15:30+03:00"
}
```

### Facilities

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/facilities` | Returns all facilities as DTOs with GeoJSON location and optional boundary. |
| GET | `/api/facilities/{id}` | Returns one facility by id. |
| POST | `/api/facilities` | Creates a facility from GeoJSON point and optional polygon boundary. |

Create facility request example:

```json
{
  "name": "New Fire Station",
  "code": "FIRE_STATION_NEW",
  "facilityType": "FIRE_STATION",
  "location": "{\"type\":\"Point\",\"coordinates\":[29.955,40.772]}",
  "boundary": null
}
```

### Routes

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/routes?fromFacilityId=1&toDestinationId=1` | Calculates a route from a facility to a saved destination. |
| GET | `/api/routes?fromFacilityId=1&toLat=40.772&toLon=29.955` | Calculates a route from a facility to raw coordinates. |

Optional query parameters:

| Parameter | Description |
| --- | --- |
| `vehiclePlate` | Stored in `route_requests.vehicle_plate` for logging. |
| `providerCode` | Stored in `route_requests.provider_code` for logging. |

Route response shape:

```json
{
  "geometry": "{GeoJSON line string}",
  "distanceMeters": 1250.5,
  "durationSeconds": 320.0,
  "steps": []
}
```

Every successful route request is inserted into `route_requests`.

### Geocoding

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/geocode?q=Izmit` | Searches the configured geocoding provider. |

The default geocoding provider is Nominatim.

### SignalR

| Hub | Event | Description |
| --- | --- | --- |
| `/vehicle-location-hub` | `vehicleLocationsUpdated` | Broadcasts current vehicle locations every 3 seconds. |

## Configuration

The default configuration is in `appsettings.json`. Local developer overrides can be placed in `appsettings.Local.json`.

Current default database configuration:

```json
{
  "DatabaseProvider": "Oracle",
  "ConnectionStrings": {
    "OracleConnection": "User Id=vehicle_user;Password=VehiclePass123;Data Source=localhost:1521/FREEPDB1"
  }
}
```

For a Docker Oracle container, the important parts are:

| Setting | Typical value |
| --- | --- |
| Host | `localhost` |
| Port | `1521` |
| Service name | `FREEPDB1`, `XEPDB1`, or the service exposed by the container image |
| User | `vehicle_user` |
| Password | local development password |

Do not commit real production passwords. Use `appsettings.Local.json`, environment variables, or a secrets manager for real credentials.

Other configuration sections:

| Section | Purpose |
| --- | --- |
| `Cors:AllowedOrigins` | Frontend origins allowed to call the API and connect to SignalR. |
| `TrackingProviders:Credentials` | Provider-specific credentials for Arvento, Sampas, and Mobiliz. |
| `Geocoding` | Nominatim base URL, user agent, rate limit, and cache duration. |
| `Routing` | OSRM base URL, profile, and optional API key. |

## Local Development

Restore packages:

```powershell
dotnet restore
```

Build:

```powershell
dotnet build
```

Run the backend:

```powershell
dotnet run
```

Swagger:

```text
http://localhost:5030/swagger
```

SignalR hub:

```text
http://localhost:5030/vehicle-location-hub
```

## Docker Oracle Notes

The backend expects Oracle to be reachable from Windows through a published Docker port. Check the container:

```powershell
docker ps
```

The `PORTS` column should contain something like:

```text
0.0.0.0:1521->1521/tcp
```

If the database container exposes service `FREEPDB1`, the backend connection string format is:

```text
User Id=vehicle_user;Password=VehiclePass123;Data Source=localhost:1521/FREEPDB1
```

The same values can be used in Oracle SQL Developer or DBeaver:

| Field | Value |
| --- | --- |
| Host | `localhost` |
| Port | `1521` |
| Service name | `FREEPDB1` |
| Username | `vehicle_user` |
| Password | `VehiclePass123` |

## EF Core Migrations

Oracle migrations are stored in:

```text
Migrations/Oracle
```

PostgreSQL migrations are stored in:

```text
Migrations/PostgreSql
```

At startup, the backend calls:

```csharp
await dbContext.Database.MigrateAsync();
await DatabaseSeeder.SeedAsync(dbContext);
```

This means the database schema is automatically updated when the application starts, assuming the configured user has the required permissions.

## External Integrations

| Integration | Current behavior |
| --- | --- |
| Arvento | Registered as a tracking provider and currently returns simulated fire truck locations. |
| Sampas | Registered as a provider integration placeholder. |
| Mobiliz | Registered as a provider integration placeholder. |
| Nominatim | Used for geocoding searches. |
| OSRM | Used for route calculation. |
| SignalR | Used for live vehicle-location broadcasts to the frontend. |

## Important Design Decisions

Provider resolution is data-driven. Vehicle types are connected to providers through the `vehicle_types.ProviderId` foreign key, not hardcoded in controllers.

Field normalization is stored in `field_mappings`. This allows provider payloads to use different names while the application uses one internal model.

Spatial data is stored directly in Oracle using `SDO_GEOMETRY`. The API exchanges spatial values as GeoJSON strings so the frontend can render them easily on a map.

Route requests are logged in the database. This gives the system a simple audit/history table for route calculations.

The backend supports both Oracle and PostgreSQL, but the active default is Oracle.
