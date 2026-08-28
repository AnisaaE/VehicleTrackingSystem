import * as signalR from '@microsoft/signalr';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5030';
const HUB_URL = `${API_BASE_URL}/vehicle-location-hub`;
const AUTH_TOKEN_KEY = 'vehicle-tracking-auth-token';

let authToken = localStorage.getItem(AUTH_TOKEN_KEY);

export function setAuthToken(token) {
  authToken = token;

  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

async function apiFetch(path, options = {}) {
  const headers = {
    ...(options.headers ?? {})
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });
}

async function readError(response, fallback) {
  const error = await response.json().catch(() => null);
  return new Error(error?.message ?? fallback);
}

export async function login(username, password) {
  const response = await apiFetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    throw await readError(response, 'Giris yapilamadi.');
  }

  return response.json();
}

export async function fetchCurrentUser() {
  const response = await apiFetch('/api/auth/me');

  if (!response.ok) {
    throw await readError(response, 'Oturum bilgisi alinamadi.');
  }

  return response.json();
}

export async function updateCurrentUserProfile(profile) {
  const response = await apiFetch('/api/auth/me', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(profile)
  });

  if (!response.ok) {
    throw await readError(response, 'Profil guncellenemedi.');
  }

  return response.json();
}

export async function fetchUsers() {
  const response = await apiFetch('/api/users');

  if (!response.ok) {
    throw await readError(response, 'Kullanıcı verileri yüklenemedi.');
  }

  return response.json();
}

export async function createUser(user) {
  const response = await apiFetch('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(user)
  });

  if (!response.ok) {
    throw await readError(response, 'Kullanıcı oluşturulamadı.');
  }

  return response.json();
}

export async function updateUserRole(id, role) {
  const response = await apiFetch(`/api/users/${encodeURIComponent(id)}/role`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ role })
  });

  if (!response.ok) {
    throw await readError(response, 'Rol guncellenemedi.');
  }

  return response.json();
}

export async function updateUserStatus(id, isActive) {
  const response = await apiFetch(`/api/users/${encodeURIComponent(id)}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ isActive })
  });

  if (!response.ok) {
    throw await readError(response, 'Kullanıcı durumu güncellenemedi.');
  }

  return response.json();
}

export async function fetchProviders() {
  const response = await apiFetch('/api/providers');

  if (!response.ok) {
    throw await readError(response, 'Sağlayıcı verileri yüklenemedi.');
  }

  return response.json();
}

export async function fetchAppConfig() {
  const response = await apiFetch('/api/app-config');

  if (!response.ok) {
    throw await readError(response, 'Uygulama ayarları yüklenemedi.');
  }

  return response.json();
}

export async function fetchVehicles(providerCode) {
  const query = providerCode ? `?providerCode=${encodeURIComponent(providerCode)}` : '';
  const response = await apiFetch(`/api/vehicles${query}`);

  if (!response.ok) {
    throw await readError(response, 'Araç konum verileri yüklenemedi.');
  }

  return response.json();
}

export async function fetchEmployees() {
  const response = await apiFetch('/api/employees');

  if (!response.ok) {
    throw await readError(response, 'Personel verileri yüklenemedi.');
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
  const response = await apiFetch(`/api/vehicle-trips/active${query}`);

  if (!response.ok) {
    throw await readError(response, 'Aktif görev verileri yüklenemedi.');
  }

  return response.json();
}

export async function fetchVehicleTrips() {
  const response = await apiFetch('/api/vehicle-trips');

  if (!response.ok) {
    throw await readError(response, 'Görev geçmişi yüklenemedi.');
  }

  return response.json();
}

export async function fetchDriverVehicleTrips(driverId) {
  const response = await apiFetch(`/api/vehicle-trips/driver/${encodeURIComponent(driverId)}`);

  if (!response.ok) {
    throw await readError(response, 'Sürücü geçmisi yüklenemedi.');
  }

  return response.json();
}

export async function fetchMyVehicleTrips() {
  const response = await apiFetch('/api/vehicle-trips/my');

  if (!response.ok) {
    throw await readError(response, 'Görevler yüklenemedi.');
  }

  return response.json();
}

export async function createVehicleTrip(trip) {
  const response = await apiFetch('/api/vehicle-trips', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(trip)
  });

  if (!response.ok) {
    throw await readError(response, 'Görev oluşturulamadı.');
  }

  return response.json();
}

export async function completeVehicleTrip(id) {
  const response = await apiFetch(`/api/vehicle-trips/${encodeURIComponent(id)}/complete`, {
    method: 'POST'
  });

  if (!response.ok) {
    throw await readError(response, 'Görev tamamlanamadı.');
  }

  return response.json();
}

export async function cancelVehicleTrip(id) {
  const response = await apiFetch(`/api/vehicle-trips/${encodeURIComponent(id)}/cancel`, {
    method: 'POST'
  });

  if (!response.ok) {
    throw await readError(response, 'Görev iptal edilemedi.');
  }

  return response.json();
}

export async function fetchFacilities() {
  const response = await apiFetch('/api/facilities');

  if (!response.ok) {
    throw await readError(response, 'Tesis verileri yüklenemedi.');
  }

  return response.json();
}

export async function createFacility(facility) {
  const response = await apiFetch('/api/facilities', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(facility)
  });

  if (!response.ok) {
    throw await readError(response, 'Tesis kaydedilemedi.');
  }

  return response.json();
}

export async function deleteFacility(id) {
  const response = await apiFetch(`/api/facilities/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw await readError(response, 'Tesis silinemedi.');
  }
}

export async function fetchDestinations() {
  const response = await apiFetch('/api/destinations');

  if (!response.ok) {
    throw await readError(response, 'Hedef verileri yüklenemedi.');
  }

  return response.json();
}

export async function createDestination(destination) {
  const response = await apiFetch('/api/destinations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(destination)
  });

  if (!response.ok) {
    throw await readError(response, 'Hedef kaydedilemedi.');
  }

  return response.json();
}

export async function deleteDestination(id) {
  const response = await apiFetch(`/api/destinations/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw await readError(response, 'Hedef silinemedi.');
  }
}

export async function geocodeAddress(query) {
  const response = await apiFetch(`/api/geocode?q=${encodeURIComponent(query)}`);

  if (!response.ok) {
    throw await readError(response, 'Adres arama tamamlanamadı.');
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

  const response = await apiFetch(`/api/routes?${params.toString()}`);

  if (!response.ok) {
    throw await readError(response, 'Rota alinamadi.');
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
