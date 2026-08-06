import * as signalR from '@microsoft/signalr';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5030';
const HUB_URL = `${API_BASE_URL}/vehicle-location-hub`;

export async function fetchProviders() {
  const response = await fetch(`${API_BASE_URL}/api/providers`);

  if (!response.ok) {
    throw new Error('Provider data could not be loaded.');
  }

  return response.json();
}

export async function fetchVehicles(providerCode) {
  const query = providerCode ? `?providerCode=${encodeURIComponent(providerCode)}` : '';
  const response = await fetch(`${API_BASE_URL}/api/vehicles${query}`);

  if (!response.ok) {
    throw new Error('Vehicle data could not be loaded.');
  }

  return response.json();
}

export function createVehicleLocationConnection(
  onVehiclesUpdated,
  onStatusChanged,
  onReconnected
) {
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(HUB_URL, {
      withCredentials: false
    })
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Information)
    .build();

  connection.on('vehicleLocationsUpdated', onVehiclesUpdated);
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
