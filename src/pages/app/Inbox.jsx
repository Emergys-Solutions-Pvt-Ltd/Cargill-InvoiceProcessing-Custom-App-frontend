import React, { useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import { AlertCircle, Filter, Inbox as InboxIcon, Paperclip, RefreshCw, Search } from 'lucide-react';
import { LanguageContext } from '../../context/LanguageContext';
import Pager from '../../components/Pager';
import { MAILBOX_EMAIL_STATUSES, listAppMailboxes, listMailboxEmails } from '../../services/mailboxEmails.service';
import { INBOX_ALL, INBOX_DEFAULT_STATUS, InboxDateTime, InboxStatusBadge, InboxStatusOptions } from './inboxUi';

const PAGE_SIZES = [10, 20, 50];
const DEFAULT_LIMIT = 10;

/** API error -> message (same shape as apiError() in the settings pages). */
const errorMessage = (err, fallback) => err.response?.data?.message || err.message || fallback;

const toPositiveInt = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/**
 * Inbox of one application (D-020 / D-021 / D-023): emails received by every mailbox whose module
 * belongs to this application. API: GET /apps/{appId}/mailbox-emails, GET /apps/{appId}/mailboxes.
 *
 * The filters live in the URL query (?status=&mailboxId=&search=&page=&limit=) so "Back to Inbox"
 * on the detail page (and the browser Back button) return to the same list.
 */
const Inbox = () => {
  const params = useParams();
  const outletContext = useOutletContext() || {};
  const appId = params.appId || outletContext.appId;
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useContext(LanguageContext);
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters (from the URL)
  const statusParam = searchParams.get('status');
  const status = statusParam === INBOX_ALL || MAILBOX_EMAIL_STATUSES.includes(statusParam) ? statusParam : INBOX_DEFAULT_STATUS;
  const mailboxId = searchParams.get('mailboxId') || '';
  const search = searchParams.get('search') || '';
  const page = toPositiveInt(searchParams.get('page'), 1);
  const limit = toPositiveInt(searchParams.get('limit'), DEFAULT_LIMIT);

  // List
  const [emails, setEmails] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Mailbox filter
  const [mailboxes, setMailboxes] = useState([]);
  const [mailboxesLoaded, setMailboxesLoaded] = useState(false);
  const [mailboxesError, setMailboxesError] = useState('');

  /** Change filters in the URL. Any change other than the page itself goes back to page 1. */
  const updateFilters = (changes) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      Object.entries(changes).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') next.delete(key);
        else next.set(key, String(value));
      });
      if (!('page' in changes)) next.delete('page');
      if (next.get('page') === '1') next.delete('page');
      if (next.get('status') === INBOX_DEFAULT_STATUS) next.delete('status');
      if (next.get('limit') === String(DEFAULT_LIMIT)) next.delete('limit');
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    if (!appId) return undefined;
    let alive = true;
    // Same delay as InvoiceList: typing in the search box doesn't fire a request per key
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await listMailboxEmails(appId, {
          status: status === INBOX_ALL ? undefined : status,
          mailboxId: mailboxId || undefined,
          search: search.trim() || undefined,
          page,
          limit
        });
        if (!alive) return;
        setEmails(Array.isArray(result?.data) ? result.data : []);
        setTotalItems(result?.totalItems || 0);
        setTotalPages(result?.totalPages || 1);
        setLoadError('');
      } catch (err) {
        if (alive) setLoadError(errorMessage(err, t('inboxLoadFailed', 'Failed to load the emails')));
      } finally {
        if (alive) setLoading(false);
      }
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, status, mailboxId, search, page, limit, reloadKey]);

  useEffect(() => {
    if (!appId) return undefined;
    let alive = true;
    listAppMailboxes(appId)
      .then((list) => {
        if (!alive) return;
        setMailboxes(list);
        setMailboxesError('');
      })
      .catch((err) => alive && setMailboxesError(errorMessage(err, t('inboxLoadMailboxesFailed', 'Failed to load the mailboxes'))))
      .finally(() => alive && setMailboxesLoaded(true));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  const openEmail = (email) => {
    navigate(`/app/${appId}/inbox/${encodeURIComponent(email.id)}`, { state: { inboxSearch: location.search } });
  };

  const mailboxLabel = (m) => (m.moduleName ? `${m.address} (${m.moduleName})` : m.address);
  // Keep a mailbox id from the URL selectable even when it isn't in the list (e.g. list failed to load)
  const unknownMailbox = mailboxId && mailboxesLoaded && !mailboxes.some((m) => String(m.id) === mailboxId);

  const emptyMessage = () => {
    if (search.trim() || mailboxId) return t('inboxEmptyFiltered', 'No emails match the current filters.');
    switch (status) {
      case 'New': return t('inboxEmptyNew', 'No new emails.');
      case 'Ignored': return t('inboxEmptyIgnored', 'No ignored emails.');
      case 'Failed': return t('inboxEmptyFailed', 'No failed emails.');
      case 'Processed': return t('inboxEmptyProcessed', 'No processed emails.');
      default: return t('inboxEmptyAll', 'No emails.');
    }
  };

  const COLUMN_COUNT = 6;

  return (
    <div className="inbox-page">
      {/* Toolbar: search ........ status filter, mailbox filter, refresh */}
      <div className="inbox-toolbar">
        <div className="inbox-search">
          <input
            type="text"
            className="input-field"
            placeholder={t('inboxSearchPlaceholder', 'Search subject or sender...')}
            value={search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            aria-label={t('inboxSearchPlaceholder', 'Search subject or sender...')}
          />
          <Search size={18} color="var(--text-secondary)" className="inbox-search-icon" />
        </div>

        <div className="inbox-filters">
          <Filter size={18} color="var(--text-secondary)" />
          <select
            className="input-field inbox-status-filter"
            value={status}
            onChange={(e) => updateFilters({ status: e.target.value })}
            aria-label={t('inboxStatusFilter', 'Status')}
          >
            <InboxStatusOptions />
          </select>

          <select
            className="input-field inbox-mailbox-filter"
            value={mailboxId}
            onChange={(e) => updateFilters({ mailboxId: e.target.value })}
            aria-label={t('inboxMailboxFilter', 'Mailbox')}
            title={mailboxesError || undefined}
          >
            <option value="">{t('inboxAllMailboxes', 'All mailboxes')}</option>
            {mailboxes.map((m) => (
              <option key={m.id} value={String(m.id)}>{mailboxLabel(m)}</option>
            ))}
            {unknownMailbox && <option value={mailboxId}>{t('inboxMailboxNumber', 'Mailbox #{id}').replace('{id}', mailboxId)}</option>}
          </select>

          <button type="button" className="btn btn-outline btn-sm" onClick={() => setReloadKey((k) => k + 1)} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> {t('refresh', 'Refresh')}
          </button>
        </div>
      </div>

      {mailboxesError && (
        <div className="inbox-hint">
          <AlertCircle size={13} /> {t('inboxLoadMailboxesFailed', 'Failed to load the mailboxes')}: {mailboxesError}
        </div>
      )}

      {loadError ? (
        <div className="form-error">
          <AlertCircle size={15} /> {loadError}
          <button type="button" className="btn btn-outline btn-sm inbox-retry" onClick={() => setReloadKey((k) => k + 1)}>
            {t('inboxRetry', 'Try again')}
          </button>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="inbox-table">
              <thead>
                <tr>
                  <th>{t('inboxColReceived', 'Received')}</th>
                  <th>{t('inboxColFrom', 'From')}</th>
                  <th>{t('inboxColSubject', 'Subject')}</th>
                  <th>{t('inboxColMailbox', 'Mailbox')}</th>
                  <th className="inbox-col-pdfs">{t('inboxColPdfs', 'PDFs')}</th>
                  <th>{t('inboxColStatus', 'Status')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={COLUMN_COUNT} className="inbox-table-message">{t('inboxLoading', 'Loading emails...')}</td>
                  </tr>
                ) : emails.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_COUNT} className="inbox-table-message">
                      <InboxIcon size={20} className="inbox-empty-icon" />
                      <div>{emptyMessage()}</div>
                    </td>
                  </tr>
                ) : emails.map((email) => (
                  <tr
                    key={email.id}
                    className="inbox-row"
                    tabIndex={0}
                    onClick={() => openEmail(email)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') openEmail(email);
                    }}
                  >
                    <td><InboxDateTime value={email.receivedAt} /></td>
                    <td title={email.fromAddress || undefined}>
                      <span className="inbox-cell-main">{email.fromName || email.fromAddress || '–'}</span>
                      {email.fromName && email.fromAddress && <span className="inbox-cell-sub">{email.fromAddress}</span>}
                    </td>
                    <td className="inbox-col-subject" title={email.subject || undefined}>
                      {email.subject
                        ? <span className="inbox-subject">{email.subject}</span>
                        : <span className="inbox-muted">{t('noSubject', '(no subject)')}</span>}
                    </td>
                    <td title={email.mailboxAddress || undefined}>
                      <span className="inbox-cell-main">{email.mailboxAddress || '–'}</span>
                      {email.moduleName && <span className="inbox-cell-sub">{email.moduleName}</span>}
                    </td>
                    <td className="inbox-col-pdfs">
                      <span
                        className={`inbox-pdf-count ${email.attachmentCount ? '' : 'is-zero'}`}
                        title={t('inboxPdfCount', '{count} PDF attachment(s)').replace('{count}', email.attachmentCount || 0)}
                      >
                        <Paperclip size={13} /> {email.attachmentCount || 0}
                      </span>
                    </td>
                    <td><InboxStatusBadge status={email.status} note={email.statusNote} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pager
            page={page}
            limit={limit}
            totalItems={totalItems}
            totalPages={totalPages}
            loading={loading}
            sizes={PAGE_SIZES}
            onPageChange={(p) => updateFilters({ page: p })}
            onLimitChange={(l) => updateFilters({ limit: l })}
          />
        </>
      )}
    </div>
  );
};

export default Inbox;
