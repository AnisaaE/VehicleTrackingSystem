import {
  Building2,
  LocateFixed,
  Map,
  MapPinned,
  Menu,
  UserCircle
} from 'lucide-react';

const navigationItems = [
  { id: 'tracking', label: 'Canli Takip', icon: MapPinned },
  { id: 'nearest', label: 'Yakin Arac', icon: LocateFixed },
  { id: 'maps', label: 'Haritalar', icon: Map },
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
  onNavigate,
  title
}) {
  return (
    <div className="dashboard-shell">
      <aside className="main-sidebar">
        <button className="sidebar-menu-button" type="button" aria-label="Menu">
          <Menu size={20} />
        </button>

        <nav className="sidebar-nav" aria-label="Ana menu">
          {navigationItems.map(item => {
            const Icon = item.icon;
            const isActive = item.id === activePage;
            const isEnabled = item.id === 'tracking' || item.id === 'nearest' || item.id === 'maps';

            return (
              <button
                key={item.id}
                className={isActive ? 'active' : ''}
                type="button"
                onClick={() => isEnabled && onNavigate?.(item.id)}
                disabled={!isEnabled}
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
            <button type="button" aria-label="Profil">
              <UserCircle size={25} />
            </button>
          </div>
        </header>

        <main className="dashboard-content">{children}</main>
      </div>
    </div>
  );
}
