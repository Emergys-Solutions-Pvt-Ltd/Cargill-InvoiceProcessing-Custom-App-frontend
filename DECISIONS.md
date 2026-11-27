# Decisions — Cargill-InvoiceProcessing-Custom-App-frontend

Decisions that affect only this repo. Cross-repo decisions: `../DECISIONS.md`.
Newest on top. Never delete; mark replaced ones `Superseded by D-FE-xxx`.

## Template
```markdown
### D-FE-000 — YYYY-MM-DD — Short title
- Decided by: user | inferred from code (confirm)
- Decision:
- Why:
- Rejected alternatives:
```

---

### D-FE-006 — 2026-11-27 — Generic Button follows Figma, built on MUI ButtonBase
- Decided by: user (accepted the defaults proposed by frontend-agent)
- Decision: `src/components/Button.jsx` implements the Figma Buttons (node 1:1465) on MUI `ButtonBase`, styled with `--btn-*` CSS
  variables from `index.css`. The Figma greens are scoped to Button; the app palette is not changed yet. Figma's "Cancel" / "Delete"
  are `color="neutral"` / `color="danger"`; their Hover and Disabled (not in Figma) are derived tokens. A visible focus ring is added;
  no loading or icon-only variant.
- Why: matches how Modal / Pager / ConfirmDialog are built on MUI, and gives focus handling, disabled behaviour and `component` /
  `href` for free; keeping the palette change separate avoids restyling every screen at once.
- Rejected alternatives: plain `<button>` with Tailwind (the repo's `!important` utilities make caller overrides unpredictable);
  full MUI `Button` with theme variants (MUI's own padding, icon margins and variants would all need overriding); changing the app palette first.
- Status: open: align `--primary-color` (#167A3C) with the Figma green (#00843D), and confirm the derived Cancel / Delete tokens with the designer.

### D-FE-005 — 2026-11-05 — Inbox filters live in the URL query
- Decided by: frontend-agent within the approved task (parent D-023 left the choice open: "URL query or state")
- Decision: the Inbox list keeps `status`, `mailboxId`, `search`, `page`, `limit` in the URL query (defaults omitted,
  `replace` navigation). A row passes the query string as route state; "Back to Inbox" on the detail page goes back
  to it. Any filter change other than the page resets the page to 1.
- Why: Back (link or browser), refresh and shared links all return to the same filtered list.
- Rejected alternatives: component state only (lost on Back and refresh); a context/store (none used in this repo).
- Status: obsolete since 2026-11-25 — the Inbox pages were removed from the UI (user request).

### D-FE-004 — 2026-11-04 — Email Registration list reloads after every write
- Decided by: frontend-agent within the approved task (parent D-018j allowed either option)
- Decision: after add / edit / delete the current page is reloaded from `GET /mailboxes` (server order by address, then
  folder, can move an edited row); deleting the last row on a page > 1 goes back one page. Only the Active toggle
  updates its row locally from the PUT response. A blank folder is sent as `inbox` (the contract default; PUT requires it).
- Why: keeps paging and ordering consistent with the server without client-side re-sorting.
- Rejected alternatives: patching the list locally after every write (row could sit on the wrong page).

### D-FE-003 — existing — No UI or CSS framework
- Decided by: inferred from code (confirm)
- Decision: hand-made components; plain CSS in `src/index.css` with feature prefixes.

### D-FE-002 — existing — All API calls through apiClient
- Decided by: inferred from code (confirm)
- Decision: axios `apiClient` with relative paths; errors shown via `apiError()` / `errorsFor()`.

### D-FE-001 — existing — Every string is translated
- Decided by: inferred from code (confirm)
- Decision: `t('key', 'English fallback')` with keys in both `en.json` and `es.json`.
