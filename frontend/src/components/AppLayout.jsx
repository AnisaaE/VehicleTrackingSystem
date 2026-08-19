import {
  Bell,
  Building2,
  CarFront,
  FileText,
  Map,
  MapPinned,
  Menu,
  MessageSquare,
  Settings,
  UserCircle,
  Wrench
} from 'lucide-react';
import { appConfig } from '../config';

const navigationItems = [
  { id: 'tracking', label: 'Canlı Takip', icon: MapPinned },
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
      {label ?? (isConnected ? 'Bağlı' : 'Bağlantı yok')}
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
  onNavigate,
  title
}) {
  return (
    <div className="dashboard-shell">
      <aside className="main-sidebar">
        <button className="sidebar-menu-button" type="button" aria-label="Menü">
          <Menu size={20} />
        </button>

        <nav className="sidebar-nav" aria-label="Ana menü">
          {navigationItems.map(item => {
            const Icon = item.icon;
            const isActive = item.id === activePage;
            const isEnabled = item.id === 'tracking' || item.id === 'maps';

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
          <strong>BELEDİYE</strong>
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
            <button type="button" aria-label="Bildirimler">
              <Bell size={19} />
              <span className="notification-dot">3</span>
            </button>
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
