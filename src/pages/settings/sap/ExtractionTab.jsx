import React, { useContext, useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Info, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { LanguageContext } from '../../../context/LanguageContext';
import { useStatuses } from '../../../services/statuses';
import { APPS } from '../../../utils/appHelper';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { Field, ListInput, Toggle, blankProfile, errorsFor, formatDateTime, profileFromTemplate } from './sapUi';

/**
 * 3.3 Invoice extraction: one profile per target application (General Payments, SJO ...), each
 * with its OData query (entity set, $select, $expand, filters, $orderby, paging), incremental
 * field, duplicate key, invoice id template, cancellation rule and field mapping.
 */
const OPERATORS = ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'in', 'startswith'];
const VALUE_TYPES = ['string', 'number', 'boolean', 'date', 'datetime', 'datetimeoffset', 'guid'];
const FILTER_SUGGESTIONS = ['CompanyCode', 'AccountingDocumentType', 'InvoicingParty', 'SupplierInvoiceStatus', 'PostingDate', 'DocumentDate', 'CreationDate'];

const FiltersEditor = ({ filters, onChange, errors }) => {
  const { t } = useContext(LanguageContext);
  const set = (i, patch) => onChange(filters.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  return (
    <div className="input-group">
      <label>{t('sapFilters', 'Extraction filters')} <small className="sap-muted">({t('sapFiltersHint', 'combined with AND - company code, document type, supplier, status, dates...')})</small></label>
      <datalist id="sap-filter-fields">{FILTER_SUGGESTIONS.map((f) => <option key={f} value={f} />)}</datalist>
      {filters.length > 0 && (
        <div className="sap-filter-table">
          <div className="sap-filter-head">
            <span>{t('sapField', 'Field')}</span><span>{t('sapOperator', 'Operator')}</span><span>{t('sapType', 'Type')}</span><span>{t('sapValues', 'Value(s)')}</span><span />
          </div>
          {filters.map((f, i) => (
            <div key={i} className="sap-filter-row">
              <input className="input-field" list="sap-filter-fields" value={f.field} placeholder="CompanyCode" aria-label={t('sapField', 'Field')}
                onChange={(e) => set(i, { field: e.target.value })} />
              <select className="input-field" value={f.operator} aria-label={t('sapOperator', 'Operator')} onChange={(e) => set(i, { operator: e.target.value })}>
                {OPERATORS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <select className="input-field" value={f.type || 'string'} aria-label={t('sapType', 'Type')} onChange={(e) => set(i, { type: e.target.value })}>
                {VALUE_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <ListInput value={f.values} onChange={(v) => set(i, { values: v })} placeholder={f.operator === 'in' ? '1010, 2020' : '1010'} aria-label={t('sapValues', 'Value(s)')} />
              <button type="button" className="row-action danger" aria-label={t('remove', 'Remove')} onClick={() => onChange(filters.filter((_, j) => j !== i))}>
                <Trash2 size={14} />
              </button>
              {Object.entries(errors).filter(([k]) => k.startsWith(`${i}.`) || k === String(i)).map(([k, m]) => (
                <div key={k} className="sap-field-error sap-span-all">{m}</div>
              ))}
            </div>
          ))}
        </div>
      )}
      <div>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => onChange([...filters, { field: '', operator: 'eq', type: 'string', values: [] }])}>
          <Plus size={14} /> {t('sapAddFilter', 'Add filter')}
        </button>
      </div>
    </div>
  );
};

const MappingTable = ({ mapping, onChange, catalog, errors }) => {
  const { t } = useContext(LanguageContext);
  const set = (field, patch) => onChange({ ...mapping, [field]: { ...(mapping[field] || {}), ...patch } });
  return (
    <div className="input-group">
      <label>{t('sapFieldMapping', 'Field mapping')} <small className="sap-muted">({t('sapFieldMappingHint', 'SAP property path, e.g. TaxNumber1 or to_Supplier/TaxNumber1')})</small></label>
      {errors._ && <div className="sap-field-error">{errors._}</div>}
      <div className="table-container">
        <table className="sap-mapping-table">
          <thead>
            <tr>
              <th>{t('sapAppField', 'Application field')}</th>
              <th>{t('sapSapPath', 'SAP field')}</th>
              <th>{t('sapTransform', 'Transform')}</th>
              <th>{t('sapConstant', 'Constant / default')}</th>
            </tr>
          </thead>
          <tbody>
            {catalog.canonicalFields.map((f) => {
              const rule = mapping[f.name] || {};
              const err = errors[f.name] || errors[`${f.name}.path`];
              return (
                <tr key={f.name} className={err ? 'has-error' : ''}>
                  <td>
                    {t(`sapField_${f.name}`, f.label)}
                    {f.required && <span className="sap-required"> *</span>}
                    {err && <div className="sap-field-error">{err}</div>}
                  </td>
                  <td>
                    <input className="input-field" value={rule.path || ''} placeholder="—" aria-label={`${f.label} SAP field`}
                      onChange={(e) => set(f.name, { path: e.target.value })} />
                  </td>
                  <td>
                    <select className="input-field" value={rule.transform || ''} aria-label={`${f.label} transform`} onChange={(e) => set(f.name, { transform: e.target.value || undefined })}>
                      <option value="">{t('sapAuto', 'Automatic')}</option>
                      {catalog.transforms.map((tr) => <option key={tr} value={tr}>{tr}</option>)}
                    </select>
                  </td>
                  <td>
                    <input className="input-field" value={rule.constant ?? ''} placeholder="—" aria-label={`${f.label} constant`}
                      onChange={(e) => set(f.name, { constant: e.target.value })} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ProfileEditor = ({ profile, index, onChange, onRemove, catalog, fieldErrors, statuses, onResetCursor, template }) => {
  const { t } = useContext(LanguageContext);
  const [open, setOpen] = useState(!profile.id);
  const s = profile.settings || {};
  const prefix = `profiles.${index}`;
  const e = errorsFor(fieldErrors, prefix);
  const se = errorsFor(fieldErrors, `${prefix}.settings`);
  const errorCount = Object.keys(e).length;
  const setSettings = (patch) => onChange({ ...profile, settings: { ...s, ...patch } });
  const rule = profile.cancellationRule;
  const setRule = (patch) => onChange({ ...profile, cancellationRule: { ...rule, ...patch } });
  const app = APPS.find((a) => a.id === profile.moduleSlug);

  return (
    <div className={`glass-panel sap-profile ${errorCount ? 'has-error' : ''}`}>
      <div className="sap-profile-header">
        <button type="button" className="sap-profile-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <strong>{profile.name || t('sapNewProfile', 'New profile')}</strong>
          <span className="badge badge-info">→ {app ? t(app.nameKey, app.name) : profile.moduleSlug}</span>
          {!profile.isActive && <span className="badge badge-neutral">{t('inactive', 'Inactive')}</span>}
          {errorCount > 0 && <span className="badge badge-danger">{errorCount} {t('sapIssues', 'issue(s)')}</span>}
        </button>
        <div className="sap-profile-meta">
          {profile.id && (
            <span title={t('sapCursorHint', 'Incremental cursor: changes after this time are read on the next run')}>
              {t('sapCursor', 'Cursor')}: {formatDateTime(profile.cursor?.watermark)}
            </span>
          )}
          {profile.id && (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => onResetCursor(profile)} title={t('sapResetCursorHint', 'Re-read everything from the initial date on the next run (no duplicates are created)')}>
              <RotateCcw size={13} /> {t('sapResetCursor', 'Full re-sync')}
            </button>
          )}
          <button type="button" className="row-action danger" aria-label={t('remove', 'Remove')} onClick={onRemove}><Trash2 size={14} /></button>
        </div>
      </div>

      {open && (
        <div className="sap-profile-body">
          {template?.notes?.length > 0 && (
            <div className="sap-template-notes">
              <Info size={15} />
              <ul>{template.notes.map((n) => <li key={n}>{n}</li>)}</ul>
            </div>
          )}
          <div className="form-grid sap-grid-3">
            <Field label={t('sapProfileName', 'Profile name')} required error={e.name}>
              <input className="input-field" value={profile.name} maxLength={100} onChange={(ev) => onChange({ ...profile, name: ev.target.value })} />
            </Field>
            <Field label={t('sapTargetApp', 'Target application')} required error={e.moduleSlug}
              hint={t('sapTargetAppHint', 'Synchronized invoices appear in this application')}>
              <select className="input-field" value={profile.moduleSlug} onChange={(ev) => onChange({ ...profile, moduleSlug: ev.target.value })}>
                {APPS.map((a) => <option key={a.id} value={a.id}>{t(a.nameKey, a.name)}</option>)}
              </select>
            </Field>
            <div className="input-group">
              <label>{t('status', 'Status')}</label>
              <Toggle checked={profile.isActive} onChange={(v) => onChange({ ...profile, isActive: v })} label={profile.isActive ? t('active', 'Active') : t('inactive', 'Inactive')} />
            </div>
          </div>

          <h4 className="sap-subheading">{t('sapODataQuery', 'OData query')}</h4>
          <div className="form-grid sap-grid-3">
            <Field label={t('sapEntitySet', 'Entity set')} required error={se.entitySet}>
              <input className="input-field" value={s.entitySet || ''} placeholder="A_SupplierInvoice" onChange={(ev) => setSettings({ entitySet: ev.target.value })} />
            </Field>
            <Field label="$select" error={se.select} hint={t('sapSelectHint', 'Empty = all properties')}>
              <input className="input-field" value={s.select || ''} placeholder="SupplierInvoice,FiscalYear,..." onChange={(ev) => setSettings({ select: ev.target.value })} />
            </Field>
            <Field label="$expand" error={se.expand}>
              <input className="input-field" value={s.expand || ''} placeholder="to_Supplier" onChange={(ev) => setSettings({ expand: ev.target.value })} />
            </Field>
          </div>
          <FiltersEditor filters={s.filters || []} onChange={(filters) => setSettings({ filters })} errors={errorsFor(fieldErrors, `${prefix}.settings.filters`)} />
          <div className="form-grid">
            <Field label={`${t('sapCustomFilter', 'Advanced $filter')}`} error={se.customFilter} hint={t('sapCustomFilterHint', 'Raw OData expression added with AND, e.g. InvoiceGrossAmount gt 0')}>
              <input className="input-field" value={s.customFilter || ''} onChange={(ev) => setSettings({ customFilter: ev.target.value })} />
            </Field>
            <Field label="$orderby" error={se.orderBy} hint={s.incrementalField ? t('sapOrderByIncremental', 'Ignored: incremental profiles read by change time') : t('sapOrderByHint', 'Default: key fields ascending')}>
              <input className="input-field" value={s.orderBy || ''} disabled={!!s.incrementalField} placeholder="PostingDate asc" onChange={(ev) => setSettings({ orderBy: ev.target.value })} />
            </Field>
          </div>
          <div className="form-grid sap-grid-3">
            <Field label={t('sapProfilePageSize', 'Page size ($top)')} error={se.pageSize} hint={t('sapPageSizeHint', 'Empty = connection default')}>
              <input className="input-field" type="number" min={1} max={5000} value={s.pageSize ?? ''} onChange={(ev) => setSettings({ pageSize: ev.target.value })} />
            </Field>
            <Field label={t('sapMaxRecords', 'Max. records per run')} error={se.maxRecordsPerRun} hint={t('sapMaxRecordsHint', 'Optional; the next run continues from the cursor')}>
              <input className="input-field" type="number" min={1} value={s.maxRecordsPerRun ?? ''} onChange={(ev) => setSettings({ maxRecordsPerRun: ev.target.value })} />
            </Field>
            <Field label={t('sapDefaultStatus', 'Status of new invoices')} error={e.defaultStatus}>
              <select className="input-field" value={profile.defaultStatus} onChange={(ev) => onChange({ ...profile, defaultStatus: ev.target.value })}>
                {statuses.map((st) => <option key={st.code} value={st.code}>{st.name}</option>)}
              </select>
            </Field>
          </div>

          <h4 className="sap-subheading">{t('sapIncremental', 'Incremental synchronization')}</h4>
          <div className="form-grid sap-grid-4">
            <Field label={t('sapIncrementalField', 'Change timestamp field')} error={se.incrementalField} hint={t('sapIncrementalFieldHint', 'Empty = full extraction each run')}>
              <input className="input-field" value={s.incrementalField || ''} placeholder="LastChangeDateTime" onChange={(ev) => setSettings({ incrementalField: ev.target.value })} />
            </Field>
            <Field label={t('sapIncrementalType', 'Field type')} error={se.incrementalFieldType}>
              <select className="input-field" value={s.incrementalFieldType || 'DateTimeOffset'} disabled={!s.incrementalField} onChange={(ev) => setSettings({ incrementalFieldType: ev.target.value })}>
                {['DateTimeOffset', 'DateTime', 'Date', 'TimestampDecimal'].map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label={t('sapOverlap', 'Overlap (minutes)')} error={se.overlapMinutes} hint={t('sapOverlapHint', 'Re-read window before the cursor')}>
              <input className="input-field" type="number" min={0} max={10080} value={s.overlapMinutes ?? 5} disabled={!s.incrementalField} onChange={(ev) => setSettings({ overlapMinutes: ev.target.value })} />
            </Field>
            <Field label={t('sapInitialFrom', 'Initial sync from')} error={e.initialFrom} hint={t('sapInitialFromHint', 'First run starts here')}>
              <input className="input-field" type="date" value={profile.initialFrom ? profile.initialFrom.slice(0, 10) : ''}
                onChange={(ev) => onChange({ ...profile, initialFrom: ev.target.value ? `${ev.target.value}T00:00:00.000Z` : null })} />
            </Field>
          </div>

          <h4 className="sap-subheading">{t('sapIdentity', 'Duplicate prevention and invoice id')}</h4>
          <div className="form-grid">
            <Field label={t('sapKeyFields', 'Key fields')} required error={e.keyFields || e['keyFields.0']} hint={t('sapKeyFieldsHint', 'Uniquely identify a document in SAP (comma separated)')}>
              <ListInput value={profile.keyFields} onChange={(v) => onChange({ ...profile, keyFields: v })} placeholder="CompanyCode, FiscalYear, SupplierInvoice" />
            </Field>
            <Field label={t('sapInvoiceIdTemplate', 'Invoice id template')} required error={e.invoiceCodeTemplate}
              hint={t('sapInvoiceIdTemplateHint', '{prefix} = application prefix; {Field} = SAP value; max 60 characters')}>
              <input className="input-field" value={profile.invoiceCodeTemplate} onChange={(ev) => onChange({ ...profile, invoiceCodeTemplate: ev.target.value })} />
            </Field>
          </div>

          <h4 className="sap-subheading">{t('sapCancellation', 'Reversed / cancelled invoices')}</h4>
          <Toggle
            checked={!!rule}
            onChange={(on) => onChange({ ...profile, cancellationRule: on ? { field: 'ReverseDocument', operator: 'notEmpty', values: [], setStatus: 'Rejected', onlyWhenStatusIn: ['Pending'] } : null })}
            label={t('sapDetectCancellation', 'Detect reversals in SAP')}
          />
          {rule && (
            <div className="form-grid sap-grid-4" style={{ marginTop: '0.75rem' }}>
              <Field label={t('sapField', 'Field')} error={errorsFor(fieldErrors, `${prefix}.cancellationRule`).field}>
                <input className="input-field" value={rule.field || ''} onChange={(ev) => setRule({ field: ev.target.value })} />
              </Field>
              <Field label={t('sapCondition', 'Condition')}>
                <select className="input-field" value={rule.operator} onChange={(ev) => setRule({ operator: ev.target.value })}>
                  <option value="notEmpty">{t('sapOpNotEmpty', 'is not empty')}</option>
                  <option value="isTrue">{t('sapOpIsTrue', 'is true / X')}</option>
                  <option value="in">{t('sapOpIn', 'is one of')}</option>
                  <option value="notEquals">{t('sapOpNotEquals', 'is not one of')}</option>
                </select>
              </Field>
              <Field label={t('sapValues', 'Value(s)')} error={errorsFor(fieldErrors, `${prefix}.cancellationRule`).values}>
                <ListInput value={rule.values || []} onChange={(v) => setRule({ values: v })} disabled={['notEmpty', 'isTrue'].includes(rule.operator)} />
              </Field>
              <Field label={t('sapSetStatus', 'Set status to')} hint={t('sapSetStatusHint', 'Only while the invoice is Pending; otherwise flagged for review')}>
                <select className="input-field" value={rule.setStatus || 'Rejected'} onChange={(ev) => setRule({ setStatus: ev.target.value })}>
                  {statuses.map((st) => <option key={st.code} value={st.code}>{st.name}</option>)}
                </select>
              </Field>
            </div>
          )}

          <MappingTable mapping={profile.fieldMapping || {}} onChange={(fieldMapping) => onChange({ ...profile, fieldMapping })} catalog={catalog}
            errors={errorsFor(fieldErrors, `${prefix}.fieldMapping`)} />
        </div>
      )}
    </div>
  );
};

const ExtractionTab = ({ form, update, fieldErrors, catalog, onResetCursor }) => {
  const { t } = useContext(LanguageContext);
  const statuses = useStatuses();
  const [resetting, setResetting] = useState(null);
  const provider = catalog.providers.find((p) => p.type === form.providerType);
  const templates = provider?.templates || [];
  const setProfiles = (profiles) => update({ profiles });

  return (
    <div className="sap-tab">
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <p className="sap-muted" style={{ margin: 0, maxWidth: 640 }}>
          {t('sapExtractionIntro', 'Each profile extracts one kind of SAP document into one application. The same SAP document is never imported twice, even if two profiles match it.')}
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {templates.map((tpl) => (
            <button key={tpl.id} type="button" className="btn btn-outline" onClick={() => setProfiles([...form.profiles, profileFromTemplate(tpl)])} title={tpl.description}>
              <Copy size={14} /> {tpl.name}
            </button>
          ))}
          <button type="button" className="btn btn-outline" onClick={() => setProfiles([...form.profiles, blankProfile()])}>
            <Plus size={14} /> {t('sapBlankProfile', 'Blank profile')}
          </button>
        </div>
      </div>
      {fieldErrors.profiles && <div className="form-error">{fieldErrors.profiles[0]}</div>}
      {form.profiles.length === 0 && (
        <div className="glass-panel sap-empty sap-empty-sm">{t('sapNoProfiles', 'No extraction profile yet. Start from the General Payments or SJO template.')}</div>
      )}
      {form.profiles.map((p, i) => (
        <ProfileEditor
          key={p.id ?? `new-${i}`}
          profile={p}
          index={i}
          catalog={catalog}
          statuses={statuses}
          fieldErrors={fieldErrors}
          template={templates.find((tpl) => tpl.id === p.templateId)}
          onChange={(next) => setProfiles(form.profiles.map((x, j) => (j === i ? next : x)))}
          onRemove={() => setProfiles(form.profiles.filter((_, j) => j !== i))}
          onResetCursor={setResetting}
        />
      ))}
      {resetting && (
        <ConfirmDialog
          title={t('sapResetCursor', 'Full re-sync')}
          message={t('sapResetCursorConfirm', 'The next run of "{name}" re-reads SAP from its initial date. Existing invoices are not duplicated; unchanged ones are skipped.').replace('{name}', resetting.name)}
          confirmLabel={t('sapResetCursor', 'Full re-sync')}
          onConfirm={() => onResetCursor(resetting)}
          onClose={() => setResetting(null)}
        />
      )}
    </div>
  );
};

export default ExtractionTab;
