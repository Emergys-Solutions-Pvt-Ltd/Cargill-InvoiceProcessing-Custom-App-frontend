# Frontend repo rules (React 19 · Vite · JavaScript)

Also follow the workspace rules in `../CLAUDE.md`. Owner agent: frontend-agent (`FE`).

## What this repo is
React 19 SPA, JavaScript/JSX (no TypeScript), ES modules, Vite 8, react-router-dom 7, axios, lucide-react icons.
Production build served by non-root nginx on port 8080 (Docker, Alpine), configured by the single root `nginx.conf`;
`/api` is reverse-proxied to `http://backend:4000`.
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
- Styling: plain CSS classes in `src/index.css` (`glass`, `btn btn-primary`, `badge-*`) with a feature prefix (`sap-*`, `email-*`).
  No CSS framework, no CSS modules, no UI library.
- New page: file under the right `pages/` area → route in `App.jsx` → menu entry in `GlobalLayout.jsx`.

## i18n (every visible string)
`t('key', 'English fallback')` and add the key to BOTH `src/locales/en.json` and `src/locales/es.json`.

## API calls
- Only through `apiClient` (`src/services/network.service.js`): `baseURL '/api'`, 5 s timeout (pass the `LONG_REQUEST` override for slow calls),
  Bearer token from localStorage, 401 → logout to `/login`.
- Paths WITHOUT `/api` (e.g. `apiClient.get('/apps/' + appId + '/invoices')`). No hard-coded hosts. Code uses no `import.meta.env`.
- The contract is the backend's `src/core/docs/openapi.ts`. Use field names exactly (camelCase). Never invent endpoints → handoff `H-FE-BE-nnn`.
- Responses: writes `{ message, data }` (use `response.data.data`); paged `{ data, totalItems, totalPages, page, limit }`.
- Errors: `{ message, details: { fieldErrors } }` → show with `apiError()` / `errorsFor()`.
- Every API call has loading, empty and error states.

## Protected (propose explicitly before editing)
`src/services/network.service.js`, `src/context/AuthContext.jsx`, `src/components/AuthRoute.jsx`,
`nginx.conf`, `Dockerfile` (+ `.DEV` / `.STG`), `docker-compose.yml`, `package-lock.json`.
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
