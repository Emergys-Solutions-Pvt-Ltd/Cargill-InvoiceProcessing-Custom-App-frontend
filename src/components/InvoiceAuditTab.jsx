import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { apiClient } from '../services/network.service';
import { LanguageContext } from '../context/LanguageContext';
import { formatDateTime, userTimeZone } from '../utils/dateTime';

/*
 * Invoice Details > Audit History (every app): created / updated / deleted events of the invoice, newest first.
 * GET /apps/:appId/invoices/:invoiceId/audit-history -> { data: [{ id, action, changedAt, user, changes }] }.
 * Recorded by a database trigger, so changes from SAP / OnBase sync and the mailbox appear too (user = null: "System").
 */

const ACTION_BADGES = { Created: 'badge-success', Updated: 'badge-info', Deleted: 'badge-danger' };

/** Column name -> label: known fields are translated, others humanized (process_id -> "Process"). */
const FIELD_LABELS = {
  status: ['auditFieldStatus', 'Status'],
  team_id: ['auditFieldStage', 'Stage'],
  process_id: ['auditFieldProcess', 'Process'],
  assigned_user_id: ['auditFieldAssignedUser', 'Assigned user'],
  origin_city_id: ['auditFieldOrigin', 'Origin'],
  destination_city_id: ['auditFieldDestination', 'Destination'],
  claim_number: ['auditFieldClaimNumber', 'Claim number'],
  additional_info: ['auditFieldAdditionalInfo', 'Additional info'],
  amount: ['auditFieldAmount', 'Amount'],
  currency_code: ['auditFieldCurrency', 'Currency'],
  vendor_id: ['auditFieldVendor', 'Vendor'],
  invoice_date: ['auditFieldInvoiceDate', 'Invoice date'],
  reception_date: ['auditFieldReceptionDate', 'Reception date'],
};

const humanize = (field) => {
  const text = field.replace(/_id$/, '').replace(/_/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const InvoiceAuditTab = ({ appId, invoiceId }) => {
  const { t } = useContext(LanguageContext);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/apps/${appId}/invoices/${encodeURIComponent(invoiceId)}/audit-history`);
      setEvents(res.data?.data ?? []);
      setLoadError(null);
    } catch (err) {
      setLoadError(err.response?.data?.message || t('auditLoadFailed', 'Failed to load the audit history'));
    } finally {
      setLoading(false);
    }
  }, [appId, invoiceId, t]);

  useEffect(() => { load(); }, [load]);

  const fieldLabel = (field) => {
    const known = FIELD_LABELS[field];
    return known ? t(known[0], known[1]) : humanize(field);
  };

  const formatValue = (value) => {
    if (value === null || value === undefined || value === '') return <span className="text-(--text-muted)">{t('auditEmpty', '(empty)')}</span>;
    if (value === 'true') return t('yes', 'Yes');
    if (value === 'false') return t('no', 'No');
    return value;
  };

  const actionLabel = (action) =>
    ({ Created: t('auditCreated', 'Created'), Updated: t('auditUpdated', 'Updated'), Deleted: t('auditDeleted', 'Deleted') })[action] || action;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[0.8125rem] text-(--text-secondary)">
          {t('auditHint', 'Every change to this invoice: who made it, when, and which fields changed.')}
        </p>
        <button type="button" className="btn btn-outline" onClick={load} disabled={loading}>
          <RefreshCw size={14} /> {t('refresh', 'Refresh')}
        </button>
      </div>

      {loadError && <div className="form-error">{loadError}</div>}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th className="w-[190px]">{t('auditDateTime', 'Date & time')}</th>
              <th className="w-[110px]">{t('auditAction', 'Action')}</th>
              <th className="w-[200px]">{t('auditUser', 'User')}</th>
              <th>{t('auditChanges', 'Changes')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="p-10 text-center text-(--text-secondary)">{t('loading', 'Loading...')}</td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-10 text-center text-(--text-secondary)">
                  {loadError ? '–' : t('auditNoEvents', 'No changes recorded for this invoice yet.')}
                </td>
              </tr>
            ) : (
              events.map((event) => (
                <tr key={event.id} className="align-top">
                  <td className="whitespace-nowrap" title={userTimeZone()}>{formatDateTime(event.changedAt)}</td>
                  <td>
                    <span className={`badge ${ACTION_BADGES[event.action] || 'badge-neutral'}`}>{actionLabel(event.action)}</span>
                  </td>
                  <td>{event.user?.name || <span className="text-(--text-secondary)">{t('auditSystem', 'System')}</span>}</td>
                  <td>
                    {event.changes?.length ? (
                      <ul className="m-0 flex list-none flex-col gap-1 p-0">
                        {event.changes.map((change) => (
                          <li key={change.field} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem]">
                            <span className="font-semibold text-(--text-primary)">{fieldLabel(change.field)}:</span>
                            <span className="text-(--text-secondary) line-through decoration-[rgba(0,0,0,0.25)]">
                              {formatValue(change.oldValue)}
                            </span>
                            <ArrowRight size={13} className="text-(--text-muted)" aria-label={t('auditChangedTo', 'changed to')} />
                            <span className="text-(--text-primary)">{formatValue(change.newValue)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-(--text-secondary)">
                        {event.action === 'Created'
                          ? t('auditInvoiceCreated', 'Invoice created')
                          : event.action === 'Deleted'
                            ? t('auditInvoiceDeleted', 'Invoice deleted')
                            : '–'}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvoiceAuditTab;
