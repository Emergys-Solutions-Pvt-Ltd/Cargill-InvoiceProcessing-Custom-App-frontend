import { apiClient } from './network.service';

/**
 * Inbox of one application (parent DECISIONS.md D-020 / D-021 / D-023).
 * `appId` is the app slug from the URL (GP / sjo / rospbu). Paths are without `/api` (apiClient adds it).
 */

/** Email statuses (app.mailbox_emails.status). Only New and Ignored can be set through the API. */
export const MAILBOX_EMAIL_STATUSES = ['New', 'Ignored', 'Failed', 'Processed'];

const emailsPath = (appId) => `/apps/${encodeURIComponent(appId)}/mailbox-emails`;

/** Drop empty values so the API only receives the filters that are set. */
const cleanParams = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));

/** GET /apps/{appId}/mailbox-emails?status&mailboxId&search&page&limit -> { data, totalItems, totalPages, page, limit } */
export const listMailboxEmails = async (appId, { status, mailboxId, search, page, limit } = {}) => {
  const response = await apiClient.get(emailsPath(appId), { params: cleanParams({ status, mailboxId, search, page, limit }) });
  return response.data;
};

/** GET /apps/{appId}/mailbox-emails/{emailId} -> email detail (+ to, cc, body, attachments[{ id, fileName, size, url }]) */
export const getMailboxEmail = async (appId, emailId) => {
  const response = await apiClient.get(`${emailsPath(appId)}/${encodeURIComponent(emailId)}`);
  return response.data;
};

/** PATCH /apps/{appId}/mailbox-emails/{emailId}/status { status: 'New' | 'Ignored', note? } -> the updated detail */
export const setMailboxEmailStatus = async (appId, emailId, status, note) => {
  const body = { status };
  if (note) body.note = note;
  const response = await apiClient.patch(`${emailsPath(appId)}/${encodeURIComponent(emailId)}/status`, body);
  return response.data.data;
};

/** GET /apps/{appId}/mailboxes -> [{ id, address, folder, moduleSlug, moduleName }] (Inbox mailbox filter) */
export const listAppMailboxes = async (appId) => {
  const response = await apiClient.get(`/apps/${encodeURIComponent(appId)}/mailboxes`);
  return Array.isArray(response.data) ? response.data : [];
};
