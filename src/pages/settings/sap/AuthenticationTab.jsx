import React, { useContext, useState } from 'react';
import { AlertCircle, CheckCircle, KeyRound, ShieldCheck } from 'lucide-react';
import { LanguageContext } from '../../../context/LanguageContext';
import { Field, ListInput, apiError, errorsFor, formatDateTime } from './sapUi';

/**
 * 3.2 Authentication: pluggable method (fields come from the API catalog), non-secret settings,
 * and write-only credentials. Stored secrets are never shown - only whether they are set.
 * New integration: credentials are sent with the create request. Existing: "Save credentials"
 * stores / rotates them immediately (PUT /integrations/:id/credentials).
 */
const SecretInput = ({ field, value, onChange }) =>
  field.name === 'extraHeaderValues' ? null : (
    <input
      className="input-field"
      type="password"
      autoComplete="new-password"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder="••••••••"
    />
  );

const AuthenticationTab = ({ form, update, fieldErrors, catalog, integration, secretDraft, setSecretDraft, onSaveCredentials, isNew }) => {
  const { t } = useContext(LanguageContext);
  const provider = catalog.providers.find((p) => p.type === form.providerType);
  const methods = catalog.authTypes.filter((a) => provider?.supportedAuthTypes.includes(a.type));
  const method = catalog.authTypes.find((a) => a.type === form.authType);
  const settingErrors = errorsFor(fieldErrors, 'authSettings');
  const secretErrors = { ...errorsFor(fieldErrors, 'secret'), ...secretDraft.errors };
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const authChanged = integration && integration.authType !== form.authType;

  const setSetting = (name, value) => update({ authSettings: { ...form.authSettings, [name]: value } });
  const setSecret = (name, value) => setSecretDraft({ values: { ...secretDraft.values, [name]: value }, errors: {} });

  const extraHeaders = form.authType === 'api-key' ? form.authSettings.extraHeaderNames || [] : [];

  const saveCredentials = async () => {
    setSaving(true);
    setResult(null);
    try {
      await onSaveCredentials(buildSecret(method, secretDraft.values, extraHeaders));
      setSecretDraft({ values: {}, errors: {} });
      setResult({ ok: true, message: t('sapCredentialsSaved', 'Credentials saved and encrypted') });
    } catch (err) {
      const { message, fieldErrors: fe } = apiError(err);
      setSecretDraft({ ...secretDraft, errors: errorsFor(fe, 'secret') });
      setResult({ ok: false, message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sap-tab">
      <section className="sap-section">
        <h3>{t('sapAuthMethod', 'Authentication method')}</h3>
        <div className="sap-method-grid" role="radiogroup">
          {methods.map((m) => (
            <label key={m.type} className={`choice-row sap-method ${form.authType === m.type ? 'checked' : ''}`}>
              <input type="radio" name="authType" checked={form.authType === m.type}
                onChange={() => update({ authType: m.type, authSettings: m.type === 'oauth2-client-credentials' ? { clientAuthentication: 'basic' } : {} })} />
              <span>
                <strong>{t(`sapAuth_${m.type}`, m.label)}</strong>
                <small>{m.description}</small>
              </span>
            </label>
          ))}
        </div>
        {fieldErrors.authType && <div className="sap-field-error">{fieldErrors.authType[0]}</div>}
        {authChanged && integration.secret.configured && (
          <div className="sap-warning">
            <AlertCircle size={15} /> {t('sapAuthChangeWarning', 'Saving a different method removes the stored credentials. Enter the new credentials after saving.')}
          </div>
        )}
      </section>

      {method && method.settingsFields.length > 0 && (
        <section className="sap-section">
          <h3>{t('sapAuthSettings', 'Settings')}</h3>
          <div className="form-grid">
            {method.settingsFields.map((f) => (
              <Field key={f.name} label={f.label} required={f.required} error={settingErrors[f.name]} hint={f.help}>
                {f.type === 'select' ? (
                  <select className="input-field" value={form.authSettings[f.name] ?? f.options?.[0]?.value} onChange={(e) => setSetting(f.name, e.target.value)}>
                    {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : f.name === 'extraHeaderNames' ? (
                  <ListInput value={form.authSettings[f.name] || []} onChange={(v) => setSetting(f.name, v)} placeholder="x-tenant-id, x-api-version" />
                ) : (
                  <input className="input-field" type={f.type === 'url' ? 'url' : 'text'} value={form.authSettings[f.name] || ''}
                    placeholder={f.placeholder} onChange={(e) => setSetting(f.name, e.target.value)} />
                )}
              </Field>
            ))}
          </div>
        </section>
      )}

      {method && method.secretFields.length > 0 && (
        <section className="sap-section">
          <h3><KeyRound size={16} /> {t('sapCredentials', 'Credentials')}</h3>
          {!catalog.secretStorageAvailable && (
            <div className="form-error"><AlertCircle size={15} /> {t('sapNoSecretStorage', 'Credential storage is not configured on the server (INTEGRATION_SECRET_KEY). Ask an operator to set it.')}</div>
          )}
          {integration && !authChanged && (
            <div className={`sap-secret-state ${integration.secret.configured ? 'set' : ''}`}>
              <ShieldCheck size={16} />
              {integration.secret.configured
                ? t('sapSecretSet', 'Credentials are stored encrypted (last changed {date}). They are never displayed; enter new values to replace them.').replace('{date}', formatDateTime(integration.secret.updatedAt))
                : t('sapSecretMissing', 'No credentials stored yet.')}
            </div>
          )}
          <div className="form-grid">
            {method.secretFields.filter((f) => f.name !== 'extraHeaderValues').map((f) => (
              <Field key={f.name} label={f.label} required={f.required && (isNew || !integration?.secret.configured)} error={secretErrors[f.name]}>
                <SecretInput field={f} value={secretDraft.values[f.name]} onChange={(v) => setSecret(f.name, v)} />
              </Field>
            ))}
            {extraHeaders.map((h) => (
              <Field key={h} label={`${t('sapHeaderValue', 'Header value')}: ${h}`}>
                <input className="input-field" type="password" autoComplete="new-password" value={secretDraft.values[`header:${h}`] || ''}
                  onChange={(e) => setSecret(`header:${h}`, e.target.value)} placeholder="••••••••" />
              </Field>
            ))}
          </div>
          {isNew ? (
            <p className="sap-note">{t('sapCredentialsOnCreate', 'Credentials are encrypted and stored when the integration is created.')}</p>
          ) : (
            <div className="sap-actions-row">
              <button type="button" className="btn btn-primary" onClick={saveCredentials}
                disabled={saving || authChanged || !Object.values(secretDraft.values).some(Boolean) || !catalog.secretStorageAvailable}>
                <KeyRound size={15} /> {integration?.secret.configured ? t('sapRotateCredentials', 'Replace credentials') : t('sapSaveCredentials', 'Save credentials')}
              </button>
              {authChanged && <span className="sap-field-hint">{t('sapSaveMethodFirst', 'Save the new authentication method first.')}</span>}
              {result && (
                <span className={`badge ${result.ok ? 'badge-success' : 'badge-danger'}`}>
                  {result.ok ? <CheckCircle size={13} /> : <AlertCircle size={13} />} {result.message}
                </span>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

/** Draft secret values -> the secret object expected by the auth method. */
export const buildSecret = (method, values, extraHeaders = []) => {
  const secret = {};
  for (const f of method?.secretFields || []) if (f.name !== 'extraHeaderValues' && values[f.name]) secret[f.name] = values[f.name];
  if (extraHeaders.length) {
    secret.extraHeaderValues = Object.fromEntries(extraHeaders.filter((h) => values[`header:${h}`]).map((h) => [h, values[`header:${h}`]]));
  }
  return secret;
};

export default AuthenticationTab;
