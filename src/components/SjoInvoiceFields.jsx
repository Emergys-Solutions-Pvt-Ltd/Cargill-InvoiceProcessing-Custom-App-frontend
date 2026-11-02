import React, { useContext, useEffect, useState } from 'react';
import { apiClient } from '../services/network.service';
import { LanguageContext } from '../context/LanguageContext';
import { Field } from './FormField';

/**
 * SJO Invoice Processing fields (Add / Create / Details page):
 *   Invoice ID, Assign To, Flow Turn Down, Critical Vendor, Urgent Invoice,
 *   Country*, BU*, ERP*, ID Fiscal*, A.B. Number, A.B. Name   (* required)
 * Country / BU / ERP come from Settings > Configuration (countries, business-units, erp-systems).
 */
export const isSjoApp = (appId) => String(appId || '').toLowerCase() === 'sjo';

export const SJO_FLAGS = [
  ['flowTurnDown', 'Flow Turn Down'],
  ['criticalVendor', 'Critical Vendor'],
  ['urgentInvoice', 'Urgent Invoice']
];

// [form key, translation key, fallback label]
export const SJO_REQUIRED = [
  ['countryId', 'country', 'Country'],
  ['businessUnitId', 'businessUnit', 'BU'],
  ['erpSystemId', 'erp', 'ERP'],
  ['idFiscal', 'idFiscal', 'ID Fiscal']
];

export const emptySjoForm = () => ({
  countryId: '',
  businessUnitId: '',
  erpSystemId: '',
  idFiscal: '',
  abNumber: '',
  abName: '',
  flowTurnDown: false,
  criticalVendor: false,
  urgentInvoice: false
});

/** Form state from the API's invoice.sjoFields (null when the invoice has none yet). */
export const sjoFormFrom = (sjo) =>
  sjo
    ? {
        countryId: sjo.country?.id ?? '',
        businessUnitId: sjo.businessUnit?.id ?? '',
        erpSystemId: sjo.erpSystem?.id ?? '',
        idFiscal: sjo.idFiscal ?? '',
        abNumber: sjo.abNumber ?? '',
        abName: sjo.abName ?? '',
        flowTurnDown: !!sjo.flowTurnDown,
        criticalVendor: !!sjo.criticalVendor,
        urgentInvoice: !!sjo.urgentInvoice
      }
    : emptySjoForm();

/** Labels of the required fields that are still empty. */
export const missingSjoFields = (form, t) =>
  SJO_REQUIRED.filter(([key]) => String(form[key] ?? '').trim() === '').map(([, tKey, label]) => t(tKey, label));

/** Active Country / BU / ERP options for the dropdowns. */
export const useSjoOptions = (enabled = true) => {
  const [options, setOptions] = useState({ countries: [], businessUnits: [], erpSystems: [] });
  useEffect(() => {
    if (!enabled) return;
    const load = (entity) => apiClient.get(`/master-data/${entity}/options`).then((r) => r.data).catch(() => []);
    Promise.all([load('countries'), load('business-units'), load('erp-systems')]).then(([countries, businessUnits, erpSystems]) =>
      setOptions({ countries, businessUnits, erpSystems })
    );
  }, [enabled]);
  return options;
};

/** Keeps a value that is no longer an active option (e.g. a deactivated country) selectable. */
const withCurrent = (list, current) =>
  current && !list.some((o) => o.id === current.id) ? [current, ...list] : list;

/**
 * Editable SJO fields as Field elements, for a two-column grid (.su-grid or the create modal).
 * `current` = invoice.sjoFields, so inactive saved values still show.
 */
export const SjoFieldInputs = ({ form, onChange, options, current = null }) => {
  const { t } = useContext(LanguageContext);
  const set = (key) => (e) => onChange({ ...form, [key]: e.target.value });
  const select = (key, tKey, label, list) => (
    <Field label={`${t(tKey, label)} *`}>
      <select className="input-field" value={form[key]} onChange={set(key)} required>
        <option value="">--{t('select', 'Select')}--</option>
        {list.map((o) => <option key={o.id} value={o.id}>{o.code && o.code !== o.name ? `${o.name} (${o.code})` : o.name}</option>)}
      </select>
    </Field>
  );
  return (
    <>
      {select('countryId', 'country', 'Country', withCurrent(options.countries, current?.country))}
      {select('businessUnitId', 'businessUnit', 'BU', withCurrent(options.businessUnits, current?.businessUnit))}
      {select('erpSystemId', 'erp', 'ERP', withCurrent(options.erpSystems, current?.erpSystem))}
      <Field label={`${t('idFiscal', 'ID Fiscal')} *`}>
        <input className="input-field" value={form.idFiscal} onChange={set('idFiscal')} maxLength={30} required />
      </Field>
      <Field label={t('abNumber', 'A.B. Number')}>
        <input className="input-field" value={form.abNumber} onChange={set('abNumber')} maxLength={30} />
      </Field>
      <Field label={t('abName', 'A.B. Name')}>
        <input className="input-field" value={form.abName} onChange={set('abName')} maxLength={255} />
      </Field>
    </>
  );
};

/** Flow Turn Down / Critical Vendor / Urgent Invoice checkboxes in one row. */
export const SjoFlagInputs = ({ form, onChange }) => {
  const { t } = useContext(LanguageContext);
  return (
    <div className="sjo-flags">
      {SJO_FLAGS.map(([key, label]) => (
        <label key={key} className="sjo-flag">
          <input
            type="checkbox"
            checked={!!form[key]}
            onChange={(e) => onChange({ ...form, [key]: e.target.checked })}
          />
          {t(key, label)}
        </label>
      ))}
    </div>
  );
};

/** Pills for the flags that are set (Invoices grid). */
export const SjoFlagBadges = ({ sjo }) => {
  const { t } = useContext(LanguageContext);
  if (!sjo) return '-';
  const set = [
    sjo.urgentInvoice && ['urgentInvoice', 'Urgent Invoice', 'danger'],
    sjo.criticalVendor && ['criticalVendor', 'Critical Vendor', 'warning'],
    sjo.flowTurnDown && ['flowTurnDown', 'Flow Turn Down', 'info']
  ].filter(Boolean);
  if (set.length === 0) return '-';
  return (
    <span style={{ display: 'inline-flex', gap: '0.25rem', flexWrap: 'wrap' }}>
      {set.map(([key, label, color]) => (
        <span key={key} className={`badge badge-${color}`} style={{ whiteSpace: 'nowrap' }}>{t(key, label)}</span>
      ))}
    </span>
  );
};
