import React, { useContext, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
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
    <Modal title={title} onClose={busy ? () => {} : onClose} width={420}>
      <p className="text-sm leading-normal text-(--text-secondary)">{message}</p>
      {error && (
        <Alert severity="error" className="mt-4">
          {error}
        </Alert>
      )}
      <div className="modal-actions">
        <Button variant="outlined" color="inherit" onClick={onClose} disabled={busy}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button variant="contained" color="error" onClick={handleConfirm} disabled={busy}>
          {busy ? t('working', 'Working...') : confirmLabel || t('delete', 'Delete')}
        </Button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
