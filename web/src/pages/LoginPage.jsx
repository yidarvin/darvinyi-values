import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

const USERNAME_RE = /^[a-z0-9_-]{3,30}$/;

export default function LoginPage() {
  const { auth, login } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameStatus, setUsernameStatus] = useState(null); // 'available' | 'taken' | 'invalid' | null
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const checkTimeout = useRef(null);

  useEffect(() => {
    if (auth) navigate('/dashboard', { replace: true });
  }, [auth, navigate]);

  async function checkUsername() {
    if (tab !== 'register') return;
    if (!USERNAME_RE.test(username)) {
      setUsernameStatus('invalid');
      return;
    }
    const { data } = await client.get(`/auth/check-username?username=${encodeURIComponent(username)}`);
    setUsernameStatus(data.available ? 'available' : 'taken');
  }

  function onUsernameChange(e) {
    const val = e.target.value;
    setUsername(val);
    setUsernameStatus(null);
    clearTimeout(checkTimeout.current);
    if (tab === 'register' && val.length >= 3) {
      checkTimeout.current = setTimeout(checkUsername, 400);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (tab === 'register' && !USERNAME_RE.test(username)) {
      setError('Username must be 3–30 characters: lowercase letters, numbers, underscores, hyphens only');
      return;
    }
    setLoading(true);
    try {
      const endpoint = tab === 'login' ? '/auth/login' : '/auth/register';
      const { data } = await client.post(endpoint, { username, password });
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function switchTab(t) {
    setTab(t);
    setUsernameStatus(null);
    setError('');
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.logo}>values.</h1>
        <p style={styles.tagline}>Discover what matters most to you.</p>

        <div style={styles.tabs}>
          {['login', 'register'].map(t => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}
            >
              {t === 'login' ? 'Log in' : 'Create account'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <input
              style={styles.input}
              type="text"
              value={username}
              onChange={onUsernameChange}
              onBlur={tab === 'register' ? checkUsername : undefined}
              autoComplete="username"
              autoCapitalize="none"
              required
            />
            {tab === 'register' && usernameStatus && (
              <span style={{
                ...styles.hint,
                color: usernameStatus === 'available' ? 'var(--success)' : 'var(--danger)',
              }}>
                {usernameStatus === 'available' && '✓ Available'}
                {usernameStatus === 'taken' && 'Username already taken'}
                {usernameStatus === 'invalid' && 'Lowercase letters, numbers, _ and - only (3–30 chars)'}
              </span>
            )}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" style={styles.submit} disabled={loading}>
            {loading ? 'Please wait…' : tab === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '48px 40px',
  },
  logo: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '2.5rem',
    color: 'var(--accent)',
    fontWeight: 400,
    marginBottom: '8px',
    letterSpacing: '-0.5px',
  },
  tagline: {
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    marginBottom: '32px',
  },
  tabs: {
    display: 'flex',
    gap: '0',
    marginBottom: '28px',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    padding: '10px 16px',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '0.875rem',
    fontWeight: 500,
    transition: 'all 0.15s',
  },
  tabActive: {
    background: 'var(--border)',
    color: 'var(--text)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: 500,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  input: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '12px 14px',
    color: 'var(--text)',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  hint: {
    fontSize: '0.8rem',
  },
  error: {
    color: 'var(--danger)',
    fontSize: '0.875rem',
    background: 'rgba(224, 85, 85, 0.08)',
    border: '1px solid rgba(224, 85, 85, 0.2)',
    borderRadius: '6px',
    padding: '10px 14px',
  },
  submit: {
    background: 'var(--accent)',
    color: '#0f0f0f',
    border: 'none',
    borderRadius: '6px',
    padding: '14px',
    fontSize: '0.95rem',
    fontWeight: 600,
    marginTop: '4px',
    transition: 'opacity 0.15s',
  },
};
