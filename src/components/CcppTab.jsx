import React, { useCallback, useContext, useEffect, useImperativeHandle, useState } from 'react';
import { ChevronDown, ChevronRight, Edit2, Save, X, CheckCircle, AlertCircle } from 'lucide-react';
import { apiClient } from '../services/network.service';
import { LanguageContext } from '../context/LanguageContext';
import { Field, ReadOnly } from './FormField';
import Modal from './Modal';

// Numeric fields render with type="number" inputs; everything else in CCPP_GROUPS is text.
// closedAmount/matchedAmount are SF "Text" fields despite the name - kept as text on purpose.
const NUMBER_FIELDS = new Set([
  'value', 'km', 'tons', 'unitRate', 'kmFc', 'tonsFc',
  'closedQuantity', 'pendingQuantity', 'totalQuantity',
  'lineAmount', 'pendingAmount', 'orderTotalAmount', 'line'
]);

// Full 55-field GP CCPP export (../shared/handoffs/database.md, 2026-11-02), grouped. Matches
// CcppDetail/CcppInput in ../../shared/api-contract.json. createdBy/updatedBy are server-managed
// (not in CcppInput) and rendered separately, always read-only.
const CCPP_GROUPS = [
  {
    title: 'Identification',
    fields: [
      ['product', 'Product'],
      ['status', 'Status'],
      ['name', 'GP CCPP Name'],
      ['uniqueCcpp', 'UniqueCCPP'],
      ['line', 'Line'],
      ['cuit', 'CUIT'],
      ['status1', 'Estado 1'],
      ['status2', 'Estado 2'],
      ['legalDocIssuer', 'Legal Doc Issuer']
    ]
  },
  {
    title: 'Legacy Codes & References',
    fields: [
      ['thirdJurisdiction', '3rd Jurisdiction'],
      ['ab', 'AB'],
      ['aux', 'Auxiliary'],
      ['bp', 'BP'],
      ['cc', 'CC'],
      ['cia', 'CIA'],
      ['gcia', 'GCIA'],
      ['account', 'Account'],
      ['matching', 'Cotejo'],
      ['withholdingCode', 'Withholding Code'],
      ['withholdingConcept', 'Withholding Concept'],
      ['ownerLegacyId', 'Owner'],
      ['userLegacyId', 'User']
    ]
  },
  {
    title: 'Quantities & Amounts',
    fields: [
      ['value', 'Value'],
      ['km', 'Km'],
      ['tons', 'Tons'],
      ['unitRate', 'Unit Rate'],
      ['kmFc', 'Km FC'],
      ['tonsFc', 'Tons FC'],
      ['closedQuantity', 'Closed Quantity'],
      ['pendingQuantity', 'Pending Quantity'],
      ['totalQuantity', 'Total Quantity'],
      ['closedAmount', 'Closed Amount'],
      ['lineAmount', 'Line Amount'],
      ['matchedAmount', 'Matched Amount'],
      ['pendingAmount', 'Pending Amount'],
      ['orderTotalAmount', 'Order Total Amount'],
      ['currency', 'Currency'],
      ['vat', 'VAT']
    ]
  },
  {
    title: 'Order & Receipt',
    fields: [
      ['orderNumber', 'Order Number'],
      ['orderType', 'Order Type'],
      ['receiptNumber', 'Receipt Number'],
      ['receiptType', 'Receipt Type'],
      ['receiptDate', 'Receipt Date'],
      ['takeLine', 'Take Line']
    ]
  },
  {
    title: 'Tax & Jurisdiction',
    fields: [
      ['iibbDestination', 'IIBB Destination'],
      ['iibbOrigin', 'IIBB Origin'],
      ['municipality', 'Municipality'],
      ['province', 'Province'],
      ['fiscalZone', 'Fiscal Zone'],
      ['taxArea', 'Tax Area'],
      ['originDestinationDrei', 'Origin-Destination-DREI'],
      ['suss', 'SUSS']
    ]
  },
  {
    title: 'Legacy Codes (PR)',
    fields: [
      ['praclo', 'PRACLO'],
      ['praptd', 'PRAPTD'],
      ['prdgl', 'PRDGL'],
      ['pruorg', 'PRUORG']
    ]
  },
  {
    title: 'Notes',
    fields: [
      ['lineDescription', 'Line Description'],
      ['receiptDetail', 'Receipt Detail'],
      ['observation', 'Observation']
    ]
  }
];

const toEditForm = (detail) => {
  const form = {};
  CCPP_GROUPS.forEach((g) => g.fields.forEach(([key]) => { form[key] = detail?.[key] ?? ''; }));
  return form;
};

const toListItem = (detail) => ({
  id: detail.id,
  name: detail.name,
  cuit: detail.cuit,
  currency: detail.currency,
  orderTotalAmount: detail.orderTotalAmount,
  pendingAmount: detail.pendingAmount,
  orderNumber: detail.orderNumber,
  status1: detail.status1
});

/** Renders one CCPP field group, either read-only or as inputs bound to `form`/`onChange`. */
const GroupFields = ({ group, editing, data, form, onChange }) => (
  <React.Fragment>
    <div className="su-section-title">{group.title}</div>
    <div className="su-grid">
      {group.fields.map(([key, label]) => (
        <Field key={key} label={label}>
          {editing ? (
            <input
              type={NUMBER_FIELDS.has(key) ? 'number' : 'text'}
              step={NUMBER_FIELDS.has(key) ? '0.01' : undefined}
              className="input-field"
              value={form[key] ?? ''}
              onChange={(e) => onChange(key, e.target.value)}
            />
          ) : (
            <ReadOnly value={data?.[key]} />
          )}
        </Field>
      ))}
    </div>
  </React.Fragment>
);

/** Inline expanded detail for one CCPP row: read-only view with an Edit toggle, or an edit form. */
const CcppDetailPanel = ({ detail, editing, form, onChange, onEdit, onCancel, onSave, saving }) => {
  const { t } = useContext(LanguageContext);
  if (!detail) return <div style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{t('loading', 'Loading...')}</div>;

  return (
    <div>
      {CCPP_GROUPS.map((group) => (
        <GroupFields key={group.title} group={group} editing={editing} data={detail} form={form} onChange={onChange} />
      ))}

      <div className="su-section-title">Audit</div>
      <div className="su-grid">
        <Field label="Created By"><ReadOnly value={detail.createdBy?.name} /></Field>
        <Field label="Last Modified By"><ReadOnly value={detail.updatedBy?.name} /></Field>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
        {editing ? (
          <React.Fragment>
            <button type="button" className="btn btn-primary" onClick={onSave} disabled={saving}>
              <Save size={15} /> {saving ? t('saving', 'Saving...') : t('save', 'Save')}
            </button>
            <button type="button" className="btn btn-outline" onClick={onCancel} disabled={saving}>
              <X size={15} /> {t('cancel', 'Cancel')}
            </button>
          </React.Fragment>
        ) : (
          <button type="button" className="btn btn-outline" onClick={onEdit}>
            <Edit2 size={15} /> {t('edit', 'Edit')}
          </button>
        )}
      </div>
    </div>
  );
};

/** CCPP tab: condensed list of CCPP records linked to this invoice, row-expand for full detail. */
// GPP only: CCPP rows live in the General Payments invoice tables (/apps/:appId/invoices/:invoiceId/ccpp)
const CcppTab = React.forwardRef(({ appId, invoiceId }, ref) => {
  const base = `/apps/${appId}/invoices/${encodeURIComponent(invoiceId)}/ccpp`;
  const { t } = useContext(LanguageContext);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [notice, setNotice] = useState(null);

  const [expandedId, setExpandedId] = useState(null);
  const [detailCache, setDetailCache] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(() => toEditForm(null));

  const showNotice = (ok, message) => {
    setNotice({ ok, message });
    setTimeout(() => setNotice(null), ok ? 3500 : 6000);
  };

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(base);
      setRows(res.data);
      setLoadError(null);
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Failed to load CCPP records');
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => { loadList(); }, [loadList]);

  const loadDetail = async (id) => {
    const res = await apiClient.get(`${base}/${id}`);
    setDetailCache((c) => ({ ...c, [id]: res.data }));
    return res.data;
  };

  const toggleExpand = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      setEditingId(null);
      return;
    }
    setExpandedId(id);
    setEditingId(null);
    if (!detailCache[id]) await loadDetail(id);
  };

  const startEdit = () => {
    setEditForm(toEditForm(detailCache[expandedId]));
    setEditingId(expandedId);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const cleanBody = (form) => {
    const body = { ...form };
    Object.keys(body).forEach((k) => { if (body[k] === '') body[k] = null; });
    return body;
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const res = await apiClient.put(`${base}/${editingId}`, cleanBody(editForm));
      const updated = res.data.data;
      setDetailCache((c) => ({ ...c, [editingId]: updated }));
      setRows((r) => r.map((row) => (row.id === editingId ? toListItem(updated) : row)));
      setEditingId(null);
      showNotice(true, 'CCPP record updated');
    } catch (err) {
      showNotice(false, err.response?.data?.message || 'Failed to save the CCPP record');
    } finally {
      setSaving(false);
    }
  };

  const openAdd = () => {
    setAddForm(toEditForm(null));
    setShowAddModal(true);
  };

  useImperativeHandle(ref, () => ({ openAdd }));

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await apiClient.post(base, cleanBody(addForm));
      const created = res.data.data;
      setRows((r) => [...r, toListItem(created)]);
      setDetailCache((c) => ({ ...c, [created.id]: created }));
      setShowAddModal(false);
      showNotice(true, 'CCPP record added');
    } catch (err) {
      showNotice(false, err.response?.data?.message || 'Failed to add the CCPP record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {notice && (
        <div className={notice.ok ? 'form-success' : 'form-error'} style={{ margin: '0 0 0.75rem' }}>
          {notice.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />} {notice.message}
        </div>
      )}

      {loadError && <div className="form-error">{loadError}</div>}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th />
              <th>GP CCPP Name</th>
              <th>CUIT</th>
              <th>Currency</th>
              <th>Order Total Amount</th>
              <th>Pending Amount</th>
              <th>Order Number</th>
              <th>Estado 1</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                  {t('loading', 'Loading...')}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                  {t('noCcppRecords', 'No CCPP records linked to this invoice.')}
                </td>
              </tr>
            ) : rows.map((row) => (
              <React.Fragment key={row.id}>
                <tr className="cell-link" onClick={() => toggleExpand(row.id)} style={{ cursor: 'pointer' }}>
                  <td>{expandedId === row.id ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</td>
                  <td>{row.name || '–'}</td>
                  <td>{row.cuit || '–'}</td>
                  <td>{row.currency || '–'}</td>
                  <td>{row.orderTotalAmount != null ? `$${row.orderTotalAmount}` : '–'}</td>
                  <td>{row.pendingAmount != null ? `$${row.pendingAmount}` : '–'}</td>
                  <td>{row.orderNumber || '–'}</td>
                  <td>{row.status1 || '–'}</td>
                </tr>
                {expandedId === row.id && (
                  <tr>
                    <td colSpan={8} style={{ background: 'var(--bg-secondary, #f6f7f8)', padding: '1rem 1.25rem' }}>
                      <CcppDetailPanel
                        detail={detailCache[row.id]}
                        editing={editingId === row.id}
                        form={editForm}
                        onChange={(key, value) => setEditForm((f) => ({ ...f, [key]: value }))}
                        onEdit={startEdit}
                        onCancel={cancelEdit}
                        onSave={handleSaveEdit}
                        saving={saving}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <Modal title={t('addCcppEntry', 'Add New Entry')} onClose={() => setShowAddModal(false)} width={720}>
          <div style={{ padding: '1rem', maxHeight: '70vh', overflowY: 'auto' }}>
            {CCPP_GROUPS.map((group) => (
              <GroupFields
                key={group.title}
                group={group}
                editing
                form={addForm}
                onChange={(key, value) => setAddForm((f) => ({ ...f, [key]: value }))}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', padding: '0 1rem 1rem' }}>
            <button type="button" className="btn btn-primary" onClick={handleCreate} disabled={saving || !addForm.product || !addForm.status}>
              <Save size={15} /> {saving ? t('saving', 'Saving...') : t('save', 'Save')}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)} disabled={saving}>
              <X size={15} /> {t('cancel', 'Cancel')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
});

export default CcppTab;
