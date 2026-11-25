import React, { useContext } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import { formatDateTime, userTimeZone } from '../../utils/dateTime';

/*
 * Shared pieces of the Inbox pages (Inbox.jsx, InboxEmailDetail.jsx).
 * Only components and constants are exported here (lint rule only-export-components);
 * small non-component helpers live inside each page.
 */

/** Badge style and translation key per email status (codes: MAILBOX_EMAIL_STATUSES in the service). */
const STATUS_DISPLAY = [
  { code: 'New', badge: 'badge-info', key: 'inboxStatusNew', label: 'New' },
  { code: 'Ignored', badge: 'badge-neutral', key: 'inboxStatusIgnored', label: 'Ignored' },
  { code: 'Failed', badge: 'badge-danger', key: 'inboxStatusFailed', label: 'Failed' },
  { code: 'Processed', badge: 'badge-success', key: 'inboxStatusProcessed', label: 'Processed' }
];

/** Status filter value meaning "no status filter" (the API gets no `status` param). */
export const INBOX_ALL = 'All';

/** Default status filter of the list (D-023). */
export const INBOX_DEFAULT_STATUS = 'New';

/** Status pill. A Failed email shows its statusNote as a tooltip. */
export const InboxStatusBadge = ({ status, note }) => {
  const { t } = useContext(LanguageContext);
  const def = STATUS_DISPLAY.find((s) => s.code === status);
  return (
    <span
      className={`badge ${def?.badge || 'badge-neutral'} inbox-status`}
      title={status === 'Failed' && note ? note : undefined}
    >
      {def ? t(def.key, def.label) : status || '–'}
    </span>
  );
};

/** <option>s of the status filter: New, Ignored, Failed, Processed, then All. */
export const InboxStatusOptions = () => {
  const { t } = useContext(LanguageContext);
  return (
    <>
      {STATUS_DISPLAY.map((s) => (
        <option key={s.code} value={s.code}>{t(s.key, s.label)}</option>
      ))}
      <option value={INBOX_ALL}>{t('inboxStatusAll', 'All')}</option>
    </>
  );
};

/** MM/DD/YYYY hh:mm AM in the user's time zone ("–" when empty). */
export const InboxDateTime = ({ value }) => {
  if (!value) return <>–</>;
  return (
    <time dateTime={value} title={userTimeZone()}>
      {formatDateTime(value)}
    </time>
  );
};
