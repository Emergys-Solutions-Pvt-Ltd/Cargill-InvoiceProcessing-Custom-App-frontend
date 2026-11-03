import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { Save, Undo2, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { apiClient } from '../../services/network.service';
import { AuthContext } from '../../context/AuthContext';
import { LanguageContext } from '../../context/LanguageContext';
import { useStatuses } from '../../services/statuses';
import InvoicePdfViewer from '../../components/InvoicePdfViewer';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Field, ReadOnly } from '../../components/FormField';
import CcppTab from '../../components/CcppTab';
import {
  SjoFieldInputs, SjoFlagInputs, sjoFormFrom, emptySjoForm, missingSjoFields, useSjoOptions
} from '../../components/SjoInvoiceFields';

const isSjoInvoice = (invoice) => String(invoice?.applicationCode || '').toUpperCase() === 'SJO';
const isGppInvoice = (invoice) => String(invoice?.applicationCode || '').toUpperCase() === 'GP';
const SJO_KEYS = Object.keys(emptySjoForm());

// SJO invoices also edit their SJO fields (country, BU, ERP, ID Fiscal, A.B., flags) in the same form
const toForm = (invoice) => ({
  originCityId: invoice.origin?.id ?? '',
  destinationCityId: invoice.destination?.id ?? '',
  processId: invoice.process?.id ?? '',
  claimNumber: invoice.claimNumber ?? '0.00',
  additionalInfo: invoice.additionalInfo ?? '',
  assignedUserId: invoice.assignedUser?.id ?? '',
  ...(isSjoInvoice(invoice) ? sjoFormFrom(invoice.sjoFields) : {})
});

// sfFields' date columns arrive as raw ISO 8601 (backend doesn't reformat them, unlike the rest
// of Invoice Detail) — format client-side so they match the house display style.
const DATE_ONLY_SF_FIELDS = new Set(['caeExpirationDate', 'dueDateInvoice']);
const formatSfDate = (key, value) => {
  if (!value) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return DATE_ONLY_SF_FIELDS.has(key)
    ? d.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })
    : d.toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

/**
 * Legacy Salesforce "GP Invoice" fields (../shared/handoffs/database.md, 2026-11-02) — read-only
 * until a write path exists. Sourced from `invoice.sfFields` (camelCase of the DB's
 * `app.invoice_sf_fields` satellite table); NULL/missing until that row/route exists, which
 * ReadOnly already renders as '–'.
 */
const SF_FIELD_GROUPS = [
  {
    title: 'Identifiers & References',
    fields: [
      ['invoice1a2aCancel', '1° and 2° Invoice Number Cancel'],
      ['firstInvoiceNumberCancel', '1° Invoice Number Cancel'],
      ['secondInvoiceNumberCancel', '2° Invoice Number Cancel'],
      ['abNumber', 'A.B. Number'],
      ['accountingRegister', 'Accounting Register'],
      ['codeOfImputation', 'Code of Imputation'],
      ['codeOfImputationStr', 'Code of Imputation (Str)'],
      ['gpCodeOfImputation', 'GP Code of Imputation'],
      ['costCenter', 'Cost Center'],
      ['jdeNumber', 'JDE Number'],
      ['nroDeO6', 'Nro de O6'],
      ['poNumber', 'PO Number'],
      ['x1Number', 'X1 Number'],
      ['ownerLegacyId', 'Owner'],
      ['userLegacyId', 'User'],
      ['rosCuitLegacyId', 'CUIT (ROS CUIT Lookup)']
    ]
  },
  {
    title: 'Codes & Classification',
    fields: [
      ['adjustmentApproval', 'Aprobacion Ajuste'],
      ['branchPlant', 'Branch Plant'],
      ['center', 'Center'],
      ['codeType', 'Code Type'],
      ['drei', 'D.R.E.I.'],
      ['adjustmentDoc', 'Doc Ajuste'],
      ['installmentPayment', 'Inst Payment'],
      ['invoiceType', 'Invoice Type'],
      ['orderType', 'Order Type'],
      ['pendingReason', 'Pending Reason'],
      ['rejectReason', 'Reject Reason'],
      ['subProcess', 'Sub Process'],
      ['producto', 'Producto']
    ]
  },
  {
    title: 'Notes & Observations',
    fields: [
      ['area', 'Area'],
      ['cbsObservation', 'CBS Observation'],
      ['computationFormula', 'Computation Formula'],
      ['expenseType', 'Expense Type'],
      ['adminObservation', 'Admin Observation'],
      ['approvalObservation', 'Approval Observation'],
      ['attachmentNameBeforeChange', 'Attachment Name Before Change'],
      ['creditNoteComments', 'Credit Note Comments'],
      ['distributionType', 'Distribution Type'],
      ['notes', 'Notes'],
      ['observation', 'Observation'],
      ['rejectObservation', 'Reject Observation'],
      ['clientEmail', 'Client Email'],
      ['description', 'Description']
    ]
  },
  {
    title: 'Legacy Dates',
    fields: [
      ['adminApprovedDate', 'Admin Approved Date'],
      ['approvalDate', 'Approval Date'],
      ['caeExpirationDate', 'CAE Expiration Date'],
      ['processedDate', 'Processed Date'],
      ['rejectionDate', 'Rejection Date'],
      ['dueDateInvoice', 'Due Date Invoice']
    ]
  },
  {
    title: 'Legacy Amounts',
    fields: [
      ['caeNumber', 'CAE Number'],
      ['exchangeRate', 'Exchange Rate'],
      ['paymentTerm', 'Payment Term'],
      ['cantidad', 'Cantidad']
    ]
  },
  {
    title: 'Flags',
    boolean: true,
    fields: [
      ['isBoortmalInvoice', 'Boortmal Invoice'],
      ['buEmployeeApproverDone', 'BU Employee Approver Done'],
      ['isDistribution', 'Distribution'],
      ['isDownloadedInvoice', 'Downloaded Invoice'],
      ['hasPo', 'Have PO'],
      ['isHighPriority', 'High Priority'],
      ['isInvoicePaid', 'Invoice Paid'],
      ['needApproval', 'Need Approval'],
      ['poAttached', 'PO Attached'],
      ['vipControlDone', 'VIP Control Done']
    ]
  }
];

/**
 * Page 2 of every app: Invoice Details.
 *   Left  - "<role>" fieldset: [invoice number | process name] header, Super User fields,
 *           Save / Send to previous team
 *   Right - PDF viewer (thumbnails + toolbar), attachment switcher, open / email / upload
 */
const InvoiceDetails = () => {
  const { invoiceId } = useParams();
  const { appId } = useOutletContext() || {};
  const { user } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const statuses = useStatuses();

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
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'ccpp'
  const ccppTabRef = useRef(null);

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
      const response = await apiClient.get(`/apps/${appId}/invoices/${encodeURIComponent(invoiceId)}`);
      applyInvoice(response.data);
      setSelectedAttachmentId((current) =>
        response.data.attachments.some((a) => a.id === current) ? current : response.data.attachments[0]?.id ?? null
      );
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Failed to load the invoice');
    }
  }, [appId, invoiceId, applyInvoice]);

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

  const sjo = isSjoInvoice(invoice);
  const isGpp = isGppInvoice(invoice);
  const sjoOptions = useSjoOptions(sjo);

  const changedKeys = useMemo(() => {
    if (!invoice || !form) return [];
    const original = toForm(invoice);
    return Object.keys(form).filter((key) => String(form[key] ?? '') !== String(original[key] ?? ''));
  }, [invoice, form]);
  const dirty = changedKeys.length > 0;

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSave = async () => {
    // SJO fields are only sent when one of them changed, so older SJO invoices without them
    // can still save the other fields; once edited, the required ones must be complete.
    const sjoChanged = sjo && changedKeys.some((key) => SJO_KEYS.includes(key));
    if (sjoChanged) {
      const missing = missingSjoFields(form, t);
      if (missing.length > 0) {
        showNotice(false, `${t('requiredFieldsMissing', 'Fill in the required fields')}: ${missing.join(', ')}`);
        return;
      }
    }
    setSaving(true);
    try {
      const response = await apiClient.put(`/apps/${appId}/invoices/${encodeURIComponent(invoice.id)}/details`, {
        processId: form.processId || null,
        originCityId: form.originCityId || null,
        destinationCityId: form.destinationCityId || null,
        claimNumber: Number(form.claimNumber) || 0,
        additionalInfo: form.additionalInfo || null,
        assignedUserId: form.assignedUserId || null,
        ...(sjoChanged ? {
          sjoFields: {
            countryId: Number(form.countryId),
            businessUnitId: Number(form.businessUnitId),
            erpSystemId: Number(form.erpSystemId),
            idFiscal: form.idFiscal,
            abNumber: form.abNumber || null,
            abName: form.abName || null,
            flowTurnDown: form.flowTurnDown,
            criticalVendor: form.criticalVendor,
            urgentInvoice: form.urgentInvoice
          }
        } : {})
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
    const response = await apiClient.post(`/apps/${appId}/invoices/${encodeURIComponent(invoice.id)}/send-to-previous-team`);
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
  const sfFields = invoice.sfFields || {};

  return (
    <div>
      <div className="tab-bar" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex' }}>
          <button
            type="button"
            className={`tab-link ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            {t('details', 'Details')}
          </button>
          {/* CCPP rows exist for General Payments invoices only (gpp.invoice_ccpps) */}
          {isGpp && (
            <button
              type="button"
              className={`tab-link ${activeTab === 'ccpp' ? 'active' : ''}`}
              onClick={() => setActiveTab('ccpp')}
            >
              {t('ccpp', 'CCPP')}
            </button>
          )}
        </div>
        {activeTab === 'ccpp' && (
          <button type="button" className="btn btn-primary" style={{ marginBottom: '0.4rem' }} onClick={() => ccppTabRef.current?.openAdd()}>
            <Plus size={15} /> {t('addCcppEntry', 'Add New Entry')}
          </button>
        )}
      </div>

      {notice && (
        <div className={notice.ok ? 'form-success' : 'form-error'} style={{ margin: '0 0 0.9rem' }}>
          {notice.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />} {notice.message}
        </div>
      )}

      {activeTab === 'ccpp' && <CcppTab ref={ccppTabRef} appId={appId} invoiceId={invoice.id} />}

      {activeTab === 'details' && (
      <div className="details-split">
        {/* Left: current user's role as the fieldset title */}
        <fieldset className="su-fieldset">
          <legend>{roleLabel}</legend>

          {sjo ? (
            <div className="su-header">
              <div>{invoice.id}</div>
            </div>
          ) : (
            <div className="su-header">
              <div title={invoice.id}>{invoice.invoiceNumber}</div>
              <div>{invoice.process?.name || t('noProcess', 'No process')}</div>
            </div>
          )}

          {/* SJO: only the SJO fields (Invoice ID, Assign To, flags, Country, BU, ERP, ID Fiscal, A.B. Number / Name) */}
          {sjo ? (
            <div className="su-body">
              <div className="su-grid">
                <Field label={t('invoiceId', 'Invoice ID')}><ReadOnly value={invoice.id} /></Field>
                <Field label={t('assignTo', 'Assign To')}>
                  <select className="input-field" value={form.assignedUserId} onChange={set('assignedUserId')}>
                    <option value="">--{t('none', 'None')}--</option>
                    {assigneeOptions.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </Field>
              </div>
              <div style={{ padding: '0 1.25rem' }}>
                <SjoFlagInputs form={form} onChange={setForm} />
              </div>
              <div className="su-grid">
                <SjoFieldInputs form={form} onChange={setForm} options={sjoOptions} current={invoice.sjoFields} />
              </div>
            </div>
          ) : (
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

            {/* Legacy Salesforce fields (105-field ask) — read-only until a write path exists */}
            {SF_FIELD_GROUPS.map((group) => (
              <React.Fragment key={group.title}>
                <div className="su-section-title">{group.title}</div>
                <div className="su-grid">
                  {group.fields.map(([key, label]) => (
                    <Field key={key} label={label}>
                      <ReadOnly
                        value={
                          group.boolean
                            ? (sfFields[key] ? 'Yes' : 'No')
                            : group.title === 'Legacy Dates'
                              ? formatSfDate(key, sfFields[key])
                              : sfFields[key]
                        }
                      />
                    </Field>
                  ))}
                </div>
              </React.Fragment>
            ))}

            {/* Remaining 17 of the 105 fields — not in sfFields, sourced directly from the base
                invoice response (resolved 2026-11-02, see ../shared/handoffs/frontend.md) */}
            <div className="su-section-title">Invoice Numbers &amp; Totals</div>
            <div className="su-grid">
              <Field label="1° Invoice Number"><ReadOnly value={invoice.firstInvoiceNumber} /></Field>
              <Field label="2° Invoice Number"><ReadOnly value={invoice.secondInvoiceNumber} /></Field>
              <Field label="GP Invoice Number"><ReadOnly value={invoice.formattedInvoiceId} /></Field>
              <Field label="Invoice Id"><ReadOnly value={invoice.id} /></Field>
              <Field label="Credit Note"><ReadOnly value={invoice.creditNote ? 'Yes' : 'No'} /></Field>
              <Field label="Invoice Currency"><ReadOnly value={invoice.currencyCode} /></Field>
              <Field label="Invoice Total">
                <ReadOnly value={invoice.amount ? `$${invoice.amount}` : null} />
              </Field>
            </div>

            <div className="su-section-title">Source Email Details</div>
            <div className="su-grid">
              <Field label="ccAddress"><ReadOnly value={invoice.sourceEmail?.cc?.join(', ')} /></Field>
              <Field label="EmailDescription"><ReadOnly value={invoice.sourceEmail?.body} /></Field>
              <Field label="EmailSubject"><ReadOnly value={invoice.sourceEmail?.subject} /></Field>
              <Field label="toEmailAddress"><ReadOnly value={invoice.sourceEmail?.to?.join(', ')} /></Field>
            </div>

            <div className="su-section-title">Ownership &amp; Audit</div>
            <div className="su-grid">
              <Field label="Created By"><ReadOnly value={invoice.createdBy?.name} /></Field>
              <Field label="CreatedBy Name"><ReadOnly value={invoice.createdBy?.name} /></Field>
              <Field label="Last Modified By"><ReadOnly value={invoice.updatedBy?.name} /></Field>
              <Field label="Last ModifiedBy Name"><ReadOnly value={invoice.updatedBy?.name} /></Field>
              <Field label="Current Owner">
                <ReadOnly value={invoice.assignedUser?.name || invoice.stage?.name} />
              </Field>
              <Field label="IsManual"><ReadOnly value={invoice.isManual ? 'Yes' : 'No'} /></Field>
            </div>

            <div className="su-section-title">Linked Records</div>
            <div className="su-grid">
              <Field label="Attachment ID"><ReadOnly value={invoice.attachments?.[0]?.id} /></Field>
              <Field label="is CCPP Linked">
                <ReadOnly value={invoice.ccpps?.length > 0 ? 'Yes' : 'No'} />
              </Field>
            </div>
          </div>
          )}

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
      )}

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
