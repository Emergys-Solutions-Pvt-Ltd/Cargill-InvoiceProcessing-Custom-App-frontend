import { PublicClientApplication } from '@azure/msal-browser';

/*
 * Microsoft Entra ID (Azure AD) sign-in with MSAL (authorization code flow + PKCE, redirect).
 * Settings are baked in at build time from VITE_MSAL_* (frontend .env / Docker build args).
 * Without VITE_MSAL_CLIENT_ID the "Sign in with Microsoft" button is hidden.
 */
const env = import.meta.env;
const clientId = (env.VITE_MSAL_CLIENT_ID || '').trim();
const tenantId = (env.VITE_MSAL_TENANT_ID || '').trim();
const apiScope = (env.VITE_MSAL_API_SCOPE || '').trim();
const origin = typeof window !== 'undefined' ? window.location.origin : '';

export const msalConfigured = Boolean(clientId && (tenantId || env.VITE_MSAL_AUTHORITY));

// The API token is requested for the API's scope (api://<API client id>/access_as_user); without one the ID token is used
const loginScopes = apiScope ? [apiScope] : ['openid', 'profile', 'email'];

const pca = msalConfigured
  ? new PublicClientApplication({
      auth: {
        clientId,
        authority: (env.VITE_MSAL_AUTHORITY || '').trim() || `https://login.microsoftonline.com/${tenantId}`,
        redirectUri: (env.VITE_MSAL_REDIRECT_URI || '').trim() || `${origin}/login`,
        postLogoutRedirectUri: (env.VITE_MSAL_POST_LOGOUT_REDIRECT_URI || '').trim() || `${origin}/login`,
      },
      // Per tab, gone when the tab closes; cleared on sign-out
      cache: { cacheLocation: 'sessionStorage' },
    })
  : null;

/**
 * Started once when the app loads, before routing can change the URL: completes a sign-in redirect coming back
 * from Microsoft. Resolves to { token, account } after a redirect sign-in, otherwise null.
 */
export const msalRedirectResult = pca
  ? pca
      .initialize()
      .then(() => pca.handleRedirectPromise())
      .then((result) => {
        if (!result) return null;
        pca.setActiveAccount(result.account);
        return { token: apiScope ? result.accessToken : result.idToken, account: result.account };
      })
  : Promise.resolve(null);

/** Sends the browser to the Microsoft sign-in page; it comes back to /login. */
export const startMicrosoftSignIn = async () => {
  if (!pca) throw new Error('Microsoft sign-in is not configured');
  await msalRedirectResult.catch(() => null);
  await pca.loginRedirect({ scopes: loginScopes, prompt: 'select_account' });
};

/**
 * Removes the Microsoft account and its tokens from this browser (no redirect). The Microsoft session itself stays,
 * so the next "Sign in with Microsoft" can be one click; the app's own token is revoked by the API.
 */
export const clearMicrosoftSession = async () => {
  if (!pca) return;
  try {
    await msalRedirectResult.catch(() => null);
    await pca.clearCache();
  } catch {
    // nothing cached
  }
};
