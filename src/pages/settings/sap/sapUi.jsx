import React, { useContext, useEffect, useId, useState } from 'react';
import { LanguageContext } from '../../../context/LanguageContext';

/**
 * Shared building blocks of Settings > SAP Configuration: labelled fields with API validation
 * messages, list inputs, status badges, formatting and the payload sent to /api/integrations.
 */

export const JOB_STATUS_BADGE = {
  queued: 'badge-neutral',
  running: 'badge-info',
  succeeded: 'badge-success',
  partially_succeeded: 'badge-warning',
  failed: 'badge-danger',
  cancelled: 'badge-neutral'
};

export const StatusBadge = ({ status }) => {
  const { t } = useContext(LanguageContext);
  if (!status) return <span className="badge badge-neutral">{t('sapNeverSynced', 'Never synced')}</span>;
  return <span className={`badge ${JOB_STATUS_BADGE[status] || 'badge-neutral'}`}>{t(`sapStatus_${status}`, status.replace('_', ' '))}</span>;
};

/** Label + control + hint + validation message (errors come from the API as field paths). */
export const Field = ({ label, error, hint, children, required, className = '' }) => {
  const id = useId();
  const control = React.isValidElement(children) ? React.cloneElement(children, { id, 'aria-invalid': !!error || undefined }) : children;
  return (
    <div className={`input-group sap-field ${error ? 'has-error' : ''} ${className}`}>
      <label htmlFor={id}>
        {label}
        {required && <span className="sap-required" aria-hidden="true"> *</span>}
      </label>
      {control}
      {error ? <div className="sap-field-error">{error}</div> : hint ? <div className="sap-field-hint">{hint}</div> : null}
    </div>
  );
};

const splitList = (text) => text.split(',').map((s) => s.trim()).filter(Boolean);

/** Comma-separated list editor that keeps the typed text (commas, spaces) while editing. */
export const ListInput = ({ value, onChange, ...props }) => {
  const [text, setText] = useState((value || []).join(', '));
  useEffect(() => {
    if (splitList(text).join(',') !== (value || []).join(',')) setText((value || []).join(', '));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <input
      type="text"
      className="input-field"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(splitList(e.target.value));
      }}
      {...props}
    />
  );
};

export const Toggle = ({ checked, onChange, label, disabled }) => (
  <label className={`sap-toggle ${checked ? 'on' : ''} ${disabled ? 'disabled' : ''}`}>
    <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
    <span className="sap-toggle-track" aria-hidden="true"><span className="sap-toggle-thumb" /></span>
    <span>{label}</span>
  </label>
);

export const formatDateTime = (iso) => {
  if (!iso) return '–';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export const formatDuration = (ms) => {
  if (ms === null || ms === undefined) return '–';
  if (ms < 1000) return `${ms} ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m} min ${s % 60} s` : `${Math.floor(m / 60)} h ${m % 60} min`;
};

export const formatNumber = (n) => (n === null || n === undefined ? '–' : Number(n).toLocaleString());

/** API error -> { message, fieldErrors } */
export const apiError = (err, fallback = 'Request failed') => ({
  message: err.response?.data?.message || err.message || fallback,
  fieldErrors: err.response?.data?.details?.fieldErrors || {}
});

/** Field errors for a path prefix, e.g. errorsFor(errors, 'connection') -> { baseUrl: '...' } */
export const errorsFor = (fieldErrors, prefix) =>
  Object.fromEntries(
    Object.entries(fieldErrors || {})
      .filter(([path]) => path === prefix || path.startsWith(`${prefix}.`))
      .map(([path, messages]) => [path.slice(prefix.length + 1) || '_', Array.isArray(messages) ? messages[0] : messages])
  );

export const countErrors = (fieldErrors, prefixes) =>
  Object.keys(fieldErrors || {}).filter((path) => prefixes.some((p) => path === p || path.startsWith(`${p}.`))).length;

export const emptyIntegration = () => ({
  providerType: 'sap-odata',
  name: '',
  description: '',
  environment: '',
  sourceSystem: '',
  isActive: true,
  connection: {
    baseUrl: '',
    servicePath: '/sap/opu/odata/sap/API_SUPPLIERINVOICE_PROCESS_SRV',
    odataVersion: 'v2',
    apiVersion: '',
    sapClient: '',
    language: '',
    timeoutMs: 30000,
    maxRetries: 3,
    minRequestIntervalMs: 0,
    defaultPageSize: 500,
    customHeaders: {}
  },
  authType: 'oauth2-client-credentials',
  authSettings: { clientAuthentication: 'basic' },
  schedule: { mode: 'interval', intervalMinutes: 60, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' },
  autoSyncEnabled: false,
  retryPolicy: { maxAttempts: 3, baseDelaySeconds: 60, maxDelaySeconds: 3600 },
  profiles: []
});

/** Profile from a provider template (GP / SJO) - the template's application decides the target module. */
export const profileFromTemplate = (template) => ({
  id: null,
  name: template.profile.name,
  moduleSlug: template.applicationCode,
  isActive: true,
  settings: { ...template.profile.settings },
  keyFields: [...template.profile.keyFields],
  invoiceCodeTemplate: template.profile.invoiceCodeTemplate,
  fieldMapping: JSON.parse(JSON.stringify(template.profile.fieldMapping)),
  cancellationRule: template.profile.cancellationRule ? { ...template.profile.cancellationRule } : null,
  defaultStatus: template.profile.defaultStatus,
  initialFrom: null,
  templateId: template.id
});

export const blankProfile = () => ({
  id: null,
  name: '',
  moduleSlug: 'GP',
  isActive: true,
  settings: { entitySet: '', filters: [], incrementalFieldType: 'DateTimeOffset', overlapMinutes: 5 },
  keyFields: [],
  invoiceCodeTemplate: 'INV-{prefix}-SAP-{SupplierInvoice}-{FiscalYear}',
  fieldMapping: {},
  cancellationRule: null,
  defaultStatus: 'Pending',
  initialFrom: null
});

const OPTIONAL_NUMBERS = ['pageSize', 'maxRecordsPerRun', 'timeoutMs', 'maxRetries', 'minRequestIntervalMs', 'defaultPageSize'];

/** Empty optional inputs are omitted so server defaults apply. */
const compact = (obj) =>
  Object.fromEntries(Object.entries(obj || {}).filter(([k, v]) => !(OPTIONAL_NUMBERS.includes(k) && (v === '' || v === null || v === undefined))));

const compactMapping = (mapping) =>
  Object.fromEntries(
    Object.entries(mapping || {})
      .map(([field, rule]) => {
        const r = {};
        if (rule?.path) r.path = rule.path.trim();
        if (rule?.constant !== undefined && rule?.constant !== '') r.constant = rule.constant;
        if (rule?.transform) r.transform = rule.transform;
        return [field, r];
      })
      .filter(([, r]) => r.path || r.constant !== undefined)
  );

export const toPayload = (form) => ({
  providerType: form.providerType,
  name: form.name,
  description: form.description || null,
  environment: form.environment || null,
  sourceSystem: form.sourceSystem,
  isActive: form.isActive,
  connection: compact(form.connection),
  authType: form.authType,
  authSettings: form.authSettings,
  schedule: form.schedule,
  autoSyncEnabled: form.autoSyncEnabled,
  retryPolicy: form.retryPolicy,
  profiles: form.profiles.map((p) => ({
    ...(p.id ? { id: p.id } : {}),
    name: p.name,
    moduleSlug: p.moduleSlug,
    isActive: p.isActive,
    settings: compact(p.settings),
    keyFields: p.keyFields,
    invoiceCodeTemplate: p.invoiceCodeTemplate,
    fieldMapping: compactMapping(p.fieldMapping),
    cancellationRule: p.cancellationRule,
    defaultStatus: p.defaultStatus,
    initialFrom: p.initialFrom || null
  }))
});

/** Integration from the API -> editable form state. */
export const toForm = (integration) => ({
  ...emptyIntegration(),
  ...integration,
  description: integration.description || '',
  environment: integration.environment || '',
  connection: { ...emptyIntegration().connection, ...integration.connection },
  profiles: integration.profiles.map((p) => ({ ...p, fieldMapping: p.fieldMapping || {}, settings: { filters: [], ...p.settings } }))
});
