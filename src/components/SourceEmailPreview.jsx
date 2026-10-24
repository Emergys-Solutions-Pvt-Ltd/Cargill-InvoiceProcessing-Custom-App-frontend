import React, { useContext } from 'react';
import { ExternalLink, Paperclip } from 'lucide-react';
import Modal from './Modal';
import { LanguageContext } from '../context/LanguageContext';

const initialsOf = (name = '') =>
  name
    .replace(/^.*?-\s*/, '')
    .split(/\s+/)
    .filter((part) => /^[A-Za-zÀ-ÿ]/.test(part))
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || '@';

/**
 * Read-only preview of the email an invoice PDF was received through
 * (Invoice Details > PDF preview > Email button):
 *   Subject
 *   [AB] Sender Name <sender@domain>                      received date
 *        To: ...   Cc: ...
 *   plain-text body
 *   attachments - click one to show it in the PDF preview
 */
const SourceEmailPreview = ({ email, onClose, onSelectAttachment }) => {
  const { t } = useContext(LanguageContext);

  return (
    <Modal title={t('sourceEmail', 'Received Email')} onClose={onClose} width={760}>
      <div className="email-preview">
        <h4 className="email-subject">{email.subject || t('noSubject', '(no subject)')}</h4>

        <div className="email-meta">
          <span className="avatar email-avatar">{initialsOf(email.fromName || email.fromAddress)}</span>
          <div className="email-meta-main">
            <div className="email-from">
              {email.fromName && <strong>{email.fromName}</strong>}
              <span className="email-address">&lt;{email.fromAddress}&gt;</span>
            </div>
            <div className="email-recipients">
              <span>{t('emailTo', 'To')}: {email.to.join(', ')}</span>
              {email.cc.length > 0 && <span>{t('emailCc', 'Cc')}: {email.cc.join(', ')}</span>}
            </div>
          </div>
          <time className="email-date">{email.receivedAt}</time>
        </div>

        <div className="email-body">{email.body}</div>

        {email.attachments.length > 0 && (
          <div className="email-attachments">
            <div className="email-attachments-title">
              <Paperclip size={14} />
              {t('emailAttachments', 'Attachments')} ({email.attachments.length})
            </div>
            <div className="email-attachment-list">
              {email.attachments.map((a) => (
                <div key={a.id} className="email-attachment">
                  <button
                    type="button"
                    className="email-attachment-main"
                    onClick={() => onSelectAttachment(a.id)}
                    title={t('showInPreview', 'Show in PDF preview')}
                  >
                    <span className="email-attachment-type">PDF</span>
                    <span className="email-attachment-name">{a.fileName}</span>
                    {a.size && <span className="email-attachment-size">{a.size}</span>}
                  </button>
                  <a
                    className="email-attachment-open"
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={t('openPdf', 'Open PDF in a new tab')}
                    aria-label={`${t('openPdf', 'Open PDF in a new tab')}: ${a.fileName}`}
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SourceEmailPreview;
