/*
 * Environment layer: the only place that reads import.meta.env (Vite, baked in at build time).
 *
 * ENVIRONMENT (.env locally; set by each Dockerfile in the pipeline) selects which variable names are used:
 *   DEV   -> VITE_<NAME>_DEV   e.g. VITE_MSAL_CLIENT_ID_DEV   (Dockerfile.DEV)
 *   STAGE -> VITE_<NAME>_STG   e.g. VITE_MSAL_CLIENT_ID_STG   (Dockerfile.STG)
 *   PROD  -> VITE_<NAME>       e.g. VITE_MSAL_CLIENT_ID       (Dockerfile; also when ENVIRONMENT is empty)
 * vite.config.js exposes ENVIRONMENT to the bundle (envPrefix) and stops the build on any other value.
 * There is no fallback between environments: a DEV build never reads production names and vice versa.
 */
const raw = import.meta.env;

const SUFFIXES = { DEV: '_DEV', STAGE: '_STG', PROD: '' };
const ALIASES = { DEVELOPMENT: 'DEV', STG: 'STAGE', STAGING: 'STAGE', PRODUCTION: 'PROD', PRD: 'PROD' };

const normaliseEnv = (value) => {
  const v = String(value || '').trim().toUpperCase();
  const name = ALIASES[v] || v;
  return name in SUFFIXES ? name : 'PROD';
};

/** DEV | STAGE | PROD */
export const APP_ENV = normaliseEnv(raw.ENVIRONMENT);

/** Value of VITE_<name> for the current environment (with its _DEV / _STG suffix), trimmed; '' when not set. */
export const envVar = (name) => String(raw[`VITE_${name}${SUFFIXES[APP_ENV]}`] ?? '').trim();

/**
 * API root used by apiClient. VITE_API_BASE_URL[_DEV|_STG] is the API origin (https://api-dev.example.com) or the
 * full root (https://api-dev.example.com/api); empty = same origin '/api' (ingress / local proxy).
 */
const apiBaseUrl = () => {
  const base = envVar('API_BASE_URL').replace(/\/+$/, '');
  if (!base) return '/api';
  return /\/api$/i.test(base) ? base : `${base}/api`;
};

export const config = Object.freeze({
  appEnv: APP_ENV,
  apiBaseUrl: apiBaseUrl(),
  msal: Object.freeze({
    clientId: envVar('MSAL_CLIENT_ID'),
    tenantId: envVar('MSAL_TENANT_ID'),
    authority: envVar('MSAL_AUTHORITY'),
    redirectUri: envVar('MSAL_REDIRECT_URI'),
    postLogoutRedirectUri: envVar('MSAL_POST_LOGOUT_REDIRECT_URI'),
    apiScope: envVar('MSAL_API_SCOPE'),
  }),
});
