# Agent changelog — Cargill-InvoiceProcessing-Custom-App-frontend

What each agent changed in this repo, and why. Newest entry on top. Never delete or rewrite old entries.
Written for a future developer who has no context.

## Entry format
```markdown
## YYYY-MM-DD — <short title> (Feature: <feature-name>)
**Agent:** frontend-agent · **Status:** Done | Partial | Blocked · **Handoffs:** H-xx-yy-nnn

### What changed
- `path/to/file` — what changed

### Why
<the reason / the request it answers>

### Cross-repo impact
- <repo>: <what they must know or do> (handoff ID)

### New env vars / dependencies / commands for the user
- None

### Still to do / known issues
- None
```

---

## 2026-11-25 — Inbox tab and pages removed from every application (Feature: email-inbox)
**Agent:** frontend-agent · **Status:** Done (build + lint) · **Handoffs:** none

### What changed
- `src/components/AppLayout.jsx` — the "Inbox" tab is gone; the app tab bar is Invoices (+ Team Assignment for admins).
- Deleted `src/pages/app/Inbox.jsx`, `InboxEmailDetail.jsx`, `inboxUi.jsx` and `src/services/mailboxEmails.service.js`
  (nothing else used them); `src/App.jsx` no longer has the `inbox` / `inbox/:emailId` routes (those URLs now fall through
  to the app's catch-all like any unknown path).
- `src/index.css` — the `inbox-*` block removed. `src/locales/en.json`, `es.json` — the 50 `inbox*` keys removed.
- `DECISIONS.md` D-FE-005 marked obsolete.

### Why
User request: remove the Inbox tab from the invoice list page, and its pages too.

### Not changed
- Backend `/apps/{appId}/mailbox-emails` and `/apps/{appId}/mailboxes` endpoints stay (no UI uses them now).
- Mailbox registration in Settings > Email Configuration is unchanged (it still uses the `inbox` folder default).
- `nginx.conf` (protected) still mentions InboxEmailDetail in a comment only; no behaviour depends on it.

---

## 2026-11-24 — Date/time localization: user time zone, MM/DD/YYYY (Feature: localization)
**Agent:** frontend-agent · **Status:** Done (build + lint; formatter checked in UTC+05:30; Details / Audit History checked in the browser with a mocked API) · **Handoffs:** none

- `src/utils/dateTime.js` (new) — `formatDate` (MM/DD/YYYY; date-only values never shifted), `formatDateTime`
  (MM/DD/YYYY hh:mm AM in the browser's time zone), `toUtcIso` (local entry -> UTC for the API), `todayLocal`, `userTimeZone`.
- Used by: Invoices grid (reception date, email reception date), Invoice Details (email reception, invoice / reception dates,
  ROSPBU dates, Salesforce dates), Audit History, Inbox, source email preview, Email Configuration and Integrations pages
  (`emailUI.formatDateTime` / `integrationUi.formatDateTime` delegate to it).
- Create Invoice / Bulk Upload: "today" is the user's local date (was the UTC date); the email reception date/time typed by the
  user is sent as UTC (`toUtcIso`).

### Known limits
- Native `<input type="date">` pickers (ROSPBU create, integration filters) display in the browser's locale format; the value is
  still YYYY-MM-DD. Currency formatting was left unchanged (user decision).

---

## 2026-11-24 — Invoice Details "Audit History" tab (Feature: invoice-audit-history)
**Agent:** frontend-agent · **Status:** Done (build + lint; checked in the browser with a mocked API) · **Handoffs:** none

- `src/components/InvoiceAuditTab.jsx` (new) — table: date & time (user's locale), action badge, user ("System" for sync /
  mailbox changes), changed fields as "Field: old -> new" (known fields translated, others humanized; true/false as Yes/No).
  Loads `GET /apps/:appId/invoices/:invoiceId/audit-history` each time the tab opens; Refresh button.
- `src/pages/app/InvoiceDetails.jsx` — third tab "Audit History" next to Details / CCPP (every app).
- Locales: `auditHistory`, `audit*` keys, `yes`, `no`.

---

## 2026-11-24 — Collapsible side menu (Feature: menu-collapse)
**Agent:** frontend-agent · **Status:** Done (build + lint; checked in the browser under the strict CSP, no API) · **Handoffs:** none

- `src/components/GlobalLayout.jsx` — collapse / expand button (PanelLeftClose / PanelLeftOpen) in the top-right corner of the menu;
  collapsed = 64 px, icons only with tooltips; clicking the Settings icon expands the menu and opens the section. The choice is
  kept in localStorage (`sidebarCollapsed`).
- `src/index.css` — `.sidebar-toggle`, `.sidebar.collapsed` rules, width transition (off with prefers-reduced-motion).
- Locales: `collapseMenu`, `expandMenu`.

---

## 2026-11-23 — Environment layer (_DEV / _STG / production variables) + .vela per-branch pipeline (Feature: env-layer)
**Agent:** frontend-agent · **Status:** Done (build + lint; DEV/STG/PROD bundles checked; Docker images not built - no Docker here) · **Handoffs:** none

- `src/config/env.js` (new) — the only reader of `import.meta.env`. `VITE_APP_ENV` DEV/STG/PROD selects `VITE_<NAME>_DEV`,
  `VITE_<NAME>_STG` or `VITE_<NAME>`; no fallback between environments. Exposes `config.apiBaseUrl` and `config.msal`.
- `msal.service.js` reads `config.msal`; `network.service.js` uses `config.apiBaseUrl` (`/api` or `VITE_API_BASE_URL*` + `/api`).
- `Dockerfile` / `.DEV` / `.STG` — set `VITE_APP_ENV` (PROD / DEV / STG); runtime stage writes the API origin and a custom MSAL
  authority origin into the nginx CSP (`__CSP_EXTRA_ORIGINS__` in connect-src / frame-src; https host only).
  `.DEV` / `.STG` back to the numeric `USER 101:101` (`USER nginx` breaks Kubernetes runAsNonRoot).
- `.vela` — header documents the mapping; production secrets: duplicate `VITE_MSAL_CLIENT_ID` removed, missing
  `VITE_MSAL_AUTHORITY` added (the prod step referenced it); branches `stage`+`staging`, `main`+`production`.
- `.env.example`, `CLAUDE.md` updated.

- Follow-up: the selector is `ENVIRONMENT` (DEV / STAGE / PROD) in `.env` and in each Dockerfile (replaces `VITE_APP_ENV`);
  `vite.config.js` exposes it with `envPrefix` and stops the build on an unknown value. `.env.example` lists the three variable sets.

### Still to do / known issues
- A cross-origin API (`VITE_API_BASE_URL*` set) needs the backend `CORS_ORIGINS` to list the frontend origin.
- `.captain*.yml` still send their own CSP with `'unsafe-inline'`; if the ingress adds it next to nginx's, browsers enforce both
  (nginx's strict one still applies) but scanners will report the `unsafe-inline` header.

---

## 2026-11-23 — Login page redesign: split brand panel + SSO-first (Feature: login-redesign)
**Agent:** frontend-agent · **Status:** Done (build + lint; checked in the browser under the strict CSP, with and without MSAL settings) · **Handoffs:** none

- `src/pages/Login.jsx` — left green "Enterprise Service Portal" panel (hidden below `md`), right panel: Cargill logo, title
  "LATAM Invoice Workflow", SSO hint text and a full-width "Login" button (Microsoft Entra ID). Password form shown below only when
  the API reports password login enabled; demo accounts collapsed behind "Use a demo account".
- `src/index.css` — `.login-hero` (gradient + hexagon pattern as a `data:` SVG; no inline CSS).
- Locales: `appName`, `login`, `loginHeroTitleLine1/2`, `loginHeroSubtitle`, `loginSsoHint`, `showDemoAccounts`, `hideDemoAccounts`.
- To match the mock-up exactly (SSO button only) run the API with `AUTH_PASSWORD_LOGIN_ENABLED=false`.

---

## 2026-11-23 — MUI + Tailwind CSS, no inline CSS, strict nonce-based CSP (Feature: ui-mui-tailwind)
**Agent:** frontend-agent · **Status:** Done (build + lint; pages checked in the browser under the strict CSP with no API) · **Handoffs:** none

### What changed
- Dependencies: `@mui/material` 9, `@emotion/react`, `@emotion/styled`, `@emotion/cache`, `tailwindcss` 4 + `@tailwindcss/vite`,
  `@fontsource/inter` (Inter self-hosted; the Google Fonts `@import` is gone - no third-party requests).
- `src/theme/muiTheme.js`, `src/theme/StyleProvider.jsx` (new) — MUI theme with the Cargill palette; Emotion cache stamped with the
  CSP nonce from `<meta name="csp-nonce">` (`index.html`). `main.jsx` wraps the app; `vite.config.js` adds the Tailwind plugin.
- `src/index.css` — Tailwind theme + utilities (no preflight, `important` so classes keep the precedence inline styles had).
- `Modal` (MUI Dialog: focus trap, Escape, backdrop), `ConfirmDialog` (MUI Buttons + Alert), `Pager` (MUI TablePagination),
  `AuthRoute` (MUI spinner), `Login` (MUI Paper / TextField / Button / Alert / Divider) rebuilt on MUI.
- All 225 `style={...}` props in 22 files replaced with Tailwind classes - `grep "style=" src` finds none.
- `nginx.conf` — strict CSP on index.html: `default-src 'self'; script-src 'self'; style-src 'self' 'nonce-$request_id'`, images /
  fonts self + data/blob, `connect-src`/`frame-src` add login.microsoftonline.com (MSAL), `object-src 'none'`; nonce written into
  index.html with `sub_filter`. Assets get `default-src 'none'`.
- Locales: `orSignInManually`.

### Why
Request: use MUI and Tailwind CSS; avoid inline CSS that VAPT reports (and allow a CSP without 'unsafe-inline').

### Still to do / known issues
- Page layouts still use the `index.css` classes (tables, tabs, forms); moving those screens to MUI components is a separate step.
- `InvoiceList.jsx` has its own pager markup (not the shared `Pager`).
- Not checked against a running API or in the nginx container (Docker unavailable); run `nginx -t` and look for CSP errors in the
  browser console after the next build. A custom `VITE_MSAL_AUTHORITY` host must be added to `connect-src` / `frame-src`.
- The login page still pre-fills the demo admin credentials (VAPT will flag them); hide with `AUTH_PASSWORD_LOGIN_ENABLED=false`.

---

## 2026-11-23 — Fix CrashLoopBackOff on Kubernetes (dev): /api proxy removed, image has no backend dependency (Feature: container-security)
**Agent:** frontend-agent · **Status:** Done in source; not built (no container engine running) · **Handoffs:** none

### What changed
- `nginx.conf` — `proxy_pass http://backend:4000` removed (it made nginx exit at start-up where no "backend" host exists:
  Kubernetes dev, "Back-off restarting failed container lataminvoiceworkflow", rolled back). nginx serves the React build
  only; `/api/` answers 404 here and must be routed to the API in front of the container (ingress).
- `docker-compose.yml` — `backend:host-gateway` removed; frontend-only compose has no API (use the full stack or `npm run dev`).
- `../docker-compose.yml` (workspace root, not in git) — new `proxy` service (web image + inline nginx config) routes
  `/api/` -> api and the rest -> web on port 8080, like the ingress; the `backend` network alias is gone.
- `Dockerfile` (+ `.DEV` / `.STG`) — nginx user created with fixed uid/gid 101 (as in nginx-unprivileged) and `USER 101:101`,
  so Kubernetes `runAsNonRoot` / `runAsUser: 101` accept the image.

### Why
Captain dev deployment failed after the "Docker Issues" commits (pod restart back-off, rollback).

### Still to do / known issues
- Confirm with the pod log (`kubectl logs <pod> --previous`) after redeploying.

---

## 2026-11-23 — Sign in with Microsoft (Entra ID), 30-minute inactivity logout, server-side logout (Feature: sso-entra-id)
**Agent:** frontend-agent · **Status:** Done (build + lint; idle logout checked in the browser; Microsoft sign-in not tried against a real tenant) · **Handoffs:** none

### What changed
- `src/services/msal.service.js` (new) — `@azure/msal-browser` (redirect flow, PKCE, sessionStorage cache) from `VITE_MSAL_*`;
  completes the redirect at app start; `clearMicrosoftSession` removes Microsoft tokens from the browser.
- `src/services/auth.service.js` — `loginWithMicrosoft` (POST `/auth/sso`), `logout` now revokes the session on the API
  (`POST /auth/logout`) and clears the app token, user, activity stamp and MSAL cache; activity / idle helpers.
- `src/context/AuthContext.jsx` — finishes the Microsoft redirect; inactivity timer (mouse/keyboard/scroll/touch, shared by
  all tabs through localStorage) signs out after `sessionIdleTimeoutMinutes` (API, default 30); keep-alive `/auth/me` every
  5 min while active; sign-out in one tab signs out the others.
- `src/pages/Login.jsx` — "Sign in with Microsoft" button (shown when MSAL is configured and the API has SSO on);
  password form / demo accounts hidden when the API disables password login; idle / expired notices;
  the old "Login with Active Directory" checkbox removed.
- `src/services/network.service.js` — `skipAuthRedirect` request option (sign-in / sign-out handle their own 401; a wrong
  password no longer reloads the page); 401 stores an "expired" notice.
- `src/locales/en.json`, `es.json` — 5 keys. `.env.example` (new), `Dockerfile` (+ `.DEV` / `.STG`) comments,
  `.dockerignore` (`Dockerfile*`), `docker-compose.yml` build args `VITE_MSAL_*`.

### Why
Request: Login with SSO (Azure Entra ID), 30-minute inactivity logout, token invalid after logout.

### Cross-repo impact
- backend: needs `/auth/options`, `/auth/sso`, `/auth/logout` (same feature).

### New env vars / dependencies / commands for the user
- Build-time: `VITE_MSAL_CLIENT_ID`, `VITE_MSAL_TENANT_ID`, `VITE_MSAL_AUTHORITY`, `VITE_MSAL_REDIRECT_URI`,
  `VITE_MSAL_POST_LOGOUT_REDIRECT_URI`, `VITE_MSAL_API_SCOPE` (already Docker build args). Dependency `@azure/msal-browser` 5.
- The code now reads `import.meta.env` (msal.service.js only).

### Still to do / known issues
- Sign-out clears the Microsoft tokens in this browser but does not end the Microsoft session itself (no redirect to
  Microsoft): the next "Sign in with Microsoft" may be one click.

---

## 2026-11-23 — Frontend image: critical CVEs fixed (Feature: container-security)
**Agent:** frontend-agent · **Status:** Done in source; image not rebuilt / rescanned yet (Docker unavailable) · **Handoffs:** none

### What changed
- `Dockerfile`, `Dockerfile.DEV`, `Dockerfile.STG` — runtime stage now `alpine:3.24` (pinned digest) + Alpine's `nginx` package
  instead of `nginxinc/nginx-unprivileged:stable-alpine` (nginx 1.30.6; no 1.30.7 image published). The build requires
  nginx >= 1.30.7-r0, zlib >= 1.4-r0, brotli-libs >= 1.2.1-r0 (if present) and fails if curl / libcurl are installed.
  Non-root (user `nginx`), port 8080, health check via busybox wget on `/healthz`. Build stage unchanged.
- `nginx.conf` (new, single file at the repo root, copied to /etc/nginx/nginx.conf; the Dockerfiles already expected it):
  `/api/` proxy to `http://backend:4000`, `server_tokens off`, 20 MB bodies, gzip, `/healthz`, `absolute_redirect off`,
  `no-cache` index.html / immutable `/assets/`, security headers (nosniff, X-Frame-Options SAMEORIGIN, CSP frame-ancestors /
  base-uri / form-action 'self', Referrer-Policy, Permissions-Policy, COOP) on the static locations only (the API uses helmet),
  temp files and pid in /tmp, logs to stdout / stderr.
- `nginx/` folder removed (`default.conf.template` with `API_UPSTREAM` substitution); `API_UPSTREAM` no longer exists.
- `docker-compose.yml` — port 8080, `backend` mapped to the Docker host (`extra_hosts: backend:host-gateway`).

### Why
Image scan: CRITICAL CVE-2026-113425/-121810/-123007/-123633/-123634 (nginx 1.30.6), CVE-2026-4738 (zlib),
CVE-2026-111497 (brotli-libs, CISA KEV), CVE-2026-86411/-86413/-86414/-87861/-87866/-92388/-94265 (curl, libcurl).

### Cross-repo impact
- Workspace `../docker-compose.yml`: web port mapping changed to `8080:8080`.

---

## 2026-11-05 — Inbox tab, list and email detail in each application (Feature: email-inbox)
**Agent:** frontend-agent · **Status:** Done (UI built against the D-023 contract; not yet tested against the API) · **Handoffs:** none

### What changed
- `src/services/mailboxEmails.service.js` (new): `listMailboxEmails`, `getMailboxEmail`, `setMailboxEmailStatus`,
  `listAppMailboxes` through `apiClient` (`/apps/{appId}/mailbox-emails…`, `/apps/{appId}/mailboxes`), plus the
  `MAILBOX_EMAIL_STATUSES` codes. Empty filters are not sent.
- `src/pages/app/inboxUi.jsx` (new): `InboxStatusBadge` (New = `badge-info`, Ignored = `badge-neutral`,
  Failed = `badge-danger` with `statusNote` tooltip, Processed = `badge-success`), `InboxStatusOptions`,
  `InboxDateTime`, constants `INBOX_ALL` / `INBOX_DEFAULT_STATUS`. Components and primitive constants only, so no new
  `only-export-components` warnings.
- `src/pages/app/Inbox.jsx` (new): list with search (250 ms delay like InvoiceList), status filter (New default,
  Ignored, Failed, Processed, All), mailbox filter ("address (module name)", "All mailboxes" default), Refresh,
  shared `Pager` (10/20/50). Columns Received, From, Subject, Mailbox (+ module), PDFs (paperclip + count, 0 muted),
  Status. Whole row clickable (and Enter on a focused row). Loading row, empty message per filter, error box with
  "Try again". Filters live in the URL query (`?status=&mailboxId=&search=&page=&limit=`, defaults omitted);
  any filter change resets the page to 1 (D-FE-005).
- `src/pages/app/InboxEmailDetail.jsx` (new): full page using `.details-split`. Left: subject, status, From / To / Cc /
  Received / Mailbox (module), status note, "Linked to invoice" line, plain-text body (`pre-wrap`). Right: `pdf-panel`
  with one tab per attachment, iframe of the signed `url`, open-in-new-tab link, "No PDF attachments" when empty.
  Actions: Ignore (New / Failed) opens a dialog with an optional note (max 1000, counter, `fieldErrors.note`) →
  PATCH `Ignored`; Move back to New (Ignored) → PATCH `New`; no action when Processed or `invoiceId` is set. The page is
  updated from the PATCH response (`data`) and shows a success notice; 400/404/409 messages are shown as returned by the
  API. "Back to Inbox" returns to the list with its previous query string.
- `src/App.jsx`: `inbox` → `<Inbox />` and `inbox/:emailId` → `<InboxEmailDetail />` inside every APPS route.
- `src/components/AppLayout.jsx`: "Inbox" tab (lucide `Mail`) between Invoices and Team, for every user with app access.
- `src/index.css`: new `inbox-*` block at the end (toolbar, table cells, detail bar, email panel, PDF tabs, Ignore dialog);
  colours only through CSS variables. Reuses `table-container`, `badge-*`, `tab-link`, `details-split`, `pdf-panel*`,
  `form-error`, `form-success`, `btn*`.
- `src/locales/en.json`, `es.json`: 50 new `inbox*` keys (listed in the task report). Reused existing keys: `refresh`,
  `noSubject`, `openPdf`, `cancel`, `working`.
- `DECISIONS.md`: D-FE-005 (Inbox filters in the URL query).

### Why
Parent `DECISIONS.md` D-020 (Inbox inside each application), D-021 (view + Ignore / undo), D-023 (contract and UI),
built in parallel with BE and DB per D-022.

### Cross-repo impact
- Backend: needs the four D-023 routes (`GET/PATCH /apps/:appId/mailbox-emails…`, `GET /apps/:appId/mailboxes`) and the
  signed `/api/files/mailbox-attachments/{id}` link; field names used exactly as in D-023.
- Database: needs the `usp_mailbox_email_*`, `usp_mailbox_attachment_*`, `usp_mailbox_list_for_application` functions
  deployed on Supabase (run by the user).

### New env vars / dependencies / commands for the user
- None. Checks: `npm run build` passes; `npm run lint` 0 errors / 32 warnings (unchanged baseline).

### Still to do / known issues
- Not tested against the API or in a browser (no dev server per the user's instructions); compare with `openapi.ts`
  once backend-agent has added the routes.
- `size` of an attachment is shown as-is when it is text, or formatted when it is a number of bytes (contract doesn't say).
- The app currently ships only a light theme (`ThemeContext` forces `light`); the new CSS uses variables only.

---

## 2026-11-05 — Email Registration: add/edit form shown as its own panel (Feature: email-configuration)
**Agent:** main session (user asked directly, "please do needful") · **Status:** Done · **Handoffs:** none

### What changed
- `src/pages/settings/email/EmailRegistrationTab.jsx`: the add/edit `<section>` gets the classes `email-form-panel` and
  `is-editing` (in edit mode). Its heading now has an icon (Plus / Pencil), and a one-line hint sits under the heading.
- `src/index.css`: new `.email-section.email-form-panel` rules (border, green left bar, light tint built from
  `--primary-rgb` so dark mode works, padding, top margin; a stronger tint in `.is-editing`), placed after `.email-section h3`.
- `src/locales/en.json`, `es.json`: `emailAddMailboxHint`, `emailEditMailboxHint`.

### Why
While testing the tab against Supabase on 2026-11-05, the user found that the "Add mailbox" form looked like part
of the "Registered mailboxes" table. Edit mode now also stands out.

### Cross-repo impact
- None (styling and text only).

### New env vars / dependencies / commands for the user
- None. Checks: `npm run build` passes; `npm run lint` shows 0 errors and 32 warnings (unchanged baseline).

### Still to do / known issues
- Not checked in dark mode or at phone width; check it visually.

---

## 2026-11-04 — Email Registration tab wired to /mailboxes and /app-modules (Feature: email-configuration)
**Agent:** frontend-agent · **Status:** Done · **Handoffs:** H-FE-BE-001 (Done), H-DB-USR-001, H-DB-USR-002

### What changed
- `src/pages/settings/email/EmailRegistrationTab.jsx` — rewritten from local-state mock to the real API:
  - List: `GET /mailboxes?page=&limit=` with the shared `Pager` (default 10 rows, same as `Users.jsx`), loading row,
    empty note (`emailNoMailboxes`), load error box and a Refresh button (reloads the list and the module dropdown).
  - New "Last polled" column: `formatDateTime(lastPolledAt)`, "Not polled yet" when null, red Error badge with
    `lastError` as tooltip (D-018i).
  - Status column is now a per-row Active `Toggle`: `PUT /mailboxes/{id}` with the full row and `isActive` flipped
    (full replace, D-018c); only that row's toggle is disabled while saving.
  - One add/edit form: Pencil loads the row into the form (`POST /mailboxes` vs `PUT /mailboxes/{id}`); in edit mode
    the hint "Changing the address or folder restarts reading from the start." is shown (D-017, D-018i).
    Field errors from `details.fieldErrors` (`address` | `folder` | `moduleSlug`) under each field; other errors
    (409 duplicate, 404) at form level via `apiError()`. The local duplicate check was removed; the required-field
    check stays. A blank folder is sent as `inbox`.
  - Target application dropdown loads `GET /app-modules` (D-014, D-015), labels "name (slug)"; when editing, the row's
    current slug stays selectable via `moduleName` even if it is no longer in the list (D-016). No more `APPS` import here.
  - Delete through `ConfirmDialog`; the API's 409 ("has received emails … Set it to Inactive instead.", D-013) is shown
    in the dialog. After any add / edit / delete the current page is reloaded; deleting the last row on a page > 1 goes back one page.
- `src/pages/settings/email/emailUI.jsx` — `emptyMailbox()` uses `address` / `folder: 'inbox'` (D-012). Other helpers untouched.
- `src/locales/en.json`, `es.json` — 13 new keys: `emailEditMailbox`, `emailDeleteMailbox`, `emailConfirmDeleteMailbox`,
  `emailMailboxCreated`, `emailMailboxUpdated`, `emailMailboxDeleted`, `emailLastPolled`, `emailNotPolledYet`,
  `emailPollError`, `emailFolderChangeHint`, `emailLoadMailboxesFailed`, `emailLoadModulesFailed`, `emailSaveMailboxFailed`.
  `{address}` is filled with `.replace('{address}', …)` like `Users.jsx`. No keys deleted (`emailMailboxDuplicate` is now unused).
- `src/index.css` — `.email-form-actions`, `.email-row-actions`, `.email-poll-status`.
- `CLAUDE.md` — "Known issues" updated: Registration tab now wired, Connection tab still UI-only (D-011); removed the wrong upload-route claim (H-FE-BE-002 Rejected, D-018k).

### Why
H-FE-BE-001: the tab was UI-only (TODOs, data lost on reload). The backend contract is in backend
`src/core/docs/openapi.ts` (tags Mailboxes, Apps). Decisions: parent `DECISIONS.md` D-011 to D-018.

### Cross-repo impact
- database: the routes return 500 until the user deploys the DB functions (H-DB-USR-002, with H-DB-USR-001).
- backend: none; uses the contract as published. No mismatch found.

### New env vars / dependencies / commands for the user
- None. Checks: `npm run build` OK; `npm run lint` 0 errors, 32 warnings (unchanged baseline).

### Still to do / known issues
- Connection tab (`EmailConnectionTab.jsx`) still unwired — Graph credential storage is parked (D-011).
- D-018l items for a later task: unused helpers in `emailUI.jsx`, "Source Email Details" labels in `InvoiceDetails.jsx`,
  null guards in `SourceEmailPreview.jsx`.
- Not tested against a running backend (no dev server per rules).
- The list has no search box (the API supports `search`); can be added if wanted.

## 2026-11-04 — Baseline: state before agents (Feature: baseline)
**Agent:** setup (from repo analysis) · **Status:** Done · **Handoffs:** H-FE-BE-001, H-FE-BE-002

### What exists (8 commits on main)
- Base app (Oct 23): login, invoice list/detail, users, master-data configuration, team assignment
- Invoice source email preview (Oct 24); SAP integration settings and sync dashboard (Oct 24)
- OnBase (Nov 2): `settings/sap/` generalised to `settings/integrations/` with `providerType`
- GP CCPP tab on Invoice Detail (Nov 2); SJO fields and app-specific schema (Nov 3)
- Email Configuration settings page — Connection and Registration tabs, UI only (Nov 4)

### Why
Recorded as the starting point so later entries have context. Reasons per commit: needs confirmation from the user.

### Cross-repo impact
- backend: all calls go to `/api/...` via `apiClient`.

### Still to do / known issues
- Email Configuration not wired: TODOs in `EmailConnectionTab.jsx:19`, `EmailRegistrationTab.jsx:10/28/34` (H-FE-BE-001).
- `InvoicePdfViewer.jsx` calls an upload route the backend doesn't have (H-FE-BE-002).
- GP Salesforce fields read-only. README is Vite boilerplate. No tests.
- One local stash `email-config-before-pull` (pre-pull backup; the user may drop it).
