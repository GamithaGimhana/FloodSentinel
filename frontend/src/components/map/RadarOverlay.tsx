import { useEffect, useState } from 'react';
import { TileLayer } from 'react-leaflet';
import { Pause, Play, Radio } from 'lucide-react';
import { useResource } from '../../hooks/useResource';
import type { Radar } from '../../services/weatherService';
export default function RadarOverlay() {
  const { data, error, loading } = useResource<Radar>('/api/v1/radar/frames', 0);
  const [index, setIndex] = useState(0); const [playing, setPlaying] = useState(false); const [visible, setVisible] = useState(true);
  const frames = data?.frames ?? [];
  useEffect(() => { setIndex(Math.max(0, frames.findIndex(f => f.time === data?.latest_frame?.time))); }, [data]);
  useEffect(() => { if (!playing || !visible || !frames.length) return; const timer = setInterval(() => setIndex(i => (i + 1) % frames.length), 1000); return () => clearInterval(timer); }, [playing, visible, frames.length]);
  const frame = frames[Math.min(index, Math.max(0, frames.length - 1))];
  return <>{visible && frame && <TileLayer url={frame.tile_url_template} opacity={.55} zIndex={400} attribution="Radar © RainViewer" maxNativeZoom={7} />}
    <div className="radar-controls" onClick={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}><Radio size={15} /><strong>{loading ? 'Loading radar…' : error || data?.status === 'unavailable' ? 'Radar unavailable' : frame?.kind === 'forecast' ? 'Forecast radar' : 'Recorded radar'}</strong>{frame && <><span>{new Date(frame.time * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Colombo' })} SLST</span><button aria-label={playing ? 'Pause radar' : 'Play radar'} onClick={() => setPlaying(!playing)}>{playing ? <Pause size={15} /> : <Play size={15} />}</button><input type="range" aria-label="Radar frame" min={0} max={frames.length - 1} value={index} onChange={e => { setIndex(Number(e.target.value)); setPlaying(false); }} /><label><input type="checkbox" checked={visible} onChange={e => setVisible(e.target.checked)} />Overlay</label></>}</div>
  </>;
}
