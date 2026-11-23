import { PublicClientApplication } from '@azure/msal-browser';
import { config } from '../config/env';

/*
 * Microsoft Entra ID (Azure AD) sign-in with MSAL (authorization code flow + PKCE, redirect).
 * Settings come from the environment layer (src/config/env.js): VITE_MSAL_*[_DEV|_STG], baked in at build time.
 * Without a client id the "Sign in with Microsoft" button is hidden.
 */
const { clientId, tenantId, authority, redirectUri, postLogoutRedirectUri, apiScope } = config.msal;
const origin = typeof window !== 'undefined' ? window.location.origin : '';

export const msalConfigured = Boolean(clientId && (tenantId || authority));

// The API token is requested for the API's scope (api://<API client id>/access_as_user); without one the ID token is used
const loginScopes = apiScope ? [apiScope] : ['openid', 'profile', 'email'];

const pca = msalConfigured
  ? new PublicClientApplication({
      auth: {
        clientId,
        authority: authority || `https://login.microsoftonline.com/${tenantId}`,
        redirectUri: redirectUri || `${origin}/login`,
        postLogoutRedirectUri: postLogoutRedirectUri || `${origin}/login`,
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
