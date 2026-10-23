import React, { useContext, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import Modal from './Modal';
import { LanguageContext } from '../context/LanguageContext';

/**
 * In-app confirmation for destructive actions. `onConfirm` may be async; an error it throws
 * (axios error or Error) is shown inside the dialog instead of closing it.
 */
const ConfirmDialog = ({ title, message, confirmLabel, onConfirm, onClose }) => {
  const { t } = useContext(LanguageContext);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setBusy(true);
    setError('');
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose} width={420}>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{message}</p>
      {error && (
        <div className="form-error" style={{ marginTop: '1rem' }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}
      <div className="modal-actions">
        <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>
          {t('cancel', 'Cancel')}
        </button>
        <button type="button" className="btn btn-danger" onClick={handleConfirm} disabled={busy}>
          {busy ? t('working', 'Working...') : confirmLabel || t('delete', 'Delete')}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
