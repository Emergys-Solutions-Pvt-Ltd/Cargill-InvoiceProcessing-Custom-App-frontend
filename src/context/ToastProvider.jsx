import React, { useCallback, useMemo, useRef, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Toast from '../components/Toast';
import { ToastContext } from './ToastContext';

/*
 * Global toasts: mounted once in App.jsx (inside LanguageProvider), used through useToast().
 * Top-right corner, stacked in the order they were shown. Each toast closes itself after its type's time
 * (Success / Info 4 s, Warning / Danger 6 s) or when its X is clicked. MUI Snackbar runs the timer: it pauses
 * while the toast is hovered or has keyboard focus, and restarts (for half the time) when that ends.
 */
const DURATION_MS = { success: 4000, info: 4000, warning: 6000, danger: 6000 };

// outside clicks must not close a toast
const SLOT_PROPS = { clickAwayListener: { mouseEvent: false, touchEvent: false } };

// each Snackbar is position: fixed by default: make it a normal block so toasts stack inside the region below
const SNACKBAR_SX = { position: 'static' };

const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((item) => item.id !== id));
  }, []);

  const api = useMemo(() => {
    const show = (type) => (message) => {
      const id = nextId.current++;
      setToasts((list) => [...list, { id, type, message }]);
      return id;
    };
    return { success: show('success'), info: show('info'), warning: show('warning'), error: show('danger'), dismiss };
  }, [dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-6 right-6 z-1400 flex flex-col items-end gap-3">
        {toasts.map(({ id, type, message }) => (
          <Snackbar
            key={id}
            open
            autoHideDuration={DURATION_MS[type]}
            // only the timer closes it from here: Escape (also used by dialogs) and outside clicks are ignored
            onClose={(_event, reason) => {
              if (reason === 'timeout') dismiss(id);
            }}
            transitionDuration={0}
            slotProps={SLOT_PROPS}
            sx={SNACKBAR_SX}
          >
            <Toast type={type} onClose={() => dismiss(id)}>{message}</Toast>
          </Snackbar>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
