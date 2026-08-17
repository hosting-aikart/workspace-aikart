import { useEffect, useState } from 'react';
import api from '../../../utils/api';

/**
 * useDirectory
 * Fetches the workspace member list (used by both the "New message" and
 * "New group" pickers) from the same /me/directory endpoint the Directory
 * page uses — available to every role.
 */
export function useDirectory() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/me/directory', { params: { limit: 200 } });
        const list = data?.data?.employees || data?.data || [];
        if (!cancelled) setUsers(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setUsers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { users, loading };
}
