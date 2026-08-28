import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Clock3, History, ListChecks, RefreshCw, Route, Shield, Truck, UserPlus, Users, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createUser, fetchUsers, fetchVehicleTrips, updateUserRole, updateUserStatus } from '../api';
import { AppLayout } from '../components/AppLayout';

const roles = ['ADMIN', 'DISPATCHER', 'DRIVER', 'VIEWER'];
const tabs = [
  { id: 'users', label: 'Kullanıcı listesi', icon: Users },
  { id: 'routes', label: 'Görev listesi', icon: ListChecks },
  { id: 'stats', label: 'İstatistikler', icon: BarChart3 }
];
const initialForm = { username: '', password: '', fullName: '', phone: '', email: '', role: 'DRIVER' };

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

function tripDestinationLabel(trip) {
  return trip.destinationName ?? `${trip.destinationLatitude.toFixed(5)}, ${trip.destinationLongitude.toFixed(5)}`;
}

function completionLocationLabel(trip) {
  if (!Number.isFinite(trip.completionLatitude) || !Number.isFinite(trip.completionLongitude)) {
    return 'Tamamlanma konumu yok';
  }

  return `${trip.completionLatitude.toFixed(5)}, ${trip.completionLongitude.toFixed(5)}`;
}

function vehicleTypeLabel(trip) {
  return trip.vehicleTypeName ?? trip.vehicleTypeCode ?? 'Diger araclar';
}

export function UsersPage({ currentUser, municipalityName, onLogout }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState(null);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    setError(null);

    try {
      setUsers(await fetchUsers());
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadTrips = async () => {
    setIsLoadingTrips(true);
    setError(null);

    try {
      setTrips(await fetchVehicleTrips());
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setIsLoadingTrips(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadTrips();
  }, []);

  const tripsByVehicleType = useMemo(() => {
    const groups = new Map();

    trips.forEach(trip => {
      const label = vehicleTypeLabel(trip);
      groups.set(label, [...(groups.get(label) ?? []), trip]);
    });

    return Array.from(groups.entries())
      .map(([label, groupedTrips]) => ({
        label,
        trips: groupedTrips.sort((first, second) => new Date(second.assignedAt) - new Date(first.assignedAt))
      }))
      .sort((first, second) => first.label.localeCompare(second.label, 'tr'));
  }, [trips]);

  const stats = useMemo(() => {
    const completedTrips = trips.filter(trip => trip.status === 'COMPLETED');
    const activeTrips = trips.filter(trip => trip.status === 'ASSIGNED' || trip.status === 'IN_PROGRESS');
    const driverStats = new Map();

    trips.forEach(trip => {
      if (!trip.driverId) {
        return;
      }

      const current = driverStats.get(trip.driverId) ?? {
        driverName: trip.driverName ?? 'Sofor',
        completedCount: 0,
        totalActualSeconds: 0,
        assignedCount: 0
      };

      current.assignedCount += 1;

      if (trip.status === 'COMPLETED') {
        current.completedCount += 1;
        current.totalActualSeconds += trip.actualDurationSeconds ?? 0;
      }

      driverStats.set(trip.driverId, current);
    });

    return {
      activeTrips,
      completedTrips,
      driverStats: Array.from(driverStats.values())
        .sort((first, second) => second.completedCount - first.completedCount)
        .slice(0, 8),
      totalActualSeconds: completedTrips.reduce((sum, trip) => sum + (trip.actualDurationSeconds ?? 0), 0)
    };
  }, [trips]);

  const handleCreateUser = async event => {
    event.preventDefault();
    setError(null);

    try {
      const created = await createUser(form);
      setUsers(current => [...current, created].sort((first, second) => first.fullName.localeCompare(second.fullName, 'tr')));
      setForm(initialForm);
      setIsCreateOpen(false);
      setNotice('Kullanıcı oluşturuldu.');
    } catch (nextError) {
      setError(nextError.message);
    }
  };

  const confirmRoleChange = async () => {
    if (!pendingRoleChange) {
      return;
    }

    try {
      const updated = await updateUserRole(pendingRoleChange.user.id, pendingRoleChange.role);
      setUsers(current => current.map(user => user.id === updated.id ? updated : user));
      setNotice(`${updated.fullName} yetkilendirme guncellendi.`);
      setPendingRoleChange(null);
    } catch (nextError) {
      setError(nextError.message);
    }
  };

  const handleStatusChange = async user => {
    const updated = await updateUserStatus(user.id, !user.isActive);
    setUsers(current => current.map(currentUser => currentUser.id === updated.id ? updated : currentUser));
    setNotice(`${updated.fullName} durumu guncellendi.`);
  };

  return (
    <AppLayout
      activePage="users"
      connectionStatus="connected"
      headerIcon={Users}
      municipalityName={municipalityName}
      onLogout={onLogout}
      title="Kullanicilar"
      user={currentUser}
    >
      <section className="users-dashboard admin-users-dashboard">
        <aside className="workspace-panel users-nav-panel">
          <div className="panel-heading">
            <div>
              <span>Kullanıcı paneli</span>
              <h2>Yönetim</h2>
            </div>
            <Shield size={22} />
          </div>

          <div className="users-inner-nav">
            {tabs.map(tab => {
              const Icon = tab.icon;

              return (
                <button key={tab.id} type="button" className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>
                  <Icon size={18} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <button className="primary-action-button users-create-button" type="button" onClick={() => setIsCreateOpen(true)}>
            <UserPlus size={18} />
            Yeni kullanıcı
          </button>
        </aside>

        <section className="workspace-panel user-list-panel">
          <div className="panel-heading">
            <div>
              <span>{activeTab === 'users' ? 'Yetkilendirme' : activeTab === 'routes' ? 'Görev geçmişi' : 'Ozet'}</span>
              <h2>{tabs.find(tab => tab.id === activeTab)?.label}</h2>
            </div>
            <button className="icon-button" type="button" onClick={() => activeTab === 'users' ? loadUsers() : loadTrips()} title="Yenile" aria-label="Yenile">
              <RefreshCw size={17} />
            </button>
          </div>

          {notice && <div className="inline-notice success">{notice}</div>}
          {error && <div className="inline-notice error">{error}</div>}

          {activeTab === 'users' && (
            <div className="users-table">
              {isLoadingUsers ? (
                <div className="empty-panel-state">Kullanicilar yukleniyor.</div>
              ) : users.map(user => (
                <article key={user.id} className="user-row-card">
                  <div>
                    <Shield size={18} />
                    <span>
                      <strong>{user.fullName}</strong>
                      <small>{user.username} · {user.email ?? 'email yok'}</small>
                    </span>
                  </div>
                  <select
                    value={user.role}
                    onChange={event => {
                      if (event.target.value !== user.role) {
                        setPendingRoleChange({ user, role: event.target.value });
                      }
                    }}
                  >
                    {roles.map(role => <option key={role} value={role}>{role}</option>)}
                  </select>
                  <button type="button" onClick={() => handleStatusChange(user)} className={user.isActive ? 'active' : ''}>
                    {user.isActive ? 'Aktif' : 'Pasif'}
                  </button>
                  {user.role === 'DRIVER' && (
                    <button type="button" className="history-button" onClick={() => navigate(`/users/drivers/${user.employeeId}/history`, { state: { driverName: user.fullName } })}>
                      <History size={16} />
                      Sürücü geçmişini görüntüle
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}

          {activeTab === 'routes' && (
            <div className="assigned-routes-list">
              {isLoadingTrips ? (
                <div className="empty-panel-state">Görevler yükleniyor.</div>
              ) : tripsByVehicleType.length === 0 ? (
                <div className="empty-panel-state">Atanmış rota yok.</div>
              ) : tripsByVehicleType.map(group => (
                <section key={group.label} className="route-category-section">
                  <div className="route-category-heading">
                    <Truck size={18} />
                    <h3>{group.label}</h3>
                    <strong>{group.trips.length}</strong>
                  </div>
                  {group.trips.map(trip => (
                    <article key={trip.id} className="assigned-route-row">
                      <div>
                        <strong>{trip.originFacilityName ?? 'Mevcut konum'} → {tripDestinationLabel(trip)}</strong>
                        <small>{trip.vehiclePlate} · {trip.driverName ?? 'Sofor atanmadi'}</small>
                        <small>Görevlendiren: {trip.assignedByEmployeeName ?? '-'}</small>
                        <small>Tamamlayan: {trip.completedByEmployeeName ?? '-'} · {completionLocationLabel(trip)}</small>
                      </div>
                      <span>{trip.status}</span>
                      <time>{formatDateTime(trip.assignedAt)}</time>
                    </article>
                  ))}
                </section>
              ))}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="admin-stats-view">
              <div className="admin-stat-grid">
                <div><Route size={20} /><span>Toplam görev</span><strong>{trips.length}</strong></div>
                <div><ListChecks size={20} /><span>Tamamlanan</span><strong>{stats.completedTrips.length}</strong></div>
                <div><Clock3 size={20} /><span>Aktif</span><strong>{stats.activeTrips.length}</strong></div>
                <div><Clock3 size={20} /><span>Toplam çalışma</span><strong>{formatDuration(stats.totalActualSeconds)}</strong></div>
              </div>

              <section className="driver-stat-list">
                <h3>Sofor performansi</h3>
                {stats.driverStats.length === 0 ? (
                  <div className="empty-panel-state compact-empty-state">Sofor istatistigi yok.</div>
                ) : stats.driverStats.map(driver => (
                  <article key={driver.driverName} className="driver-stat-row">
                    <strong>{driver.driverName}</strong>
                    <span>{driver.assignedCount} atanmis / {driver.completedCount} tamamlanan</span>
                    <em>{formatDuration(driver.totalActualSeconds)}</em>
                  </article>
                ))}
              </section>
            </div>
          )}
        </section>
      </section>

      {isCreateOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="create-user-title">
          <section className="modal-panel user-create-modal">
            <div className="panel-heading">
              <div>
                <span>Admin</span>
                <h2 id="create-user-title">Yeni Kullanıcı</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setIsCreateOpen(false)} aria-label="Kapat" title="Kapat">
                <X size={17} />
              </button>
            </div>

            <form className="user-form" onSubmit={handleCreateUser}>
              <label className="field-stack"><span>Ad Soyad</span><input value={form.fullName} onChange={event => setForm(current => ({ ...current, fullName: event.target.value }))} /></label>
              <label className="field-stack"><span>Kullanıcı adı</span><input value={form.username} onChange={event => setForm(current => ({ ...current, username: event.target.value }))} /></label>
              <label className="field-stack"><span>Şifre</span><input value={form.password} onChange={event => setForm(current => ({ ...current, password: event.target.value }))} type="password" /></label>
              <label className="field-stack"><span>Telefon</span><input value={form.phone} onChange={event => setForm(current => ({ ...current, phone: event.target.value }))} /></label>
              <label className="field-stack"><span>Email</span><input value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} /></label>
              <label className="field-stack">
                <span>Rol</span>
                <select value={form.role} onChange={event => setForm(current => ({ ...current, role: event.target.value }))}>
                  {roles.map(role => <option key={role} value={role}>{role}</option>)}
                </select>
              </label>
              <button className="primary-action-button" type="submit"><UserPlus size={18} />Olustur</button>
            </form>
          </section>
        </div>
      )}

      {pendingRoleChange && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="role-confirm-title">
          <section className="modal-panel confirmation-modal">
            <div className="panel-heading">
              <div>
                <span>Yetkilendirme</span>
                <h2 id="role-confirm-title">Rol değiştirilsin mi?</h2>
              </div>
              <Shield size={22} />
            </div>
            <p>
              {pendingRoleChange.user.fullName} kullanıcısının yetkilendirmesini {pendingRoleChange.user.role} rolünden {pendingRoleChange.role} rolüne değiştirmek istediginize emin misiniz?
            </p>
            <div className="modal-actions">
              <button type="button" onClick={() => setPendingRoleChange(null)}>Vazgeç</button>
              <button type="button" onClick={confirmRoleChange}>Onayla</button>
            </div>
          </section>
        </div>
      )}
    </AppLayout>
  );
}
