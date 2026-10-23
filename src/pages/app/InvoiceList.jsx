import React, { useState, useEffect, useMemo, useContext } from 'react';
import { useParams, useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { apiClient } from '../../services/network.service';
import { LanguageContext } from '../../context/LanguageContext';
import {
  Eye, Search, Filter, ChevronUp, ChevronDown, ArrowUpDown,
  ChevronLeft, ChevronRight, Plus, X, CheckCircle, Upload, FileSpreadsheet,
  Download, Trash2, AlertCircle, FileUp
} from 'lucide-react';
import { getAppName } from '../../utils/appHelper';
import { useStatuses } from '../../services/statuses';

const VENDORS_LIST = [
  { name: 'Molinos Agro S.A.', cuit: '30-50001234-9' },
  { name: 'Vicentin S.A.I.C.', cuit: '30-61234567-2' },
  { name: 'Terminal Quequén S.A.', cuit: '30-71122334-5' },
  { name: 'Cargill Logistics S.R.L.', cuit: '30-50009876-1' },
  { name: 'Aceitera General Deheza', cuit: '30-50003456-8' }
];

const STATIONS_LIST = [
  'ARG - Rosario Port',
  'ARG - Bahía Blanca',
  'BRA - Santos Terminal',
  'URU - Nueva Palmira',
  'PAR - Villeta Dock'
];

const InvoiceList = () => {
  const params = useParams();
  const outletContext = useOutletContext() || {};
  const appId = params.appId || outletContext.appId || 'freight-processing';
  const appName = outletContext.appName || getAppName(appId);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useContext(LanguageContext);
  const statuses = useStatuses();

  // 1. Search (Online) & 2. Filter (Online) & 3. Pagination (Online) States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);

  // Response Data
  const [invoices, setInvoices] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // 4. Column Sorting (Local) State
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');

  // Single Create Invoice Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [newInvoiceData, setNewInvoiceData] = useState({
    id: '',
    invoice1a: '',
    invoice2a: '',
    countryStation: 'ARG - Rosario Port',
    vendorName: 'Molinos Agro S.A.',
    cuit: '30-50001234-9',
    amount: '15000.00',
    status: 'Pending',
    receptionDate: new Date().toISOString().split('T')[0],
    emailReceptionDate: `${new Date().toISOString().split('T')[0]} 10:00 AM`
  });

  // Bulk Invoice Upload Modal State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkData, setBulkData] = useState([]);
  const [bulkFileName, setBulkFileName] = useState('');
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkError, setBulkError] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // --- Single Invoice Handlers ---
  const handleOpenCreateModal = () => {
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const generatedId = `INV-${appId.toUpperCase()}-${randomId}`;
    setNewInvoiceData({
      id: generatedId,
      invoice1a: `0001-000${randomId}`,
      invoice2a: `0001-000${randomId + 1}`,
      countryStation: 'ARG - Rosario Port',
      vendorName: VENDORS_LIST[0].name,
      cuit: VENDORS_LIST[0].cuit,
      amount: '15000.00',
      status: 'Pending',
      receptionDate: new Date().toISOString().split('T')[0],
      emailReceptionDate: `${new Date().toISOString().split('T')[0]} 10:00 AM`
    });
    setShowCreateModal(true);
  };

  const handleVendorChange = (vendorName) => {
    const foundVendor = VENDORS_LIST.find((v) => v.name === vendorName);
    setNewInvoiceData((prev) => ({
      ...prev,
      vendorName,
      cuit: foundVendor ? foundVendor.cuit : prev.cuit
    }));
  };

  const handleCreateInvoiceSubmit = async (e) => {
    e.preventDefault();
    if (!newInvoiceData.vendorName || !newInvoiceData.amount) return;

    const created = {
      ...newInvoiceData,
      appId
    };

    try {
      await apiClient.post(`/apps/${appId}/invoices`, created);
      setInvoices((prev) => [created, ...prev]);
      setTotalItems((prev) => prev + 1);
      setShowCreateModal(false);
      showToast(`${t('invoiceCreatedSuccess', 'Invoice created successfully!')} (${created.id})`);
    } catch (err) {
      console.error('Failed to create invoice', err);
    }
  };

  // --- Bulk Upload Handlers ---
  const handleOpenBulkModal = () => {
    const random1 = Math.floor(1000 + Math.random() * 9000);
    const random2 = random1 + 1;
    const today = new Date().toISOString().split('T')[0];

    setBulkData([
      {
        id: `INV-${appId.toUpperCase()}-${random1}`,
        vendorName: VENDORS_LIST[0].name,
        cuit: VENDORS_LIST[0].cuit,
        countryStation: STATIONS_LIST[0],
        invoice1a: `0001-000${random1}`,
        invoice2a: `0001-000${random1 + 1}`,
        amount: '12500.00',
        status: 'Pending',
        receptionDate: today,
        emailReceptionDate: `${today} 10:00 AM`
      },
      {
        id: `INV-${appId.toUpperCase()}-${random2}`,
        vendorName: VENDORS_LIST[1].name,
        cuit: VENDORS_LIST[1].cuit,
        countryStation: STATIONS_LIST[1],
        invoice1a: `0001-000${random2}`,
        invoice2a: `0001-000${random2 + 1}`,
        amount: '19800.50',
        status: 'Pending',
        receptionDate: today,
        emailReceptionDate: `${today} 10:30 AM`
      }
    ]);
    setBulkFileName('');
    setBulkError(null);
    setShowBulkModal(true);
  };

  const handleDownloadTemplate = () => {
    const csvContent = [
      'Invoice ID,Vendor Name,CUIT,Country Station,1a Invoice,2a Invoice,Amount,Status,Reception Date',
      `INV-${appId.toUpperCase()}-8801,Molinos Agro S.A.,30-50001234-9,ARG - Rosario Port,0001-000501,0001-000502,18500.00,Pending,2026-07-22`,
      `INV-${appId.toUpperCase()}-8802,Vicentin S.A.I.C.,30-61234567-2,ARG - Bahía Blanca,0001-000503,0001-000504,22400.50,Approved,2026-07-23`,
      `INV-${appId.toUpperCase()}-8803,Terminal Quequén S.A.,30-71122334-5,BRA - Santos Terminal,0001-000505,0001-000506,12800.00,Pending,2026-07-24`
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${appId}_bulk_invoices_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(t('sampleTemplateDownloaded', 'Sample CSV template downloaded!'));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setBulkFileName(file.name);
    setBulkError(null);

    const reader = new FileReader();

    if (file.name.endsWith('.json')) {
      reader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          const rawList = Array.isArray(parsed) ? parsed : (parsed.invoices || [parsed]);
          const today = new Date().toISOString().split('T')[0];
          const formatted = rawList.map((item, idx) => ({
            id: item.id || `INV-${appId.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
            vendorName: item.vendorName || VENDORS_LIST[idx % VENDORS_LIST.length].name,
            cuit: item.cuit || VENDORS_LIST[idx % VENDORS_LIST.length].cuit,
            countryStation: item.countryStation || STATIONS_LIST[idx % STATIONS_LIST.length],
            invoice1a: item.invoice1a || `0001-000${1000 + idx}`,
            invoice2a: item.invoice2a || `0001-000${1001 + idx}`,
            amount: item.amount ? String(item.amount) : '15000.00',
            status: item.status || 'Pending',
            receptionDate: item.receptionDate || today,
            emailReceptionDate: item.emailReceptionDate || `${today} 10:00 AM`
          }));
          setBulkData(formatted);
        } catch {
          setBulkError(t('invalidFileFormat', 'Invalid JSON file format.'));
        }
      };
      reader.readAsText(file);
    } else {
      // CSV / TXT / PDF parsing fallback
      reader.onload = (evt) => {
        try {
          const text = evt.target.result;
          const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
          if (lines.length === 0) return;

          const today = new Date().toISOString().split('T')[0];
          const isHeader = lines[0].toLowerCase().includes('invoice') || lines[0].toLowerCase().includes('vendor');
          const dataLines = isHeader ? lines.slice(1) : lines;

          const formatted = dataLines.map((line, idx) => {
            const cols = line.split(/[,;\t]/).map((c) => c.trim().replace(/^["']|["']$/g, ''));
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            return {
              id: cols[0] || `INV-${appId.toUpperCase()}-${randomNum}`,
              vendorName: cols[1] || VENDORS_LIST[idx % VENDORS_LIST.length].name,
              cuit: cols[2] || VENDORS_LIST[idx % VENDORS_LIST.length].cuit,
              countryStation: cols[3] || STATIONS_LIST[idx % STATIONS_LIST.length],
              invoice1a: cols[4] || `0001-000${randomNum}`,
              invoice2a: cols[5] || `0001-000${randomNum + 1}`,
              amount: cols[6] || '14500.00',
              status: cols[7] || 'Pending',
              receptionDate: cols[8] || today,
              emailReceptionDate: `${cols[8] || today} 10:00 AM`
            };
          });
          setBulkData(formatted);
        } catch {
          setBulkError(t('invalidFileFormat', 'Invalid file format. Please upload CSV or JSON.'));
        }
      };
      reader.readAsText(file);
    }
  };

  const handleAddBulkRow = () => {
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const today = new Date().toISOString().split('T')[0];
    const newRow = {
      id: `INV-${appId.toUpperCase()}-${randomId}`,
      vendorName: VENDORS_LIST[0].name,
      cuit: VENDORS_LIST[0].cuit,
      countryStation: STATIONS_LIST[0],
      invoice1a: `0001-000${randomId}`,
      invoice2a: `0001-000${randomId + 1}`,
      amount: '15000.00',
      status: 'Pending',
      receptionDate: today,
      emailReceptionDate: `${today} 10:00 AM`
    };
    setBulkData((prev) => [...prev, newRow]);
  };

  const handleRemoveBulkRow = (index) => {
    setBulkData((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBulkRowChange = (index, field, value) => {
    setBulkData((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'vendorName') {
        const v = VENDORS_LIST.find((item) => item.name === value);
        if (v) updated[index].cuit = v.cuit;
      }
      return updated;
    });
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (bulkData.length === 0) return;

    setBulkUploading(true);
    try {
      const payload = bulkData.map((item) => ({ ...item, appId }));
      await apiClient.post(`/apps/${appId}/invoices/bulk`, { invoices: payload });

      setInvoices((prev) => [...payload, ...prev]);
      setTotalItems((prev) => prev + payload.length);
      setShowBulkModal(false);
      showToast(t('uploadSuccess', `Successfully uploaded ${payload.length} invoice(s)!`, { count: payload.length }));
    } catch (err) {
      console.error('Failed bulk invoice upload', err);
      setBulkError('Failed to process bulk upload. Please try again.');
    } finally {
      setBulkUploading(false);
    }
  };

  // Fetch online data when appId, searchQuery, statusFilter, page, or limit changes
  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get(`/apps/${appId}/invoices`, {
          params: {
            search: searchQuery,
            status: statusFilter,
            page,
            limit
          }
        });
        const result = response.data;
        if (result.data) {
          setInvoices(result.data);
          setTotalItems(result.totalItems || result.data.length);
          setTotalPages(result.totalPages || 1);
        } else {
          setInvoices(Array.isArray(result) ? result : []);
          setTotalItems(Array.isArray(result) ? result.length : 0);
          setTotalPages(1);
        }
      } catch (error) {
        console.error('Failed to fetch invoices', error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchInvoices();
    }, 250);

    return () => clearTimeout(timer);
  }, [appId, searchQuery, statusFilter, page, limit]);

  // Handle Local Column Sorting
  const handleSort = (columnKey) => {
    if (sortColumn === columnKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const sortedInvoices = useMemo(() => {
    if (!sortColumn) return invoices;
    return [...invoices].sort((a, b) => {
      let valA = a[sortColumn] ?? '';
      let valB = b[sortColumn] ?? '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [invoices, sortColumn, sortDirection]);

  const renderSortIcon = (columnKey) => {
    if (sortColumn !== columnKey) return <ArrowUpDown size={14} className="sort-icon" style={{ opacity: 0.4 }} />;
    return sortDirection === 'asc' ? <ChevronUp size={14} className="sort-icon" /> : <ChevronDown size={14} className="sort-icon" />;
  };

  // Pill color and label come from Settings > Configuration > Statuses
  const getStatusBadge = (status) => `badge-${statuses.find((s) => s.code === status)?.color || 'neutral'}`;

  const getStatusLabel = (status) => {
    const config = statuses.find((s) => s.code === status);
    // Core statuses keep their translations; added ones show their configured name
    return t(`status${status}`, config?.name || status);
  };

  const statusOptions = statuses.map((s) => (
    <option key={s.code} value={s.code}>{getStatusLabel(s.code)}</option>
  ));

  return (
    <div>
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', color: '#22c55e', padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <CheckCircle size={18} /> {toastMessage}
        </div>
      )}

      {/* Toolbar: Search Box, Filter & Actions (Single Create & Bulk Upload) */}
      <div className="flex-between" style={{ marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
        {/* Search Box */}
        <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
          <input
            type="text"
            className="input-field"
            placeholder={t('searchInvoicesPlaceholder')}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            style={{ paddingLeft: '2.4rem' }}
          />
          <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} color="var(--text-secondary)" />
            <select
              className="input-field"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{ width: '160px' }}
            >
              <option value="ALL">{t('allStatuses')}</option>
              {statusOptions}
            </select>
          </div>

          {/* Bulk Invoice Upload Button */}
          <button
            className="btn btn-outline"
            onClick={handleOpenBulkModal}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}
          >
            <Upload size={18} /> {t('bulkUpload', 'Bulk Upload')}
          </button>

          {/* Single Create Invoice Button */}
          <button className="btn btn-primary" onClick={handleOpenCreateModal} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={18} /> {t('createInvoice', 'Create Invoice')}
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th className="sortable-header" onClick={() => handleSort('id')}>
                {t('invoiceId')} {renderSortIcon('id')}
              </th>
              <th className="sortable-header" onClick={() => handleSort('receptionDate')}>
                {t('receptionDate')} {renderSortIcon('receptionDate')}
              </th>
              <th>{t('emailReceptionDate')}</th>
              <th>{t('firstInvoice')}</th>
              <th>{t('secondInvoice')}</th>
              <th className="sortable-header" onClick={() => handleSort('countryStation')}>
                {t('countryStation')} {renderSortIcon('countryStation')}
              </th>
              <th className="sortable-header" onClick={() => handleSort('vendorName')}>
                {t('vendorName')} {renderSortIcon('vendorName')}
              </th>
              <th className="sortable-header" onClick={() => handleSort('cuit')}>
                {t('cuit')} {renderSortIcon('cuit')}
              </th>
              <th className="sortable-header" onClick={() => handleSort('status')}>
                {t('status')} {renderSortIcon('status')}
              </th>
              <th style={{ textAlign: 'right' }}>{t('action')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                  {t('loadingInvoices')}
                </td>
              </tr>
            ) : sortedInvoices.map((inv) => (
              <tr key={inv.id}>
                <td>
                  <span
                    className="cell-link"
                    onClick={() => navigate(`/app/${appId}/invoices/${inv.id}`, { state: { appName } })}
                  >
                    {inv.id}
                  </span>
                </td>
                <td>{inv.receptionDate || inv.date || '-'}</td>
                <td>{inv.emailReceptionDate || '-'}</td>
                <td>{inv.invoice1a || '-'}</td>
                <td>{inv.invoice2a || '-'}</td>
                <td>{inv.countryStation || '-'}</td>
                <td>{inv.vendorName || inv.customer || '-'}</td>
                <td>{inv.cuit || '-'}</td>
                <td>
                  <span className={`badge ${getStatusBadge(inv.status)}`}>
                    {getStatusLabel(inv.status)}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    className="btn btn-outline"
                    style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                    onClick={() => {
                      const cleanPath = location.pathname.replace(/\/$/, '');
                      const targetUrl = cleanPath.includes('/invoices')
                        ? `${cleanPath}/${inv.id}`
                        : `/app/${appId}/invoices/${inv.id}`;
                      navigate(targetUrl, { state: { appName } });
                    }}
                  >
                    <Eye size={14} /> {t('view')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && sortedInvoices.length === 0 && (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            {t('noInvoicesFound')}
          </div>
        )}
      </div>

      {/* Online Pagination Controls */}
      <div className="pagination-container">
        <div className="pagination-info">
          {t('showingRecords', { start: totalItems === 0 ? 0 : (page - 1) * limit + 1, end: Math.min(page * limit, totalItems), total: totalItems })}
        </div>

        <div className="pagination-controls">
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginRight: '0.5rem' }}>{t('rowsPerPage')}</label>
          <select
            className="input-field"
            value={limit}
            onChange={(e) => {
              setLimit(parseInt(e.target.value));
              setPage(1);
            }}
            style={{ width: '70px', padding: '0.25rem 0.5rem', marginRight: '1rem' }}
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
          </select>

          <button
            className="pagination-btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            <ChevronLeft size={16} /> {t('previous')}
          </button>

          <span className="pagination-page">{page}</span>
            <span className="pagination-of">{t('pageOfTotal', { totalPages })}</span>

          <button
            className="pagination-btn"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
          >
            {t('next')} <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Single Create Invoice Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '580px', padding: '2rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
            <div className="flex-between" style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={20} color="var(--primary-color)" />
                {t('createNewInvoice', 'Create New Invoice')} ({appName})
              </h3>
              <button type="button" className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={() => setShowCreateModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateInvoiceSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>{t('invoiceId')}</label>
                  <input
                    type="text"
                    className="input-field"
                    value={newInvoiceData.id}
                    onChange={(e) => setNewInvoiceData({ ...newInvoiceData, id: e.target.value })}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>{t('vendorName')}</label>
                  <select
                    className="input-field"
                    value={newInvoiceData.vendorName}
                    onChange={(e) => handleVendorChange(e.target.value)}
                  >
                    {VENDORS_LIST.map((v) => (
                      <option key={v.name} value={v.name}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>{t('cuit')}</label>
                  <input
                    type="text"
                    className="input-field"
                    value={newInvoiceData.cuit}
                    onChange={(e) => setNewInvoiceData({ ...newInvoiceData, cuit: e.target.value })}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>{t('countryStation')}</label>
                  <select
                    className="input-field"
                    value={newInvoiceData.countryStation}
                    onChange={(e) => setNewInvoiceData({ ...newInvoiceData, countryStation: e.target.value })}
                  >
                    {STATIONS_LIST.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>{t('firstInvoice')}</label>
                  <input
                    type="text"
                    className="input-field"
                    value={newInvoiceData.invoice1a}
                    onChange={(e) => setNewInvoiceData({ ...newInvoiceData, invoice1a: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label>{t('secondInvoice')}</label>
                  <input
                    type="text"
                    className="input-field"
                    value={newInvoiceData.invoice2a}
                    onChange={(e) => setNewInvoiceData({ ...newInvoiceData, invoice2a: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>{t('amount', 'Amount ($)')}</label>
                  <input
                    type="text"
                    className="input-field"
                    value={newInvoiceData.amount}
                    onChange={(e) => setNewInvoiceData({ ...newInvoiceData, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>{t('status')}</label>
                  <select
                    className="input-field"
                    value={newInvoiceData.status}
                    onChange={(e) => setNewInvoiceData({ ...newInvoiceData, status: e.target.value })}
                  >
                    {statusOptions}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateModal(false)}>
                  {t('cancel')}
                </button>
                <button type="submit" className="btn btn-primary">
                  <Plus size={16} /> {t('createInvoice', 'Create Invoice')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Invoice Upload Modal */}
      {showBulkModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '880px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', boxShadow: '0 25px 50px rgba(0,0,0,0.6)', borderRadius: '12px' }}>

            {/* Modal Header */}
            <div className="flex-between" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: '600' }}>
                  <Upload size={22} color="var(--primary-color)" />
                  {t('bulkUploadTitle', 'Bulk Invoice Upload')} ({appName})
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  {t('bulkUploadSubtitle', 'Upload CSV, JSON, TXT, or PDF files to import multiple invoices at once.')}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleDownloadTemplate}
                  style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Download size={14} /> {t('downloadTemplate', 'Download CSV Template')}
                </button>
                <button type="button" className="btn btn-outline" style={{ padding: '6px 10px' }} onClick={() => setShowBulkModal(false)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* File Dropzone Box */}
            <div style={{ border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '1.5rem', textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)', marginBottom: '1.5rem', position: 'relative', cursor: 'pointer' }}>
              <input
                type="file"
                accept=".csv,.json,.txt,.pdf"
                onChange={handleFileUpload}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
              />
              <FileUp size={36} color="var(--primary-color)" style={{ marginBottom: '0.5rem' }} />
              <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                {bulkFileName ? `Selected: ${bulkFileName}` : t('dragDropFile', 'Drag and drop file here, or click to browse')}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                {t('supportedFormats', 'Supports CSV, JSON, TXT, or PDF files')}
              </div>
            </div>

            {/* Error Banner if any */}
            {bulkError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <AlertCircle size={18} /> {bulkError}
              </div>
            )}

            {/* Bulk Batch Preview Table */}
            <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileSpreadsheet size={18} color="var(--primary-color)" />
                {t('readyToUpload', '{count} invoice(s) ready to upload', { count: bulkData.length })}
              </span>
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleAddBulkRow}
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <Plus size={14} /> {t('addRow', 'Add Row')}
              </button>
            </div>

            <div className="table-container" style={{ maxHeight: '280px', overflowY: 'auto', marginBottom: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <table style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>{t('invoiceId')}</th>
                    <th>{t('vendorName')}</th>
                    <th>{t('cuit')}</th>
                    <th>{t('countryStation')}</th>
                    <th>{t('amount')}</th>
                    <th>{t('status')}</th>
                    <th style={{ textAlign: 'center', width: '50px' }}>{t('action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkData.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        {t('noInvoicesToUpload', 'No invoices ready for upload.')}
                      </td>
                    </tr>
                  ) : (
                    bulkData.map((row, idx) => (
                      <tr key={idx}>
                        <td>
                          <input
                            type="text"
                            className="input-field"
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.82rem' }}
                            value={row.id}
                            onChange={(e) => handleBulkRowChange(idx, 'id', e.target.value)}
                          />
                        </td>
                        <td>
                          <select
                            className="input-field"
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.82rem' }}
                            value={row.vendorName}
                            onChange={(e) => handleBulkRowChange(idx, 'vendorName', e.target.value)}
                          >
                            {VENDORS_LIST.map((v) => (
                              <option key={v.name} value={v.name}>{v.name}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="input-field"
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.82rem' }}
                            value={row.cuit}
                            onChange={(e) => handleBulkRowChange(idx, 'cuit', e.target.value)}
                          />
                        </td>
                        <td>
                          <select
                            className="input-field"
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.82rem' }}
                            value={row.countryStation}
                            onChange={(e) => handleBulkRowChange(idx, 'countryStation', e.target.value)}
                          >
                            {STATIONS_LIST.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="input-field"
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.82rem', width: '90px' }}
                            value={row.amount}
                            onChange={(e) => handleBulkRowChange(idx, 'amount', e.target.value)}
                          />
                        </td>
                        <td>
                          <select
                            className="input-field"
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.82rem' }}
                            value={row.status}
                            onChange={(e) => handleBulkRowChange(idx, 'status', e.target.value)}
                          >
                            {statusOptions}
                          </select>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ padding: '0.3rem', color: '#ef4444', borderColor: 'transparent' }}
                            onClick={() => handleRemoveBulkRow(idx)}
                            title="Remove Row"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex-between" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {bulkData.length > 0 && `Batch total: $${bulkData.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowBulkModal(false)} disabled={bulkUploading}>
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleBulkSubmit}
                  disabled={bulkUploading || bulkData.length === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Upload size={16} />
                  {bulkUploading ? t('uploading', 'Uploading...') : `${t('uploadInvoices', 'Upload Invoices')} (${bulkData.length})`}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceList;
