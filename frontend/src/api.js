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

export async function fetchAppConfig() {
  const response = await fetch(`${API_BASE_URL}/api/app-config`);

  if (!response.ok) {
    throw new Error('Uygulama ayarlari yuklenemedi.');
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

export async function fetchEmployees() {
  const response = await fetch(`${API_BASE_URL}/api/employees`);

  if (!response.ok) {
    throw new Error('Personel verileri yuklenemedi.');
  }

  return response.json();
}

export async function fetchActiveVehicleTrips({ providerCode, plate } = {}) {
  const params = new URLSearchParams();

  if (providerCode && plate) {
    params.set('providerCode', providerCode);
    params.set('plate', plate);
  }

  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`${API_BASE_URL}/api/vehicle-trips/active${query}`);

  if (!response.ok) {
    throw new Error('Aktif gorev verileri yuklenemedi.');
  }

  return response.json();
}

export async function createVehicleTrip(trip) {
  const response = await fetch(`${API_BASE_URL}/api/vehicle-trips`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(trip)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message ?? 'Gorev olusturulamadi.');
  }

  return response.json();
}

export async function completeVehicleTrip(id) {
  const response = await fetch(`${API_BASE_URL}/api/vehicle-trips/${encodeURIComponent(id)}/complete`, {
    method: 'POST'
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message ?? 'Gorev tamamlanamadi.');
  }

  return response.json();
}

export async function cancelVehicleTrip(id) {
  const response = await fetch(`${API_BASE_URL}/api/vehicle-trips/${encodeURIComponent(id)}/cancel`, {
    method: 'POST'
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message ?? 'Gorev iptal edilemedi.');
  }

  return response.json();
}

export async function fetchFacilities() {
  const response = await fetch(`${API_BASE_URL}/api/facilities`);

  if (!response.ok) {
    throw new Error('Tesis verileri yüklenemedi.');
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

export async function deleteFacility(id) {
  const response = await fetch(`${API_BASE_URL}/api/facilities/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message ?? 'Tesis silinemedi.');
  }
}

export async function fetchDestinations() {
  const response = await fetch(`${API_BASE_URL}/api/destinations`);

  if (!response.ok) {
    throw new Error('Hedef verileri yüklenemedi.');
  }

  return response.json();
}

export async function createDestination(destination) {
  const response = await fetch(`${API_BASE_URL}/api/destinations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(destination)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message ?? 'Hedef kaydedilemedi.');
  }

  return response.json();
}

export async function deleteDestination(id) {
  const response = await fetch(`${API_BASE_URL}/api/destinations/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message ?? 'Hedef silinemedi.');
  }
}

export async function geocodeAddress(query) {
  const response = await fetch(`${API_BASE_URL}/api/geocode?q=${encodeURIComponent(query)}`);

  if (!response.ok) {
    throw new Error('Adres arama tamamlanamadı.');
  }

  return response.json();
}

export async function fetchRoute({
  fromFacilityId,
  fromLat,
  fromLon,
  toLat,
  toLon,
  toDestinationId,
  vehiclePlate,
  providerCode
}) {
  const params = new URLSearchParams();

  if (fromFacilityId) {
    params.set('fromFacilityId', String(fromFacilityId));
  } else {
    params.set('fromLat', String(fromLat));
    params.set('fromLon', String(fromLon));
  }

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
    throw new Error(error?.message ?? 'Rota alınamadı.');
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
