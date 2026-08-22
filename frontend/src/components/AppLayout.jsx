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

const navigationItems = [
  { id: 'tracking', label: 'Canli Takip', icon: MapPinned, roles: ['ADMIN', 'DISPATCHER', 'VIEWER'] },
  { id: 'nearest', label: 'Yakin Arac', icon: LocateFixed, roles: ['ADMIN', 'DISPATCHER', 'VIEWER'] },
  { id: 'maps', label: 'Haritalar', icon: Map, roles: ['ADMIN', 'DISPATCHER', 'VIEWER'] },
  { id: 'driverTrips', label: 'Gorevlerim', icon: ClipboardList, roles: ['DRIVER'] },
  { id: 'users', label: 'Kullanicilar', icon: Users, roles: ['ADMIN'] },
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
  onNavigate,
  user,
  title
}) {
  const visibleNavigationItems = navigationItems.filter(item =>
    !user?.role || item.roles.includes(user.role)
  );

  return (
    <div className="dashboard-shell">
      <aside className="main-sidebar">
        <button className="sidebar-menu-button" type="button" aria-label="Menu">
          <Menu size={20} />
        </button>

        <nav className="sidebar-nav" aria-label="Ana menu">
          {visibleNavigationItems.map(item => {
            const Icon = item.icon;
            const isActive = item.id === activePage;

            return (
              <button
                key={item.id}
                className={isActive ? 'active' : ''}
                type="button"
                onClick={() => onNavigate?.(item.id)}
                title={item.label}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
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
            <button type="button" aria-label="Profil" title={user?.username ?? 'Profil'}>
              <UserCircle size={25} />
            </button>
            {onLogout && (
              <button type="button" onClick={onLogout} aria-label="Cikis" title="Cikis">
                <LogOut size={21} />
              </button>
            )}
          </div>
        </header>

        <main className="dashboard-content">{children}</main>
      </div>
    </div>
  );
}
