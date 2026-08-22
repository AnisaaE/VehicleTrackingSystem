import { useEffect, useState } from 'react';
import { RefreshCw, Shield, UserPlus, Users } from 'lucide-react';
import { createUser, fetchUsers, updateUserRole, updateUserStatus } from '../api';
import { AppLayout } from '../components/AppLayout';

const roles = ['ADMIN', 'DISPATCHER', 'DRIVER', 'VIEWER'];

export function UsersPage({ currentUser, municipalityName, onLogout }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    username: '',
    password: '',
    fullName: '',
    phone: '',
    email: '',
    role: 'DRIVER'
  });
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      setUsers(await fetchUsers());
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async event => {
    event.preventDefault();
    setError(null);

    try {
      const created = await createUser(form);
      setUsers(current => [...current, created].sort((first, second) => first.fullName.localeCompare(second.fullName, 'tr')));
      setForm({ username: '', password: '', fullName: '', phone: '', email: '', role: 'DRIVER' });
      setNotice('Kullanici olusturuldu.');
    } catch (nextError) {
      setError(nextError.message);
    }
  };

  const handleRoleChange = async (user, role) => {
    const updated = await updateUserRole(user.id, role);
    setUsers(current => current.map(currentUser => currentUser.id === updated.id ? updated : currentUser));
    setNotice(`${updated.fullName} rolu guncellendi.`);
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
      <section className="users-dashboard">
        <aside className="workspace-panel user-create-panel">
          <div className="panel-heading">
            <div>
              <span>Admin</span>
              <h2>Yeni Kullanici</h2>
            </div>
            <UserPlus size={22} />
          </div>

          <form className="user-form" onSubmit={handleCreateUser}>
            <label className="field-stack">
              <span>Ad Soyad</span>
              <input value={form.fullName} onChange={event => setForm(current => ({ ...current, fullName: event.target.value }))} />
            </label>
            <label className="field-stack">
              <span>Kullanici adi</span>
              <input value={form.username} onChange={event => setForm(current => ({ ...current, username: event.target.value }))} />
            </label>
            <label className="field-stack">
              <span>Sifre</span>
              <input value={form.password} onChange={event => setForm(current => ({ ...current, password: event.target.value }))} type="password" />
            </label>
            <label className="field-stack">
              <span>Telefon</span>
              <input value={form.phone} onChange={event => setForm(current => ({ ...current, phone: event.target.value }))} />
            </label>
            <label className="field-stack">
              <span>Email</span>
              <input value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} />
            </label>
            <label className="field-stack">
              <span>Rol</span>
              <select value={form.role} onChange={event => setForm(current => ({ ...current, role: event.target.value }))}>
                {roles.map(role => <option key={role} value={role}>{role}</option>)}
              </select>
            </label>
            <button className="primary-action-button" type="submit">
              <UserPlus size={18} />
              Olustur
            </button>
          </form>
        </aside>

        <section className="workspace-panel user-list-panel">
          <div className="panel-heading">
            <div>
              <span>Yetkilendirme</span>
              <h2>Tum Kullanicilar</h2>
            </div>
            <button className="icon-button" type="button" onClick={loadUsers} title="Yenile" aria-label="Yenile">
              <RefreshCw size={17} />
            </button>
          </div>

          {notice && <div className="inline-notice success">{notice}</div>}
          {error && <div className="inline-notice error">{error}</div>}

          <div className="users-table">
            {isLoading ? (
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
                <select value={user.role} onChange={event => handleRoleChange(user, event.target.value)}>
                  {roles.map(role => <option key={role} value={role}>{role}</option>)}
                </select>
                <button type="button" onClick={() => handleStatusChange(user)} className={user.isActive ? 'active' : ''}>
                  {user.isActive ? 'Aktif' : 'Pasif'}
                </button>
              </article>
            ))}
          </div>
        </section>
      </section>
    </AppLayout>
  );
}
