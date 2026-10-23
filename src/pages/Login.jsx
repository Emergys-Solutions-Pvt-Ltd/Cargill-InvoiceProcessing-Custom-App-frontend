import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { ShieldCheck, CreditCard, FileText, Lock, Layers, LayoutGrid } from 'lucide-react';
import cargillLogo from '../assets/cargill_logo.svg';

const DEMO_USERS = [
  {
    id: 'admin',
    label: 'Admin User',
    email: 'admin@cargill.com',
    password: 'password',
    role: 'Admin',
    access: 'Full Admin (3 Apps + UAM)',
    icon: ShieldCheck,
    badgeClass: 'badge-success'
  },
  {
    id: 'GP-sjo',
    label: 'Multi-App User (GP + SJO)',
    email: 'GP.sjo.user@cargill.com',
    password: 'password',
    role: 'User',
    access: '2 Apps Visible (GP & SJO)',
    icon: Layers,
    badgeClass: 'badge-info'
  },
  {
    id: 'sjo-rospbu',
    label: 'Multi-App User (SJO + ROSPBU)',
    email: 'sjo.rospbu.user@cargill.com',
    password: 'password',
    role: 'User',
    access: '2 Apps Visible (SJO & ROSPBU)',
    icon: Layers,
    badgeClass: 'badge-info'
  },
  {
    id: 'multi-all',
    label: 'Multi-App User (All 3 Apps)',
    email: 'user@cargill.com',
    password: 'password',
    role: 'User',
    access: '3 Apps Visible (GP, SJO, ROSPBU)',
    icon: LayoutGrid,
    badgeClass: 'badge-info'
  },
  {
    id: 'GP',
    label: 'Single-App User (GP Only)',
    email: 'GP.user@cargill.com',
    password: 'password',
    role: 'User',
    access: '1 App Visible (GP Only)',
    icon: CreditCard,
    badgeClass: 'badge-warning'
  },
  {
    id: 'sjo',
    label: 'Single-App User (SJO Only)',
    email: 'sjo.user@cargill.com',
    password: 'password',
    role: 'User',
    access: '1 App Visible (SJO Only)',
    icon: FileText,
    badgeClass: 'badge-warning'
  }
];

const Login = () => {
  const [username, setUsername] = useState('admin@cargill.com');
  const [password, setPassword] = useState('password');
  const [isAD, setIsAD] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, getDefaultRoute } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const navigate = useNavigate();

  const handleLogin = async (e, customUser, customPass) => {
    if (e) e.preventDefault();
    setError('');
    setIsLoading(true);

    const userToLogin = customUser || username;
    const passToLogin = customPass || password;

    try {
      const loggedInUser = await login(userToLogin, passToLogin, isAD);
      const targetRoute = getDefaultRoute(loggedInUser);
      navigate(targetRoute, { replace: true });
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDemo = (demo) => {
    setUsername(demo.email);
    setPassword(demo.password);
    handleLogin(null, demo.email, demo.password);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '2rem', background: 'radial-gradient(circle at top right, rgba(var(--primary-rgb), 0.08), transparent 40%), radial-gradient(circle at bottom left, rgba(34, 197, 94, 0.05), transparent 40%)' }}>
      <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: '24px', width: '100%', maxWidth: '480px', border: '1px solid var(--border-color)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)' }}>

        {/* Header with Cargill Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem 1.5rem', borderRadius: '16px', background: 'rgba(255, 255, 255, 0.05)', marginBottom: '1.25rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <img src={cargillLogo} alt="Cargill" style={{ height: '36px', filter: 'brightness(1.1)' }} />
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>{t('welcomeBack')}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Sign in to access Cargill Custom Applications & UAM</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.12)', color: 'var(--danger-color)', padding: '0.85rem 1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.85rem', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock size={16} />
            {error}
          </div>
        )}

        {/* Demo Quick Login Chips */}
        <div style={{ marginBottom: '1.75rem' }}>
          <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: '600', display: 'block', marginBottom: '0.65rem' }}>
            ⚡ Select Demo Account Role:
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {DEMO_USERS.map((demo) => {
              const Icon = demo.icon;
              const isSelected = username === demo.email;
              return (
                <button
                  key={demo.id}
                  type="button"
                  onClick={() => handleSelectDemo(demo)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    padding: '0.65rem 0.9rem',
                    borderRadius: '10px',
                    border: isSelected ? '1.5px solid var(--primary-color)' : '1px solid var(--border-color)',
                    background: isSelected ? 'rgba(var(--primary-rgb), 0.1)' : 'rgba(255, 255, 255, 0.02)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{ color: 'var(--primary-color)', display: 'flex' }}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>{demo.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{demo.email}</div>
                    </div>
                  </div>
                  <span className={`badge ${demo.badgeClass}`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                    {demo.access}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.25rem 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
          <span>or sign in manually</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
        </div>

        <form onSubmit={(e) => handleLogin(e)}>
          <div className="input-group">
            <label style={{ fontSize: '0.85rem', fontWeight: '500' }}>{t('emailUsername')}</label>
            <input
              type="text"
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label style={{ fontSize: '0.85rem', fontWeight: '500' }}>{t('password')}</label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!isAD}
              disabled={isAD}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              id="ad-login"
              checked={isAD}
              onChange={(e) => setIsAD(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--primary-color)', cursor: 'pointer' }}
            />
            <label htmlFor="ad-login" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', userSelect: 'none', cursor: 'pointer' }}>{t('loginActiveDirectory')}</label>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', fontWeight: '600' }} disabled={isLoading}>
            {isLoading ? t('signingIn') : (isAD ? t('signInWithAD') : t('signIn'))}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
