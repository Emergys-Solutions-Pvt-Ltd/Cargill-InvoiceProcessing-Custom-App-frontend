import { createContext, useContext } from 'react';

/*
 * Toast API for the whole app. <ToastProvider> (ToastProvider.jsx, mounted once in App.jsx) fills it.
 *
 *   const toast = useToast();
 *   toast.success(t('saved', 'Saved'));            // also toast.info / toast.warning / toast.error
 *   const id = toast.error(message);  toast.dismiss(id);
 *
 * Each call returns the toast id. The object is stable between renders, so it is safe in effect dependencies.
 * Kept in a .js file apart from the provider so neither file mixes components with non-components (lint).
 */
export const ToastContext = createContext(null);

export const useToast = () => {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside <ToastProvider>');
  return api;
};
