import { useMemo, useState } from 'react';
import { Check, Layers, Map as MapIcon } from 'lucide-react';
import { MapContainer, ZoomControl } from 'react-leaflet';
import { appConfig } from '../config';
import { AppLayout } from '../components/AppLayout';
import { BasemapLayer, basemapOptions, getStoredBasemapId, setStoredBasemapId } from '../components/BasemapLayer';

export function BasemapPage({ currentUser, municipalityName, onLogout }) {
  const [selectedBasemapId, setSelectedBasemapId] = useState(getStoredBasemapId);
  const selectedBasemap = useMemo(
    () => basemapOptions.find(option => option.id === selectedBasemapId) ?? basemapOptions[0],
    [selectedBasemapId]
  );

  const handleBasemapChange = basemapId => {
    setSelectedBasemapId(basemapId);
    setStoredBasemapId(basemapId);
  };

  return (
    <AppLayout
      activePage="basemaps"
      connectionStatus="connected"
      headerIcon={Layers}
      municipalityName={municipalityName}
      onLogout={onLogout}
      title="Altlık Harita"
      user={currentUser}
    >
      <section className="basemap-dashboard">
        <aside className="workspace-panel basemap-panel">
          <div className="panel-heading">
            <div>
              <span>Harita Katmanı</span>
              <h2>Basemap</h2>
            </div>
            <strong>{basemapOptions.length}</strong>
          </div>

          <div className="basemap-option-list">
            {basemapOptions.map(option => {
              const isSelected = option.id === selectedBasemapId;

              return (
                <button
                  key={option.id}
                  className={isSelected ? 'selected' : ''}
                  type="button"
                  onClick={() => handleBasemapChange(option.id)}
                  aria-pressed={isSelected}
                >
                  <span className="basemap-option-icon">
                    <MapIcon size={18} />
                  </span>
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                    <em>{option.provider}</em>
                  </span>
                  {isSelected && <Check size={18} />}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="map-stage basemap-map-stage">
          <MapContainer
            center={appConfig.mapCenter}
            zoom={appConfig.mapZoom}
            className="basemap-canvas"
            scrollWheelZoom
            zoomControl={false}
          >
            <BasemapLayer basemapId={selectedBasemapId} />
            <ZoomControl position="topright" />
          </MapContainer>

          <div className="basemap-map-badge">
            <strong>{selectedBasemap.label}</strong>
            <span>{selectedBasemap.provider}</span>
          </div>
        </section>
      </section>
    </AppLayout>
  );
}
