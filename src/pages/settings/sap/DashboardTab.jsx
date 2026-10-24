import React, { useCallback, useContext, useEffect, useState } from 'react';
import { AlertCircle, Ban, Loader2, Play, RefreshCw, RotateCw } from 'lucide-react';
import { apiClient } from '../../../services/network.service';
import { LanguageContext } from '../../../context/LanguageContext';
import Modal from '../../../components/Modal';
import Pager from '../../../components/Pager';
import { StatusBadge, apiError, formatDateTime, formatDuration, formatNumber } from './sapUi';

/**
 * 3.5 Synchronization dashboard and history: KPIs for a period, the active / last job, job history
 * with filters and paging, job details with per-profile statistics and paged error details,
 * retry / cancel / sync now. Polls while a job is queued or running.
 */
const STATUSES = ['queued', 'running', 'succeeded', 'partially_succeeded', 'failed', 'cancelled'];
const STAGES = ['fetch', 'mapping', 'validation', 'persistence', 'review'];
const RETRYABLE = ['failed', 'partially_succeeded', 'cancelled'];

const Kpi = ({ label, value, tone }) => (
  <div className={`sap-kpi ${tone || ''}`}>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

const JobDetailModal = ({ integrationId, jobId, onClose, onRetry, onCancel }) => {
  const { t } = useContext(LanguageContext);
  const [job, setJob] = useState(null);
  const [errors, setErrors] = useState({ data: [], totalItems: 0, totalPages: 1 });
  const [stage, setStage] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    apiClient.get(`/integrations/${integrationId}/jobs/${jobId}`).then((r) => setJob(r.data)).catch((err) => setMessage(apiError(err).message));
  }, [integrationId, jobId]);

  useEffect(() => {
    setLoading(true);
    apiClient
      .get(`/integrations/${integrationId}/jobs/${jobId}/errors`, { params: { stage: stage || undefined, page, limit } })
      .then((r) => setErrors(r.data))
      .catch((err) => setMessage(apiError(err).message))
      .finally(() => setLoading(false));
  }, [integrationId, jobId, stage, page, limit]);

  const profiles = Object.entries(job?.profileStats || {});

  return (
    <Modal title={`${t('sapJob', 'Job')} #${jobId}`} onClose={onClose} width={960}>
      {message && <div className="form-error"><AlertCircle size={15} /> {message}</div>}
      {!job ? (
        <div className="sap-empty sap-empty-sm"><Loader2 size={18} className="spin" /></div>
      ) : (
        <>
          <div className="sap-job-summary">
            <div><span>{t('status', 'Status')}</span><StatusBadge status={job.status} /></div>
            <div><span>{t('sapTrigger', 'Trigger')}</span><strong>{t(`sapTrigger_${job.trigger}`, job.trigger)}{job.requestedBy ? ` · ${job.requestedBy}` : ''}</strong></div>
            <div><span>{t('sapAttempt', 'Attempt')}</span><strong>{job.attempt} / {job.maxAttempts}{job.retryOfJobId ? ` (${t('sapRetryOf', 'retry of')} #${job.retryOfJobId})` : ''}</strong></div>
            <div><span>{t('sapStarted', 'Started')}</span><strong>{formatDateTime(job.startedAt)}</strong></div>
            <div><span>{t('sapFinished', 'Finished')}</span><strong>{formatDateTime(job.finishedAt)}</strong></div>
            <div><span>{t('sapDuration', 'Duration')}</span><strong>{formatDuration(job.durationMs)}</strong></div>
          </div>
          {job.errorSummary && <div className={job.status === 'failed' ? 'form-error' : 'sap-warning'}><AlertCircle size={15} /> {job.errorSummary}</div>}

          <h4 className="sap-subheading">{t('sapPerProfile', 'Per profile')}</h4>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t('sapProfile', 'Profile')}</th><th>{t('sapFetched', 'Fetched')}</th><th>{t('sapCreated', 'Created')}</th>
                  <th>{t('sapUpdated', 'Updated')}</th><th>{t('sapSkipped', 'Skipped')}</th><th>{t('sapRejected', 'Rejected')}</th>
                  <th>{t('sapFailed', 'Failed')}</th><th>{t('sapPages', 'Pages')}</th><th>{t('sapCursor', 'Cursor')}</th>
                </tr>
              </thead>
              <tbody>
                {profiles.length === 0 ? (
                  <tr><td colSpan="9" className="sap-muted" style={{ textAlign: 'center' }}>{t('sapNoPagesYet', 'No page processed')}</td></tr>
                ) : profiles.map(([id, p]) => (
                  <tr key={id}>
                    <td>{p.name}</td><td>{formatNumber(p.fetched)}</td><td>{formatNumber(p.created)}</td><td>{formatNumber(p.updated)}</td>
                    <td>{formatNumber(p.unchanged)}</td><td>{formatNumber(p.rejected)}</td><td>{formatNumber(p.failed)}</td>
                    <td>{formatNumber(p.pages)}</td><td>{formatDateTime(p.watermark)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex-between" style={{ marginTop: '1.25rem', marginBottom: '0.5rem' }}>
            <h4 className="sap-subheading" style={{ margin: 0 }}>{t('sapErrorDetails', 'Error details')} ({errors.totalItems})</h4>
            <select className="input-field" style={{ width: 200 }} value={stage} aria-label={t('sapStage', 'Stage')} onChange={(e) => { setStage(e.target.value); setPage(1); }}>
              <option value="">{t('sapAllStages', 'All stages')}</option>
              {STAGES.map((s) => <option key={s} value={s}>{t(`sapStage_${s}`, s)}</option>)}
            </select>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>{t('sapStage', 'Stage')}</th><th>{t('sapProfile', 'Profile')}</th><th>{t('sapSapKey', 'SAP document')}</th><th>{t('sapMessage', 'Message')}</th><th>{t('sapWhen', 'When')}</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center' }}><Loader2 size={16} className="spin" /></td></tr>
                ) : errors.data.length === 0 ? (
                  <tr><td colSpan="5" className="sap-muted" style={{ textAlign: 'center' }}>{t('sapNoErrors', 'No errors')}</td></tr>
                ) : errors.data.map((er) => (
                  <tr key={er.id}>
                    <td><span className={`badge ${er.stage === 'review' ? 'badge-warning' : 'badge-danger'}`}>{t(`sapStage_${er.stage}`, er.stage)}</span></td>
                    <td>{er.profileName || '–'}</td>
                    <td className="sap-mono">{er.externalKey || '–'}</td>
                    <td className="sap-error-message">
                      {er.details?.fieldErrors && Object.keys(er.details.fieldErrors).length > 1 ? null : er.message}
                      {er.details?.fieldErrors && Object.keys(er.details.fieldErrors).length > 1 && (
                        <ul>{Object.entries(er.details.fieldErrors).map(([f, m]) => <li key={f}><code>{f}</code>: {m}</li>)}</ul>
                      )}
                    </td>
                    <td>{formatDateTime(er.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} limit={limit} totalItems={errors.totalItems} totalPages={errors.totalPages} loading={loading}
            onPageChange={setPage} onLimitChange={(n) => { setLimit(n); setPage(1); }} sizes={[10, 20, 50]} />

          <div className="modal-actions">
            {['queued', 'running'].includes(job.status) && (
              <button type="button" className="btn btn-outline" onClick={() => onCancel(job)} disabled={job.cancelRequested}>
                <Ban size={15} /> {job.cancelRequested ? t('sapCancelling', 'Stopping...') : t('sapCancelJob', 'Cancel job')}
              </button>
            )}
            {RETRYABLE.includes(job.status) && (
              <button type="button" className="btn btn-primary" onClick={() => onRetry(job)}>
                <RotateCw size={15} /> {t('sapRetryJob', 'Retry job')}
              </button>
            )}
            <button type="button" className="btn btn-outline" onClick={onClose}>{t('close', 'Close')}</button>
          </div>
        </>
      )}
    </Modal>
  );
};

const DashboardTab = ({ integration, onSyncNow, syncing, notify, onSummary }) => {
  const { t } = useContext(LanguageContext);
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState(null);
  const [jobs, setJobs] = useState({ data: [], totalItems: 0, totalPages: 1 });
  const [filters, setFilters] = useState({ status: '', trigger: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [tick, setTick] = useState(0);
  const id = integration.id;

  const load = useCallback(async () => {
    try {
      const [s, j] = await Promise.all([
        apiClient.get(`/integrations/${id}/summary`, { params: { days } }),
        apiClient.get(`/integrations/${id}/jobs`, {
          params: {
            page, limit,
            status: filters.status || undefined,
            trigger: filters.trigger || undefined,
            from: filters.from ? new Date(`${filters.from}T00:00:00`).toISOString() : undefined,
            to: filters.to ? new Date(new Date(`${filters.to}T00:00:00`).getTime() + 86_400_000).toISOString() : undefined,
          },
        }),
      ]);
      setSummary(s.data);
      setJobs(j.data);
      setError('');
      onSummary?.(s.data);
    } catch (err) {
      setError(apiError(err, 'Failed to load the dashboard').message);
    } finally {
      setLoading(false);
    }
  }, [id, days, page, limit, filters, onSummary]);

  useEffect(() => {
    load();
  }, [load, tick, syncing]);

  // Live refresh while a job is queued / running
  const active = summary?.activeJob;
  useEffect(() => {
    if (!active) return undefined;
    const timer = setInterval(() => setTick((n) => n + 1), 4000);
    return () => clearInterval(timer);
  }, [active]);

  const retry = async (job) => {
    try {
      await apiClient.post(`/integrations/${id}/jobs/${job.id}/retry`);
      notify(t('sapRetryQueued', 'Retry queued'));
      setSelected(null);
      setTick((n) => n + 1);
    } catch (err) {
      notify(apiError(err).message, true);
    }
  };

  const cancel = async (job) => {
    try {
      const r = await apiClient.post(`/integrations/${id}/jobs/${job.id}/cancel`);
      notify(r.data.message);
      setSelected(null);
      setTick((n) => n + 1);
    } catch (err) {
      notify(apiError(err).message, true);
    }
  };

  const totals = summary?.totals;
  const last = summary?.lastJob;
  const setFilter = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  return (
    <div className="sap-tab">
      {error && <div className="form-error"><AlertCircle size={15} /> {error}</div>}

      {active && (
        <div className="sap-active-job">
          <Loader2 size={18} className="spin" />
          <div>
            <strong>{active.status === 'queued' ? t('sapJobQueued', 'Synchronization queued') : t('sapJobRunning', 'Synchronization running')}</strong>
            <span>
              {t('sapFetched', 'Fetched')} {formatNumber(active.records.fetched)} · {t('sapCreated', 'Created')} {formatNumber(active.records.created)} ·{' '}
              {t('sapUpdated', 'Updated')} {formatNumber(active.records.updated)} · {t('sapPages', 'Pages')} {active.pages}
              {active.status === 'running' ? ` · ${formatDuration(active.durationMs)}` : ''}
            </span>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setSelected(active.id)}>{t('details', 'Details')}</button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => cancel(active)} disabled={active.cancelRequested}>
            <Ban size={14} /> {active.cancelRequested ? t('sapCancelling', 'Stopping...') : t('sapCancelJob', 'Cancel job')}
          </button>
        </div>
      )}

      <div className="flex-between" style={{ marginBottom: '0.75rem', gap: '0.75rem', flexWrap: 'wrap' }}>
        <h3 className="sap-subheading" style={{ margin: 0 }}>{t('sapOverview', 'Overview')}</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select className="input-field" style={{ width: 150 }} value={days} aria-label={t('sapPeriod', 'Period')} onChange={(e) => setDays(Number(e.target.value))}>
            {[1, 7, 30, 90].map((d) => <option key={d} value={d}>{t('sapLastDays', 'Last {n} days').replace('{n}', d)}</option>)}
          </select>
          <button type="button" className="btn btn-outline" onClick={() => setTick((n) => n + 1)} aria-label={t('refresh', 'Refresh')}><RefreshCw size={15} /></button>
          <button type="button" className="btn btn-primary" onClick={onSyncNow} disabled={syncing || !!active || !integration.isActive}>
            <Play size={15} /> {t('sapSyncNow', 'Sync now')}
          </button>
        </div>
      </div>

      <div className="sap-kpi-grid">
        <Kpi label={t('sapLastStatus', 'Last status')} value={<StatusBadge status={last?.status || summary?.lastStatus} />} />
        <Kpi label={t('sapLastDuration', 'Last duration')} value={formatDuration(last?.durationMs)} />
        <Kpi label={t('sapLastSuccess', 'Last successful sync')} value={formatDateTime(summary?.lastSuccessAt)} />
        <Kpi label={t('sapNextRun', 'Next scheduled run')} value={summary?.nextRunAt ? formatDateTime(summary.nextRunAt) : t('sapManualOnly', 'Manual only')} />
        <Kpi label={t('sapFetched', 'Fetched')} value={formatNumber(totals?.fetched)} />
        <Kpi label={t('sapCreated', 'Created')} value={formatNumber(totals?.created)} tone="good" />
        <Kpi label={t('sapUpdated', 'Updated')} value={formatNumber(totals?.updated)} tone="info" />
        <Kpi label={t('sapSkipped', 'Skipped (unchanged)')} value={formatNumber(totals?.unchanged)} />
        <Kpi label={t('sapRejected', 'Rejected')} value={formatNumber(totals?.rejected)} tone={totals?.rejected ? 'warn' : ''} />
        <Kpi label={t('sapFailed', 'Failed')} value={formatNumber(totals?.failedRecords)} tone={totals?.failedRecords ? 'bad' : ''} />
        <Kpi label={t('sapJobs', 'Jobs (ok / partial / failed)')} value={totals ? `${totals.succeeded} / ${totals.partial} / ${totals.failed}` : '–'} />
        <Kpi label={t('sapInvoicesImported', 'Invoices imported (all time)')} value={formatNumber(summary?.invoicesImported)} />
      </div>
      {last?.errorSummary && (
        <div className={last.status === 'failed' ? 'form-error' : 'sap-warning'} style={{ marginTop: '0.75rem' }}>
          <AlertCircle size={15} /> {t('sapLastJob', 'Last job')} #{last.id}: {last.errorSummary}
          <button type="button" className="btn-link" onClick={() => setSelected(last.id)}>{t('sapViewErrors', 'View errors')}</button>
        </div>
      )}

      <h3 className="sap-subheading">{t('sapHistory', 'Synchronization history')}</h3>
      <div className="sap-history-filters">
        <select className="input-field" value={filters.status} aria-label={t('status', 'Status')} onChange={(e) => setFilter({ status: e.target.value })}>
          <option value="">{t('allStatuses', 'All statuses')}</option>
          {STATUSES.map((s) => <option key={s} value={s}>{t(`sapStatus_${s}`, s)}</option>)}
        </select>
        <select className="input-field" value={filters.trigger} aria-label={t('sapTrigger', 'Trigger')} onChange={(e) => setFilter({ trigger: e.target.value })}>
          <option value="">{t('sapAllTriggers', 'All triggers')}</option>
          {['scheduled', 'manual', 'retry'].map((s) => <option key={s} value={s}>{t(`sapTrigger_${s}`, s)}</option>)}
        </select>
        <input className="input-field" type="date" value={filters.from} aria-label={t('sapFrom', 'From')} onChange={(e) => setFilter({ from: e.target.value })} />
        <input className="input-field" type="date" value={filters.to} aria-label={t('sapTo', 'To')} onChange={(e) => setFilter({ to: e.target.value })} />
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>#</th><th>{t('status', 'Status')}</th><th>{t('sapTrigger', 'Trigger')}</th><th>{t('sapStarted', 'Started')}</th>
              <th>{t('sapDuration', 'Duration')}</th><th>{t('sapFetched', 'Fetched')}</th><th>{t('sapCreated', 'Created')}</th>
              <th>{t('sapUpdated', 'Updated')}</th><th>{t('sapSkipped', 'Skipped')}</th><th>{t('sapRejected', 'Rejected')}</th>
              <th>{t('sapFailed', 'Failed')}</th><th style={{ textAlign: 'right' }}>{t('actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && jobs.data.length === 0 ? (
              <tr><td colSpan="12" style={{ textAlign: 'center' }}><Loader2 size={16} className="spin" /></td></tr>
            ) : jobs.data.length === 0 ? (
              <tr><td colSpan="12" className="sap-muted" style={{ textAlign: 'center', padding: '1.5rem' }}>{t('sapNoJobs', 'No synchronization has run yet.')}</td></tr>
            ) : jobs.data.map((j) => (
              <tr key={j.id}>
                <td><button type="button" className="cell-link" onClick={() => setSelected(j.id)}>#{j.id}</button></td>
                <td><StatusBadge status={j.status} />{j.attempt > 1 && <small className="sap-muted"> {t('sapAttempt', 'Attempt')} {j.attempt}</small>}</td>
                <td>{t(`sapTrigger_${j.trigger}`, j.trigger)}</td>
                <td>{formatDateTime(j.startedAt || j.createdAt)}</td>
                <td>{formatDuration(j.durationMs)}</td>
                <td>{formatNumber(j.records.fetched)}</td>
                <td>{formatNumber(j.records.created)}</td>
                <td>{formatNumber(j.records.updated)}</td>
                <td>{formatNumber(j.records.unchanged)}</td>
                <td className={j.records.rejected ? 'sap-warn-text' : ''}>{formatNumber(j.records.rejected)}</td>
                <td className={j.records.failed ? 'sap-bad-text' : ''}>{formatNumber(j.records.failed)}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setSelected(j.id)}>
                    {t('details', 'Details')}{j.errorCount ? ` (${j.errorCount})` : ''}
                  </button>
                  {RETRYABLE.includes(j.status) && !active && (
                    <button type="button" className="row-action" title={t('sapRetryJob', 'Retry job')} aria-label={`${t('sapRetryJob', 'Retry job')} #${j.id}`} onClick={() => retry(j)}>
                      <RotateCw size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page} limit={limit} totalItems={jobs.totalItems} totalPages={jobs.totalPages} loading={loading}
        onPageChange={setPage} onLimitChange={(n) => { setLimit(n); setPage(1); }} sizes={[10, 20, 50]} />

      {selected && <JobDetailModal integrationId={id} jobId={selected} onClose={() => setSelected(null)} onRetry={retry} onCancel={cancel} />}
    </div>
  );
};

export default DashboardTab;
