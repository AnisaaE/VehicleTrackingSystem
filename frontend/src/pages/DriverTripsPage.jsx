import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, MapPin, Navigation, Route } from 'lucide-react';
import { completeVehicleTrip, fetchMyVehicleTrips } from '../api';
import { AppLayout } from '../components/AppLayout';

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

  return `${Math.max(1, Math.round(value / 60))} dk`;
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}

export function DriverTripsPage({ currentUser, municipalityName, onLogout, onNavigate }) {
  const [trips, setTrips] = useState([]);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const activeTrips = useMemo(
    () => trips.filter(trip => trip.status === 'ASSIGNED' || trip.status === 'IN_PROGRESS'),
    [trips]
  );

  const loadTrips = async () => {
    setIsLoading(true);
    setError(null);

    try {
      setTrips(await fetchMyVehicleTrips());
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, []);

  const handleComplete = async trip => {
    try {
      await completeVehicleTrip(trip.id);
      setNotice(`${trip.destinationName ?? 'Gorev'} tamamlandi.`);
      await loadTrips();
    } catch (nextError) {
      setError(nextError.message);
    }
  };

  return (
    <AppLayout
      activePage="driverTrips"
      connectionStatus="connected"
      headerIcon={Route}
      municipalityName={municipalityName}
      onLogout={onLogout}
      onNavigate={onNavigate}
      title="Benim Gorevlerim"
      user={currentUser}
    >
      <section className="driver-dashboard">
        <div className="driver-summary">
          <div>
            <Navigation size={20} />
            <span>Aktif gorev</span>
            <strong>{activeTrips.length}</strong>
          </div>
          <div>
            <Clock3 size={20} />
            <span>Toplam gorev</span>
            <strong>{trips.length}</strong>
          </div>
        </div>

        {notice && <div className="inline-notice success">{notice}</div>}
        {error && <div className="inline-notice error">{error}</div>}

        <div className="driver-trip-list">
          {isLoading ? (
            <div className="empty-panel-state">Gorevler yukleniyor.</div>
          ) : trips.length === 0 ? (
            <div className="empty-panel-state">
              <strong>Gorev yok</strong>
              <span>Henuz size atanmis rota bulunmuyor.</span>
            </div>
          ) : trips.map(trip => (
            <article key={trip.id} className="driver-trip-card">
              <div className="driver-trip-heading">
                <div>
                  <span>{trip.vehiclePlate}</span>
                  <h2>{trip.destinationName ?? 'Harita hedefi'}</h2>
                </div>
                <em>{trip.status}</em>
              </div>

              <div className="driver-trip-grid">
                <div>
                  <MapPin size={17} />
                  <span>Cikis</span>
                  <strong>{trip.originFacilityName ?? 'Mevcut konum'}</strong>
                </div>
                <div>
                  <Clock3 size={17} />
                  <span>Tahmini sure</span>
                  <strong>{formatDuration(trip.estimatedDurationSeconds)}</strong>
                </div>
                <div>
                  <Route size={17} />
                  <span>Mesafe</span>
                  <strong>{formatDistance(trip.estimatedDistanceMeters)}</strong>
                </div>
                <div>
                  <CheckCircle2 size={17} />
                  <span>Atanma</span>
                  <strong>{formatDateTime(trip.assignedAt)}</strong>
                </div>
              </div>

              {(trip.status === 'ASSIGNED' || trip.status === 'IN_PROGRESS') && (
                <button className="primary-action-button" type="button" onClick={() => handleComplete(trip)}>
                  <CheckCircle2 size={18} />
                  Gorevi tamamla
                </button>
              )}
            </article>
          ))}
        </div>
      </section>
    </AppLayout>
  );
}
