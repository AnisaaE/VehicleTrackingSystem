import { useEffect, useState } from 'react';
import {
  Building2,
  ClipboardList,
  LocateFixed,
  LogOut,
  Map,
  MapPinned,
  Menu,
  UserCircle,
  Users
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navigationItems = [
  { id: 'tracking', path: '/tracking', label: 'Canli Takip', icon: MapPinned, roles: ['ADMIN', 'DISPATCHER', 'VIEWER'] },
  { id: 'nearest', path: '/nearest', label: 'Yakin Arac', icon: LocateFixed, roles: ['ADMIN', 'DISPATCHER', 'VIEWER'] },
  { id: 'maps', path: '/maps', label: 'Haritalar', icon: Map, roles: ['ADMIN'] },
  { id: 'driverTrips', path: '/my-trips', label: 'Gorevlerim', icon: ClipboardList, roles: ['DRIVER'] },
  { id: 'users', path: '/users', label: 'Kullanicilar', icon: Users, roles: ['ADMIN'] },
];

function formatHeaderTime(value) {
  return new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(value ?? new Date());
}

export function StatusPill({ status = 'connected', label }) {
  const isConnected = status === 'connected';

  return (
    <span className={`app-status-pill ${isConnected ? 'connected' : 'disconnected'}`}>
      <span />
      {label ?? (isConnected ? 'Bagli' : 'Baglanti yok')}
    </span>
  );
}

export function AppLayout({
  activePage,
  children,
  connectionLabel,
  connectionStatus,
  headerIcon: HeaderIcon = Map,
  lastUpdatedAt,
  municipalityName,
  onLogout,
  user,
  title
}) {
  const { updateProfile } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    phone: '',
    email: ''
  });
  const [profileNotice, setProfileNotice] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const visibleNavigationItems = navigationItems.filter(item =>
    !user?.role || item.roles.includes(user.role)
  );

  useEffect(() => {
    if (!user) {
      return;
    }

    setProfileForm({
      fullName: user.fullName ?? '',
      phone: user.phone ?? '',
      email: user.email ?? ''
    });
  }, [user]);

  const handleProfileSubmit = async event => {
    event.preventDefault();
    setProfileError(null);
    setProfileNotice(null);
    setIsProfileSaving(true);

    try {
      await updateProfile(profileForm);
      setProfileNotice('Profil guncellendi.');
    } catch (nextError) {
      setProfileError(nextError.message);
    } finally {
      setIsProfileSaving(false);
    }
  };

  return (
    <div className="dashboard-shell">
      <aside className="main-sidebar">
        <button className="sidebar-menu-button" type="button" aria-label="Menu">
          <Menu size={20} />
        </button>

        <nav className="sidebar-nav" aria-label="Ana menu">
          {visibleNavigationItems.map(item => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.id}
                className={({ isActive }) => isActive || item.id === activePage ? 'active' : ''}
                to={item.path}
                title={item.label}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-brand">
          <Building2 size={21} />
          <strong>{municipalityName}</strong>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-title">
            <HeaderIcon size={22} />
            <strong>{title}</strong>
          </div>

          <div className="header-actions">
            <StatusPill status={connectionStatus} label={connectionLabel} />
            <time>{formatHeaderTime(lastUpdatedAt)}</time>
            {user && <span className="header-user-role">{user.fullName} · {user.role}</span>}
            <button
              type="button"
              aria-label="Profil"
              title={user?.username ?? 'Profil'}
              onClick={() => setIsProfileOpen(current => !current)}
            >
              <UserCircle size={25} />
            </button>
            {onLogout && (
              <button type="button" onClick={onLogout} aria-label="Cikis" title="Cikis">
                <LogOut size={21} />
              </button>
            )}
          </div>

          {isProfileOpen && user && (
            <form className="profile-popover" onSubmit={handleProfileSubmit}>
              <div className="profile-popover-heading">
                <div>
                  <span>Profil</span>
                  <strong>{user.username}</strong>
                </div>
                <em>{user.role}</em>
              </div>

              <label className="field-stack">
                <span>Ad Soyad</span>
                <input
                  value={profileForm.fullName}
                  onChange={event => setProfileForm(current => ({ ...current, fullName: event.target.value }))}
                />
              </label>

              <label className="field-stack">
                <span>Telefon</span>
                <input
                  value={profileForm.phone}
                  onChange={event => setProfileForm(current => ({ ...current, phone: event.target.value }))}
                />
              </label>

              <label className="field-stack">
                <span>Email</span>
                <input
                  value={profileForm.email}
                  onChange={event => setProfileForm(current => ({ ...current, email: event.target.value }))}
                  type="email"
                />
              </label>

              {profileNotice && <div className="inline-notice success">{profileNotice}</div>}
              {profileError && <div className="inline-notice error">{profileError}</div>}

              <div className="segmented-actions">
                <button type="submit" disabled={isProfileSaving}>
                  {isProfileSaving ? 'Kaydediliyor' : 'Kaydet'}
                </button>
                <button type="button" onClick={() => setIsProfileOpen(false)}>
                  Kapat
                </button>
              </div>
            </form>
          )}
        </header>

        <main className="dashboard-content">{children}</main>
      </div>
    </div>
  );
}
