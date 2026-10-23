import { useEffect, useState } from 'react';
import { apiClient } from './network.service';

// Fallback until /api/lookups answers (and the core codes that have translations)
export const DEFAULT_STATUSES = [
  { code: 'Pending', name: 'Pending', color: 'warning' },
  { code: 'Approved', name: 'Approved', color: 'success' },
  { code: 'Processed', name: 'Processed', color: 'info' },
  { code: 'Rejected', name: 'Rejected', color: 'danger' }
];

let cache = null;

/** Invoice statuses from Settings > Configuration > Statuses (active, in workflow order). */
export const loadStatuses = (force = false) => {
  if (!cache || force) {
    cache = apiClient
      .get('/lookups')
      .then((response) => (response.data.statuses?.length ? response.data.statuses : DEFAULT_STATUSES))
      .catch(() => {
        cache = null;
        return DEFAULT_STATUSES;
      });
  }
  return cache;
};

export const useStatuses = () => {
  const [statuses, setStatuses] = useState(DEFAULT_STATUSES);
  useEffect(() => {
    let alive = true;
    loadStatuses().then((list) => alive && setStatuses(list));
    return () => {
      alive = false;
    };
  }, []);
  return statuses;
};
