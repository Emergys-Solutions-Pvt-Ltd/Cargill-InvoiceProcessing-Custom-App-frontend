import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search, AlertCircle, CheckCircle } from 'lucide-react';
import { apiClient } from '../../services/network.service';
import { LanguageContext } from '../../context/LanguageContext';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pager from '../../components/Pager';
import { loadStatuses } from '../../services/statuses';

// Tab titles (the API returns singular labels for messages)
const PLURALS = {
  countries: 'Countries',
  states: 'States',
  cities: 'Cities',
  'business-units': 'Business Units',
  teams: 'Teams (Queues)',
  statuses: 'Statuses',
  processes: 'Processes',
  'erp-systems': 'ERP Systems'
};

const COLORS = ['warning', 'info', 'success', 'danger', 'neutral'];

const pluralKey = (entity) => `config_${entity.replace('-', '_')}`;

/** Add / edit form for one master data item; fields follow the entity definition. */
const ItemFormModal = ({ def, parentDef, item, parentOptions, onClose, onSaved }) => {
  const { t } = useContext(LanguageContext);
  const [form, setForm] = useState({
    code: item?.code ?? '',
    name: item?.name ?? '',
    description: item?.description ?? '',
    parentId: item?.parentId ?? '',
    color: item?.color ?? (def.hasColor ? 'neutral' : null),
    sortOrder: item?.sortOrder ?? 0,
    isActive: item?.isActive ?? true
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      code: form.code.trim() || null,
      name: form.name,
      description: form.description.trim() || null,
      parentId: parentDef ? form.parentId || null : null,
      color: def.hasColor ? form.color : null,
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive
    };
    try {
      const response = item
        ? await apiClient.put(`/master-data/${def.entity}/${item.id}`, payload)
        : await apiClient.post(`/master-data/${def.entity}`, payload);
      onSaved(response.data.data, !!item);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`${item ? t('edit', 'Edit') : t('add', 'Add')} ${def.label.toLowerCase()}`} onClose={onClose} width={520}>
      {error && <div className="form-error"><AlertCircle size={15} /> {error}</div>}
      <form onSubmit={handleSubmit}>
        {parentDef && (
          <div className="input-group">
            <label>{parentDef.label} *</label>
            <select className="input-field" value={form.parentId} onChange={set('parentId')} required>
              <option value="">{t('select', 'Select')}...</option>
              {parentOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="form-grid">
          <div className="input-group">
            <label>{t('code', 'Code')}{def.codeRequired ? ' *' : ''}</label>
            <input className="input-field" value={form.code} onChange={set('code')} maxLength={30} required={def.codeRequired}
              placeholder={def.entity === 'statuses' ? 'e.g. OnHold' : 'e.g. ARG'} />
          </div>
          <div className="input-group">
            <label>{t('nameLabel', 'Name')} *</label>
            <input className="input-field" value={form.name} onChange={set('name')} maxLength={150} required />
          </div>
        </div>
        {def.entity === 'statuses' && (
          <p className="page-subtitle mt-[-0.6rem] mb-4">
            {t('statusCodeHint', 'The code is stored on invoices; renaming it updates existing invoices.')}
          </p>
        )}
        <div className="input-group">
          <label>{t('description', 'Description')}</label>
          <textarea className="input-field resize-y" rows={2} value={form.description} onChange={set('description')} maxLength={500} />
        </div>
        <div className="form-grid">
          {def.hasColor && (
            <div className="input-group">
              <label>{t('pillColor', 'Pill color')}</label>
              <div className="flex gap-2 items-center">
                <select className="input-field" value={form.color} onChange={set('color')}>
                  {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <span className={`badge badge-${form.color}`}>{form.name || 'Preview'}</span>
              </div>
            </div>
          )}
          <div className="input-group">
            <label>{t('sortOrder', 'Sort order')}</label>
            <input type="number" min="0" className="input-field" value={form.sortOrder} onChange={set('sortOrder')} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-[0.8125rem]">
          <input type="checkbox" checked={form.isActive} onChange={set('isActive')} className="accent-(--primary-color) w-[15px] h-[15px]" />
          {t('activeLabel', 'Active (available in dropdowns)')}
        </label>
        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {item ? <Pencil size={15} /> : <Plus size={15} />} {item ? t('saveChanges', 'Save Changes') : t('add', 'Add')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

/**
 * Settings > Configuration: master data lists (countries, states, cities, business units,
 * teams / queues, statuses, processes) with search, paging and add / edit / delete.
 */
const Configuration = () => {
  const { t } = useContext(LanguageContext);
  const { entity: entityParam } = useParams();
  const navigate = useNavigate();

  const [entities, setEntities] = useState([]);
  const def = entities.find((e) => e.entity === entityParam) || entities[0];
  const parentDef = def?.parentEntity ? entities.find((e) => e.entity === def.parentEntity) : null;

  const [search, setSearch] = useState('');
  const [parentFilter, setParentFilter] = useState('');
  const [includeInactive, setIncludeInactive] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [items, setItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [parentOptions, setParentOptions] = useState([]);

  const [editing, setEditing] = useState(null); // null | 'new' | item
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    apiClient.get('/master-data/entities').then((r) => setEntities(r.data)).catch((err) => console.error(err));
  }, []);

  // Reset filters when switching lists
  useEffect(() => {
    setSearch('');
    setParentFilter('');
    setPage(1);
  }, [def?.entity]);

  const parentEntity = parentDef?.entity;
  useEffect(() => {
    if (!parentEntity) {
      setParentOptions([]);
      return;
    }
    apiClient.get(`/master-data/${parentEntity}/options`).then((r) => setParentOptions(r.data)).catch(() => setParentOptions([]));
  }, [parentEntity, reloadKey]);

  useEffect(() => {
    if (!def) return undefined;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await apiClient.get(`/master-data/${def.entity}`, {
          params: { search, parentId: parentFilter || undefined, includeInactive, page, limit }
        });
        setItems(response.data.data);
        setTotalItems(response.data.totalItems);
        setTotalPages(response.data.totalPages);
      } catch (err) {
        console.error(err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [def, search, parentFilter, includeInactive, page, limit, reloadKey]);

  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  }, []);

  const handleSaved = (saved, isEdit) => {
    setEditing(null);
    setReloadKey((k) => k + 1);
    if (def.entity === 'statuses') loadStatuses(true); // invoice filters / pills pick up the change
    showToast(`${saved.name} ${isEdit ? t('updated', 'updated') : t('created', 'created')}`);
  };

  const handleDelete = async () => {
    await apiClient.delete(`/master-data/${def.entity}/${deleting.id}`);
    setReloadKey((k) => k + 1);
    if (def.entity === 'statuses') loadStatuses(true);
    showToast(`${deleting.name} ${t('deleted', 'deleted')}`);
  };

  const tabLabel = (e) => t(pluralKey(e.entity), PLURALS[e.entity] || e.label);

  return (
    <div>
      <div className="flex-between page-header gap-4 flex-wrap">
        <div>
          <h1 className="page-title">{t('configurationMenu', 'Configuration')}</h1>
          <p className="page-subtitle">
            {t('configurationSubtitle', 'Master data used across the apps: locations, business units, team queues, invoice statuses and processes.')}
          </p>
        </div>
        {toast && <span className="badge badge-success gap-[0.35rem]"><CheckCircle size={13} /> {toast}</span>}
      </div>

      <div className="tab-bar overflow-x-auto overflow-y-hidden">
        {entities.map((e) => (
          <button
            key={e.entity}
            type="button"
            className={`tab-link bg-transparent bg-none border-0 border-solid border-b-2 cursor-pointer whitespace-nowrap ${def?.entity === e.entity ? 'active border-b-(--primary-color)' : 'border-b-transparent'}`}
            onClick={() => navigate(`/settings/configuration/${e.entity}`)}
          >
            {tabLabel(e)}
          </button>
        ))}
      </div>

      {def && (
        <div className="glass-panel p-[1.25rem]">
          <div className="flex-between mb-4 gap-3 flex-wrap">
            <div className="flex gap-3 flex-wrap items-center flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-[320px]">
                <input
                  type="text"
                  className="input-field pl-[2.1rem]"
                  placeholder={`${t('search', 'Search')} ${tabLabel(def).toLowerCase()}...`}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
                <Search size={15} color="var(--text-secondary)" className="absolute left-[0.7rem] top-1/2 [transform:translateY(-50%)] pointer-events-none" />
              </div>
              {parentDef && (
                <select className="input-field w-[200px]" value={parentFilter} onChange={(e) => { setParentFilter(e.target.value); setPage(1); }} aria-label={parentDef.label}>
                  <option value="">{t('all', 'All')} {tabLabel(parentDef).toLowerCase()}</option>
                  {parentOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
              <label className="flex items-center gap-[0.4rem] text-[0.8125rem] text-(--text-secondary)">
                <input type="checkbox" checked={includeInactive} onChange={(e) => { setIncludeInactive(e.target.checked); setPage(1); }} className="accent-(--primary-color)" />
                {t('showInactive', 'Show inactive')}
              </label>
            </div>
            <button className="btn btn-primary" onClick={() => setEditing('new')}>
              <Plus size={15} /> {t('add', 'Add')} {def.label.toLowerCase()}
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t('code', 'Code')}</th>
                  <th>{t('nameLabel', 'Name')}</th>
                  {parentDef && <th>{parentDef.label}</th>}
                  {def.hasColor && <th>{t('preview', 'Preview')}</th>}
                  <th>{t('description', 'Description')}</th>
                  <th>{t('sortOrder', 'Order')}</th>
                  <th>{t('status')}</th>
                  <th className="text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" className="text-center p-8 text-(--text-secondary)">{t('loading', 'Loading...')}</td></tr>
                ) : items.map((item) => (
                  <tr key={item.id} className={item.isActive ? 'opacity-100' : 'opacity-60'}>
                    <td className="font-medium">{item.code || '–'}</td>
                    <td>{item.name}</td>
                    {parentDef && <td>{item.parentName}</td>}
                    {def.hasColor && <td><span className={`badge badge-${item.color || 'neutral'}`}>{item.name}</span></td>}
                    <td className="text-(--text-secondary) max-w-[320px]" title={item.description || ''}>{item.description || '–'}</td>
                    <td>{item.sortOrder}</td>
                    <td><span className={`badge ${item.isActive ? 'badge-success' : 'badge-neutral'}`}>{item.isActive ? t('active', 'Active') : t('inactive', 'Inactive')}</span></td>
                    <td className="text-right">
                      <div className="inline-flex gap-[0.35rem]">
                        <button type="button" className="row-action" title={t('edit', 'Edit')} aria-label={`Edit ${item.name}`} onClick={() => setEditing(item)}>
                          <Pencil size={14} />
                        </button>
                        <button type="button" className="row-action danger" title={t('delete', 'Delete')} aria-label={`Delete ${item.name}`} onClick={() => setDeleting(item)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && items.length === 0 && (
              <div className="p-8 text-center text-(--text-secondary)">{t('noRecords', 'No records found')}</div>
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
            sizes={[10, 20, 50]}
          />
        </div>
      )}

      {editing && def && (
        <ItemFormModal
          def={def}
          parentDef={parentDef}
          item={editing === 'new' ? null : editing}
          parentOptions={parentOptions}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      {deleting && def && (
        <ConfirmDialog
          title={`${t('delete', 'Delete')} ${def.label.toLowerCase()}`}
          message={t('confirmDeleteItem', 'Delete "{name}"? Items that are still in use cannot be deleted; deactivate them instead.').replace('{name}', deleting.name)}
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
};

export default Configuration;
