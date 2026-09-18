import { useEffect, useState } from 'react';
import type { DistrictSnapshot } from '../services/weatherService';
import { readSavedPlaces } from '../services/watchlist';

export interface AlertEvent { id: string; district: string; level: string; probability: number; at: string; positive: boolean }
const KEY = 'floodsentinel_alert_history_v1';
export function useAlerts(snapshot: DistrictSnapshot | null) {
  const [events, setEvents] = useState<AlertEvent[]>(() => {
    try { const data = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(data) ? data.filter(e => e && typeof e.id === 'string' && typeof e.district === 'string' && typeof e.at === 'string' && typeof e.probability === 'number' && typeof e.positive === 'boolean').slice(0, 100) : []; } catch { return []; }
  });
  useEffect(() => {
    if (!snapshot) return;
    const saved = readSavedPlaces();
    setEvents(previous => {
      const additions: AlertEvent[] = [];
      for (const district of snapshot.districts) {
        if (!saved.includes(district.id) || !district.prediction) continue;
        const p = district.prediction;
        const latest = previous.find(e => e.district === district.id);
        if (latest && latest.level === p.alert_level && latest.positive === Boolean(p.binary_prediction)) continue;
        additions.push({ id: `${district.id}-${snapshot.generated_at}`, district: district.id, level: p.alert_level, probability: p.flood_probability, positive: Boolean(p.binary_prediction), at: snapshot.generated_at });
      }
      if (!additions.length) return previous;
      const next = [...additions, ...previous].slice(0, 100);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* Session history remains usable. */ }
      return next;
    });
  }, [snapshot]);
  return { events, clear: () => { try { localStorage.removeItem(KEY); } catch { /* Best effort. */ } setEvents([]); } };
}
