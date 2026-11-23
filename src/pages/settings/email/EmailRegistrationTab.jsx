import React, { useContext, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { apiClient } from '../../../services/network.service';
import { LanguageContext } from '../../../context/LanguageContext';
import ConfirmDialog from '../../../components/ConfirmDialog';
import Pager from '../../../components/Pager';
import { Field, Toggle, apiError, emptyMailbox, formatDateTime } from './emailUI';

/** First message of one field in `details.fieldErrors` (values may be arrays). */
const fieldError = (fieldErrors, key) => {
  const v = fieldErrors?.[key];
  return Array.isArray(v) ? v[0] : v;
};

/**
 * Email Registration: mailboxes read for invoices, each delivering to one application module.
 * API: GET/POST /mailboxes, PUT/DELETE /mailboxes/{id}, GET /app-modules (admin only).
 */
const EmailRegistrationTab = () => {
  const { t } = useContext(LanguageContext);
  const formRef = useRef(null);

  // Server-side paging (same as Users.jsx)
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [mailboxes, setMailboxes] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Target application dropdown (GET /app-modules)
  const [modules, setModules] = useState([]);
  const [modulesError, setModulesError] = useState('');
  const [modulesKey, setModulesKey] = useState(0);

  // Add / edit form
  const [editing, setEditing] = useState(null); // null = add, else the mailbox row being edited
  const [draft, setDraft] = useState(emptyMailbox);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [togglingId, setTogglingId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState(null); // { message, isError }

  const showToast = (message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), isError ? 5000 : 3000);
  };

  useEffect(() => {
    let alive = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await apiClient.get('/mailboxes', { params: { page, limit } });
        if (!alive) return;
        setMailboxes(response.data.data || []);
        setTotalItems(response.data.totalItems || 0);
        setTotalPages(response.data.totalPages || 1);
        setLoadError('');
      } catch (err) {
        if (alive) setLoadError(apiError(err, t('emailLoadMailboxesFailed', 'Failed to load mailboxes')).message);
      } finally {
        if (alive) setLoading(false);
      }
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, reloadKey]);

  useEffect(() => {
    let alive = true;
    apiClient
      .get('/app-modules')
      .then((r) => alive && (setModules(r.data || []), setModulesError('')))
      .catch((err) => alive && setModulesError(apiError(err, t('emailLoadModulesFailed', 'Failed to load target applications')).message));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modulesKey]);

  const refresh = () => {
    setReloadKey((k) => k + 1);
    setModulesKey((k) => k + 1);
  };

  const resetForm = () => {
    setEditing(null);
    setDraft(emptyMailbox());
    setFieldErrors({});
    setFormError('');
  };

  const startEdit = (m) => {
    setEditing(m);
    setDraft({ address: m.address, folder: m.folder, moduleSlug: m.moduleSlug, isActive: m.isActive });
    setFieldErrors({});
    setFormError('');
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const save = async (ev) => {
    ev.preventDefault();
    if (!draft.address.trim() || !draft.moduleSlug) {
      setFieldErrors({});
      setFormError(t('emailMailboxRequired', 'Email address and target application are required.'));
      return;
    }
    const payload = {
      address: draft.address.trim(),
      folder: draft.folder.trim() || 'inbox',
      moduleSlug: draft.moduleSlug,
      isActive: draft.isActive
    };
    setSaving(true);
    setFieldErrors({});
    setFormError('');
    try {
      const response = editing
        ? await apiClient.put(`/mailboxes/${editing.id}`, payload)
        : await apiClient.post('/mailboxes', payload);
      const saved = response.data.data;
      showToast(
        editing
          ? t('emailMailboxUpdated', '{address} updated.').replace('{address}', saved.address)
          : t('emailMailboxCreated', '{address} added.').replace('{address}', saved.address)
      );
      resetForm();
      setReloadKey((k) => k + 1);
    } catch (err) {
      const { message, fieldErrors: fe } = apiError(err, t('emailSaveMailboxFailed', 'Failed to save the mailbox'));
      setFieldErrors(fe);
      setFormError(Object.keys(fe).length ? '' : message);
    } finally {
      setSaving(false);
    }
  };

  // PUT is a full replace (D-018c): the toggle sends the whole row with isActive flipped.
  const toggleActive = async (m) => {
    setTogglingId(m.id);
    try {
      const response = await apiClient.put(`/mailboxes/${m.id}`, {
        address: m.address,
        folder: m.folder,
        moduleSlug: m.moduleSlug,
        isActive: !m.isActive
      });
      const saved = response.data.data;
      setMailboxes((list) => list.map((x) => (x.id === saved.id ? saved : x)));
      if (editing?.id === saved.id) {
        setEditing(saved);
        setDraft((d) => ({ ...d, isActive: saved.isActive }));
      }
      showToast(t('emailMailboxUpdated', '{address} updated.').replace('{address}', saved.address));
    } catch (err) {
      showToast(apiError(err, t('emailSaveMailboxFailed', 'Failed to save the mailbox')).message, true);
    } finally {
      setTogglingId(null);
    }
  };

  // Errors (e.g. 409 "has received emails") are thrown and shown inside ConfirmDialog.
  const handleDelete = async () => {
    await apiClient.delete(`/mailboxes/${deleting.id}`);
    if (editing?.id === deleting.id) resetForm();
    // Last row on a page that isn't the first → go back one page (the effect reloads it).
    if (mailboxes.length === 1 && page > 1) setPage((p) => p - 1);
    else setReloadKey((k) => k + 1);
    showToast(t('emailMailboxDeleted', '{address} deleted.').replace('{address}', deleting.address));
  };

  const moduleLabel = (name, slug) => `${name} (${slug})`;
  // D-016: when editing, keep the current module selectable even if it is no longer active.
  const keepCurrentModule = editing && !modules.some((m) => m.slug === editing.moduleSlug);

  return (
    <div className="email-tab">
      <section className="email-section">
        <div className="flex-between gap-3 flex-wrap">
          <h3>{t('emailRegisteredMailboxes', 'Registered mailboxes')}</h3>
          <div className="email-actions-row">
            {toast && (
              <span className={`badge gap-[0.35rem] ${toast.isError ? 'badge-danger' : 'badge-success'}`}>
                {toast.isError ? <AlertCircle size={13} /> : <CheckCircle size={13} />} {toast.message}
              </span>
            )}
            <button type="button" className="btn btn-outline btn-sm" onClick={refresh} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> {t('refresh', 'Refresh')}
            </button>
          </div>
        </div>

        {loadError && <div className="form-error"><AlertCircle size={15} /> {loadError}</div>}

        {!loadError && (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>{t('emailAddressLabel', 'Email address')}</th>
                    <th>{t('emailFolderToRead', 'Folder')}</th>
                    <th>{t('emailTargetApp', 'Target application')}</th>
                    <th>{t('status', 'Status')}</th>
                    <th>{t('emailLastPolled', 'Last polled')}</th>
                    <th className="text-right">{t('actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="6" className="text-center p-8 text-(--text-secondary)">{t('loading', 'Loading...')}</td></tr>
                  ) : mailboxes.map((m) => (
                    <tr key={m.id}>
                      <td className="font-medium">{m.address}</td>
                      <td className="email-mono">{m.folder}</td>
                      <td>{moduleLabel(m.moduleName, m.moduleSlug)}</td>
                      <td>
                        <Toggle
                          checked={m.isActive}
                          onChange={() => toggleActive(m)}
                          disabled={togglingId === m.id}
                          label={m.isActive ? t('active', 'Active') : t('inactive', 'Inactive')}
                        />
                      </td>
                      <td>
                        <span className="email-poll-status">
                          {m.lastPolledAt
                            ? formatDateTime(m.lastPolledAt)
                            : <span className="email-muted">{t('emailNotPolledYet', 'Not polled yet')}</span>}
                          {m.lastError && (
                            <span className="badge badge-danger" title={m.lastError}>
                              <AlertCircle size={12} /> {t('emailPollError', 'Error')}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="text-right">
                        <span className="email-row-actions">
                          <button type="button" className="row-action" title={t('edit', 'Edit')}
                            aria-label={`${t('edit', 'Edit')} ${m.address}`} onClick={() => startEdit(m)}>
                            <Pencil size={14} />
                          </button>
                          <button type="button" className="row-action danger" title={t('delete', 'Delete')}
                            aria-label={`${t('delete', 'Delete')} ${m.address}`} onClick={() => setDeleting(m)}>
                            <Trash2 size={14} />
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && mailboxes.length === 0 && (
                <p className="email-note p-4 text-center">{t('emailNoMailboxes', 'No mailbox registered yet.')}</p>
              )}
            </div>

            <Pager
              page={page}
              limit={limit}
              totalItems={totalItems}
              totalPages={totalPages}
              loading={loading}
              onPageChange={setPage}
              onLimitChange={(size) => { setLimit(size); setPage(1); }}
            />
          </>
        )}
      </section>

      <section className={`email-section email-form-panel${editing ? ' is-editing' : ''}`} ref={formRef}>
        <h3>
          {editing ? <Pencil size={16} /> : <Plus size={16} />}
          {editing ? t('emailEditMailbox', 'Edit mailbox') : t('emailAddMailbox', 'Add mailbox')}
        </h3>
        <p className="email-note email-form-panel-hint">
          {editing
            ? t('emailEditMailboxHint', 'Change the selected mailbox, then save or cancel.')
            : t('emailAddMailboxHint', 'Register a new mailbox to read invoices from.')}
        </p>
        {modulesError && <div className="form-error"><AlertCircle size={15} /> {modulesError}</div>}
        <form onSubmit={save} noValidate>
          <div className="form-grid email-grid-3">
            <Field label={t('emailAddressLabel', 'Email address')} required error={fieldError(fieldErrors, 'address')}>
              <input className="input-field" type="email" value={draft.address} placeholder="invoices@cargill.com"
                onChange={(ev) => setDraft({ ...draft, address: ev.target.value })} />
            </Field>
            <Field label={t('emailFolderToRead', 'Folder')} error={fieldError(fieldErrors, 'folder')}>
              <input className="input-field" value={draft.folder} placeholder="inbox"
                onChange={(ev) => setDraft({ ...draft, folder: ev.target.value })} />
            </Field>
            <Field label={t('emailTargetApp', 'Target application')} required error={fieldError(fieldErrors, 'moduleSlug')}>
              <select className="input-field" value={draft.moduleSlug} onChange={(ev) => setDraft({ ...draft, moduleSlug: ev.target.value })}>
                <option value="">{t('select', 'Select...')}</option>
                {keepCurrentModule && (
                  <option value={editing.moduleSlug}>{moduleLabel(editing.moduleName, editing.moduleSlug)}</option>
                )}
                {modules.map((m) => <option key={m.slug} value={m.slug}>{moduleLabel(m.name, m.slug)}</option>)}
              </select>
            </Field>
          </div>
          {editing && <p className="email-note">{t('emailFolderChangeHint', 'Changing the address or folder restarts reading from the start.')}</p>}
          {formError && <div className="form-error"><AlertCircle size={15} /> {formError}</div>}
          <div className="email-actions-row email-form-actions">
            {editing ? (
              <>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Pencil size={15} /> {saving ? t('working', 'Working...') : t('saveChanges', 'Save Changes')}
                </button>
                <button type="button" className="btn btn-outline" onClick={resetForm} disabled={saving}>
                  {t('cancel', 'Cancel')}
                </button>
              </>
            ) : (
              <button type="submit" className="btn btn-outline" disabled={saving}>
                <Plus size={15} /> {saving ? t('working', 'Working...') : t('emailAddMailbox', 'Add mailbox')}
              </button>
            )}
          </div>
        </form>
      </section>

      {deleting && (
        <ConfirmDialog
          title={t('emailDeleteMailbox', 'Delete mailbox')}
          message={t('emailConfirmDeleteMailbox', 'Delete {address}? This is only possible while it has not received any emails.').replace('{address}', deleting.address)}
          confirmLabel={t('delete', 'Delete')}
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
};

export default EmailRegistrationTab;
