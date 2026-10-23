import React, { useState, useEffect, useMemo, useContext, useRef } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { apiClient } from '../../services/network.service';
import { LanguageContext } from '../../context/LanguageContext';
import {
  Search, UserPlus, UserMinus, AlertCircle, CheckCircle,
  ChevronUp, ChevronDown, ArrowUpDown
} from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pager from '../../components/Pager';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Team Assignment panel for one app (layout of the reference screen):
 *   [Team ▾] [Search...]                       [user lookup 🔍] [Add Member] [Remove Member]
 *   ☐ | User Name | User Email | Alias
 * The team dropdown picks the queue being managed; Add Member puts the looked-up user in it,
 * Remove Member takes the ticked users out. Teams come from Settings > Configuration > Teams.
 */
const TeamAssignment = ({ appId: appIdProp }) => {
  const params = useParams();
  const outletContext = useOutletContext() || {};
  const appId = appIdProp || params.appId || outletContext.appId;
  const { t } = useContext(LanguageContext);

  const [teams, setTeams] = useState([]);
  const [team, setTeam] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [members, setMembers] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showRemove, setShowRemove] = useState(false);
  const [notice, setNotice] = useState(null); // { ok, message }

  // User lookup for Add Member
  const [lookup, setLookup] = useState('');
  const [lookupResults, setLookupResults] = useState([]);
  const [pickedUser, setPickedUser] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [adding, setAdding] = useState(false);
  const lookupRef = useRef(null);

  const showNotice = (ok, message) => {
    setNotice({ ok, message });
    setTimeout(() => setNotice(null), ok ? 3500 : 6000);
  };

  // Teams (queues) for the dropdown; the first one is selected
  useEffect(() => {
    if (!appId) return;
    apiClient
      .get(`/apps/${appId}/config`, { params: { limit: 1 } })
      .then((response) => {
        const list = response.data.teams || [];
        setTeams(list);
        setTeam((current) => (current && list.includes(current) ? current : list[0] || ''));
      })
      .catch((err) => console.error('Failed to load teams', err));
  }, [appId]);

  // Members of the selected team
  useEffect(() => {
    if (!appId || !team) return undefined;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await apiClient.get(`/apps/${appId}/config`, { params: { team, search, page, limit } });
        setMembers(response.data.users || []);
        setTotalItems(response.data.totalItems || 0);
        setTotalPages(response.data.totalPages || 1);
        setSelectedIds([]);
      } catch (error) {
        console.error('Failed to fetch team members', error);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [appId, team, search, page, limit, reloadKey]);

  // Platform user lookup while typing in the Add Member box
  useEffect(() => {
    if (!showResults || lookup.trim().length < 2) {
      setLookupResults([]);
      return undefined;
    }
    const timer = setTimeout(async () => {
      try {
        const response = await apiClient.get('/users', { params: { search: lookup.trim(), limit: 8, page: 1 } });
        setLookupResults(response.data.data || []);
      } catch {
        setLookupResults([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [lookup, showResults]);

  // Close the lookup list when clicking elsewhere
  useEffect(() => {
    const onClick = (e) => {
      if (lookupRef.current && !lookupRef.current.contains(e.target)) setShowResults(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const pickUser = (user) => {
    setPickedUser(user);
    setLookup(user.email);
    setShowResults(false);
  };

  const handleAdd = async () => {
    // A user picked from the lookup, or a typed email (name taken from the address)
    const typed = lookup.trim();
    const member = pickedUser && pickedUser.email === typed
      ? { name: pickedUser.name, email: pickedUser.email }
      : EMAIL.test(typed)
        ? { name: typed.split('@')[0].replace(/[._]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), email: typed }
        : null;
    if (!member) {
      showNotice(false, t('pickUserFirst', 'Look up a user (or type an email) before adding.'));
      return;
    }
    setAdding(true);
    try {
      const response = await apiClient.post(`/apps/${appId}/config/members`, { ...member, team });
      showNotice(true, `${response.data.data.name} ${t('addedTo', 'added to')} ${team}`);
      setLookup('');
      setPickedUser(null);
      setReloadKey((k) => k + 1);
    } catch (error) {
      showNotice(false, error.response?.data?.message || 'Failed to add member');
    } finally {
      setAdding(false);
    }
  };

  const removeSelected = async () => {
    const response = await apiClient.delete(`/apps/${appId}/config/members`, { data: { ids: selectedIds } });
    setReloadKey((k) => k + 1);
    showNotice(true, response.data.message);
  };

  const handleSort = (columnKey) => {
    if (sortColumn === columnKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const sortedMembers = useMemo(() => {
    if (!sortColumn) return members;
    return [...members].sort((a, b) => {
      const valA = String(a[sortColumn] ?? '').toLowerCase();
      const valB = String(b[sortColumn] ?? '').toLowerCase();
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [members, sortColumn, sortDirection]);

  const renderSortIcon = (columnKey) => {
    if (sortColumn !== columnKey) return <ArrowUpDown size={13} className="sort-icon" style={{ opacity: 0.4 }} />;
    return sortDirection === 'asc' ? <ChevronUp size={13} className="sort-icon" /> : <ChevronDown size={13} className="sort-icon" />;
  };

  const isAllSelected = sortedMembers.length > 0 && sortedMembers.every((m) => selectedIds.includes(m.id));
  const toggleAll = (checked) => setSelectedIds(checked ? sortedMembers.map((m) => m.id) : []);
  const toggleOne = (id) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));

  return (
    <div className="glass-panel" style={{ padding: '1.25rem' }}>
      {/* Toolbar: team + search on the left, user lookup + Add / Remove on the right */}
      <div className="team-toolbar">
        <div className="team-toolbar-left">
          <select
            className="input-field"
            value={team}
            onChange={(e) => { setTeam(e.target.value); setPage(1); }}
            style={{ width: 210 }}
            aria-label={t('team', 'Team')}
          >
            {teams.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <input
            type="text"
            className="input-field"
            placeholder={`${t('search', 'Search')}...`}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 220 }}
            aria-label={t('searchMemberPlaceholder')}
          />
        </div>

        <div className="team-toolbar-right">
          <div className="lookup" ref={lookupRef}>
            <input
              type="text"
              className="input-field"
              placeholder={t('findUserPlaceholder', 'Search by name or email...')}
              value={lookup}
              onChange={(e) => { setLookup(e.target.value); setPickedUser(null); setShowResults(true); }}
              onFocus={() => setShowResults(true)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              aria-label={t('findUser', 'Find a user')}
            />
            <button type="button" className="lookup-btn" onClick={() => setShowResults(true)} aria-label={t('findUser', 'Find a user')}>
              <Search size={14} />
            </button>
            {showResults && lookupResults.length > 0 && (
              <div className="picker-list">
                {lookupResults.map((u) => (
                  <button type="button" key={u.id} className="picker-item" onClick={() => pickUser(u)}>
                    <span style={{ fontWeight: 500 }}>{u.name}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{u.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" className="btn btn-outline" onClick={handleAdd} disabled={adding || !team}>
            <UserPlus size={15} /> {t('addMember')}
          </button>
          <button type="button" className="btn btn-outline" onClick={() => setShowRemove(true)} disabled={selectedIds.length === 0}>
            <UserMinus size={15} /> {t('removeMember')}{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
          </button>
        </div>
      </div>

      {notice && (
        <div className={notice.ok ? 'form-success' : 'form-error'}>
          {notice.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />} {notice.message}
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: 44, textAlign: 'center' }}>
                <input type="checkbox" checked={isAllSelected} onChange={(e) => toggleAll(e.target.checked)} aria-label="Select all" style={{ accentColor: 'var(--primary-color)' }} />
              </th>
              <th className="sortable-header" onClick={() => handleSort('name')}>{t('userName')} {renderSortIcon('name')}</th>
              <th className="sortable-header" onClick={() => handleSort('email')}>{t('userEmail')} {renderSortIcon('email')}</th>
              <th className="sortable-header" onClick={() => handleSort('alias')}>{t('alias')} {renderSortIcon('alias')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>{t('loadingTeamAccess')}</td></tr>
            ) : sortedMembers.map((member) => (
              <tr key={member.id} style={{ background: selectedIds.includes(member.id) ? 'rgba(var(--primary-rgb), 0.05)' : undefined }}>
                <td style={{ textAlign: 'center' }}>
                  <input type="checkbox" checked={selectedIds.includes(member.id)} onChange={() => toggleOne(member.id)} aria-label={`Select ${member.name}`} style={{ accentColor: 'var(--primary-color)' }} />
                </td>
                <td className="cell-link" style={{ cursor: 'default' }}>{member.name}</td>
                <td className="cell-link" style={{ cursor: 'default' }}>{member.email}</td>
                <td className="cell-link" style={{ cursor: 'default' }}>{member.alias}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && sortedMembers.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{t('noMembersFound')}</div>
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

      {showRemove && (
        <ConfirmDialog
          title={t('removeMember')}
          message={`${t('confirmRemoveMembers', { count: selectedIds.length })} (${team})`}
          confirmLabel={t('removeMember')}
          onConfirm={removeSelected}
          onClose={() => setShowRemove(false)}
        />
      )}
    </div>
  );
};

export default TeamAssignment;
