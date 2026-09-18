import { useEffect, useState } from 'react';
import { api } from '../services/weatherService';
export function useResource<T>(path: string | null, refresh: number, interval = 300000) {
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: !!path });
  useEffect(() => {
    if (!path) { setState({ data: null, error: null, loading: false }); return; }
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    setState({ data: null, error: null, loading: true });
    const load = async () => {
      try {
        const data = await api<T>(path, { signal: controller.signal });
        if (active) setState({ data, error: null, loading: false });
      } catch (error) {
        if (active) setState({ data: null, error: error instanceof Error ? error.message : 'Request failed', loading: false });
      } finally { if (active) timer = setTimeout(load, interval); }
    };
    void load();
    return () => { active = false; controller.abort(); clearTimeout(timer); };
  }, [path, refresh, interval]);
  return state;
}
