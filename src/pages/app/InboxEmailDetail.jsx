import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Link, useLocation, useOutletContext, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle, EyeOff, ExternalLink, FileText, Link2, Paperclip, Undo2 } from 'lucide-react';
import { LanguageContext } from '../../context/LanguageContext';
import Modal from '../../components/Modal';
import { getMailboxEmail, setMailboxEmailStatus } from '../../services/mailboxEmails.service';
import { InboxDateTime, InboxStatusBadge } from './inboxUi';

const NOTE_MAX = 1000;

/** API error -> { message, fieldErrors } (same shape as apiError() in the settings pages). */
const apiError = (err, fallback) => ({
  message: err.response?.data?.message || err.message || fallback,
  fieldErrors: err.response?.data?.details?.fieldErrors || {}
});

/** First message of one field in `details.fieldErrors` (values may be arrays). */
const fieldError = (fieldErrors, key) => {
  const v = fieldErrors?.[key];
  return Array.isArray(v) ? v[0] : v;
};

/** Attachment size: the API may send bytes (number) or an already formatted text ("245 KB"). */
const formatSize = (size) => {
  if (size === null || size === undefined || size === '') return '';
  if (typeof size !== 'number') return String(size);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

/** "Ignore" dialog with an optional note (max 1000 characters). */
const IgnoreDialog = ({ onConfirm, onClose }) => {
  const { t } = useContext(LanguageContext);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [noteError, setNoteError] = useState('');

  const handleConfirm = async () => {
    setBusy(true);
    setError('');
    setNoteError('');
    try {
      await onConfirm(note.trim());
      onClose();
    } catch (err) {
      const { message, fieldErrors } = apiError(err, t('inboxStatusChangeFailed', 'Failed to change the status'));
      setNoteError(fieldError(fieldErrors, 'note') || '');
      setError(message);
      setBusy(false);
    }
  };

  return (
    <Modal title={t('inboxIgnoreTitle', 'Ignore this email')} onClose={busy ? () => {} : onClose} width={480}>
      <p className="inbox-dialog-text">
        {t('inboxIgnoreText', 'The email moves to the Ignored list. You can move it back to New later.')}
      </p>
      <div className={`input-group ${noteError ? 'has-error' : ''}`}>
        <label htmlFor="inbox-ignore-note">{t('inboxIgnoreNoteLabel', 'Note (optional)')}</label>
        <textarea
          id="inbox-ignore-note"
          className="input-field inbox-note-input"
          rows={4}
          maxLength={NOTE_MAX}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('inboxIgnoreNotePlaceholder', 'Why is this email ignored? (e.g. spam, duplicate)')}
          disabled={busy}
          aria-invalid={!!noteError || undefined}
        />
        <div className="inbox-note-footer">
          {noteError ? <span className="inbox-field-error">{noteError}</span> : <span />}
          <span className="inbox-muted">{note.length} / {NOTE_MAX}</span>
        </div>
      </div>
      {error && (
        <div className="form-error mt-3">
          <AlertCircle size={15} /> {error}
        </div>
      )}
      <div className="modal-actions">
        <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>
          {t('cancel', 'Cancel')}
        </button>
        <button type="button" className="btn btn-primary" onClick={handleConfirm} disabled={busy}>
          <EyeOff size={15} /> {busy ? t('working', 'Working...') : t('inboxIgnore', 'Ignore')}
        </button>
      </div>
    </Modal>
  );
};

/**
 * Inbox email detail (D-021 / D-023), a full page like Invoice Details:
 *   Left  - subject, status, From / To / Cc / Received / Mailbox, status note, plain-text body
 *   Right - PDF preview of the selected attachment, list of PDFs, open in a new tab
 * Actions: Ignore (New / Failed), Move back to New (Ignored); none when Processed or linked to an invoice.
 * API: GET /apps/{appId}/mailbox-emails/{emailId}, PATCH /apps/{appId}/mailbox-emails/{emailId}/status.
 */
const InboxEmailDetail = () => {
  const { emailId, appId: appIdParam } = useParams();
  const outletContext = useOutletContext() || {};
  const appId = appIdParam || outletContext.appId;
  const location = useLocation();
  const { t } = useContext(LanguageContext);

  const [email, setEmail] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [ignoreOpen, setIgnoreOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [notice, setNotice] = useState(null); // { ok, message }

  // Back to the list with the filters it had (Inbox.jsx passes its query string in the route state)
  const backTo = `/app/${appId}/inbox${location.state?.inboxSearch || ''}`;

  const showNotice = (ok, message) => {
    setNotice({ ok, message });
    setTimeout(() => setNotice(null), ok ? 3500 : 6000);
  };

  const applyEmail = useCallback((data) => {
    setEmail(data);
    const attachments = data?.attachments || [];
    setSelectedId((current) => (attachments.some((a) => a.id === current) ? current : attachments[0]?.id ?? null));
  }, []);

  useEffect(() => {
    if (!appId || !emailId) return undefined;
    let alive = true;
    setEmail(null);
    setLoadError('');
    getMailboxEmail(appId, emailId)
      .then((data) => alive && applyEmail(data))
      .catch((err) => alive && setLoadError(apiError(err, t('inboxLoadEmailFailed', 'Failed to load the email')).message));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, emailId, applyEmail]);

  const handleIgnore = async (note) => {
    const data = await setMailboxEmailStatus(appId, email.id, 'Ignored', note || undefined);
    applyEmail(data);
    showNotice(true, t('inboxIgnoredToast', 'Email ignored.'));
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const data = await setMailboxEmailStatus(appId, email.id, 'New');
      applyEmail(data);
      showNotice(true, t('inboxRestoredToast', 'Email moved back to New.'));
    } catch (err) {
      showNotice(false, apiError(err, t('inboxStatusChangeFailed', 'Failed to change the status')).message);
    } finally {
      setRestoring(false);
    }
  };

  const backLink = (
    <Link to={backTo} className="inbox-back-link">
      <ArrowLeft size={15} /> {t('inboxBack', 'Back to Inbox')}
    </Link>
  );

  if (loadError) {
    return (
      <div>
        <div className="inbox-detail-bar">{backLink}</div>
        <div className="form-error"><AlertCircle size={15} /> {loadError}</div>
      </div>
    );
  }
  if (!email) {
    return (
      <div>
        <div className="inbox-detail-bar">{backLink}</div>
        <div className="inbox-loading">{t('inboxLoadingEmail', 'Loading email...')}</div>
      </div>
    );
  }

  const attachments = email.attachments || [];
  const current = attachments.find((a) => a.id === selectedId) || attachments[0];
  const to = email.to || [];
  const cc = email.cc || [];
  const locked = email.status === 'Processed' || !!email.invoiceId;
  const canIgnore = !locked && (email.status === 'New' || email.status === 'Failed');
  const canRestore = !locked && email.status === 'Ignored';

  return (
    <div className="inbox-detail">
      <div className="inbox-detail-bar">
        {backLink}
        <div className="inbox-detail-actions">
          {canIgnore && (
            <button type="button" className="btn btn-outline" onClick={() => setIgnoreOpen(true)}>
              <EyeOff size={15} /> {t('inboxIgnore', 'Ignore')}
            </button>
          )}
          {canRestore && (
            <button type="button" className="btn btn-primary" onClick={handleRestore} disabled={restoring}>
              <Undo2 size={15} /> {restoring ? t('working', 'Working...') : t('inboxMoveToNew', 'Move back to New')}
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div className={notice.ok ? 'form-success' : 'form-error'}>
          {notice.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />} {notice.message}
        </div>
      )}

      <div className="details-split">
        {/* Left: the email */}
        <section className="inbox-email-panel">
          <div className="inbox-email-head">
            <h2 className="email-subject">{email.subject || t('noSubject', '(no subject)')}</h2>
            <InboxStatusBadge status={email.status} note={email.statusNote} />
          </div>

          <dl className="inbox-meta">
            <dt>{t('inboxFrom', 'From')}</dt>
            <dd>
              {email.fromName && <strong>{email.fromName} </strong>}
              {email.fromAddress && <span className="inbox-muted">&lt;{email.fromAddress}&gt;</span>}
              {!email.fromName && !email.fromAddress && '–'}
            </dd>
            <dt>{t('inboxTo', 'To')}</dt>
            <dd>{to.length > 0 ? to.join(', ') : '–'}</dd>
            {cc.length > 0 && (
              <>
                <dt>{t('inboxCc', 'Cc')}</dt>
                <dd>{cc.join(', ')}</dd>
              </>
            )}
            <dt>{t('inboxReceived', 'Received')}</dt>
            <dd><InboxDateTime value={email.receivedAt} /></dd>
            <dt>{t('inboxMailbox', 'Mailbox')}</dt>
            <dd>
              {email.mailboxAddress || '–'}
              {email.moduleName && <span className="inbox-muted"> ({email.moduleName})</span>}
            </dd>
          </dl>

          {email.statusNote && (
            <div className={`inbox-status-note ${email.status === 'Failed' ? 'is-failed' : ''}`}>
              <strong>{t('inboxStatusNote', 'Status note')}:</strong> {email.statusNote}
            </div>
          )}

          {email.invoiceId && (
            <div className="inbox-linked">
              <Link2 size={14} /> {t('inboxLinkedInvoice', 'Linked to invoice {id}').replace('{id}', email.invoiceId)}
            </div>
          )}

          <div className="inbox-body">
            {email.body ? email.body : <span className="inbox-muted">{t('inboxNoBody', '(no message text)')}</span>}
          </div>
        </section>

        {/* Right: PDF preview (same approach as InvoicePdfViewer) */}
        <section className="pdf-panel inbox-pdf-panel">
          <div className="pdf-panel-header">
            <div className="pdf-panel-file">
              <Paperclip size={14} />
              <span>{t('inboxPdfAttachments', 'PDF attachments')} ({attachments.length})</span>
            </div>
            <div className="pdf-panel-actions">
              {current && (
                <a
                  className="pdf-icon pdf"
                  href={current.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={t('openPdf', 'Open PDF in a new tab')}
                  aria-label={`${t('openPdf', 'Open PDF in a new tab')}: ${current.fileName}`}
                >
                  <ExternalLink size={17} />
                </a>
              )}
            </div>
          </div>

          {attachments.length > 0 && (
            <div className="inbox-pdf-tabs" role="tablist" aria-label={t('inboxPdfAttachments', 'PDF attachments')}>
              {attachments.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  role="tab"
                  aria-selected={current?.id === a.id}
                  className={`inbox-pdf-tab ${current?.id === a.id ? 'active' : ''}`}
                  onClick={() => setSelectedId(a.id)}
                  title={a.fileName}
                >
                  <FileText size={14} />
                  <span className="inbox-pdf-tab-name">{a.fileName}</span>
                  {formatSize(a.size) && <span className="inbox-pdf-tab-size">{formatSize(a.size)}</span>}
                </button>
              ))}
            </div>
          )}

          {current ? (
            <iframe
              key={current.id}
              className="pdf-panel-frame"
              src={`${current.url}#toolbar=1&navpanes=1&view=FitH`}
              title={current.fileName}
            />
          ) : (
            <div className="pdf-panel-empty">{t('inboxNoPdf', 'No PDF attachments')}</div>
          )}
        </section>
      </div>

      {ignoreOpen && <IgnoreDialog onConfirm={handleIgnore} onClose={() => setIgnoreOpen(false)} />}
    </div>
  );
};

export default InboxEmailDetail;
