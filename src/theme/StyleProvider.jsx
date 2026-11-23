import React from 'react';
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { ThemeProvider } from '@mui/material/styles';
import { muiTheme } from './muiTheme';

/*
 * MUI styles are generated at run time by Emotion as <style> elements. The production Content-Security-Policy
 * (nginx.conf) only allows <style> elements carrying the per-response nonce, which nginx writes into
 * <meta name="csp-nonce"> of index.html. Emotion stamps that nonce on every <style> it creates.
 * In `npm run dev` the placeholder is not replaced and there is no CSP: no nonce is used.
 */
const NONCE_PLACEHOLDER = '__CSP_NONCE__';
const metaNonce = document.querySelector('meta[name="csp-nonce"]')?.getAttribute('content') || '';
const nonce = metaNonce && metaNonce !== NONCE_PLACEHOLDER ? metaNonce : undefined;

const emotionCache = createCache({ key: 'mui', nonce });

const StyleProvider = ({ children }) => (
  <CacheProvider value={emotionCache}>
    <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>
  </CacheProvider>
);

export default StyleProvider;
