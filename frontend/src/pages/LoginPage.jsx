import { useState } from 'react';
import { LockKeyhole, LogIn, MapPinned } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage({ municipalityName }) {
  const { signIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async event => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const user = await signIn({ username, password });
      const fallbackPath = user.role === 'DRIVER' ? '/my-trips' : '/tracking';
      navigate(location.state?.from?.pathname ?? fallbackPath, { replace: true });
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-screen">
      <section className="login-panel">
        <div className="login-brand">
          <MapPinned size={30} />
          <div>
            <h1>Vehicle Tracking</h1>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field-stack">
            <span>Kullanıcı adı</span>
            <input value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" />
          </label>

          <label className="field-stack">
            <span>Şifre</span>
            <input
              value={password}
              onChange={event => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
            />
          </label>

          {error && (
            <div className="login-error">
              <LockKeyhole size={16} />
              <span>{error}</span>
            </div>
          )}

          <button className="primary-action-button" type="submit" disabled={isSubmitting}>
            <LogIn size={18} />
            {isSubmitting ? 'Giriş yapılıyor' : 'Giriş yap'}
          </button>
        </form>
      </section>
    </main>
  );
}
