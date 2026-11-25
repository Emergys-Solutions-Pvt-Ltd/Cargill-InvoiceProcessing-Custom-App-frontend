# Frontend repo rules (React 19 · Vite · JavaScript)

Also follow the workspace rules in `../CLAUDE.md`. Owner agent: frontend-agent (`FE`).

## What this repo is
React 19 SPA, JavaScript/JSX (no TypeScript), ES modules, Vite 8, react-router-dom 7, axios, lucide-react icons.
Production build served by non-root nginx on port 8080 (Docker, Alpine), configured by the single root `nginx.conf`;
No backend dependency: `/api` is routed to the API in front of the container (Kubernetes ingress; the `proxy` service in `../docker-compose.yml` locally).
Three apps share the UI: GP, sjo, rospbu (`src/utils/appHelper.js` → `APPS`).

## Layout
- `src/App.jsx` — all routes (`<Routes>`); `src/index.css` — the one global stylesheet
- `src/components/` — shared widgets (Modal, ConfirmDialog, Pager, FormField, CcppTab, SjoInvoiceFields, InvoicePdfViewer …)
- `src/context/` — `AuthContext`, `LanguageContext`, `ThemeContext`
- `src/locales/` — `en.json`, `es.json`
- `src/services/` — `network.service.js` (axios `apiClient`), `auth.service.js`, storage, `statuses.js` (/lookups cache)
- `src/pages/app/` — invoice work per app (InvoiceList, InvoiceDetails, TeamAssignment)
- `src/pages/settings/` — admin (Users, Configuration, `integrations/`, `email/`)

## Conventions
- Components/pages: PascalCase `.jsx`, `const X = () => { … }; export default X;`
- Services: `<name>.service.js`. Feature helpers: `<feature>Ui.jsx` (use this casing for new files; `emailUI.jsx` is an old exception).
- camelCase functions/state (`handleSubmit`, `loadStatuses`); UPPER_SNAKE constants (`TABS`, `APPS`).
- State: React Context + local `useState`. No Redux/Zustand. No form library — controlled inputs + manual checks.
- Styling: MUI v9 components (theme `src/theme/muiTheme.js`, provider `src/theme/StyleProvider.jsx`) + Tailwind CSS v4 utilities
  (`src/index.css` top: no preflight, utilities are `!important`) + the existing classes in `src/index.css` (`glass`, `btn btn-primary`,
  `badge-*`, feature prefixes `sap-*`, `email-*`). Palette = CSS variables in `index.css`; in Tailwind use `text-(--text-secondary)`.
- **No inline CSS (VAPT / strict CSP):** never `style={...}`. Use Tailwind classes, MUI `sx`, or a class in `index.css`.
  Dynamic values: conditional full class names (Tailwind only sees literal class names), native attributes, or MUI `sx`.
  The production CSP allows `<style>` only with the nonce nginx injects (`nginx.conf`); MUI/Emotion gets it from `<meta name="csp-nonce">`.
- **Dates / times:** the API sends timestamps in UTC (ISO 8601) and date-only values as YYYY-MM-DD. Show them only through
  `src/utils/dateTime.js` (`formatDate` -> MM/DD/YYYY, `formatDateTime` -> MM/DD/YYYY hh:mm AM in the user's time zone);
  send user-entered times with `toUtcIso`, and use `todayLocal()` (never `new Date().toISOString()` for a date).
- New page: file under the right `pages/` area → route in `App.jsx` → menu entry in `GlobalLayout.jsx`.

## i18n (every visible string)
`t('key', 'English fallback')` and add the key to BOTH `src/locales/en.json` and `src/locales/es.json`.

## API calls
- Only through `apiClient` (`src/services/network.service.js`): base URL from `src/config/env.js` (`/api`, or `VITE_API_BASE_URL[_DEV|_STG]` + `/api`), 5 s timeout (pass the `LONG_REQUEST` override for slow calls),
  Bearer token from localStorage, 401 → logout to `/login`.
- Paths WITHOUT `/api` (e.g. `apiClient.get('/apps/' + appId + '/invoices')`). No hard-coded hosts.
- Environment variables: only `src/config/env.js` reads `import.meta.env` (build time). `ENVIRONMENT` (`.env`; set by each Dockerfile)
  picks the names: DEV -> `VITE_<NAME>_DEV` (Dockerfile.DEV), STAGE -> `VITE_<NAME>_STG` (Dockerfile.STG), PROD/empty -> `VITE_<NAME>`
  (Dockerfile); `vite.config.js` exposes it (`envPrefix`) and fails the build on any other value. Use `config.*` / `envVar('NAME')`; new variables need the three secrets in `.vela` + ARGs in all three Dockerfiles.
- Auth: password (`/auth/login`) or Microsoft Entra ID (MSAL -> `/auth/sso`); sign-out revokes the API session (`/auth/logout`);
  `AuthContext` signs out after `sessionIdleTimeoutMinutes` (default 30) without user activity.
- The contract is the backend's `src/core/docs/openapi.ts`. Use field names exactly (camelCase). Never invent endpoints → handoff `H-FE-BE-nnn`.
- Responses: writes `{ message, data }` (use `response.data.data`); paged `{ data, totalItems, totalPages, page, limit }`.
- Errors: `{ message, details: { fieldErrors } }` → show with `apiError()` / `errorsFor()`.
- Every API call has loading, empty and error states.

## Protected (propose explicitly before editing)
`src/services/network.service.js`, `src/services/msal.service.js`, `src/context/AuthContext.jsx`, `src/components/AuthRoute.jsx`,
`nginx.conf`, `Dockerfile` (+ `.DEV` / `.STG`), `docker-compose.yml`, `package-lock.json`, `.vela`, `.captain*.yml`, `src/config/env.js`, `src/theme/StyleProvider.jsx`, `index.html` (nonce meta).
Secret inputs use `type="password"`; never log or show secrets/tokens.

## Do not run without approval
`npm run dev` / `preview` against a real backend; `docker compose up` against a real backend;
any UI action against a live backend (Sync, Delete integration, bulk upload, Users delete).

## Checks before "done"
`npm run build` and `npm run lint` (oxlint). No tests exist, so the build is the safety net.
Lint baseline 2026-11-04: 0 errors, 32 `only-export-components` warnings — don't add new ones.

## Known issues (don't "fix" without a task)
Email Configuration: the Email Registration tab is wired to `/mailboxes` and `/app-modules` (H-FE-BE-001; needs the DB functions deployed, H-DB-USR-001/002). The Connection tab (`EmailConnectionTab.jsx`) is still UI-only: Graph credential storage is parked (D-011).
GP Salesforce fields read-only (no write path).
README is Vite boilerplate. Large files: `InvoiceList.jsx` (~1,180 lines), `index.css` (~1,900 lines).
`CcppTab` / `SjoInvoiceFields` are app-specific but live in shared `components/`.
