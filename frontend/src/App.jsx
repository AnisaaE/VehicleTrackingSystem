import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CarFront,
  Flame,
  Gauge,
  LocateFixed,
  MapPin,
  Power,
  Search,
  Wifi,
  WifiOff
} from 'lucide-react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { appConfig } from './config';
import { useVehicleLocations } from './useVehicleLocations';
import { MapsPage } from './pages/MapsPage';

function createVehicleIcon(iconUrl) {
  return new L.Icon({
    iconUrl,
    iconSize: [46, 46],
    iconAnchor: [23, 23],
    popupAnchor: [0, -24]
  });
}

const vehicleIcons = {
  AMBULANCE: createVehicleIcon('/markers/ambulance.png'),
  FIRE_TRUCK: createVehicleIcon('/markers/fire-truck.png'),
  GARBAGE_TRUCK: createVehicleIcon('/markers/garbage-truck.png'),
  WORK_MACHINE: createVehicleIcon('/markers/work-machine.png'),
  SWEEPER: createVehicleIcon('/markers/sweeper.png'),
  DEFAULT: createVehicleIcon('/markers/default-vihacle.png')
};

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'medium'
  }).format(new Date(value));
}

function normalizePlate(value) {
  return value.replace(/\s|-/g, '').toUpperCase();
}

function getVehicleKey(vehicle) {
  return `${vehicle.provider}:${vehicle.plate}`;
}

function normalizeVehicleType(value) {
  return value
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toUpperCase();
}

function getVehicleIcon(vehicle) {
  return vehicleIcons[normalizeVehicleType(vehicle.vehicleType)] ?? vehicleIcons.DEFAULT;
}

function formatConnectionStatus(status) {
  const labels = {
    connecting: 'Bağlanıyor',
    connected: 'Bağlı',
    reconnecting: 'Yeniden bağlanıyor',
    disconnected: 'Bağlantı yok'
  };

  return labels[status] ?? status;
}

function MapFocus({ vehicles, selectedVehicle }) {
  const map = useMap();
  const previousSelectedPlate = useRef(null);
  const hasFitInitialBounds = useRef(false);

  useEffect(() => {
    const selectedPlate = selectedVehicle?.plate ?? null;

    if (selectedVehicle) {
      if (previousSelectedPlate.current !== selectedPlate) {
        map.flyTo([selectedVehicle.latitude, selectedVehicle.longitude], 15, {
          duration: 0.8
        });
      }

      previousSelectedPlate.current = selectedPlate;
      return;
    }

    if (vehicles.length > 0 && (!hasFitInitialBounds.current || previousSelectedPlate.current)) {
      const bounds = L.latLngBounds(
        vehicles.map(vehicle => [vehicle.latitude, vehicle.longitude])
      );

      map.fitBounds(bounds, {
        padding: [40, 40],
        maxZoom: 14
      });

      hasFitInitialBounds.current = true;
    }

    previousSelectedPlate.current = null;
  }, [map, selectedVehicle?.plate, vehicles.length]);

  return null;
}

function VehicleMap({ vehicles, selectedVehicle, onSelectVehicle }) {
  return (
    <MapContainer
      center={appConfig.mapCenter}
      zoom={appConfig.mapZoom}
      className="vehicle-map"
      scrollWheelZoom
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapFocus vehicles={vehicles} selectedVehicle={selectedVehicle} />
      {vehicles.map(vehicle => (
        <Marker
          key={getVehicleKey(vehicle)}
          position={[vehicle.latitude, vehicle.longitude]}
          icon={getVehicleIcon(vehicle)}
          eventHandlers={{
            click: () => onSelectVehicle(getVehicleKey(vehicle))
          }}
        >
          <Popup>
            <strong>{vehicle.plate}</strong>
            <span>{vehicle.speed} km/h</span>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

function StatusBadge({ status }) {
  const isConnected = status === 'connected';
  const Icon = isConnected ? Wifi : WifiOff;

  return (
    <span className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}>
      <Icon size={16} />
      {formatConnectionStatus(status)}
    </span>
  );
}

function DetailItem({ icon: Icon, label, value }) {
  return (
    <div className="detail-item">
      <Icon size={18} />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function LiveTrackingPage() {
  const [selectedProviderCode, setSelectedProviderCode] = useState(
    appConfig.defaultProviderCode
  );
  const { vehicles, providers, connectionStatus, lastUpdatedAt, error } =
    useVehicleLocations(selectedProviderCode);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlate, setSelectedPlate] = useState(null);

  const filteredVehicles = useMemo(() => {
    const normalizedSearch = normalizePlate(searchTerm);

    if (!normalizedSearch) {
      return vehicles;
    }

    return vehicles.filter(vehicle =>
      normalizePlate(vehicle.plate).includes(normalizedSearch)
    );
  }, [vehicles, searchTerm]);

  const selectedVehicle = useMemo(
    () => vehicles.find(vehicle => getVehicleKey(vehicle) === selectedPlate) ?? null,
    [selectedPlate, vehicles]
  );

  const selectedProviderName = selectedProviderCode
    ? providers.find(provider => provider.code === selectedProviderCode)?.name ?? selectedProviderCode
    : 'Tümü';

  useEffect(() => {
    setSelectedPlate(null);
    setSearchTerm('');
  }, [selectedProviderCode]);

  return (
    <main className="app-shell">
      <section className="top-bar">
        <div>
          <div className="eyebrow">
            <Flame size={17} />
            {appConfig.municipalityName}
          </div>
          <h1>{appConfig.appTitle}</h1>
        </div>
        <div className="live-meta">
          <label className="provider-picker">
            <span>Sağlayıcı</span>
            <select
              value={selectedProviderCode}
              onChange={event => setSelectedProviderCode(event.target.value)}
            >
              {providers.length === 0 ? (
                <option value="">Tümü</option>
              ) : (
                <>
                  <option value="">Tümü</option>
                  {providers
                    .filter(provider => provider.isActive)
                    .map(provider => (
                      <option key={provider.code} value={provider.code}>
                        {provider.name}
                      </option>
                    ))}
                </>
              )}
            </select>
          </label>
          <StatusBadge status={connectionStatus} />
          <span>{lastUpdatedAt ? formatDateTime(lastUpdatedAt) : 'Güncelleme bekleniyor'}</span>
        </div>
      </section>

      {error && <div className="error-banner">{error}</div>}

      <section className="content-grid">
        <aside className="vehicle-panel">
          <div className="search-box">
            <Search size={18} />
            <input
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder="Plakaya göre ara"
            />
            <button
              className="show-all-button"
              type="button"
              onClick={() => setSelectedPlate(null)}
              aria-label="Tüm araçları göster"
              title="Tüm araçları göster"
            >
              <LocateFixed size={18} />
            </button>
          </div>

          <div className="vehicle-list">
            {filteredVehicles.length === 0 ? (
              <div className="no-location-state">
                <strong>{selectedProviderName}</strong>
                <span>Bu sağlayıcı için kullanılabilir araç konumu yok.</span>
              </div>
            ) : (
              filteredVehicles.map(vehicle => (
                <button
                  key={getVehicleKey(vehicle)}
                  className={`vehicle-row ${selectedPlate === getVehicleKey(vehicle) ? 'selected' : ''}`}
                  onClick={() => setSelectedPlate(getVehicleKey(vehicle))}
                  type="button"
                >
                  <div>
                    <strong>{vehicle.plate}</strong>
                    <span>{vehicle.vehicleName}</span>
                  </div>
                  <div className="vehicle-row-meta">
                    <span>{vehicle.speed} km/h</span>
                    <span>{vehicle.ignitionOn ? 'Kontak Açık' : 'Kontak Kapalı'}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="map-panel">
          <VehicleMap
            vehicles={vehicles}
            selectedVehicle={selectedVehicle}
            onSelectVehicle={setSelectedPlate}
          />
        </section>
      </section>

      <section className="details-panel">
        {selectedVehicle ? (
          <>
            <div className="details-heading">
              <div>
                <span>Seçili araç</span>
                <h2>{selectedVehicle.plate}</h2>
              </div>
              <strong>{selectedVehicle.vehicleName}</strong>
            </div>
            <div className="details-grid">
              <DetailItem icon={CarFront} label="Araç Tipi" value={selectedVehicle.vehicleType} />
              <DetailItem icon={MapPin} label="Sağlayıcı" value={selectedVehicle.provider} />
              <DetailItem icon={Gauge} label="Hız" value={`${selectedVehicle.speed} km/h`} />
              <DetailItem
                icon={Power}
                label="Kontak Durumu"
                value={selectedVehicle.ignitionOn ? 'Açık' : 'Kapalı'}
              />
              <DetailItem icon={MapPin} label="Enlem" value={selectedVehicle.latitude} />
              <DetailItem icon={MapPin} label="Boylam" value={selectedVehicle.longitude} />
              <DetailItem
                icon={Wifi}
                label="Son Konum Tarihi"
                value={formatDateTime(selectedVehicle.lastLocationTime)}
              />
            </div>
          </>
        ) : (
          <div className="empty-state">
            {vehicles.length === 0
              ? `${selectedProviderName} için kullanılabilir konum yok`
              : 'Detayları görmek için bir araç seçin'}
          </div>
        )}
      </section>
    </main>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState('tracking');

  return (
    <div className="root-shell">
      <nav className="main-navigation">
        <button
          className={activePage === 'tracking' ? 'active' : ''}
          type="button"
          onClick={() => setActivePage('tracking')}
        >
          Canlı Takip
        </button>
        <button
          className={activePage === 'maps' ? 'active' : ''}
          type="button"
          onClick={() => setActivePage('maps')}
        >
          Haritalar
        </button>
      </nav>
      {activePage === 'tracking' ? <LiveTrackingPage /> : <MapsPage />}
    </div>
  );
}
