import React, { useContext } from 'react';
import { Outlet, NavLink, useParams, useLocation } from 'react-router-dom';
import { FileText, Users } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { APPS, getAppName } from '../utils/appHelper';

/** Shell of one invoice app: title + tabs (Invoices / Team Assignment) + the current page. */
const AppLayout = () => {
  const params = useParams();
  const { t } = useContext(LanguageContext);
  const { isAdmin } = useContext(AuthContext);
  const location = useLocation();
  // App routes are literal paths (e.g. "app/GP"), so derive the slug from the URL when there is no :appId param
  const appId = params.appId || location.pathname.match(/^\/app\/([^/]+)/)?.[1];
  const app = APPS.find((a) => a.id === appId);
  const appName = app ? t(app.nameKey, app.name) : getAppName(appId, location.pathname);
  const basePath = `/app/${appId}`;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{appName}</h1>
        <p className="page-subtitle">
          {t('appSubtitle', 'Search, review and assign invoices for this application.')}
        </p>
      </div>

      <div className="tab-bar">
        <NavLink to={`${basePath}/invoices`} className={({ isActive }) => `tab-link ${isActive ? 'active' : ''}`}>
          <FileText size={15} /> {t('invoicesMenu', 'Invoices')}
        </NavLink>
        {isAdmin() && (
          <NavLink to={`${basePath}/team`} className={({ isActive }) => `tab-link ${isActive ? 'active' : ''}`}>
            <Users size={15} /> {t('teamAssignment', 'Team Assignment')}
          </NavLink>
        )}
      </div>

      <div className="glass" style={{ padding: '1.25rem' }}>
        <Outlet context={{ appName, appId }} />
      </div>
    </div>
  );
};

export default AppLayout;
