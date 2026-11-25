/*
 * Date / time localization for the whole UI.
 * - The database stores timestamps in UTC; the API sends them as ISO 8601 UTC ("2026-11-24T13:05:00.000Z").
 * - The UI shows them in the user's (browser's) time zone, as MM/DD/YYYY or MM/DD/YYYY hh:mm AM.
 * - Date-only values ("2026-11-24": invoice / reception / due dates) are calendar dates: never shifted by time zone.
 * - Values the user enters are local; send them with toUtcIso() / todayLocal().
 */

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i;
const pad = (n) => String(n).padStart(2, '0');

/** Date from an API value (ISO string, Date or epoch ms); null when empty or invalid. */
const toDate = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "MM/DD/YYYY" (empty / invalid -> fallback). Date-only strings keep their calendar date. */
export const formatDate = (value, fallback = '–') => {
  if (typeof value === 'string') {
    const m = value.trim().match(DATE_ONLY);
    if (m) return `${m[2]}/${m[3]}/${m[1]}`;
  }
  const d = toDate(value);
  if (!d) return value ? String(value) : fallback;
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
};

/** "MM/DD/YYYY hh:mm AM" in the user's time zone (date-only strings -> "MM/DD/YYYY"). */
export const formatDateTime = (value, fallback = '–') => {
  if (typeof value === 'string' && DATE_ONLY.test(value.trim())) return formatDate(value, fallback);
  const d = toDate(value);
  if (!d) return value ? String(value) : fallback;
  const hours = d.getHours();
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${formatDate(d)} ${pad(h12)}:${pad(d.getMinutes())} ${hours < 12 ? 'AM' : 'PM'}`;
};

/** The user's time zone, e.g. "America/Argentina/Buenos_Aires" (for tooltips). */
export const userTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

/** Today in the user's time zone as "YYYY-MM-DD" (not the UTC date). */
export const todayLocal = (now = new Date()) => `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

/**
 * Local date/time the user entered -> ISO 8601 UTC for the API.
 * Accepts "YYYY-MM-DD", "YYYY-MM-DD hh:mm AM", "YYYY-MM-DDTHH:mm" (taken as local time) or a full ISO string with
 * "Z" / an offset (kept as that instant). Empty -> null; anything else is returned unchanged for the API to reject.
 */
export const toUtcIso = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const text = String(value).trim();
  const m = text.match(LOCAL_DATE_TIME);
  if (m) {
    const [, y, mo, d, hh = '0', mm = '0', ss = '0', meridiem] = m;
    let hours = Number(hh);
    if (meridiem) {
      const pm = meridiem.toUpperCase() === 'PM';
      if (hours === 12) hours = pm ? 12 : 0;
      else if (pm) hours += 12;
    }
    const local = new Date(Number(y), Number(mo) - 1, Number(d), hours, Number(mm), Number(ss));
    return Number.isNaN(local.getTime()) ? text : local.toISOString();
  }
  const d = toDate(text);
  return d ? d.toISOString() : text;
};
