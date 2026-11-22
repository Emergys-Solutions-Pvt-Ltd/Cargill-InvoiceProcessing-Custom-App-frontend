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
