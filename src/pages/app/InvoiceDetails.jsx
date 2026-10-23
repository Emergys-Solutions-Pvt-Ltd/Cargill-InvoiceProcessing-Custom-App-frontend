import React, { useCallback, useContext, useEffect, useId, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Undo2, CheckCircle, AlertCircle } from 'lucide-react';
import { apiClient } from '../../services/network.service';
import { AuthContext } from '../../context/AuthContext';
import { LanguageContext } from '../../context/LanguageContext';
import { useStatuses } from '../../services/statuses';
import InvoicePdfViewer from '../../components/InvoicePdfViewer';
import ConfirmDialog from '../../components/ConfirmDialog';

const toForm = (invoice) => ({
  originCityId: invoice.origin?.id ?? '',
  destinationCityId: invoice.destination?.id ?? '',
  processId: invoice.process?.id ?? '',
  claimNumber: invoice.claimNumber ?? '0.00',
  additionalInfo: invoice.additionalInfo ?? '',
  assignedUserId: invoice.assignedUser?.id ?? ''
});

/** Label + control; the label is linked to the control (id / htmlFor) for screen readers and clicks. */
const Field = ({ label, children }) => {
  const id = useId();
  return (
    <div className="su-field">
      <label htmlFor={id}>{label}</label>
      {React.cloneElement(children, { id })}
    </div>
  );
};

const ReadOnly = ({ id, value }) => <output id={id} className="su-readonly">{value || '–'}</output>;

/**
 * Page 2 of every app: Invoice Details.
 *   Left  - "<role>" fieldset: [invoice number | process name] header, Super User fields,
 *           Save / Send to previous team
 *   Right - PDF viewer (thumbnails + toolbar), attachment switcher, open / email / upload
 */
const InvoiceDetails = () => {
  const { invoiceId } = useParams();
  const { appId, appName } = useOutletContext() || {};
  const { user } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const statuses = useStatuses();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [form, setForm] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [cities, setCities] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null); // { ok, message }
  const [confirmSendBack, setConfirmSendBack] = useState(false);

  const showNotice = (ok, message) => {
    setNotice({ ok, message });
    setTimeout(() => setNotice(null), ok ? 3500 : 6000);
  };

  const applyInvoice = useCallback((data) => {
    setInvoice(data);
    setForm(toForm(data));
  }, []);

  const loadInvoice = useCallback(async () => {
    try {
      const response = await apiClient.get(`/invoices/${encodeURIComponent(invoiceId)}`);
      applyInvoice(response.data);
      setSelectedAttachmentId((current) =>
        response.data.attachments.some((a) => a.id === current) ? current : response.data.attachments[0]?.id ?? null
      );
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Failed to load the invoice');
    }
  }, [invoiceId, applyInvoice]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  // Dropdown sources: cities (origin / destination), processes, users who may own the invoice
  useEffect(() => {
    apiClient.get('/master-data/cities/options').then((r) => setCities(r.data)).catch(() => setCities([]));
    apiClient.get('/master-data/processes/options').then((r) => setProcesses(r.data)).catch(() => setProcesses([]));
  }, []);
  useEffect(() => {
    if (!appId) return;
    apiClient.get(`/apps/${appId}/users`).then((r) => setAssignees(r.data)).catch(() => setAssignees([]));
  }, [appId]);

  const dirty = useMemo(() => {
    if (!invoice || !form) return false;
    const original = toForm(invoice);
    return Object.keys(form).some((key) => String(form[key] ?? '') !== String(original[key] ?? ''));
  }, [invoice, form]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await apiClient.put(`/invoices/${encodeURIComponent(invoice.id)}/details`, {
        processId: form.processId || null,
        originCityId: form.originCityId || null,
        destinationCityId: form.destinationCityId || null,
        claimNumber: Number(form.claimNumber) || 0,
        additionalInfo: form.additionalInfo || null,
        assignedUserId: form.assignedUserId || null
      });
      applyInvoice(response.data.data);
      showNotice(true, response.data.message);
    } catch (err) {
      showNotice(false, err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSendBack = async () => {
    const response = await apiClient.post(`/invoices/${encodeURIComponent(invoice.id)}/send-to-previous-team`);
    await loadInvoice();
    showNotice(true, response.data.message);
  };

  const handleUploaded = async (attachment) => {
    await loadInvoice();
    setSelectedAttachmentId(attachment.id);
    showNotice(true, `${attachment.fileName} ${t('uploaded', 'uploaded')}`);
  };

  // Assigned user may no longer be in the list (e.g. lost access): keep showing them
  const assigneeOptions = useMemo(() => {
    const list = [...assignees];
    if (invoice?.assignedUser && !list.some((u) => u.id === invoice.assignedUser.id)) list.unshift(invoice.assignedUser);
    return list;
  }, [assignees, invoice]);

  const processOptions = useMemo(() => {
    const list = [...processes];
    if (invoice?.process && !list.some((p) => p.id === invoice.process.id)) list.unshift(invoice.process);
    return list;
  }, [processes, invoice]);

  if (loadError) {
    return <div className="form-error">{loadError}</div>;
  }
  if (!invoice || !form) {
    return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>{t('loadingInvoiceDetails', 'Loading invoice details...')}</div>;
  }

  const roleLabel = (user?.role || '').toLowerCase() === 'admin' ? t('roleAdmin', 'Admin') : t('roleUser', 'User');
  const statusLabel = statuses.find((s) => s.code === invoice.status)?.name || invoice.status;
  const cityLabel = (c) => c.name;

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '0.9rem', gap: '1rem', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-outline" onClick={() => navigate(`/app/${appId}/invoices`)}>
          <ArrowLeft size={15} /> {t('backToInvoicesOf', 'Back to {app} invoices').replace('{app}', appName || '')}
        </button>
        {notice && (
          <div className={notice.ok ? 'form-success' : 'form-error'} style={{ margin: 0 }}>
            {notice.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />} {notice.message}
          </div>
        )}
      </div>

      <div className="details-split">
        {/* Left: current user's role as the fieldset title */}
        <fieldset className="su-fieldset">
          <legend>{roleLabel}</legend>

          <div className="su-header">
            <div title={invoice.id}>{invoice.invoiceNumber}</div>
            <div>{invoice.process?.name || t('noProcess', 'No process')}</div>
          </div>

          <div className="su-body">
            <div className="su-grid">
              <Field label={t('origin', 'Origin')}>
                <select className="input-field" value={form.originCityId} onChange={set('originCityId')}>
                  <option value="">--{t('none', 'None')}--</option>
                  {cities.map((c) => <option key={c.id} value={c.id}>{cityLabel(c)}</option>)}
                </select>
              </Field>
              <Field label={t('destination', 'Destination')}>
                <select className="input-field" value={form.destinationCityId} onChange={set('destinationCityId')}>
                  <option value="">--{t('none', 'None')}--</option>
                  {cities.map((c) => <option key={c.id} value={c.id}>{cityLabel(c)}</option>)}
                </select>
              </Field>

              <Field label={t('status', 'Status')}><ReadOnly value={statusLabel} /></Field>
              <Field label={t('stage', 'Stage')}><ReadOnly value={invoice.stage?.name} /></Field>

              <Field label={t('claimNumber', 'Claim Number')}>
                <input type="number" min="0" step="0.01" className="input-field" value={form.claimNumber} onChange={set('claimNumber')} />
              </Field>
              <Field label={t('additionalInfo', 'Additional Info.')}>
                <textarea className="input-field" rows={3} maxLength={1000} value={form.additionalInfo} onChange={set('additionalInfo')} style={{ resize: 'vertical' }} />
              </Field>

              <Field label={t('emailReceptionDate', 'Email Reception Date')}><ReadOnly value={invoice.emailReceptionDateTime} /></Field>
              <Field label={t('changeProcess', 'Change Process')}>
                <select className="input-field" value={form.processId} onChange={set('processId')}>
                  <option value="">--{t('none', 'None')}--</option>
                  {processOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>

              <Field label={t('filenetId', 'ID FileNet')}><ReadOnly value={invoice.filenetId} /></Field>
              <Field label={t('assignedUser', 'Assigned User')}>
                <select className="input-field" value={form.assignedUserId} onChange={set('assignedUserId')}>
                  <option value="">--{t('none', 'None')}--</option>
                  {assigneeOptions.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </Field>
            </div>

            <div className="su-section-title">{t('invoiceInformation', 'Invoice information')}</div>
            <div className="su-grid">
              <Field label={t('vendorName', 'Vendor')}><ReadOnly value={invoice.vendorLegalName} /></Field>
              <Field label={t('cuit', 'CUIT')}><ReadOnly value={invoice.cuit} /></Field>
              <Field label={t('firstInvoice', '1a Invoice')}><ReadOnly value={invoice.invoice1a} /></Field>
              <Field label={t('secondInvoice', '2a Invoice')}><ReadOnly value={invoice.invoice2a} /></Field>
              <Field label={t('invoiceDate', 'Invoice Date')}><ReadOnly value={invoice.invoiceDate} /></Field>
              <Field label={t('receptionDate', 'Reception Date')}><ReadOnly value={invoice.receptionDate} /></Field>
              <Field label={t('countryStation', 'Country Station')}><ReadOnly value={invoice.countryStation} /></Field>
              <Field label={t('invoiceSubtotalWithTax', 'Subtotal with Tax')}>
                <ReadOnly value={invoice.invoiceSubtotalWithTax ? `$${invoice.invoiceSubtotalWithTax}` : null} />
              </Field>
            </div>
          </div>

          <div className="su-footer">
            <button type="button" className="btn btn-outline" onClick={() => setForm(toForm(invoice))} disabled={!dirty || saving}>
              {t('reset', 'Reset')}
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={!dirty || saving}>
              <Save size={15} /> {saving ? t('saving', 'Saving...') : t('save', 'Save')}
            </button>
            <button type="button" className="btn btn-send-back" onClick={() => setConfirmSendBack(true)} disabled={!invoice.stage}>
              <Undo2 size={15} /> {t('sendToPreviousTeam', 'Send to previous team')}
            </button>
          </div>
        </fieldset>

        {/* Right: PDF viewer */}
        <InvoicePdfViewer
          invoice={invoice}
          attachments={invoice.attachments}
          selectedId={selectedAttachmentId}
          onSelect={setSelectedAttachmentId}
          onUploaded={handleUploaded}
        />
      </div>

      {confirmSendBack && (
        <ConfirmDialog
          title={t('sendToPreviousTeam', 'Send to previous team')}
          message={t('confirmSendBack', 'Send {invoice} back from {team} to the previous team? The assigned user will be cleared.')
            .replace('{invoice}', invoice.invoiceNumber)
            .replace('{team}', invoice.stage?.name || '')}
          confirmLabel={t('sendToPreviousTeam', 'Send to previous team')}
          onConfirm={handleSendBack}
          onClose={() => setConfirmSendBack(false)}
        />
      )}
    </div>
  );
};

export default InvoiceDetails;
