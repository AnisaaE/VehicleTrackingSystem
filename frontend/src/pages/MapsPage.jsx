import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import {
  Building2,
  Construction,
  Cross,
  Edit3,
  Flame,
  Layers,
  Map as MapIcon,
  MapPin,
  Navigation,
  Route,
  Save,
  Search,
  Trash2,
  Warehouse
} from 'lucide-react';
import { GeoJSON, MapContainer, Marker, Polyline, Popup, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { appConfig } from '../config';
import {
  createDestination,
  createFacility,
  createVehicleLocationConnection,
  deleteDestination,
  deleteFacility,
  fetchDestinations,
  fetchFacilities,
  fetchRoute,
  geocodeAddress
} from '../api';
import { AppLayout } from '../components/AppLayout';

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const facilityBoundaryStyles = {
  FIRE_STATION: { color: '#ef4444', weight: 2, fillOpacity: 0.12 },
  HOSPITAL: { color: '#2563eb', weight: 2, fillOpacity: 0.12 },
  GARAGE: { color: '#1d4ed8', weight: 2, fillOpacity: 0.12 },
  DEPOT: { color: '#f97316', weight: 2, fillOpacity: 0.12 }
};

const facilityTypeLabels = {
  FIRE_STATION: 'İtfaiye',
  HOSPITAL: 'Hastane',
  GARAGE: 'Garaj',
  DEPOT: 'Depo'
};

const facilityMarkerColors = {
  FIRE_STATION: '#ef4444',
  HOSPITAL: '#2563eb',
  GARAGE: '#1d4ed8',
  DEPOT: '#f97316',
  UNKNOWN: '#64748b'
};

function parseGeometry(value) {
  if (!value) {
    return null;
  }

  return typeof value === 'string' ? JSON.parse(value) : value;
}

function pointToLatLng(geoJson) {
  const geometry = parseGeometry(geoJson);

  if (!geometry || geometry.type !== 'Point') {
    return null;
  }

  return [geometry.coordinates[1], geometry.coordinates[0]];
}

function routeToPositions(route) {
  const geometry = parseGeometry(route?.geometry);

  if (!geometry || geometry.type !== 'LineString') {
    return [];
  }

  return geometry.coordinates.map(coordinate => [coordinate[1], coordinate[0]]);
}

function normalizeFacilityType(value) {
  return value
    ?.toString()
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toUpperCase() || 'UNKNOWN';
}

function formatFacilityTypeLabel(value) {
  const normalizedType = normalizeFacilityType(value);

  return facilityTypeLabels[normalizedType] ?? value ?? 'Diğer';
}

function getFacilityBoundaryStyle(facilityType) {
  return facilityBoundaryStyles[normalizeFacilityType(facilityType)] ?? facilityBoundaryStyles.DEPOT;
}

function getFacilityColor(facilityType) {
  return facilityMarkerColors[normalizeFacilityType(facilityType)] ?? facilityMarkerColors.UNKNOWN;
}

function createFacilityMarkerIcon(facility, isSelected) {
  const normalizedType = normalizeFacilityType(facility.facilityType);
  const color = getFacilityColor(facility.facilityType);

  return L.divIcon({
    className: `facility-map-marker ${isSelected ? 'selected' : ''}`,
    html: `<span style="--marker-color:${color}">${normalizedType === 'HOSPITAL' ? '+' : ''}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -16]
  });
}

function getFacilityIcon(facilityType) {
  const normalizedType = normalizeFacilityType(facilityType);

  if (normalizedType === 'FIRE_STATION') {
    return Flame;
  }

  if (normalizedType === 'HOSPITAL') {
    return Cross;
  }

  if (normalizedType === 'GARAGE') {
    return Warehouse;
  }

  if (normalizedType === 'DEPOT') {
    return Construction;
  }

  return Building2;
}

function getPolygonCenterPoint(geometry) {
  if (geometry.type !== 'Polygon' || !geometry.coordinates?.[0]?.length) {
    return null;
  }

  const ring = geometry.coordinates[0];
  const totals = ring.reduce(
    (current, coordinate) => ({
      longitude: current.longitude + coordinate[0],
      latitude: current.latitude + coordinate[1]
    }),
    { longitude: 0, latitude: 0 }
  );

  return {
    type: 'Point',
    coordinates: [
      totals.longitude / ring.length,
      totals.latitude / ring.length
    ]
  };
}

function formatDistance(value) {
  if (!Number.isFinite(value)) {
    return '-';
  }

  return value >= 1000 ? `${(value / 1000).toFixed(1)} km` : `${Math.round(value)} m`;
}

function formatDuration(value) {
  if (!Number.isFinite(value)) {
    return '-';
  }

  const minutes = Math.max(1, Math.round(value / 60));
  return `${minutes} dk`;
}

function DrawingTools({ onGeometryCreated }) {
  const map = useMap();

  useEffect(() => {
    map.pm.addControls({
      position: 'topright',
      drawCircle: false,
      drawCircleMarker: false,
      drawMarker: true,
      drawPolyline: false,
      drawRectangle: false,
      drawText: false,
      editMode: true,
      dragMode: true,
      removalMode: true
    });

    const handleCreate = event => {
      const geoJson = event.layer.toGeoJSON().geometry;
      onGeometryCreated(geoJson);
    };

    map.on('pm:create', handleCreate);

    return () => {
      map.off('pm:create', handleCreate);
      map.pm.removeControls();
    };
  }, [map, onGeometryCreated]);

  return null;
}

function MapCommandToolbar({ isPickMode }) {
  const map = useMap();

  return (
    <div className="map-command-toolbar">
      <button type="button" className={isPickMode ? 'active' : ''} disabled>
        <MapPin size={15} />
        Seç
      </button>
      <button type="button" onClick={() => map.pm.enableDraw('Marker')}>
        <MapPin size={15} />
        Nokta Ekle
      </button>
      <button type="button" onClick={() => map.pm.enableDraw('Polygon')}>
        <Layers size={15} />
        Alan Çiz
      </button>
      <button type="button" onClick={() => map.pm.toggleGlobalEditMode()}>
        <Edit3 size={15} />
        Düzenle
      </button>
      <button type="button" onClick={() => map.pm.toggleGlobalRemovalMode()}>
        <Trash2 size={15} />
        Sil
      </button>
    </div>
  );
}

function MapClickTarget({ enabled, onTargetSelected }) {
  useMapEvents({
    click: event => {
      if (enabled) {
        onTargetSelected({
          latitude: event.latlng.lat,
          longitude: event.latlng.lng,
          label: 'Haritadan seçilen nokta'
        });
      }
    }
  });

  return null;
}

export function MapsPage({ currentUser, municipalityName, onLogout, onNavigate }) {
  const canEditMaps = currentUser?.role === 'ADMIN' || currentUser?.role === 'DISPATCHER';
  const canDeleteMapPoints = currentUser?.role === 'ADMIN';
  const [facilities, setFacilities] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState('');
  const [selectedDestinationId, setSelectedDestinationId] = useState('');
  const [facilitySearchTerm, setFacilitySearchTerm] = useState('');
  const [addressQuery, setAddressQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [target, setTarget] = useState(null);
  const [route, setRoute] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPickMode, setIsPickMode] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftCode, setDraftCode] = useState('');
  const [draftType, setDraftType] = useState('FIRE_STATION');
  const [draftLocation, setDraftLocation] = useState(null);
  const [draftBoundary, setDraftBoundary] = useState(null);
  const [hiddenFacilityTypes, setHiddenFacilityTypes] = useState([]);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const targetRef = useRef(null);

  const availableFacilityTypes = useMemo(() => {
    const typesByCode = new Map();

    facilities.forEach(facility => {
      const code = normalizeFacilityType(facility.facilityType);

      if (!typesByCode.has(code)) {
        typesByCode.set(code, {
          code,
          label: formatFacilityTypeLabel(facility.facilityType),
          count: 0
        });
      }

      typesByCode.get(code).count += 1;
    });

    return Array.from(typesByCode.values()).sort((first, second) =>
      first.label.localeCompare(second.label, 'tr')
    );
  }, [facilities]);

  const visibleFacilities = useMemo(() => {
    const normalizedSearch = facilitySearchTerm.trim().toLocaleLowerCase('tr-TR');

    return facilities.filter(facility =>
      !hiddenFacilityTypes.includes(normalizeFacilityType(facility.facilityType)) &&
      (
        !normalizedSearch ||
        facility.name?.toLocaleLowerCase('tr-TR').includes(normalizedSearch) ||
        facility.code?.toLocaleLowerCase('tr-TR').includes(normalizedSearch) ||
        formatFacilityTypeLabel(facility.facilityType).toLocaleLowerCase('tr-TR').includes(normalizedSearch)
      )
    );
  }, [facilities, facilitySearchTerm, hiddenFacilityTypes]);

  const selectedFacility = useMemo(
    () => visibleFacilities.find(facility => facility.id === Number(selectedFacilityId)) ?? visibleFacilities[0] ?? null,
    [selectedFacilityId, visibleFacilities]
  );
  const selectedDestination = useMemo(
    () => destinations.find(destination => destination.id === Number(selectedDestinationId)) ?? null,
    [destinations, selectedDestinationId]
  );
  const routePositions = useMemo(() => routeToPositions(route), [route]);

  const toggleFacilityType = typeCode => {
    setHiddenFacilityTypes(currentHiddenTypes =>
      currentHiddenTypes.includes(typeCode)
        ? currentHiddenTypes.filter(currentTypeCode => currentTypeCode !== typeCode)
        : [...currentHiddenTypes, typeCode]
    );
  };

  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  const loadFacilities = useCallback(async () => {
    const nextFacilities = await fetchFacilities();
    setFacilities(nextFacilities);

    if (!selectedFacilityId && nextFacilities.length > 0) {
      setSelectedFacilityId(String(nextFacilities[0].id));
    }
  }, [selectedFacilityId]);

  useEffect(() => {
    loadFacilities().catch(nextError => setError(nextError.message));
  }, [loadFacilities]);

  const loadDestinations = useCallback(async () => {
    const nextDestinations = await fetchDestinations();
    setDestinations(nextDestinations);
  }, []);

  useEffect(() => {
    loadDestinations().catch(nextError => setError(nextError.message));
  }, [loadDestinations]);

  useEffect(() => {
    if (visibleFacilities.length === 0) {
      setSelectedFacilityId('');
      return;
    }

    if (!visibleFacilities.some(facility => facility.id === Number(selectedFacilityId))) {
      setSelectedFacilityId(String(visibleFacilities[0].id));
    }
  }, [selectedFacilityId, visibleFacilities]);

  useEffect(() => {
    if (addressQuery.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      geocodeAddress(addressQuery)
        .then(setSuggestions)
        .catch(nextError => setError(nextError.message));
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [addressQuery]);

  useEffect(() => {
    const connection = createVehicleLocationConnection(
      () => {},
      setConnectionStatus,
      nextConnection => nextConnection.invoke('SubscribeToAllProviders'),
      async departure => {
        setNotice(`${departure.plate} ${departure.facilityName} tesisinden çıktı.`);
        setSelectedFacilityId(String(departure.facilityId));

        if (!targetRef.current) {
          return;
        }

        try {
          const nextRoute = await fetchRoute({
            fromFacilityId: departure.facilityId,
            toLat: targetRef.current.latitude,
            toLon: targetRef.current.longitude,
            vehiclePlate: departure.plate,
            providerCode: departure.provider
          });
          setRoute(nextRoute);
        } catch (nextError) {
          setError(nextError.message);
        }
      }
    );

    connection.start()
      .then(() => {
        setConnectionStatus('connected');
        return connection.invoke('SubscribeToAllProviders');
      })
      .catch(nextError => {
        setConnectionStatus('disconnected');
        setError(nextError.message);
      });

    return () => {
      connection.stop();
    };
  }, []);

  const handleGeometryCreated = useCallback(geometry => {
    if (geometry.type === 'Point') {
      setDraftLocation(geometry);
      return;
    }

    if (geometry.type === 'Polygon') {
      setDraftBoundary(geometry);
      setDraftLocation(currentLocation => currentLocation ?? getPolygonCenterPoint(geometry));
    }
  }, []);

  const handleSaveFacility = async () => {
    if (!draftLocation) {
      setError('Tesis için önce haritada bir nokta çizin.');
      return;
    }

    try {
      const created = await createFacility({
        name: draftName || 'Yeni Tesis',
        code: draftCode || `FACILITY_${Date.now()}`,
        facilityType: draftType,
        location: JSON.stringify(draftLocation),
        boundary: draftBoundary ? JSON.stringify(draftBoundary) : null
      });

      setFacilities(current => [...current, created]);
      setHiddenFacilityTypes(current => current.filter(type => type !== normalizeFacilityType(created.facilityType)));
      setSelectedFacilityId(String(created.id));
      setDraftName('');
      setDraftCode('');
      setDraftLocation(null);
      setDraftBoundary(null);
      setNotice('Tesis kaydedildi.');
      setError(null);
    } catch (nextError) {
      setError(nextError.message);
    }
  };

  const handleSelectDestination = destinationId => {
    setSelectedDestinationId(destinationId);

    const destination = destinations.find(currentDestination => currentDestination.id === Number(destinationId));

    if (!destination) {
      return;
    }

    const position = pointToLatLng(destination.location);

    if (!position) {
      return;
    }

    setTarget({
      latitude: position[0],
      longitude: position[1],
      label: destination.name
    });
    setSuggestions([]);
  };

  const handleSaveDestination = async () => {
    if (!target) {
      setError('Kaydetmek için önce bir hedef seçin.');
      return;
    }

    try {
      const created = await createDestination({
        name: addressQuery.trim() || target.label || 'Yeni Hedef',
        location: JSON.stringify({
          type: 'Point',
          coordinates: [target.longitude, target.latitude]
        })
      });

      setDestinations(current => [...current, created].sort((first, second) => first.name.localeCompare(second.name, 'tr')));
      setSelectedDestinationId(String(created.id));
      setTarget({
        latitude: target.latitude,
        longitude: target.longitude,
        label: created.name
      });
      setNotice('Hedef kaydedildi.');
      setError(null);
    } catch (nextError) {
      setError(nextError.message);
    }
  };

  const handleDeleteDestination = async () => {
    if (!selectedDestination) {
      return;
    }

    if (!window.confirm(`${selectedDestination.name} hedefini veritabanından silmek istiyor musunuz?`)) {
      return;
    }

    try {
      await deleteDestination(selectedDestination.id);
      setDestinations(current => current.filter(destination => destination.id !== selectedDestination.id));
      setSelectedDestinationId('');
      setNotice('Hedef silindi.');
      setError(null);
    } catch (nextError) {
      setError(nextError.message);
    }
  };

  const handleDeleteFacility = async facility => {
    if (!window.confirm(`${facility.name} tesisini veritabanından silmek istiyor musunuz?`)) {
      return;
    }

    try {
      await deleteFacility(facility.id);
      setFacilities(current => current.filter(currentFacility => currentFacility.id !== facility.id));

      if (selectedFacilityId === String(facility.id)) {
        setSelectedFacilityId('');
      }

      setNotice('Tesis silindi.');
      setError(null);
    } catch (nextError) {
      setError(nextError.message);
    }
  };

  const handleRoute = async () => {
    if (!selectedFacility || !target) {
      setError('Rota için tesis ve hedef seçin.');
      return;
    }

    try {
      const nextRoute = await fetchRoute({
        fromFacilityId: selectedFacility.id,
        toLat: target.latitude,
        toLon: target.longitude,
        toDestinationId: selectedDestinationId || undefined
      });
      setRoute(nextRoute);
      setNotice('Rota hazır.');
      setError(null);
    } catch (nextError) {
      setError(nextError.message);
    }
  };

  const handleAddressSearch = () => {
    if (addressQuery.trim().length < 3) {
      return;
    }

    geocodeAddress(addressQuery)
      .then(setSuggestions)
      .catch(nextError => setError(nextError.message));
  };

  return (
    <AppLayout
      activePage="maps"
      connectionStatus={connectionStatus}
      headerIcon={MapIcon}
      municipalityName={municipalityName}
      onLogout={onLogout}
      onNavigate={onNavigate}
      title="Haritalar"
      user={currentUser}
    >
      <section className="maps-dashboard">
        <aside className="workspace-panel facilities-panel">
          <div className="panel-heading">
            <div>
              <span>Haritalar</span>
              <h2>Tesisler</h2>
            </div>
            {canEditMaps && (
              <button className="primary-mini-button" type="button" onClick={() => setIsEditorOpen(value => !value)}>
                + Yeni Tesis
              </button>
            )}
          </div>

          <div className="search-box panel-search">
            <Search size={17} />
            <input
              value={facilitySearchTerm}
              onChange={event => setFacilitySearchTerm(event.target.value)}
              placeholder="Tesis ara..."
            />
          </div>

          {availableFacilityTypes.length > 0 && (
            <div className="type-filter compact">
              <div className="type-filter-heading">
                <span>Tesis türü</span>
                <button
                  type="button"
                  onClick={() => setHiddenFacilityTypes([])}
                  disabled={hiddenFacilityTypes.length === 0}
                >
                  Tümü
                </button>
              </div>
              <div className="type-filter-options">
                {availableFacilityTypes.map(facilityType => {
                  const isVisible = !hiddenFacilityTypes.includes(facilityType.code);
                  const Icon = getFacilityIcon(facilityType.code);

                  return (
                    <button
                      key={facilityType.code}
                      className={isVisible ? 'active' : ''}
                      type="button"
                      onClick={() => toggleFacilityType(facilityType.code)}
                      aria-pressed={isVisible}
                    >
                      <Icon size={16} />
                      <span>{facilityType.label}</span>
                      <strong>{facilityType.count}</strong>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="facility-list">
            {visibleFacilities.length === 0 ? (
              <div className="empty-panel-state">
                <strong>Tesis bulunamadı</strong>
                <span>Seçili filtrelere uygun tesis yok.</span>
              </div>
            ) : (
              visibleFacilities.map(facility => {
                const Icon = getFacilityIcon(facility.facilityType);
                const isSelected = selectedFacility?.id === facility.id;

                return (
                  <button
                    key={facility.id}
                    className={`facility-row ${isSelected ? 'selected' : ''}`}
                    type="button"
                    onClick={() => setSelectedFacilityId(String(facility.id))}
                  >
                    <span className="facility-row-icon" style={{ '--facility-color': getFacilityColor(facility.facilityType) }}>
                      <Icon size={18} />
                    </span>
                    <span>
                      <strong>{facility.name}</strong>
                      <small>{facility.code}</small>
                      <em>{formatFacilityTypeLabel(facility.facilityType)}</em>
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {canEditMaps && isEditorOpen && (
            <section className="facility-editor">
              <div className="section-title">
                <Building2 size={18} />
                <strong>Yeni tesis</strong>
              </div>
              <input value={draftName} onChange={event => setDraftName(event.target.value)} placeholder="Tesis adı" />
              <input value={draftCode} onChange={event => setDraftCode(event.target.value)} placeholder="Kod" />
              <select value={draftType} onChange={event => setDraftType(event.target.value)}>
                <option value="FIRE_STATION">FIRE_STATION</option>
                <option value="HOSPITAL">HOSPITAL</option>
                <option value="GARAGE">GARAGE</option>
                <option value="DEPOT">DEPOT</option>
              </select>
              <div className="draft-state">
                <span>{draftLocation ? 'Nokta hazır' : 'Nokta bekleniyor'}</span>
                <span>{draftBoundary ? 'Poligon hazır' : 'Poligon opsiyonel'}</span>
              </div>
              <button type="button" onClick={handleSaveFacility}>
                <Save size={18} />
                Kaydet
              </button>
            </section>
          )}
        </aside>

        <section className="map-stage maps-map-stage">
          <MapContainer center={appConfig.mapCenter} zoom={appConfig.mapZoom} className="maps-canvas" scrollWheelZoom zoomControl={false}>
            <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <ZoomControl position="topright" />
            {canEditMaps && <DrawingTools onGeometryCreated={handleGeometryCreated} />}
            {canEditMaps && <MapCommandToolbar isPickMode={isPickMode} />}
            <MapClickTarget enabled={isPickMode} onTargetSelected={nextTarget => {
              setTarget(nextTarget);
              setSelectedDestinationId('');
              setIsPickMode(false);
            }} />

            {visibleFacilities.map(facility => {
              const position = pointToLatLng(facility.location);
              const boundary = parseGeometry(facility.boundary);
              const isSelected = selectedFacility?.id === facility.id;

              return (
                <Fragment key={facility.id}>
                  {boundary && <GeoJSON data={boundary} style={getFacilityBoundaryStyle(facility.facilityType)} />}
                  {position && (
                    <Marker
                      position={position}
                      icon={createFacilityMarkerIcon(facility, isSelected)}
                      zIndexOffset={isSelected ? 1000 : 0}
                      eventHandlers={{ click: () => setSelectedFacilityId(String(facility.id)) }}
                    >
                      <Popup>
                        <div className="facility-popup">
                          <strong>{facility.name}</strong>
                          <span>{facility.code}</span>
                          <em>{formatFacilityTypeLabel(facility.facilityType)}</em>
                          {canDeleteMapPoints && (
                            <button type="button" onClick={() => handleDeleteFacility(facility)}>
                              <Trash2 size={15} />
                              Sil
                            </button>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </Fragment>
              );
            })}

            {target && <Marker position={[target.latitude, target.longitude]} icon={markerIcon} />}
            {routePositions.length > 0 && <Polyline positions={routePositions} pathOptions={{ color: '#2563eb', weight: 5 }} />}
          </MapContainer>

          {route && (
            <div className="route-map-badge">
              <strong>{formatDuration(route.durationSeconds)}</strong>
              <span>{formatDistance(route.distanceMeters)}</span>
            </div>
          )}

          {notice && (
            <div className="system-toast success">
              <strong>ARAÇ ÇIKTI</strong>
              <span>{notice}</span>
            </div>
          )}

          {error && (
            <div className="system-toast error">
              <strong>Sistem bildirimi</strong>
              <span>{error}</span>
            </div>
          )}
        </section>

        <aside className="workspace-panel route-panel">
          <div className="details-heading">
            <div>
              <span>Yol Tarifi</span>
              <h2>Rota</h2>
            </div>
            <Route size={22} />
          </div>

          <label className="field-stack panel-field">
            <span>Çıkış Noktası</span>
            <select value={selectedFacility?.id ?? ''} onChange={event => setSelectedFacilityId(event.target.value)}>
              {visibleFacilities.length === 0 && <option value="">Görünen tesis yok</option>}
              {visibleFacilities.map(facility => (
                <option key={facility.id} value={facility.id}>{facility.name}</option>
              ))}
            </select>
          </label>

          <div className="field-stack panel-field">
            <span>Hedef</span>
            <div className="inline-input">
              <Search size={18} />
              <input value={addressQuery} onChange={event => setAddressQuery(event.target.value)} placeholder="Mahalle + cadde ara" />
              {addressQuery && (
                <button className="plain-icon-button" type="button" onClick={() => setAddressQuery('')} aria-label="Temizle">
                  ×
                </button>
              )}
            </div>
            {suggestions.length > 0 && (
              <div className="suggestion-list">
                {suggestions.map(suggestion => (
                  <button key={`${suggestion.latitude}:${suggestion.longitude}`} type="button" onClick={() => {
                    setTarget({
                      latitude: suggestion.latitude,
                      longitude: suggestion.longitude,
                      label: suggestion.displayName
                    });
                    setSelectedDestinationId('');
                    setSuggestions([]);
                  }}>
                    <MapPin size={16} />
                    <span>{suggestion.displayName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {canEditMaps && (
          <div className="segmented-actions">
            <button type="button" onClick={handleAddressSearch}>
              Adres Ara
            </button>
            <button type="button" onClick={() => setIsPickMode(true)} className={isPickMode ? 'active' : ''}>
              Haritadan Seç
            </button>
          </div>
          )}

          <label className="field-stack panel-field">
            <span>Kayitli Hedefler</span>
            <select value={selectedDestinationId} onChange={event => handleSelectDestination(event.target.value)}>
              <option value="">Kayitli hedef sec</option>
              {destinations.map(destination => (
                <option key={destination.id} value={destination.id}>{destination.name}</option>
              ))}
            </select>
          </label>

          {target && (
            <div className="address-card">
              <MapPin size={18} />
              <div>
                <strong>{target.label}</strong>
                <span>{target.latitude.toFixed(5)}, {target.longitude.toFixed(5)}</span>
              </div>
            </div>
          )}

          {canEditMaps && (
          <div className="segmented-actions">
            <button type="button" onClick={handleSaveDestination} disabled={!target}>
              Hedefi Kaydet
            </button>
            {canDeleteMapPoints && (
            <button type="button" onClick={handleDeleteDestination} disabled={!selectedDestination}>
              Hedefi Sil
            </button>
            )}
          </div>
          )}

          <button className="primary-action-button" type="button" onClick={handleRoute}>
            <Navigation size={18} />
            Yol Tarifi Al
          </button>

          {route && (
            <section className="route-summary">
              <div>
                <span>Mesafe</span>
                <strong>{formatDistance(route.distanceMeters)}</strong>
              </div>
              <div>
                <span>Tahmini Süre</span>
                <strong>{formatDuration(route.durationSeconds)}</strong>
              </div>
              {route.steps.length > 0 && (
                <ol>
                  {route.steps.map((step, index) => (
                    <li key={`${step.instruction}-${index}`}>
                      <span>{step.instruction}</span>
                      <small>{formatDistance(step.distanceMeters)}</small>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}
        </aside>
      </section>
    </AppLayout>
  );
}
