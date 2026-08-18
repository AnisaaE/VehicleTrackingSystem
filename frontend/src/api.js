import * as signalR from '@microsoft/signalr';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5030';
const HUB_URL = `${API_BASE_URL}/vehicle-location-hub`;

export async function fetchProviders() {
  const response = await fetch(`${API_BASE_URL}/api/providers`);

  if (!response.ok) {
    throw new Error('Sağlayıcı verileri yüklenemedi.');
  }

  return response.json();
}

export async function fetchVehicles(providerCode) {
  const query = providerCode ? `?providerCode=${encodeURIComponent(providerCode)}` : '';
  const response = await fetch(`${API_BASE_URL}/api/vehicles${query}`);

  if (!response.ok) {
    throw new Error('Araç konum verileri yüklenemedi.');
  }

  return response.json();
}

export async function fetchFacilities() {
  const response = await fetch(`${API_BASE_URL}/api/facilities`);

  if (!response.ok) {
    throw new Error('Tesis verileri yuklenemedi.');
  }

  return response.json();
}

export async function createFacility(facility) {
  const response = await fetch(`${API_BASE_URL}/api/facilities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(facility)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message ?? 'Tesis kaydedilemedi.');
  }

  return response.json();
}

export async function geocodeAddress(query) {
  const response = await fetch(`${API_BASE_URL}/api/geocode?q=${encodeURIComponent(query)}`);

  if (!response.ok) {
    throw new Error('Adres arama tamamlanamadi.');
  }

  return response.json();
}

export async function fetchRoute({ fromFacilityId, toLat, toLon, toDestinationId, vehiclePlate, providerCode }) {
  const params = new URLSearchParams({
    fromFacilityId: String(fromFacilityId)
  });

  if (toDestinationId) {
    params.set('toDestinationId', String(toDestinationId));
  } else {
    params.set('toLat', String(toLat));
    params.set('toLon', String(toLon));
  }

  if (vehiclePlate) {
    params.set('vehiclePlate', vehiclePlate);
  }

  if (providerCode) {
    params.set('providerCode', providerCode);
  }

  const response = await fetch(`${API_BASE_URL}/api/routes?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message ?? 'Rota alinamadi.');
  }

  return response.json();
}

export function createVehicleLocationConnection(
  onVehiclesUpdated,
  onStatusChanged,
  onReconnected,
  onVehicleLeftFacility
) {
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(HUB_URL, {
      withCredentials: false
    })
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Information)
    .build();

  connection.on('vehicleLocationsUpdated', onVehiclesUpdated);
  if (onVehicleLeftFacility) {
    connection.on('vehicleLeftFacility', onVehicleLeftFacility);
  }
  connection.onreconnecting(() => onStatusChanged('reconnecting'));
  connection.onreconnected(async () => {
    onStatusChanged('connected');

    if (onReconnected) {
      await onReconnected(connection);
    }
  });
  connection.onclose(() => onStatusChanged('disconnected'));

  return connection;
}
