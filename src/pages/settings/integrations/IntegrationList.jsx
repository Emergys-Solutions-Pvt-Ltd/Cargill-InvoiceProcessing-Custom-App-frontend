import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Plus, RefreshCw, Server, ChevronRight, Clock, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../../../services/network.service';
import { LanguageContext } from '../../../context/LanguageContext';
import { APPS } from '../../../utils/appHelper';
import { StatusBadge, apiError, formatDateTime, providerUi } from './integrationUi';

/** Settings > SAP / OnBase Configuration: integrations of one provider with their synchronization status. */
const IntegrationList = ({ providerType }) => {
  const { t } = useContext(LanguageContext);
  const navigate = useNavigate();
  const ui = providerUi(providerType);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    apiClient
      .get('/integrations', { params: { providerType } })
      .then((r) => alive && (setItems(r.data), setError('')))
      .catch((err) => alive && setError(apiError(err, 'Failed to load integrations').message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [reloadKey, providerType]);

  const appName = (slug) => {
    const app = APPS.find((a) => a.id === slug);
    return app ? t(app.nameKey, app.name) : slug;
  };

  return (
    <div>
      <div className="flex-between page-header" style={{ gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">{t(ui.titleKey, ui.title)}</h1>
          <p className="page-subtitle">{t(ui.subtitleKey, ui.subtitle)}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button type="button" className="btn btn-outline" onClick={() => setReloadKey((k) => k + 1)} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} /> {t('refresh', 'Refresh')}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => navigate(`${ui.basePath}/new`)}>
            <Plus size={15} /> {t('sapNewIntegration', 'New integration')}
          </button>
        </div>
      </div>

      {error && <div className="form-error"><AlertCircle size={15} /> {error}</div>}

      {loading && items.length === 0 ? (
        <div className="glass-panel sap-empty">{t('loading', 'Loading...')}</div>
      ) : items.length === 0 && !error ? (
        <div className="glass-panel sap-empty">
          <Server size={28} />
          <h3>{t(ui.emptyTitleKey, ui.emptyTitle)}</h3>
          <p>{t(ui.emptyHintKey, ui.emptyHint)}</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate(`${ui.basePath}/new`)}>
            <Plus size={15} /> {t('sapNewIntegration', 'New integration')}
          </button>
        </div>
      ) : (
        <div className="sap-integration-list">
          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className="glass-panel sap-integration-card"
              onClick={() => navigate(`${ui.basePath}/${item.id}/dashboard`)}
            >
              <div className="sap-card-main">
                <div className="sap-card-title">
                  <Server size={18} />
                  <strong>{item.name}</strong>
                  {item.environment && <span className="badge badge-neutral">{item.environment}</span>}
                  <span className={`badge ${item.isActive ? 'badge-success' : 'badge-danger'}`}>
                    {item.isActive ? t('active', 'Active') : t('inactive', 'Inactive')}
                  </span>
                </div>
                <div className="sap-card-meta">
                  <span>{t('sapSourceSystem', 'Source system')}: <code>{item.sourceSystem}</code></span>
                  <span>
                    {t('sapProfiles', 'Extraction profiles')}:{' '}
                    {item.profiles.length === 0
                      ? '–'
                      : item.profiles.map((p) => `${p.name} → ${appName(p.moduleSlug)}${p.isActive ? '' : ` (${t('inactive', 'Inactive')})`}`).join(', ')}
                  </span>
                </div>
              </div>
              <div className="sap-card-status">
                <StatusBadge status={item.status.lastStatus} />
                <span title={t('sapLastSuccess', 'Last successful sync')}>
                  <CheckCircle2 size={13} /> {formatDateTime(item.status.lastSuccessAt)}
                </span>
                <span title={t('sapNextRun', 'Next scheduled run')}>
                  <Clock size={13} /> {item.autoSyncEnabled && item.status.nextRunAt ? formatDateTime(item.status.nextRunAt) : t('sapManualOnly', 'Manual only')}
                </span>
              </div>
              <ChevronRight size={18} className="sap-card-chevron" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default IntegrationList;
