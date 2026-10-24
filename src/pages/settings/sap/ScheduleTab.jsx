import React, { useContext, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { LanguageContext } from '../../../context/LanguageContext';
import { Field, StatusBadge, Toggle, errorsFor, formatDateTime } from './sapUi';

/** 3.4 Synchronization schedule: frequency, time zone, automatic on/off, retries, current state. */
const PRESETS = [
  { id: 'every15', schedule: { mode: 'interval', intervalMinutes: 15 } },
  { id: 'hourly', schedule: { mode: 'interval', intervalMinutes: 60 } },
  { id: 'interval', schedule: { mode: 'interval', intervalMinutes: 240 } },
  { id: 'daily', schedule: { mode: 'daily', times: ['06:00'] } },
  { id: 'cron', schedule: { mode: 'cron', cron: '0 */4 * * 1-5' } },
];

const presetOf = (s) =>
  s.mode === 'interval' ? (Number(s.intervalMinutes) === 15 ? 'every15' : Number(s.intervalMinutes) === 60 ? 'hourly' : 'interval') : s.mode;

const ScheduleTab = ({ form, update, fieldErrors, integration }) => {
  const { t } = useContext(LanguageContext);
  const s = form.schedule;
  const e = errorsFor(fieldErrors, 'schedule');
  const re = errorsFor(fieldErrors, 'retryPolicy');
  const setSchedule = (patch) => update({ schedule: { ...s, ...patch } });
  const timeZones = useMemo(() => {
    try {
      return Intl.supportedValuesOf('timeZone');
    } catch {
      return ['UTC', 'America/Argentina/Buenos_Aires', 'America/Chicago', 'Europe/Amsterdam'];
    }
  }, []);
  const preset = presetOf(s);
  const label = {
    every15: t('sapEvery15', 'Every 15 minutes'),
    hourly: t('sapHourly', 'Hourly'),
    interval: t('sapCustomInterval', 'Custom interval'),
    daily: t('sapDaily', 'Daily at fixed times'),
    cron: t('sapCron', 'Custom (cron expression)'),
  };

  return (
    <div className="sap-tab">
      {integration && (
        <section className="sap-section sap-status-grid">
          <div><span>{t('sapCurrentStatus', 'Current status')}</span><StatusBadge status={integration.status.lastStatus} /></div>
          <div><span>{t('sapLastSuccess', 'Last successful sync')}</span><strong>{formatDateTime(integration.status.lastSuccessAt)}</strong></div>
          <div><span>{t('sapLastAttempt', 'Last attempt')}</span><strong>{formatDateTime(integration.status.lastAttemptAt)}</strong></div>
          <div><span>{t('sapNextRun', 'Next scheduled run')}</span><strong>{integration.status.nextRunAt ? formatDateTime(integration.status.nextRunAt) : t('sapManualOnly', 'Manual only')}</strong></div>
        </section>
      )}

      <section className="sap-section">
        <h3>{t('sapAutomaticSync', 'Automatic synchronization')}</h3>
        <Toggle checked={form.autoSyncEnabled} onChange={(v) => update({ autoSyncEnabled: v })}
          label={form.autoSyncEnabled ? t('sapAutoOn', 'Enabled - runs on the schedule below') : t('sapAutoOff', 'Disabled - only manual synchronization')} />
        {!form.isActive && form.autoSyncEnabled && <div className="sap-field-hint">{t('sapInactiveNoSchedule', 'The integration is inactive, so no automatic run is planned.')}</div>}
      </section>

      <section className="sap-section">
        <h3>{t('sapFrequency', 'Frequency')}</h3>
        <div className="sap-method-grid">
          {PRESETS.map((p) => (
            <label key={p.id} className={`choice-row ${preset === p.id ? 'checked' : ''}`}>
              <input type="radio" name="schedulePreset" checked={preset === p.id} onChange={() => update({ schedule: { ...p.schedule, timezone: s.timezone } })} />
              <span>{label[p.id]}</span>
            </label>
          ))}
        </div>

        <div className="form-grid" style={{ marginTop: '1rem' }}>
          {s.mode === 'interval' && preset === 'interval' && (
            <Field label={t('sapIntervalMinutes', 'Every (minutes)')} error={e.intervalMinutes} hint={t('sapIntervalHint', 'Minimum 5 minutes')}>
              <input className="input-field" type="number" min={5} max={10080} value={s.intervalMinutes} onChange={(ev) => setSchedule({ intervalMinutes: ev.target.value })} />
            </Field>
          )}
          {s.mode === 'daily' && (
            <div className="input-group">
              <label>{t('sapTimes', 'Times of day')}</label>
              {(s.times || []).map((time, i) => (
                <div key={i} className="sap-inline-row">
                  <input className="input-field" type="time" value={time} aria-label={t('sapTimes', 'Times of day')}
                    onChange={(ev) => setSchedule({ times: s.times.map((x, j) => (j === i ? ev.target.value : x)) })} />
                  <button type="button" className="row-action danger" aria-label={t('remove', 'Remove')} disabled={s.times.length === 1}
                    onClick={() => setSchedule({ times: s.times.filter((_, j) => j !== i) })}><Trash2 size={14} /></button>
                </div>
              ))}
              {(e.times || e['times.0']) && <div className="sap-field-error">{e.times || e['times.0']}</div>}
              <div>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setSchedule({ times: [...(s.times || []), '18:00'] })}>
                  <Plus size={14} /> {t('sapAddTime', 'Add time')}
                </button>
              </div>
            </div>
          )}
          {s.mode === 'cron' && (
            <Field label={t('sapCronExpression', 'Cron expression')} error={e.cron} hint={t('sapCronHint', 'minute hour day-of-month month day-of-week, e.g. 0 */4 * * 1-5')}>
              <input className="input-field sap-mono" value={s.cron || ''} onChange={(ev) => setSchedule({ cron: ev.target.value })} />
            </Field>
          )}
          <Field label={t('sapTimezone', 'Time zone')} error={e.timezone}>
            <select className="input-field" value={s.timezone || 'UTC'} onChange={(ev) => setSchedule({ timezone: ev.target.value })}>
              {!timeZones.includes(s.timezone) && <option value={s.timezone}>{s.timezone}</option>}
              {timeZones.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </Field>
        </div>
      </section>

      <section className="sap-section">
        <h3>{t('sapRetries', 'Retries of failed jobs')}</h3>
        <p className="sap-muted">{t('sapRetriesHint', 'Jobs failing for temporary reasons (network, SAP unavailable, throttling) are retried with exponential backoff. Credential or configuration errors are not retried.')}</p>
        <div className="form-grid sap-grid-3">
          <Field label={t('sapMaxAttempts', 'Max. attempts')} error={re.maxAttempts}>
            <input className="input-field" type="number" min={1} max={10} value={form.retryPolicy.maxAttempts ?? 3}
              onChange={(ev) => update({ retryPolicy: { ...form.retryPolicy, maxAttempts: ev.target.value } })} />
          </Field>
          <Field label={t('sapBaseDelay', 'First retry after (s)')} error={re.baseDelaySeconds}>
            <input className="input-field" type="number" min={5} max={3600} value={form.retryPolicy.baseDelaySeconds ?? 60}
              onChange={(ev) => update({ retryPolicy: { ...form.retryPolicy, baseDelaySeconds: ev.target.value } })} />
          </Field>
          <Field label={t('sapMaxDelay', 'Max. delay (s)')} error={re.maxDelaySeconds}>
            <input className="input-field" type="number" min={5} max={86400} value={form.retryPolicy.maxDelaySeconds ?? 3600}
              onChange={(ev) => update({ retryPolicy: { ...form.retryPolicy, maxDelaySeconds: ev.target.value } })} />
          </Field>
        </div>
      </section>
    </div>
  );
};

export default ScheduleTab;
