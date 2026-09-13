import { useState, useEffect, useRef } from "react";
import { TileLayer } from "react-leaflet";
import { Play, Pause, CloudRain, FastForward, Eye, EyeOff, Radio } from "lucide-react";

interface RadarFrame {
  time: number;
  path: string;
}

interface RainViewerRadarData {
  past?: RadarFrame[];
  nowcast?: RadarFrame[];
}

interface RainViewerResponse {
  version: string;
  generated: number;
  host: string;
  radar: RainViewerRadarData;
}

/**
 * RadarOverlay Component (TypeScript)
 * Integrates the open RainViewer Doppler weather radar API.
 * Features live animated precipitation cloud tiles, timeline scrub bar,
 * play/pause loops, opacity control, and speed toggles.
 */
export default function RadarOverlay() {
  const [radarData, setRadarData] = useState<RainViewerResponse | null>(null);
  const [frames, setFrames] = useState<RadarFrame[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(600); // ms per frame
  const [opacity, setOpacity] = useState<number>(0.75);
  const [visible, setVisible] = useState<boolean>(true);

  const animationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1. Fetch RainViewer API radar timeline frames
  useEffect(() => {
    let isMounted = true;

    async function loadRainViewerData() {
      try {
        const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
        if (!res.ok) throw new Error("RainViewer API unavailable");
        const data: RainViewerResponse = await res.json();

        if (isMounted && data.radar && data.radar.past) {
          setRadarData(data);
          const allFrames: RadarFrame[] = [
            ...(data.radar.past || []),
            ...(data.radar.nowcast || []),
          ];
          setFrames(allFrames);
          setCurrentFrameIndex(Math.max(0, (data.radar.past || []).length - 1));
        }
      } catch (err) {
        console.warn("Could not load RainViewer radar frames:", err);
      }
    }

    loadRainViewerData();
    const refreshInterval = setInterval(loadRainViewerData, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(refreshInterval);
    };
  }, []);

  // 2. Playback animation loop
  useEffect(() => {
    if (!isPlaying || frames.length === 0 || !visible) {
      if (animationTimerRef.current) clearInterval(animationTimerRef.current);
      return;
    }

    animationTimerRef.current = setInterval(() => {
      setCurrentFrameIndex((prevIndex) => (prevIndex + 1) % frames.length);
    }, speed);

    return () => {
      if (animationTimerRef.current) clearInterval(animationTimerRef.current);
    };
  }, [isPlaying, frames, speed, visible]);

  if (frames.length === 0 || !radarData) {
    return null;
  }

  const currentFrame = frames[currentFrameIndex];
  const host = radarData.host || "https://tilecache.rainviewer.com";
  // Universal color scheme: 2, smooth: 1, snow: 1
  const tileUrl = `${host}${currentFrame?.path}/256/{z}/{x}/{y}/2/1_1.png`;

  const frameDate = currentFrame?.time ? new Date(currentFrame.time * 1000) : new Date();
  const timeString = frameDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const isPast = currentFrameIndex < (radarData.radar.past || []).length;

  return (
    <>
      {/* Live RainViewer Radar Cloud Tile Layer */}
      {visible && currentFrame && (
        <TileLayer
          key={currentFrame.path}
          url={tileUrl}
          opacity={opacity}
          zIndex={400}
          tileSize={256}
          minZoom={4}
          maxNativeZoom={12}
        />
      )}

      {/* Floating Doppler Radar Player Controller */}
      <div className="radar-player-card">
        {/* Top Header */}
        <div className="radar-header">
          <div className="radar-live-badge">
            <Radio size={14} className="radar-live-icon animate-pulse" />
            <span>LIVE DOPPLER RADAR</span>
          </div>

          <div className="radar-toggle-actions">
            <button
              className="radar-icon-btn"
              onClick={() => setVisible(!visible)}
              title={visible ? "Hide Radar Layer" : "Show Radar Layer"}
              aria-label="Toggle Radar Visibility"
            >
              {visible ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
          </div>
        </div>

        {/* Timeline Status & Timestamp */}
        <div className="radar-status-bar">
          <span className="radar-timestamp">
            <CloudRain size={13} className="text-sky-400" />
            <strong>{timeString}</strong>
            <small className="time-tag">
              {isPast ? "Recorded Radar" : "Nowcast Forecast"}
            </small>
          </span>

          <span className="radar-frame-count">
            Frame {currentFrameIndex + 1} / {frames.length}
          </span>
        </div>

        {/* Timeline Progress Scrubber */}
        <div className="radar-timeline-slider">
          <input
            type="range"
            min={0}
            max={frames.length - 1}
            value={currentFrameIndex}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentFrameIndex(Number(e.target.value));
            }}
            className="slider-scrubber"
            aria-label="Radar Timeline Slider"
          />
        </div>

        {/* Playback Button Controls */}
        <div className="radar-controls-row">
          <button
            className="radar-play-btn"
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? "Pause Radar Animation" : "Play Radar Animation"}
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            <span>{isPlaying ? "Pause" : "Play"}</span>
          </button>

          <button
            className="radar-speed-btn"
            onClick={() => setSpeed(speed === 600 ? 300 : speed === 300 ? 900 : 600)}
            title="Adjust Playback Speed"
          >
            <FastForward size={14} />
            <span>{speed === 300 ? "2.0x" : speed === 600 ? "1.0x" : "0.5x"}</span>
          </button>

          {/* Opacity Control */}
          <div className="radar-opacity-group">
            <span className="opacity-label">Opacity</span>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="opacity-slider"
              title={`Radar Layer Opacity: ${Math.round(opacity * 100)}%`}
            />
          </div>
        </div>
      </div>
    </>
  );
}
