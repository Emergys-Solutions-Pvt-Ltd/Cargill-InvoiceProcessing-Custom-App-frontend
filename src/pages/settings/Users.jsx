import React, { useState, useEffect, useMemo, useContext } from 'react';
import { apiClient } from '../../services/network.service';
import { AuthContext } from '../../context/AuthContext';
import { LanguageContext } from '../../context/LanguageContext';
import {
  Search, Plus, Pencil, Trash2, CheckCircle, AlertCircle,
  ChevronUp, ChevronDown, ArrowUpDown
} from 'lucide-react';
import { APPS } from '../../utils/appHelper';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pager from '../../components/Pager';

const EMPTY_FORM = { name: '', email: '', role: 'User', status: 'Active', assignedApps: [] };

/** Create / edit user form (name, email, role, status, accessible apps). */
const UserFormModal = ({ user, onClose, onSaved }) => {
  const { t } = useContext(LanguageContext);
  const isEdit = !!user;
  const [form, setForm] = useState(
    isEdit
      ? { name: user.name, email: user.email, role: user.role, status: user.status, assignedApps: user.assignedApps || [] }
      : { ...EMPTY_FORM, assignedApps: ['GP'] }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleApp = (appId) =>
    setForm((prev) => ({
      ...prev,
      assignedApps: prev.assignedApps.includes(appId)
        ? prev.assignedApps.filter((id) => id !== appId)
        : [...prev.assignedApps, appId]
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { name: form.name, email: form.email, role: form.role, assignedApps: form.assignedApps };
      const response = isEdit
        ? await apiClient.put(`/users/${user.id}`, { ...payload, status: form.status })
        : await apiClient.post('/users', payload);
      onSaved(response.data.data, isEdit);
    } catch (err) {
      setError(err.response?.data?.message || (isEdit ? 'Failed to update user' : 'Failed to create user'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? t('editUser', 'Edit User') : t('addNewPlatformUser')} onClose={onClose} width={520}>
      {error && <div className="form-error"><AlertCircle size={15} /> {error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label>{t('userFullName')}</label>
          <input type="text" className="input-field" placeholder="e.g. Maria Corvalan" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="input-group">
          <label>{t('cargillEmail')}</label>
          <input type="email" className="input-field" placeholder="e.g. maria_corvalan@cargill.com" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div className="form-grid">
          <div className="input-group">
            <label>{t('globalRole')}</label>
            <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="User">User</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          {isEdit && (
            <div className="input-group">
              <label>{t('status')}</label>
              <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
          )}
        </div>

        <div className="input-group" style={{ marginBottom: 0 }}>
          <label>{t('assignAccessibleApps', 'Assign Accessible App(s)')}</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {APPS.map((app) => {
              const checked = form.assignedApps.includes(app.id);
              return (
                <label key={app.id} className={`choice-row ${checked ? 'checked' : ''}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleApp(app.id)} />
                  <span style={{ flex: 1 }}>{t(app.nameKey, app.name)}</span>
                  <span className={`badge ${checked ? 'badge-success' : 'badge-neutral'}`}>
                    {checked ? t('granted', 'Granted') : t('noAccess', 'No Access')}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {isEdit ? <Pencil size={15} /> : <Plus size={15} />}
            {isEdit ? t('saveChanges', 'Save Changes') : t('createUser')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

/** Settings > Users: list of platform users with Create / Edit / Delete and Suspend / Activate. */
const Users = () => {
  const { t } = useContext(LanguageContext);
  const { user: currentUser } = useContext(AuthContext);

  // Server-side search / filters / paging
  const [searchQuery, setSearchQuery] = useState('');
  const [filterApp, setFilterApp] = useState('ALL');
  const [filterRole, setFilterRole] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [users, setUsers] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  // Local column sorting of the current page
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');

  const [toast, setToast] = useState(null); // { message, isError }
  const [editing, setEditing] = useState(null); // null | 'new' | user
  const [deleting, setDeleting] = useState(null);
  const [togglingUserId, setTogglingUserId] = useState(null);

  const showToast = (message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), isError ? 5000 : 3000);
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await apiClient.get('/users', {
          params: { search: searchQuery, appFilter: filterApp, roleFilter: filterRole, page, limit }
        });
        setUsers(response.data.data || []);
        setTotalItems(response.data.totalItems || 0);
        setTotalPages(response.data.totalPages || 1);
      } catch (error) {
        console.error('Failed to fetch users', error);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, filterApp, filterRole, page, limit, reloadKey]);

  const handleSort = (columnKey) => {
    if (sortColumn === columnKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const sortedUsers = useMemo(() => {
    if (!sortColumn) return users;
    return [...users].sort((a, b) => {
      const valA = String(a[sortColumn] ?? '').toLowerCase();
      const valB = String(b[sortColumn] ?? '').toLowerCase();
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [users, sortColumn, sortDirection]);

  const renderSortIcon = (columnKey) => {
    if (sortColumn !== columnKey) return <ArrowUpDown size={13} className="sort-icon" style={{ opacity: 0.4 }} />;
    return sortDirection === 'asc' ? <ChevronUp size={13} className="sort-icon" /> : <ChevronDown size={13} className="sort-icon" />;
  };

  const handleToggleUserStatus = async (user) => {
    const newStatus = user.status === 'Active' ? 'Suspended' : 'Active';
    setTogglingUserId(user.id);
    try {
      const response = await apiClient.patch(`/users/${user.id}/status`, { status: newStatus });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? response.data.data : u)));
      showToast(response.data.message);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update user status', true);
    } finally {
      setTogglingUserId(null);
    }
  };

  const handleSaved = (saved, isEdit) => {
    setEditing(null);
    if (isEdit) {
      setUsers((prev) => prev.map((u) => (u.id === saved.id ? saved : u)));
      showToast(`${saved.name} ${t('updated', 'updated')}`);
    } else {
      setReloadKey((k) => k + 1);
      showToast(`${saved.name} ${t('created', 'created')}`);
    }
  };

  const handleDelete = async () => {
    const response = await apiClient.delete(`/users/${deleting.id}`);
    setReloadKey((k) => k + 1);
    showToast(response.data.message);
  };

  const isSelf = (u) => u.id === currentUser?.id;

  return (
    <div>
      <div className="flex-between page-header" style={{ gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">{t('usersMenu', 'Users')}</h1>
          <p className="page-subtitle">{t('usersSubtitle', 'Create, edit and delete platform users and choose which apps they can open.')}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {toast && (
            <span className={`badge ${toast.isError ? 'badge-danger' : 'badge-success'}`} style={{ gap: '0.35rem' }}>
              {toast.isError ? <AlertCircle size={13} /> : <CheckCircle size={13} />} {toast.message}
            </span>
          )}
          <button className="btn btn-primary" onClick={() => setEditing('new')}>
            <Plus size={15} /> {t('addNewUser')}
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div className="flex-between" style={{ marginBottom: '1rem', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 240, maxWidth: 360 }}>
            <input
              type="text"
              className="input-field"
              placeholder={t('searchUserPlaceholder')}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              style={{ paddingLeft: '2.1rem' }}
            />
            <Search size={15} color="var(--text-secondary)" style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <select className="input-field" value={filterApp} onChange={(e) => { setFilterApp(e.target.value); setPage(1); }} style={{ width: 230 }} aria-label="App filter">
              <option value="ALL">{t('allApps')} ({APPS.length})</option>
              {APPS.map((app) => (
                <option key={app.id} value={app.id}>{t(app.nameKey, app.name)}</option>
              ))}
            </select>
            <select className="input-field" value={filterRole} onChange={(e) => { setFilterRole(e.target.value); setPage(1); }} style={{ width: 150 }} aria-label="Role filter">
              <option value="ALL">{t('allRoles')}</option>
              <option value="Admin">Admin</option>
              <option value="User">User</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th className="sortable-header" onClick={() => handleSort('name')}>{t('userName', 'Name')} {renderSortIcon('name')}</th>
                <th className="sortable-header" onClick={() => handleSort('email')}>{t('userEmail', 'Email')} {renderSortIcon('email')}</th>
                <th className="sortable-header" onClick={() => handleSort('role')}>{t('globalRole')} {renderSortIcon('role')}</th>
                <th>{t('accessibleApps')}</th>
                <th className="sortable-header" onClick={() => handleSort('status')}>{t('status')} {renderSortIcon('status')}</th>
                <th style={{ textAlign: 'right' }}>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>{t('loadingUsers')}</td></tr>
              ) : sortedUsers.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td><span className={`badge ${u.role === 'Admin' ? 'badge-success' : 'badge-info'}`}>{u.role}</span></td>
                  <td style={{ maxWidth: 'none' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                      {(u.assignedApps || []).map((appId) => {
                        const app = APPS.find((a) => a.id === appId);
                        return <span key={appId} className="badge badge-neutral">{app ? t(app.nameKey, app.name) : appId}</span>;
                      })}
                      {(!u.assignedApps || u.assignedApps.length === 0) && (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{t('noAppsAssigned')}</span>
                      )}
                    </div>
                  </td>
                  <td><span className={`badge ${u.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>{u.status}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', color: u.status === 'Active' ? 'var(--danger-color)' : 'var(--success-color)' }}
                        onClick={() => handleToggleUserStatus(u)}
                        disabled={togglingUserId === u.id || isSelf(u)}
                      >
                        {u.status === 'Active' ? t('suspend') : t('activate')}
                      </button>
                      <button type="button" className="row-action" title={t('edit', 'Edit')} aria-label={`Edit ${u.name}`} onClick={() => setEditing(u)}>
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="row-action danger"
                        title={isSelf(u) ? t('cannotDeleteSelf', 'You cannot delete your own account') : t('delete', 'Delete')}
                        aria-label={`Delete ${u.name}`}
                        onClick={() => setDeleting(u)}
                        disabled={isSelf(u)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && sortedUsers.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{t('noUsersFound')}</div>
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
      </div>

      {editing && (
        <UserFormModal user={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={handleSaved} />
      )}

      {deleting && (
        <ConfirmDialog
          title={t('deleteUser', 'Delete user')}
          message={t('confirmDeleteUser', 'Delete {name}? Invoices they created and their team history are kept.').replace('{name}', deleting.name)}
          confirmLabel={t('delete', 'Delete')}
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
};

export default Users;
