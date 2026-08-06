# Vehicle Tracking System

This repository contains the second-stage vehicle tracking project split into two applications:

```text
backend/   ASP.NET Core Web API, provider architecture, SignalR live updates
frontend/  React, Leaflet map, SignalR client
```

## Run Backend

```powershell
cd backend
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

## Run Frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://127.0.0.1:5173
```
