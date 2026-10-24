import React, { useContext } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { LanguageContext } from '../../../context/LanguageContext';
import { Field, Toggle, errorsFor } from './sapUi';

/** 3.1 Connection: identity of the integration, SAP endpoint and request settings. */
const ConnectionTab = ({ form, update, fieldErrors, isNew }) => {
  const { t } = useContext(LanguageContext);
  const c = form.connection;
  const e = errorsFor(fieldErrors, 'connection');
  const setConn = (patch) => update({ connection: { ...c, ...patch } });
  const headers = Object.entries(c.customHeaders || {});
  const setHeaders = (list) => setConn({ customHeaders: Object.fromEntries(list) });

  return (
    <div className="sap-tab">
      <section className="sap-section">
        <h3>{t('sapGeneral', 'General')}</h3>
        <div className="form-grid">
          <Field label={t('sapIntegrationName', 'Integration name')} required error={fieldErrors.name?.[0]}>
            <input className="input-field" value={form.name} maxLength={150} placeholder="SAP S/4HANA – Production"
              onChange={(ev) => update({ name: ev.target.value })} />
          </Field>
          <Field label={t('sapEnvironment', 'SAP system / environment')} error={fieldErrors.environment?.[0]}>
            <input className="input-field" value={form.environment} maxLength={100} placeholder="Production, QA, Sandbox..."
              onChange={(ev) => update({ environment: ev.target.value })} />
          </Field>
        </div>
        <Field label={t('description', 'Description')} error={fieldErrors.description?.[0]}>
          <textarea className="input-field" rows={2} maxLength={1000} value={form.description}
            onChange={(ev) => update({ description: ev.target.value })} />
        </Field>
        <div className="form-grid">
          <Field
            label={t('sapSourceSystem', 'Source system')}
            required
            error={fieldErrors.sourceSystem?.[0]}
            hint={t('sapSourceSystemHint', 'Stable id of the SAP system + client (e.g. S4P-100). Part of the duplicate-prevention key: do not change it later.')}
          >
            <input className="input-field" value={form.sourceSystem} maxLength={100} placeholder="S4P-100"
              onChange={(ev) => update({ sourceSystem: ev.target.value })} />
          </Field>
          <div className="input-group">
            <label>{t('status', 'Status')}</label>
            <Toggle checked={form.isActive} onChange={(v) => update({ isActive: v })}
              label={form.isActive ? t('sapActiveHint', 'Active – can be synchronized') : t('sapInactiveHint', 'Inactive – no synchronization')} />
          </div>
        </div>
      </section>

      <section className="sap-section">
        <h3>{t('sapEndpoint', 'SAP OData endpoint')}</h3>
        <div className="form-grid">
          <Field label={t('sapBaseUrl', 'Base URL')} required error={e.baseUrl} hint={t('sapBaseUrlHint', 'HTTPS address of the SAP system, e.g. https://my400000.s4hana.cloud.sap')}>
            <input className="input-field" type="url" value={c.baseUrl} placeholder="https://my-s4.example.com"
              onChange={(ev) => setConn({ baseUrl: ev.target.value })} />
          </Field>
          <Field label={t('sapServicePath', 'OData service path')} required error={e.servicePath}>
            <input className="input-field" value={c.servicePath} placeholder="/sap/opu/odata/sap/API_SUPPLIERINVOICE_PROCESS_SRV"
              onChange={(ev) => setConn({ servicePath: ev.target.value })} />
          </Field>
        </div>
        <div className="form-grid sap-grid-4">
          <Field label={t('sapODataVersion', 'OData version')} error={e.odataVersion}>
            <select className="input-field" value={c.odataVersion} onChange={(ev) => setConn({ odataVersion: ev.target.value })}>
              <option value="v2">OData V2</option>
              <option value="v4">OData V4</option>
            </select>
          </Field>
          <Field label={t('sapApiVersion', 'API version')} error={e.apiVersion} hint={t('optional', 'Optional')}>
            <input className="input-field" value={c.apiVersion} maxLength={20} placeholder="0001"
              onChange={(ev) => setConn({ apiVersion: ev.target.value })} />
          </Field>
          <Field label={t('sapClient', 'SAP client')} error={e.sapClient} hint={t('optional', 'Optional')}>
            <input className="input-field" value={c.sapClient} maxLength={3} placeholder="100"
              onChange={(ev) => setConn({ sapClient: ev.target.value })} />
          </Field>
          <Field label={t('sapLanguage', 'Language')} error={e.language} hint={t('optional', 'Optional')}>
            <input className="input-field" value={c.language} maxLength={2} placeholder="EN"
              onChange={(ev) => setConn({ language: ev.target.value })} />
          </Field>
        </div>
      </section>

      <section className="sap-section">
        <h3>{t('sapRequestSettings', 'Request settings')}</h3>
        <div className="form-grid sap-grid-4">
          <Field label={t('sapTimeout', 'Timeout (ms)')} error={e.timeoutMs}>
            <input className="input-field" type="number" min={1000} max={300000} step={1000} value={c.timeoutMs}
              onChange={(ev) => setConn({ timeoutMs: ev.target.value })} />
          </Field>
          <Field label={t('sapMaxRetries', 'Retries per request')} error={e.maxRetries} hint={t('sapMaxRetriesHint', 'Network errors, 429 and 5xx')}>
            <input className="input-field" type="number" min={0} max={10} value={c.maxRetries}
              onChange={(ev) => setConn({ maxRetries: ev.target.value })} />
          </Field>
          <Field label={t('sapPageSize', 'Default page size')} error={e.defaultPageSize}>
            <input className="input-field" type="number" min={1} max={5000} value={c.defaultPageSize}
              onChange={(ev) => setConn({ defaultPageSize: ev.target.value })} />
          </Field>
          <Field label={t('sapMinInterval', 'Min. interval between requests (ms)')} error={e.minRequestIntervalMs} hint={t('sapMinIntervalHint', 'Client-side throttling')}>
            <input className="input-field" type="number" min={0} max={60000} value={c.minRequestIntervalMs}
              onChange={(ev) => setConn({ minRequestIntervalMs: ev.target.value })} />
          </Field>
        </div>

        <div className="input-group">
          <label>{t('sapCustomHeaders', 'Additional headers (non-secret)')}</label>
          {e.customHeaders && <div className="sap-field-error">{e.customHeaders}</div>}
          {headers.map(([name, value], i) => (
            <div key={i} className="sap-inline-row">
              <input className="input-field" placeholder={t('sapHeaderName', 'Header name')} value={name}
                onChange={(ev) => setHeaders(headers.map((h, j) => (j === i ? [ev.target.value, h[1]] : h)))} />
              <input className="input-field" placeholder={t('value', 'Value')} value={value}
                onChange={(ev) => setHeaders(headers.map((h, j) => (j === i ? [h[0], ev.target.value] : h)))} />
              <button type="button" className="row-action danger" aria-label={t('remove', 'Remove')}
                onClick={() => setHeaders(headers.filter((_, j) => j !== i))}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <div>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setHeaders([...headers, [`X-Header-${headers.length + 1}`, '']])}>
              <Plus size={14} /> {t('sapAddHeader', 'Add header')}
            </button>
          </div>
          <div className="sap-field-hint">{t('sapCustomHeadersHint', 'Secret headers (API keys, tokens) belong under Authentication.')}</div>
        </div>
        {isNew && <p className="sap-note">{t('sapTestBeforeSave', 'Tip: use "Test connection" to check the settings before saving.')}</p>}
      </section>
    </div>
  );
};

export default ConnectionTab;
