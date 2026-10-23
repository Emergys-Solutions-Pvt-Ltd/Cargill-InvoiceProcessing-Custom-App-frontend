import React, { useContext, useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Settings,
  LogOut,
  CreditCard,
  FileText,
  BarChart3,
  Globe,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import cargillLogo from '../assets/cargill_logo.svg';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { APPS } from '../utils/appHelper';

const APP_ICONS = { GP: CreditCard, sjo: FileText, rospbu: BarChart3 };

const getInitials = (name = '') =>
  name
    .replace(/\(.*?\)/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || '?';

/** One collapsible menu section ("Settings" > Users / Configuration). */
const NavSection = ({ icon: Icon, label, basePath, active, children }) => {
  const [open, setOpen] = useState(active);

  // Opening a page inside the section (e.g. from a link) expands it
  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  return (
    <div className="nav-section">
      <button
        type="button"
        className={`nav-section-header ${active ? 'active-parent' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        data-base-path={basePath}
      >
        <span className="nav-section-left">
          <Icon size={17} />
          {label}
        </span>
        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
      </button>
      {open && <div className="nav-submenu">{children}</div>}
    </div>
  );
};

const SubItem = ({ to, label, end = false, forceActive = false }) => (
  <NavLink to={to} end={end} className={({ isActive }) => `nav-subitem ${isActive || forceActive ? 'active' : ''}`}>
    <span className="nav-subitem-bullet" />
    {label}
  </NavLink>
);

const GlobalLayout = () => {
  const { user, logout, isAdmin, hasAppAccess } = useContext(AuthContext);
  const { language, toggleLanguage, t } = useContext(LanguageContext);
  const navigate = useNavigate();
  const location = useLocation();

  const canAccessAdmin = isAdmin();
  const visibleApps = APPS.filter((app) => hasAppAccess(app.id));
  const roleLabel = canAccessAdmin ? 'Admin' : 'User';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      {/* Top header: brand on the left, signed-in user on the right */}
      <header className="top-header">
        <div className="top-header-brand">
          <img src={cargillLogo} alt="Cargill" />
          <span className="top-header-divider" />
          {t('app_title', 'Invoice Processing')}
        </div>

        <div className="top-header-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={toggleLanguage}
            title="Switch Language (English / Español)"
          >
            <Globe size={15} />
            {language === 'en' ? 'ES' : 'EN'}
          </button>
          <button type="button" className="icon-btn" onClick={handleLogout} title={t('logout')}>
            <LogOut size={15} />
          </button>

          <div className="user-chip">
            <span className="avatar">{getInitials(user?.name)}</span>
            <div>
              <div className="user-chip-name">{user?.name}</div>
              <div className="user-chip-role">{roleLabel}</div>
            </div>
          </div>
        </div>
      </header>

      <div className="app-container">
        <aside className="sidebar">
          <nav className="sidebar-nav">
            <div className="sidebar-section-label">
              <span>{t('menu', 'Menu')}</span>
            </div>

            {/* One entry per app; its pages (Invoices / Team Assignment) are tabs inside the app */}
            {visibleApps.map((app) => {
              const basePath = `/app/${app.id}`;
              const inApp = location.pathname.startsWith(`${basePath}/`) || location.pathname === basePath;
              const Icon = APP_ICONS[app.id] ?? FileText;
              return (
                <NavLink key={app.id} to={`${basePath}/invoices`} className={`nav-item ${inApp ? 'active' : ''}`}>
                  <Icon size={17} />
                  {t(app.nameKey, app.name)}
                </NavLink>
              );
            })}

            {canAccessAdmin && (
              <NavSection
                icon={Settings}
                label={t('settings')}
                basePath="/settings"
                active={location.pathname.startsWith('/settings')}
              >
                <SubItem to="/settings/users" label={t('usersMenu', 'Users')} />
                <SubItem to="/settings/configuration" label={t('configurationMenu', 'Configuration')} />
              </NavSection>
            )}
          </nav>

          <div className="sidebar-footer">
            {canAccessAdmin ? 'UAM (Full Admin)' : visibleApps.map((a) => a.id.toUpperCase()).join(', ')}
          </div>
        </aside>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default GlobalLayout;
