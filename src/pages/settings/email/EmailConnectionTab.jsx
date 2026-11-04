import React, { useContext, useState } from 'react';
import { AlertCircle, Loader2, Save } from 'lucide-react';
import { LanguageContext } from '../../../context/LanguageContext';
import { Field, apiError, emptyConnection } from './emailUI';

/** Connection: the Microsoft Entra ID app registration used to read every registered mailbox (one per application). */
const EmailConnectionTab = () => {
  const { t } = useContext(LanguageContext);
  const [conn, setConn] = useState(emptyConnection);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (patch) => setConn((c) => ({ ...c, ...patch }));

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      // TODO: await apiClient.put('/email-settings/connection', conn) once the backend endpoint exists
      console.log('Saving connection');
    } catch (err) {
      setError(apiError(err, 'Failed to save connection').message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="email-tab">
      <section className="email-section">
        <h3>{t('emailAppRegistration', 'Application registration')}</h3>
        <div className="form-grid">
          <Field label={t('emailTenantId', 'Tenant ID')} required>
            <input className="input-field" value={conn.tenantId} placeholder="00000000-0000-0000-0000-000000000000"
              onChange={(ev) => update({ tenantId: ev.target.value })} />
          </Field>
          <Field label={t('emailClientId', 'Client (application) ID')} required>
            <input className="input-field" value={conn.clientId} placeholder="00000000-0000-0000-0000-000000000000"
              onChange={(ev) => update({ clientId: ev.target.value })} />
          </Field>
          <Field label={t('emailClientSecret', 'Client secret')} required>
            <input className="input-field" type="password" autoComplete="new-password" value={conn.clientSecret}
              onChange={(ev) => update({ clientSecret: ev.target.value })} />
          </Field>
        </div>
      </section>

      {error && <div className="form-error"><AlertCircle size={15} /> {error}</div>}

      <div className="email-actions-row">
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? <Loader2 size={15} className="spin" /> : <Save size={15} />} {t('save', 'Save')}
        </button>
      </div>
    </div>
  );
};

export default EmailConnectionTab;
