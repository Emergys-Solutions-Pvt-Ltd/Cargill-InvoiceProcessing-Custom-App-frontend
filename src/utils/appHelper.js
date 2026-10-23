/**
 * The three invoice apps of the "Invoice Processing" menu, in menu order.
 * `id` is the route slug (/app/:id) and the permission code assigned to users.
 */
export const APPS = [
  { id: 'GP', name: 'General Payments', nameKey: 'GPFull' },
  { id: 'sjo', name: 'SJO Invoice Processing', nameKey: 'sjoFull' },
  { id: 'rospbu', name: 'ROSPBU Invoice Processing', nameKey: 'rospbuFull' }
];

/**
 * Helper to get human-readable app name from appId slug or location pathname
 */
export const getAppName = (appId, pathname = '') => {
  const fromPath = pathname.match(/^\/app\/([^/]+)/)?.[1];
  const app = APPS.find((a) => a.id === (fromPath || appId));
  if (app) return app.name;
  if (!appId) return 'Invoice Processing';

  return appId
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
