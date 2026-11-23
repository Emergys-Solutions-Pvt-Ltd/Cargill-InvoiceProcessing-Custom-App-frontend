import React from 'react';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import { X } from 'lucide-react';

/**
 * Centered dialog with a title bar (MUI Dialog: focus trap, Escape, backdrop click, aria wiring).
 * `width` is the maximum width in px; the dialog shrinks on small screens.
 */
const Modal = ({ title, onClose, width = 480, children }) => (
  <Dialog
    open
    onClose={onClose}
    maxWidth={false}
    scroll="body"
    aria-labelledby="modal-title"
    slotProps={{
      paper: {
        className: 'modal-panel',
        sx: { width: '100%', maxWidth: width, m: 2 },
      },
    }}
  >
    <div className="modal-header">
      <h3 id="modal-title">{title}</h3>
      <IconButton size="small" className="modal-close" onClick={onClose} aria-label="Close">
        <X size={16} />
      </IconButton>
    </div>
    {children}
  </Dialog>
);

export default Modal;
