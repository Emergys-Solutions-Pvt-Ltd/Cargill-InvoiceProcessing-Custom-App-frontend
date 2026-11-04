import React, { useContext, useState } from 'react';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';
import { LanguageContext } from '../../../context/LanguageContext';
import { APPS } from '../../../utils/appHelper';
import { Field, emptyMailbox } from './emailUI';

/** Email Registration: mailboxes read for invoices, each delivering to one application. */
const EmailRegistrationTab = () => {
  const { t } = useContext(LanguageContext);
  const [mailboxes, setMailboxes] = useState([]);   // TODO: load with apiClient.get('/email-settings/mailboxes')
  const [draft, setDraft] = useState(emptyMailbox);
  const [error, setError] = useState('');

  const appName = (slug) => {
    const app = APPS.find((a) => a.id === slug);
    return app ? t(app.nameKey, app.name) : slug;
  };

  const add = () => {
    if (!draft.emailAddress || !draft.moduleSlug) {
      setError(t('emailMailboxRequired', 'Email address and target application are required.'));
      return;
    }
    if (mailboxes.some((m) => m.emailAddress.toLowerCase() === draft.emailAddress.toLowerCase())) {
      setError(t('emailMailboxDuplicate', 'This mailbox is already registered.'));
      return;
    }
    // TODO: await apiClient.post('/email-settings/mailboxes', draft) and use the returned row (with its id)
    setMailboxes((list) => [...list, { ...draft, id: Date.now() }]);
    setDraft(emptyMailbox());
    setError('');
  };

  // TODO: await apiClient.delete(`/email-settings/mailboxes/${id}`)
  const remove = (id) => setMailboxes((list) => list.filter((m) => m.id !== id));

  return (
    <div className="email-tab">
      <section className="email-section">
        <h3>{t('emailRegisteredMailboxes', 'Registered mailboxes')}</h3>
        {mailboxes.length === 0 ? (
          <p className="email-note">{t('emailNoMailboxes', 'No mailbox registered yet.')}</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t('emailAddressLabel', 'Email address')}</th>
                  <th>{t('emailFolderToRead', 'Folder')}</th>
                  <th>{t('emailTargetApp', 'Target application')}</th>
                  <th>{t('status', 'Status')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {mailboxes.map((m) => (
                  <tr key={m.id}>
                    <td>{m.emailAddress}</td>
                    <td>{m.folderToRead}</td>
                    <td>{appName(m.moduleSlug)}</td>
                    <td>
                      <span className={`badge ${m.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {m.isActive ? t('active', 'Active') : t('inactive', 'Inactive')}
                      </span>
                    </td>
                    <td>
                      <button type="button" className="row-action danger" aria-label={t('remove', 'Remove')} onClick={() => remove(m.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="email-section">
        <h3>{t('emailAddMailbox', 'Add mailbox')}</h3>
        <div className="form-grid email-grid-3">
          <Field label={t('emailAddressLabel', 'Email address')} required>
            <input className="input-field" type="email" value={draft.emailAddress} placeholder="invoices@cargill.com"
              onChange={(ev) => setDraft({ ...draft, emailAddress: ev.target.value })} />
          </Field>
          <Field label={t('emailFolderToRead', 'Folder')}>
            <input className="input-field" value={draft.folderToRead} placeholder="Inbox"
              onChange={(ev) => setDraft({ ...draft, folderToRead: ev.target.value })} />
          </Field>
          <Field label={t('emailTargetApp', 'Target application')} required>
            <select className="input-field" value={draft.moduleSlug} onChange={(ev) => setDraft({ ...draft, moduleSlug: ev.target.value })}>
              <option value="">{t('select', 'Select...')}</option>
              {APPS.map((a) => <option key={a.id} value={a.id}>{t(a.nameKey, a.name)}</option>)}
            </select>
          </Field>
        </div>
        {error && <div className="form-error"><AlertCircle size={15} /> {error}</div>}
        <button type="button" className="btn btn-outline" onClick={add}>
          <Plus size={15} /> {t('emailAddMailbox', 'Add mailbox')}
        </button>
      </section>
    </div>
  );
};

export default EmailRegistrationTab;
