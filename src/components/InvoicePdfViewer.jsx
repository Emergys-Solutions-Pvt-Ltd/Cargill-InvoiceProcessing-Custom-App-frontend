import React, { useContext, useRef, useState } from 'react';
import { FileText, Mail, UploadCloud, Loader2 } from 'lucide-react';
import { apiClient } from '../services/network.service';
import { LanguageContext } from '../context/LanguageContext';

/**
 * Right-hand PDF panel of the Invoice Details page:
 *   File Name : IN-0001065698.pdf                     [PDF] [Email] [Upload]
 *   browser PDF viewer with the page-thumbnail sidebar (navpanes=1) and toolbar
 * Signed attachment URLs are same-origin (/api/files/...), so the browser viewer can frame them.
 */
const InvoicePdfViewer = ({ invoice, attachments, selectedId, onSelect, onUploaded }) => {
  const { t } = useContext(LanguageContext);
  const fileInput = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const current = attachments.find((a) => a.id === selectedId) || attachments[0];

  const openPdf = () => current && window.open(current.url, '_blank', 'noopener');

  const emailInvoice = () => {
    const subject = `${t('invoice', 'Invoice')} ${invoice.invoiceNumber}`;
    const body = [
      `${t('invoice', 'Invoice')}: ${invoice.invoiceNumber}`,
      `${t('vendorName', 'Vendor')}: ${invoice.vendorLegalName}`,
      `${t('link', 'Link')}: ${window.location.href}`
    ].join('\n');
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError(t('onlyPdf', 'Only PDF files can be uploaded.'));
      return;
    }
    setUploading(true);
    setError('');
    try {
      const response = await apiClient.post(`/invoices/${encodeURIComponent(invoice.id)}/attachments`, file, {
        params: { fileName: file.name },
        headers: { 'Content-Type': 'application/pdf' },
        timeout: 120000
      });
      onUploaded(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || t('uploadFailed', 'Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="pdf-panel">
      <div className="pdf-panel-header">
        <div className="pdf-panel-file">
          <span>{t('fileName', 'File Name')} :</span>
          {attachments.length > 1 ? (
            <select
              className="pdf-panel-select"
              value={current?.id ?? ''}
              onChange={(e) => onSelect(Number(e.target.value))}
              aria-label={t('fileName', 'File Name')}
            >
              {attachments.map((a) => (
                <option key={a.id} value={a.id}>{a.fileName}</option>
              ))}
            </select>
          ) : (
            <strong>{current?.fileName || '–'}</strong>
          )}
        </div>
        <div className="pdf-panel-actions">
          <button type="button" className="pdf-icon pdf" title={t('openPdf', 'Open PDF in a new tab')} onClick={openPdf} disabled={!current}>
            <FileText size={18} />
          </button>
          <button type="button" className="pdf-icon mail" title={t('emailInvoice', 'Email this invoice')} onClick={emailInvoice}>
            <Mail size={18} />
          </button>
          <button type="button" className="pdf-icon upload" title={t('uploadPdf', 'Upload a PDF')} onClick={() => fileInput.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 size={18} className="spin" /> : <UploadCloud size={18} />}
          </button>
          <input ref={fileInput} type="file" accept="application/pdf,.pdf" hidden onChange={handleUpload} />
        </div>
      </div>

      {error && <div className="form-error" style={{ margin: '0.5rem 0.75rem 0' }}>{error}</div>}

      {current ? (
        <iframe
          key={current.id}
          className="pdf-panel-frame"
          src={`${current.url}#toolbar=1&navpanes=1&view=FitH`}
          title={current.fileName}
        />
      ) : (
        <div className="pdf-panel-empty">{t('noPdf', 'No PDF attached to this invoice.')}</div>
      )}
    </div>
  );
};

export default InvoicePdfViewer;
