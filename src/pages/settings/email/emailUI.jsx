import React, { useId } from 'react';





export const Field = ({ label, error, hint, children, required, className = '' }) => {
  const id = useId();
  const control = React.isValidElement(children) ? React.cloneElement(children, { id, 'aria-invalid': !!error || undefined }) : children;
  return (
    <div className={`input-group email-field ${error ? 'has-error' : ''} ${className}`}>
      <label htmlFor={id}>
        {label}
        {required && <span className="email-required" aria-hidden="true"> *</span>}
      </label>
      {control}
      {error ? <div className="email-field-error">{error}</div> : hint ? <div className="email-field-hint">{hint}</div> : null}
    </div>
  );
};

export const Toggle = ({ checked, onChange, label, disabled }) => (
  <label className={`email-toggle ${checked ? 'on' : ''} ${disabled ? 'disabled' : ''}`}>
    <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
    <span className="email-toggle-track" aria-hidden="true"><span className="email-toggle-thumb" /></span>
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

  /** Blank Microsoft Graph connection (one for the whole application). */
export const emptyConnection = () => ({ tenantId: '', clientId: '', clientSecret: '' });

/** Blank mailbox registration (many allowed). */
export const emptyMailbox = () => ({ emailAddress: '', folderToRead: 'Inbox', moduleSlug: '', isActive: true });
