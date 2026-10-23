import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/** Centered dialog with a title bar; closes on Escape or the X button. */
const Modal = ({ title, onClose, width = 480, children }) => {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
      <div className="modal-panel" style={{ maxWidth: width }}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;
