import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock3, Eye, MapPin, Route } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { fetchDriverVehicleTrips } from '../api';
import { AppLayout } from '../components/AppLayout';

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function formatDuration(value) {
  if (!Number.isFinite(value)) {
    return '-';
  }

  const minutes = Math.max(1, Math.round(value / 60));
  return minutes >= 60 ? `${Math.floor(minutes / 60)} sa ${minutes % 60} dk` : `${minutes} dk`;
}

function formatDistance(value) {
  if (!Number.isFinite(value)) {
    return '-';
  }

  return value >= 1000 ? `${(value / 1000).toFixed(1)} km` : `${Math.round(value)} m`;
}

function formatCoordinates(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return '-';
  }

  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

function destinationLabel(trip) {
  return trip.destinationName ?? `${trip.destinationLatitude.toFixed(5)}, ${trip.destinationLongitude.toFixed(5)}`;
}

export function AdminDriverHistoryPage({ currentUser, municipalityName, onLogout }) {
  const { driverId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const driverName = location.state?.driverName ?? trips.find(trip => trip.driverName)?.driverName ?? 'Sofor';
  const completedTrips = useMemo(() => trips.filter(trip => trip.status === 'COMPLETED'), [trips]);
  const totalActualSeconds = useMemo(
    () => completedTrips.reduce((sum, trip) => sum + (trip.actualDurationSeconds ?? 0), 0),
    [completedTrips]
  );

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    fetchDriverVehicleTrips(driverId)
      .then(setTrips)
      .catch(nextError => setError(nextError.message))
      .finally(() => setIsLoading(false));
  }, [driverId]);

  return (
    <AppLayout
      activePage="users"
      connectionStatus="connected"
      headerIcon={Route}
      municipalityName={municipalityName}
      onLogout={onLogout}
      title="Sürücü geçmişi"
      user={currentUser}
    >
      <section className="driver-history-dashboard">
        <div className="driver-history-toolbar">
          <button className="icon-text-button" type="button" onClick={() => navigate('/users')}>
            <ArrowLeft size={18} />
            Geri
          </button>
          <div>
            <span>Sürücü geçmişini görüntüle:</span>
            <h2>{driverName}</h2>
          </div>
        </div>

        <div className="driver-summary">
          <div><CheckCircle2 size={20} /><span>Tamamlanan görevler</span><strong>{completedTrips.length}</strong></div>
          <div><Route size={20} /><span>Toplam görev</span><strong>{trips.length}</strong></div>
          <div><Clock3 size={20} /><span>Toplam çalışma</span><strong>{formatDuration(totalActualSeconds)}</strong></div>
        </div>

        {error && <div className="inline-notice error">{error}</div>}

        <div className="driver-trip-list">
          {isLoading ? (
            <div className="empty-panel-state">Sürücü geçmişi yükleniyor.</div>
          ) : trips.length === 0 ? (
            <div className="empty-panel-state">Bu sürücü için atanmış görev yok.</div>
          ) : trips.map(trip => (
            <article key={trip.id} className="driver-trip-card">
              <div className="driver-trip-heading">
                <div>
                  <span>{trip.vehiclePlate} · {trip.vehicleTypeName ?? trip.vehicleTypeCode ?? 'Araç'}</span>
                  <h2>{trip.originFacilityName ?? 'Mevcut konum'} → {destinationLabel(trip)}</h2>
                </div>
                <div className="driver-trip-heading-actions">
                  <em>{trip.status}</em>
                  <button
                    className="icon-text-button compact-action-button"
                    type="button"
                    onClick={() => navigate(`/users/drivers/${driverId}/history/${trip.id}`, { state: { trip, driverName } })}
                  >
                    <Eye size={16} />
                    Detayları gör
                  </button>
                </div>
              </div>

              <div className="driver-trip-grid">
                <div><MapPin size={17} /><span>Nereden</span><strong>{trip.originFacilityName ?? 'Mevcut konum'}</strong></div>
                <div><MapPin size={17} /><span>Nereye</span><strong>{destinationLabel(trip)}</strong></div>
                <div><Clock3 size={17} /><span>Tahmin süresi</span><strong>{formatDuration(trip.estimatedDurationSeconds)}</strong></div>
                <div><Clock3 size={17} /><span>Gerçek süresi</span><strong>{formatDuration(trip.actualDurationSeconds)}</strong></div>
                <div><Route size={17} /><span>Tahmin mesafe</span><strong>{formatDistance(trip.estimatedDistanceMeters)}</strong></div>
                <div><CheckCircle2 size={17} /><span>Atanma</span><strong>{formatDateTime(trip.assignedAt)}</strong></div>
                <div><CheckCircle2 size={17} /><span>Görevlendiren</span><strong>{trip.assignedByEmployeeName ?? '-'}</strong></div>
                <div><CheckCircle2 size={17} /><span>Tamamlanma</span><strong>{formatDateTime(trip.completedAt)}</strong></div>
                <div><CheckCircle2 size={17} /><span>Tamamlayan</span><strong>{trip.completedByEmployeeName ?? '-'}</strong></div>
                <div><MapPin size={17} /><span>Tamamlanan konum</span><strong>{formatCoordinates(trip.completionLatitude, trip.completionLongitude)}</strong></div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AppLayout>
  );
}
