import { useEffect, useRef } from "react";
import { useStore } from "../store";
import type { AnimatableProp } from "../types";

// must match .track-label width + .track-row gap in App.css
const LANE_OFFSET_PX = 98;

const PROP_COLORS: Record<AnimatableProp, string> = {
  x: "#ff6666",
  y: "#66ff66",
  rotation: "#6699ff",
  scale: "#ffcc66",
  intensity: "#cc66ff",
};

export function Timeline() {
  const scene = useStore((s) => s.scene);
  const currentTime = useStore((s) => s.currentTime);
  const isPlaying = useStore((s) => s.isPlaying);
  const isLooping = useStore((s) => s.isLooping);
  const play = useStore((s) => s.play);
  const pause = useStore((s) => s.pause);
  const stop = useStore((s) => s.stop);
  const toggleLoop = useStore((s) => s.toggleLoop);
  const setCurrentTime = useStore((s) => s.setCurrentTime);
  const setDuration = useStore((s) => s.setDuration);
  const removeKeyframe = useStore((s) => s.removeKeyframe);

  const trackAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPlaying) return;
    let raf: number;
    let last = performance.now();
    function tick(now: number) {
      const dt = (now - last) / 1000;
      last = now;
      const s = useStore.getState();
      let t = s.currentTime + dt;
      if (t >= s.scene.duration) {
        if (s.isLooping) t %= s.scene.duration;
        else {
          s.setCurrentTime(s.scene.duration);
          s.pause();
          return;
        }
      }
      s.setCurrentTime(t);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying]);

  function seekFromEvent(e: React.PointerEvent<HTMLDivElement>) {
    const el = trackAreaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const laneWidth = rect.width - LANE_OFFSET_PX;
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left - LANE_OFFSET_PX) / laneWidth));
    setCurrentTime(ratio * scene.duration);
  }

  const rulerMarks = Math.ceil(scene.duration);

  return (
    <div className="timeline">
      <div className="transport">
        <button onClick={() => (isPlaying ? pause() : play())}>{isPlaying ? "Pause" : "Play"}</button>
        <button onClick={stop}>Stop</button>
        <button className={isLooping ? "active" : ""} onClick={toggleLoop}>
          Loop
        </button>
        <span className="time-display">
          {currentTime.toFixed(1)}s / {scene.duration.toFixed(1)}s
        </span>
        <label className="duration-input">
          Duration
          <input
            type="number"
            min={0.5}
            step={0.5}
            value={scene.duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </label>
      </div>

      <div
        className="timeline-tracks"
        ref={trackAreaRef}
        onPointerDown={(e) => {
          seekFromEvent(e);
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => e.buttons === 1 && seekFromEvent(e)}
      >
        <div className="lanes-viewport">
          <div className="ruler">
            {Array.from({ length: rulerMarks + 1 }, (_, i) => (
              <span key={i} style={{ left: `${(i / scene.duration) * 100}%` }}>
                {i}s
              </span>
            ))}
          </div>
          <div className="playhead" style={{ left: `${(currentTime / scene.duration) * 100}%` }} />
        </div>

        {scene.objects.map((obj) => (
          <div key={obj.id} className="track-row">
            <span className="track-label">{obj.name}</span>
            <div className="track-lane">
              {(Object.keys(obj.tracks ?? {}) as AnimatableProp[]).flatMap((prop) =>
                (obj.tracks?.[prop] ?? []).map((kf) => (
                  <div
                    key={kf.id}
                    className="keyframe-marker"
                    style={{ left: `${(kf.time / scene.duration) * 100}%`, background: PROP_COLORS[prop] }}
                    title={`${prop} @ ${kf.time.toFixed(2)}s (click to remove)`}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      removeKeyframe(obj.id, prop, kf.id);
                    }}
                  />
                )),
              )}
            </div>
          </div>
        ))}

      </div>
    </div>
  );
}
