import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CarFront,
  Gauge,
  LocateFixed,
  MapPinned,
  MapPin,
  Power,
  Search,
  Wifi
} from 'lucide-react';
import { MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import { appConfig } from './config';
import { useVehicleLocations } from './useVehicleLocations';
import { MapsPage } from './pages/MapsPage';
import { AppLayout } from './components/AppLayout';

function createVehicleIcon(iconUrl, className = '') {
  return new L.Icon({
    iconUrl,
    iconSize: [46, 46],
    iconAnchor: [23, 23],
    popupAnchor: [0, -24],
    className
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

const vehicleTypeLabels = {
  AMBULANCE: 'Ambulans',
  FIRE_TRUCK: 'İtfaiye Aracı',
  GARBAGE_TRUCK: 'Çöp Kamyonu',
  WORK_MACHINE: 'İş Makinesi',
  SWEEPER: 'Süpürge Aracı'
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
    ?.toString()
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toUpperCase() || 'DEFAULT';
}

function getVehicleIcon(vehicle, isSelected = false) {
  const icon = vehicleIcons[normalizeVehicleType(vehicle.vehicleType)] ?? vehicleIcons.DEFAULT;

  if (!isSelected) {
    return icon;
  }

  return createVehicleIcon(icon.options.iconUrl, 'selected-vehicle-marker');
}

function formatVehicleTypeLabel(value) {
  const normalizedType = normalizeVehicleType(value);

  return vehicleTypeLabels[normalizedType] ?? value ?? 'Diğer';
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
      zoomControl={false}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="topright" />
      <MapFocus vehicles={vehicles} selectedVehicle={selectedVehicle} />
      {vehicles.map(vehicle => {
        const vehicleKey = getVehicleKey(vehicle);
        const isSelected = selectedVehicle && getVehicleKey(selectedVehicle) === vehicleKey;

        return (
          <Marker
            key={vehicleKey}
            position={[vehicle.latitude, vehicle.longitude]}
            icon={getVehicleIcon(vehicle, isSelected)}
            zIndexOffset={isSelected ? 1000 : 0}
            eventHandlers={{
              click: () => onSelectVehicle(vehicleKey)
            }}
          >
            <Popup>
              <strong>{vehicle.plate}</strong>
              <span>{vehicle.speed} km/h</span>
              <span>{vehicle.ignitionOn ? 'Kontak Açık' : 'Kontak Kapalı'}</span>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
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

function LiveTrackingPage({ onNavigate }) {
  const [selectedProviderCode, setSelectedProviderCode] = useState(
    appConfig.defaultProviderCode
  );
  const { vehicles, providers, connectionStatus, lastUpdatedAt, error } =
    useVehicleLocations(selectedProviderCode);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlate, setSelectedPlate] = useState(null);
  const [hiddenVehicleTypes, setHiddenVehicleTypes] = useState([]);

  const availableVehicleTypes = useMemo(() => {
    const typesByCode = new Map();

    vehicles.forEach(vehicle => {
      const code = normalizeVehicleType(vehicle.vehicleType);

      if (!typesByCode.has(code)) {
        typesByCode.set(code, {
          code,
          label: formatVehicleTypeLabel(vehicle.vehicleType),
          count: 0
        });
      }

      typesByCode.get(code).count += 1;
    });

    return Array.from(typesByCode.values()).sort((first, second) =>
      first.label.localeCompare(second.label, 'tr')
    );
  }, [vehicles]);

  const toggleVehicleType = typeCode => {
    setHiddenVehicleTypes(currentHiddenTypes =>
      currentHiddenTypes.includes(typeCode)
        ? currentHiddenTypes.filter(currentTypeCode => currentTypeCode !== typeCode)
        : [...currentHiddenTypes, typeCode]
    );
  };

  const filteredVehicles = useMemo(() => {
    const normalizedSearch = normalizePlate(searchTerm);

    return vehicles.filter(vehicle =>
      !hiddenVehicleTypes.includes(normalizeVehicleType(vehicle.vehicleType)) &&
      (!normalizedSearch || normalizePlate(vehicle.plate).includes(normalizedSearch))
    );
  }, [hiddenVehicleTypes, vehicles, searchTerm]);

  const selectedVehicle = useMemo(
    () => filteredVehicles.find(vehicle => getVehicleKey(vehicle) === selectedPlate) ?? null,
    [filteredVehicles, selectedPlate]
  );

  const selectedProviderName = selectedProviderCode
    ? providers.find(provider => provider.code === selectedProviderCode)?.name ?? selectedProviderCode
    : 'Tümü';

  useEffect(() => {
    setSelectedPlate(null);
    setSearchTerm('');
    setHiddenVehicleTypes([]);
  }, [selectedProviderCode]);

  useEffect(() => {
    if (
      selectedPlate &&
      !filteredVehicles.some(vehicle => getVehicleKey(vehicle) === selectedPlate)
    ) {
      setSelectedPlate(null);
    }
  }, [filteredVehicles, selectedPlate]);

  return (
    <AppLayout
      activePage="tracking"
      connectionLabel={formatConnectionStatus(connectionStatus)}
      connectionStatus={connectionStatus}
      headerIcon={MapPinned}
      lastUpdatedAt={lastUpdatedAt}
      onNavigate={onNavigate}
      title="Canlı Takip"
    >
      <section className={`tracking-dashboard ${selectedVehicle ? 'has-details' : ''}`}>
        <aside className="workspace-panel vehicle-panel">
          <div className="panel-heading">
            <div>
              <span>{appConfig.municipalityName}</span>
              <h2>Araçlar</h2>
            </div>
            <strong>{filteredVehicles.length}</strong>
          </div>

          <label className="field-stack panel-field">
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

          <div className="search-box panel-search">
            <Search size={18} />
            <input
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder="Plaka ara..."
            />
            <button
              className="icon-button"
              type="button"
              onClick={() => setSelectedPlate(null)}
              aria-label="Tüm araçları göster"
              title="Tüm araçları göster"
            >
              <LocateFixed size={18} />
            </button>
          </div>

          {availableVehicleTypes.length > 0 && (
            <div className="type-filter">
              <div className="type-filter-heading">
                <span>Araç türü</span>
                <button
                  type="button"
                  onClick={() => setHiddenVehicleTypes([])}
                  disabled={hiddenVehicleTypes.length === 0}
                >
                  Tümü
                </button>
              </div>
              <div className="type-filter-options">
                {availableVehicleTypes.map(vehicleType => {
                  const isVisible = !hiddenVehicleTypes.includes(vehicleType.code);

                  return (
                    <button
                      key={vehicleType.code}
                      className={isVisible ? 'active' : ''}
                      type="button"
                      onClick={() => toggleVehicleType(vehicleType.code)}
                      aria-pressed={isVisible}
                    >
                      <CarFront size={16} />
                      <span>{vehicleType.label}</span>
                      <strong>{vehicleType.count}</strong>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="panel-subheading">
            <span>{selectedProviderName}</span>
            <strong>{filteredVehicles.length} araç</strong>
          </div>

          <div className="vehicle-list">
            {filteredVehicles.length === 0 ? (
              <div className="empty-panel-state">
                <strong>{selectedProviderName}</strong>
                <span>
                  {vehicles.length === 0
                    ? 'Bu sağlayıcı için kullanılabilir araç konumu yok.'
                    : 'Seçili filtrelere uygun araç yok.'}
                </span>
              </div>
            ) : (
              filteredVehicles.map(vehicle => (
                <button
                  key={getVehicleKey(vehicle)}
                  className={`vehicle-row ${selectedPlate === getVehicleKey(vehicle) ? 'selected' : ''}`}
                  onClick={() => setSelectedPlate(getVehicleKey(vehicle))}
                  type="button"
                >
                  <CarFront size={18} />
                  <div>
                    <strong>{vehicle.plate}</strong>
                    <span>{vehicle.vehicleName}</span>
                  </div>
                  <div className="vehicle-row-meta">
                    <strong>{vehicle.speed} km/h</strong>
                    <span className={vehicle.ignitionOn ? 'status-text on' : 'status-text'}>
                      {vehicle.ignitionOn ? 'Kontak Açık' : 'Kontak Kapalı'}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="map-stage tracking-map-stage">
          <VehicleMap
            vehicles={filteredVehicles}
            selectedVehicle={selectedVehicle}
            onSelectVehicle={setSelectedPlate}
          />
          {error && (
            <div className="system-toast error">
              <strong>Sistem bildirimi</strong>
              <span>{error}</span>
            </div>
          )}
        </section>

        {selectedVehicle && (
          <aside className="workspace-panel details-panel">
            <div className="details-heading">
              <div>
                <span>Araç Detayları</span>
                <h2>{selectedVehicle.plate}</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => setSelectedPlate(null)}
                aria-label="Detayları kapat"
                title="Detayları kapat"
              >
                ×
              </button>
            </div>

            <div className="selected-vehicle-card">
              <CarFront size={24} />
              <div>
                <strong>{selectedVehicle.vehicleName}</strong>
                <span>{formatVehicleTypeLabel(selectedVehicle.vehicleType)}</span>
              </div>
            </div>

            <section className="detail-section">
              <h3>Canlı Durum</h3>
              <div className="details-grid">
                <DetailItem icon={Gauge} label="Hız" value={`${selectedVehicle.speed} km/h`} />
                <DetailItem
                  icon={Power}
                  label="Kontak"
                  value={selectedVehicle.ignitionOn ? 'Açık' : 'Kapalı'}
                />
                <DetailItem
                  icon={Wifi}
                  label="Son Konum"
                  value={formatDateTime(selectedVehicle.lastLocationTime)}
                />
              </div>
            </section>

            <section className="detail-section">
              <h3>Konum</h3>
              <div className="details-grid">
                <DetailItem icon={MapPin} label="Enlem" value={selectedVehicle.latitude} />
                <DetailItem icon={MapPin} label="Boylam" value={selectedVehicle.longitude} />
              </div>
            </section>

            <section className="detail-section">
              <h3>Sağlayıcı</h3>
              <div className="details-grid">
                <DetailItem icon={MapPin} label="Takip Sağlayıcısı" value={selectedVehicle.provider} />
                <DetailItem icon={CarFront} label="Araç Tipi" value={formatVehicleTypeLabel(selectedVehicle.vehicleType)} />
              </div>
            </section>
          </aside>
        )}
      </section>
    </AppLayout>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState('tracking');

  return (
    <div className="root-shell">
      {activePage === 'tracking'
        ? <LiveTrackingPage onNavigate={setActivePage} />
        : <MapsPage onNavigate={setActivePage} />}
    </div>
  );
}
