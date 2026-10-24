import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle, ArrowLeft, BarChart3, CalendarClock, CheckCircle, CheckCircle2, Database, KeyRound, Loader2, Play, Plug, Save, Trash2, XCircle,
} from 'lucide-react';
import { apiClient } from '../../../services/network.service';
import { LanguageContext } from '../../../context/LanguageContext';
import Modal from '../../../components/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog';
import ConnectionTab from './ConnectionTab';
import AuthenticationTab, { buildSecret } from './AuthenticationTab';
import ExtractionTab from './ExtractionTab';
import ScheduleTab from './ScheduleTab';
import DashboardTab from './DashboardTab';
import { StatusBadge, apiError, countErrors, emptyIntegration, toForm, toPayload } from './sapUi';

/**
 * One SAP integration: Connection · Authentication · Extraction · Schedule · Dashboard & History.
 * The configuration tabs edit one document saved with "Save" (optimistic concurrency via version);
 * credentials are write-only and saved separately; dashboard actions act immediately.
 */
const LONG_REQUEST = { timeout: 120_000 };

const TABS = [
  { id: 'dashboard', icon: BarChart3, label: 'sapTabDashboard', fallback: 'Dashboard & History', errors: [], existingOnly: true },
  { id: 'connection', icon: Plug, label: 'sapTabConnection', fallback: 'Connection', errors: ['name', 'description', 'environment', 'sourceSystem', 'connection', 'providerType'] },
  { id: 'authentication', icon: KeyRound, label: 'sapTabAuthentication', fallback: 'Authentication', errors: ['authType', 'authSettings', 'secret'] },
  { id: 'extraction', icon: Database, label: 'sapTabExtraction', fallback: 'Invoice extraction', errors: ['profiles'] },
  { id: 'schedule', icon: CalendarClock, label: 'sapTabSchedule', fallback: 'Schedule', errors: ['schedule', 'retryPolicy', 'autoSyncEnabled'] },
];

const TestResultModal = ({ result, onClose }) => {
  const { t } = useContext(LanguageContext);
  const missing = Object.entries(result.details?.missingFields || {}).filter(([, list]) => list.length);
  return (
    <Modal title={t('sapTestResult', 'Connection test')} onClose={onClose} width={640}>
      <div className={`sap-test-banner ${result.ok ? 'ok' : 'fail'}`}>
        {result.ok ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
        {result.ok ? t('sapTestOk', 'Connection successful') : t('sapTestFailed', 'Connection test failed')}
      </div>
      <ol className="sap-test-steps">
        {result.steps.map((s, i) => (
          <li key={i} className={s.ok ? 'ok' : 'fail'}>
            {s.ok ? <CheckCircle size={16} /> : <XCircle size={16} />}
            <div>
              <strong>{s.name}</strong> <small className="sap-muted">{s.durationMs} ms</small>
              <p>{s.message}</p>
            </div>
          </li>
        ))}
      </ol>
      {missing.length > 0 && (
        <div className="sap-warning">
          <AlertCircle size={15} />
          <div>{missing.map(([profile, list]) => <div key={profile}><strong>{profile}</strong>: {list.join(', ')}</div>)}</div>
        </div>
      )}
      {result.details?.entitySets && (
        <details className="sap-details">
          <summary>{t('sapEntitySets', 'Entity sets offered by the service')} ({result.details.entitySets.length})</summary>
          <p className="sap-mono">{result.details.entitySets.join(', ')}</p>
        </details>
      )}
      <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={onClose}>{t('close', 'Close')}</button></div>
    </Modal>
  );
};

const SapIntegrationDetail = () => {
  const { t } = useContext(LanguageContext);
  const { id: idParam, tab: tabParam } = useParams();
  const navigate = useNavigate();
  const isNew = idParam === 'new';
  const [catalog, setCatalog] = useState(null);
  const [integration, setIntegration] = useState(null);
  const [form, setForm] = useState(null);
  const [savedForm, setSavedForm] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [secretDraft, setSecretDraft] = useState({ values: {}, errors: {} });
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  const tab = TABS.find((x) => x.id === tabParam && !(isNew && x.existingOnly))?.id ?? (isNew ? 'connection' : 'dashboard');
  const notify = useCallback((message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 5000);
  }, []);

  useEffect(() => {
    let alive = true;
    setIntegration(null);
    setLoadError('');
    const load = async () => {
      try {
        const [cat, item] = await Promise.all([
          apiClient.get('/integrations/providers'),
          isNew ? Promise.resolve(null) : apiClient.get(`/integrations/${idParam}`),
        ]);
        if (!alive) return;
        setCatalog(cat.data);
        setIntegration(item?.data ?? null);
        const initial = item ? toForm(item.data) : emptyIntegration();
        setForm(initial);
        setSavedForm(initial);
      } catch (err) {
        if (alive) setLoadError(apiError(err, 'Failed to load the integration').message);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [idParam, isNew]);

  const dirty = useMemo(() => !!form && JSON.stringify(form) !== JSON.stringify(savedForm), [form, savedForm]);

  // Closing / reloading the tab with unsaved changes asks for confirmation
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const leave = () => {
    // eslint-disable-next-line no-alert
    if (!dirty || window.confirm(t('sapLeaveConfirm', 'Leave this page and discard your changes?'))) navigate('/settings/sap-configuration');
  };

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));
  const goTab = (id) => navigate(`/settings/sap-configuration/${idParam}/${id}`, { replace: true });

  const applySaved = (data) => {
    setIntegration(data);
    const next = toForm(data);
    setForm(next);
    setSavedForm(next);
    setFieldErrors({});
  };

  const save = async () => {
    setSaving(true);
    setFieldErrors({});
    try {
      if (isNew) {
        const method = catalog.authTypes.find((a) => a.type === form.authType);
        const secret = buildSecret(method, secretDraft.values, form.authSettings.extraHeaderNames || []);
        const r = await apiClient.post('/integrations', { ...toPayload(form), ...(Object.keys(secret).length ? { secret } : {}) });
        setSavedForm(form); // allow navigation without the unsaved-changes prompt
        setSecretDraft({ values: {}, errors: {} });
        notify(r.data.message);
        navigate(`/settings/sap-configuration/${r.data.data.id}/dashboard`, { replace: true });
      } else {
        const r = await apiClient.put(`/integrations/${integration.id}`, { ...toPayload(form), version: integration.version });
        applySaved(r.data.data);
        notify(t('sapSaved', 'Configuration saved'));
      }
    } catch (err) {
      const { message, fieldErrors: fe } = apiError(err, 'Save failed');
      setFieldErrors(fe);
      const firstTab = TABS.find((x) => countErrors(fe, x.errors) > 0);
      if (firstTab && firstTab.id !== tab) goTab(firstTab.id);
      notify(err.response?.status === 409 ? message : Object.keys(fe).length ? t('sapFixErrors', 'Please correct the highlighted fields') : message, true);
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const method = catalog.authTypes.find((a) => a.type === form.authType);
      const secret = buildSecret(method, secretDraft.values, form.authSettings.extraHeaderNames || []);
      const payload = { ...toPayload(form), ...(Object.keys(secret).length ? { secret } : {}) };
      const r = isNew
        ? await apiClient.post('/integrations/test-connection', payload, LONG_REQUEST)
        : await apiClient.post(`/integrations/${integration.id}/test-connection`, dirty || payload.secret ? { draft: payload } : {}, LONG_REQUEST);
      setTestResult(r.data);
      setFieldErrors({});
    } catch (err) {
      const { message, fieldErrors: fe } = apiError(err, 'Connection test failed');
      setFieldErrors(fe);
      notify(Object.keys(fe).length ? t('sapFixErrors', 'Please correct the highlighted fields') : message, true);
    } finally {
      setTesting(false);
    }
  };

  const syncNow = async () => {
    setSyncing(true);
    try {
      const r = await apiClient.post(`/integrations/${integration.id}/sync`);
      notify(`${r.data.message} (#${r.data.data.id})`);
      if (tab !== 'dashboard') goTab('dashboard');
    } catch (err) {
      notify(apiError(err).message, true);
    } finally {
      setSyncing(false);
    }
  };

  // Keeps the header / schedule status in step with the dashboard's live data
  const onSummary = useCallback((s) => {
    setIntegration((current) =>
      current && current.status.lastStatus === s.lastStatus && current.status.lastSuccessAt === s.lastSuccessAt
        ? current
        : current && { ...current, status: { ...current.status, lastStatus: s.lastStatus, lastSuccessAt: s.lastSuccessAt, lastAttemptAt: s.lastAttemptAt, nextRunAt: s.nextRunAt } },
    );
  }, []);

  const saveCredentials = async (secret) => {
    const r = await apiClient.put(`/integrations/${integration.id}/credentials`, { secret });
    setIntegration(r.data.data);
    notify(r.data.message);
  };

  const resetCursor = async (profile) => {
    const r = await apiClient.post(`/integrations/${integration.id}/profiles/${profile.id}/reset-cursor`);
    const fresh = await apiClient.get(`/integrations/${integration.id}`);
    applySaved(fresh.data);
    notify(r.data.message);
  };

  const remove = async () => {
    await apiClient.delete(`/integrations/${integration.id}`);
    setSavedForm(form);
    navigate('/settings/sap-configuration', { replace: true });
  };

  if (loadError) {
    return (
      <div>
        <button type="button" className="btn btn-outline" onClick={() => navigate('/settings/sap-configuration')}><ArrowLeft size={15} /> {t('back', 'Back')}</button>
        <div className="form-error" style={{ marginTop: '1rem' }}><AlertCircle size={15} /> {loadError}</div>
      </div>
    );
  }
  // Also covers the switch from /new to /:id after creating (same component, data still loading)
  if (!form || !catalog || (!isNew && !integration)) return <div className="glass-panel sap-empty"><Loader2 size={20} className="spin" /></div>;

  const tabProps = { form, update, fieldErrors, catalog, integration, isNew };

  return (
    <div>
      <div className="flex-between page-header" style={{ gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <button type="button" className="btn-link sap-back" onClick={leave}>
            <ArrowLeft size={14} /> {t('sapConfigurationMenu', 'SAP Configuration')}
          </button>
          <h1 className="page-title sap-title">
            {isNew ? t('sapNewIntegration', 'New integration') : integration.name}
            {!isNew && integration.environment && <span className="badge badge-neutral">{integration.environment}</span>}
            {!isNew && (
              <span className={`badge ${integration.isActive ? 'badge-success' : 'badge-danger'}`}>
                {integration.isActive ? t('active', 'Active') : t('inactive', 'Inactive')}
              </span>
            )}
            {!isNew && <StatusBadge status={integration.status.lastStatus} />}
          </h1>
          <p className="page-subtitle">
            {isNew
              ? t('sapNewSubtitle', 'Connection, credentials and what to extract. You can test the connection before saving.')
              : `${t('sapSourceSystem', 'Source system')}: ${integration.sourceSystem}${integration.updatedBy ? ` · ${t('sapUpdatedBy', 'Last changed by')} ${integration.updatedBy}` : ''}`}
          </p>
        </div>
        <div className="sap-header-actions">
          {toast && (
            <span className={`badge ${toast.isError ? 'badge-danger' : 'badge-success'}`} role="status">
              {toast.isError ? <AlertCircle size={13} /> : <CheckCircle size={13} />} {toast.message}
            </span>
          )}
          {dirty && <span className="badge badge-warning">{t('sapUnsaved', 'Unsaved changes')}</span>}
          {!isNew && (
            <button type="button" className="row-action danger" title={t('delete', 'Delete')} aria-label={t('delete', 'Delete')} onClick={() => setDeleting(true)}>
              <Trash2 size={15} />
            </button>
          )}
          <button type="button" className="btn btn-outline" onClick={testConnection} disabled={testing}>
            {testing ? <Loader2 size={15} className="spin" /> : <Plug size={15} />} {t('sapTestConnection', 'Test connection')}
          </button>
          {!isNew && (
            <button type="button" className="btn btn-outline" onClick={syncNow} disabled={syncing || dirty || !integration.isActive}
              title={dirty ? t('sapSaveBeforeSync', 'Save your changes first') : undefined}>
              <Play size={15} /> {t('sapSyncNow', 'Sync now')}
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving || (!dirty && !isNew)}>
            {saving ? <Loader2 size={15} className="spin" /> : <Save size={15} />} {isNew ? t('sapCreate', 'Create integration') : t('save', 'Save')}
          </button>
        </div>
      </div>

      <div className="tab-bar sap-tab-bar">
        {TABS.filter((x) => !(isNew && x.existingOnly)).map((x) => {
          const errors = countErrors(fieldErrors, x.errors);
          const Icon = x.icon;
          return (
            <NavLink key={x.id} to={`/settings/sap-configuration/${idParam}/${x.id}`} replace className={() => `tab-link ${tab === x.id ? 'active' : ''}`}>
              <Icon size={15} /> {t(x.label, x.fallback)}
              {errors > 0 && <span className="badge badge-danger sap-tab-errors">{errors}</span>}
            </NavLink>
          );
        })}
      </div>

      <div className="glass" style={{ padding: '1.25rem' }}>
        {tab === 'dashboard' && !isNew && <DashboardTab integration={integration} onSyncNow={syncNow} syncing={syncing} notify={notify} onSummary={onSummary} />}
        {tab === 'connection' && <ConnectionTab {...tabProps} />}
        {tab === 'authentication' && (
          <AuthenticationTab {...tabProps} secretDraft={secretDraft} setSecretDraft={setSecretDraft} onSaveCredentials={saveCredentials} />
        )}
        {tab === 'extraction' && <ExtractionTab {...tabProps} onResetCursor={resetCursor} />}
        {tab === 'schedule' && <ScheduleTab {...tabProps} />}
      </div>

      {testResult && <TestResultModal result={testResult} onClose={() => setTestResult(null)} />}
      {deleting && (
        <ConfirmDialog
          title={t('sapDeleteIntegration', 'Delete integration')}
          message={t('sapDeleteConfirm', 'Delete "{name}" with its profiles and history? Invoices already imported stay in their applications.').replace('{name}', integration.name)}
          confirmLabel={t('delete', 'Delete')}
          onConfirm={remove}
          onClose={() => setDeleting(false)}
        />
      )}
    </div>
  );
};

export default SapIntegrationDetail;
