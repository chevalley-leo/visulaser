import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { groupObjects } from "../groups";
import type { AnimatableProp, LaserObject } from "../types";

// must match .track-label width + .lfo-badges width + .track-row gaps in App.css
const LANE_OFFSET_PX = 134;

const PROP_COLORS: Record<AnimatableProp, string> = {
  x: "#ff6666",
  y: "#66ff66",
  rotation: "#6699ff",
  scale: "#ffcc66",
  intensity: "#cc66ff",
};

const PROP_LABELS: Record<AnimatableProp, string> = {
  x: "X",
  y: "Y",
  rotation: "Rot",
  scale: "Scale",
  intensity: "Int",
};

const ALL_PROPS = Object.keys(PROP_COLORS) as AnimatableProp[];

type DragMode = "move" | "left" | "right";

// A clip like on an audio track: drag the body to move it in time, drag an
// edge to stretch it. No range set = active for the whole scene (the block
// then just shows that full span, unstyled as "customized").
function ActiveRangeBlock({ obj, duration }: { obj: LaserObject; duration: number }) {
  const updateObject = useStore((s) => s.updateObject);
  const range = obj.activeRange ?? { start: 0, end: duration };
  const [drag, setDrag] = useState<{ mode: DragMode; startX: number; laneWidth: number; origStart: number; origEnd: number } | null>(
    null,
  );

  useEffect(() => {
    if (!drag) return;
    function onMove(e: PointerEvent) {
      if (!drag) return;
      const deltaSec = ((e.clientX - drag.startX) / drag.laneWidth) * duration;
      let start = drag.origStart;
      let end = drag.origEnd;
      if (drag.mode === "move") {
        const len = drag.origEnd - drag.origStart;
        start = Math.max(0, Math.min(duration - len, drag.origStart + deltaSec));
        end = start + len;
      } else if (drag.mode === "left") {
        start = Math.max(0, Math.min(drag.origEnd - 0.1, drag.origStart + deltaSec));
      } else {
        end = Math.min(duration, Math.max(drag.origStart + 0.1, drag.origEnd + deltaSec));
      }
      updateObject(obj.id, { activeRange: { start, end } });
    }
    function onUp() {
      setDrag(null);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, duration, obj.id, updateObject]);

  function startDrag(mode: DragMode) {
    return (e: React.PointerEvent) => {
      e.stopPropagation();
      const lane = e.currentTarget.closest(".track-lane") as HTMLElement | null;
      const laneWidth = lane?.getBoundingClientRect().width ?? 1;
      setDrag({ mode, startX: e.clientX, laneWidth, origStart: range.start, origEnd: range.end });
    };
  }

  return (
    <div
      className={`active-block${obj.activeRange ? "" : " implicit"}`}
      style={{ left: `${(range.start / duration) * 100}%`, width: `${((range.end - range.start) / duration) * 100}%` }}
      onPointerDown={startDrag("move")}
      onDoubleClick={(e) => {
        e.stopPropagation();
        updateObject(obj.id, { activeRange: undefined });
      }}
      title={`Actif de ${range.start.toFixed(1)}s à ${range.end.toFixed(1)}s — glisser pour déplacer, bords pour étirer, double-clic pour réinitialiser`}
    >
      <div className="active-block-handle left" onPointerDown={startDrag("left")} />
      <div className="active-block-handle right" onPointerDown={startDrag("right")} />
    </div>
  );
}

// Same clip control as ActiveRangeBlock, but drives every member of a group at
// once: moving translates all members' ranges by the same delta, resizing an
// edge scales them affinely around the opposite edge — so a staggered build-up
// keeps its stagger while the whole group's window shifts or stretches. Expand
// the group to still edit one member's block individually (ActiveRangeBlock).
function GroupActiveRangeBlock({ members, duration }: { members: LaserObject[]; duration: number }) {
  const updateObject = useStore((s) => s.updateObject);
  const rangeStart = Math.min(...members.map((m) => m.activeRange?.start ?? 0));
  const rangeEnd = Math.max(...members.map((m) => m.activeRange?.end ?? duration));
  const [drag, setDrag] = useState<
    | { mode: DragMode; startX: number; laneWidth: number; origStart: number; origEnd: number; origRanges: { id: string; start: number; end: number }[] }
    | null
  >(null);

  useEffect(() => {
    if (!drag) return;
    function onMove(e: PointerEvent) {
      if (!drag) return;
      const deltaSec = ((e.clientX - drag.startX) / drag.laneWidth) * duration;
      let newStart = drag.origStart;
      let newEnd = drag.origEnd;
      if (drag.mode === "move") {
        const len = drag.origEnd - drag.origStart;
        newStart = Math.max(0, Math.min(duration - len, drag.origStart + deltaSec));
        newEnd = newStart + len;
      } else if (drag.mode === "left") {
        newStart = Math.max(0, Math.min(drag.origEnd - 0.1, drag.origStart + deltaSec));
      } else {
        newEnd = Math.min(duration, Math.max(drag.origStart + 0.1, drag.origEnd + deltaSec));
      }
      const scale = (newEnd - newStart) / (drag.origEnd - drag.origStart || 0.0001);
      const shift = newStart - drag.origStart * scale;
      drag.origRanges.forEach(({ id, start, end }) => {
        updateObject(id, { activeRange: { start: start * scale + shift, end: end * scale + shift } });
      });
    }
    function onUp() {
      setDrag(null);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, duration, updateObject]);

  function startDrag(mode: DragMode) {
    return (e: React.PointerEvent) => {
      e.stopPropagation();
      const lane = e.currentTarget.closest(".track-lane") as HTMLElement | null;
      const laneWidth = lane?.getBoundingClientRect().width ?? 1;
      const origRanges = members.map((m) => ({ id: m.id, start: m.activeRange?.start ?? 0, end: m.activeRange?.end ?? duration }));
      setDrag({ mode, startX: e.clientX, laneWidth, origStart: rangeStart, origEnd: rangeEnd, origRanges });
    };
  }

  return (
    <div
      className={`active-block${members.some((m) => m.activeRange) ? "" : " implicit"}`}
      style={{ left: `${(rangeStart / duration) * 100}%`, width: `${((rangeEnd - rangeStart) / duration) * 100}%` }}
      onPointerDown={startDrag("move")}
      onDoubleClick={(e) => {
        e.stopPropagation();
        members.forEach((m) => updateObject(m.id, { activeRange: undefined }));
      }}
      title={`Groupe actif de ${rangeStart.toFixed(1)}s à ${rangeEnd.toFixed(1)}s — affecte tous les membres (glisser = déplacer, bord = étirer, double-clic = reset). Dépliez le groupe pour ajuster un membre seul.`}
    >
      <div className="active-block-handle left" onPointerDown={startDrag("left")} />
      <div className="active-block-handle right" onPointerDown={startDrag("right")} />
    </div>
  );
}

function TrackRow({ obj, duration, indent }: { obj: LaserObject; duration: number; indent?: boolean }) {
  const removeKeyframe = useStore((s) => s.removeKeyframe);
  const selectObject = useStore((s) => s.selectObject);

  return (
    <div className="track-row">
      <span className={`track-label${indent ? " indent" : ""}`} title={obj.name}>
        {obj.name}
      </span>
      <div className="lfo-badges">
        {ALL_PROPS.filter((prop) => obj.lfos?.[prop]).map((prop) => (
          <span
            key={prop}
            className="legend-swatch dot"
            style={{ background: PROP_COLORS[prop] }}
            title={`LFO sur ${PROP_LABELS[prop]} (${obj.lfos![prop]!.type})`}
            onPointerDown={(e) => {
              e.stopPropagation();
              selectObject(obj.id);
            }}
          />
        ))}
      </div>
      <div className="track-lane">
        <ActiveRangeBlock obj={obj} duration={duration} />
        {(Object.keys(obj.tracks ?? {}) as AnimatableProp[]).flatMap((prop) =>
          (obj.tracks?.[prop] ?? []).map((kf) => (
            <div
              key={kf.id}
              className="keyframe-marker"
              style={{ left: `${(kf.time / duration) * 100}%`, background: PROP_COLORS[prop] }}
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
  );
}

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

  const trackAreaRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  function toggleGroup(groupId: string) {
    setExpandedGroups((s) => {
      const next = new Set(s);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

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
        <button onClick={() => setExpanded((e) => !e)}>{expanded ? "Réduire" : "Agrandir"}</button>
      </div>

      <div className="timeline-legend">
        <span className="hint">Cliquez/glissez la règle pour déplacer la tête de lecture.</span>
        {ALL_PROPS.map((prop) => (
          <span key={prop} className="legend-item">
            <span className="legend-swatch diamond" style={{ background: PROP_COLORS[prop] }} />
            {PROP_LABELS[prop]} (keyframe)
          </span>
        ))}
        <span className="legend-item">
          <span className="legend-swatch dot" />
          LFO actif (clic pour l'ouvrir dans Properties)
        </span>
        <span className="legend-item">
          <span className="legend-swatch block" />
          Bloc actif (glisser = déplacer, bord = étirer, double-clic = reset)
        </span>
      </div>

      <div
        className={`timeline-tracks${expanded ? " expanded" : ""}`}
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

        {groupObjects(scene.objects).map((g) => {
          if (g.members.length === 1) {
            return <TrackRow key={g.groupId} obj={g.members[0]} duration={scene.duration} />;
          }
          const expandedGroup = expandedGroups.has(g.groupId);
          return (
            <div key={g.groupId}>
              <div className="track-row group-header-row" onPointerDown={(e) => e.stopPropagation()}>
                <span className="track-label" title={g.groupName} onClick={() => toggleGroup(g.groupId)}>
                  <span className="group-toggle-inline">{expandedGroup ? "▾" : "▸"}</span> {g.groupName} ({g.members.length})
                </span>
                <div className="lfo-badges" />
                <div className="track-lane">
                  <GroupActiveRangeBlock members={g.members} duration={scene.duration} />
                </div>
              </div>
              {expandedGroup && g.members.map((obj) => <TrackRow key={obj.id} obj={obj} duration={scene.duration} indent />)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
