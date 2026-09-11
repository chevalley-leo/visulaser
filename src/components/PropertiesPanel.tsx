import { useStore } from "../store";
import { hexToRgb, rgbToHex } from "../color";
import type { AnimatableProp, LaserObject, LFOType } from "../types";

const LFO_TYPES: LFOType[] = ["sine", "triangle", "square", "saw", "noise"];

function AnimatedRow({
  obj,
  prop,
  label,
  min,
  max,
  step,
}: {
  obj: LaserObject;
  prop: AnimatableProp;
  label: string;
  min: number;
  max: number;
  step: number;
}) {
  const updateObject = useStore((s) => s.updateObject);
  const currentTime = useStore((s) => s.currentTime);
  const addKeyframe = useStore((s) => s.addKeyframe);
  const clearTrack = useStore((s) => s.clearTrack);
  const setLFO = useStore((s) => s.setLFO);

  const value = obj[prop];
  const track = obj.tracks?.[prop];
  const lfo = obj.lfos?.[prop];

  return (
    <div className="anim-row">
      <label>
        {label} ({value.toFixed(2)})
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => updateObject(obj.id, { [prop]: Number(e.target.value) } as Partial<LaserObject>)}
        />
      </label>
      <div className="anim-row-actions">
        <button title="Add keyframe at playhead" onClick={() => addKeyframe(obj.id, prop, currentTime, value)}>
          + Key
        </button>
        {track && track.length > 0 && (
          <button title="Clear all keyframes" onClick={() => clearTrack(obj.id, prop)}>
            Clear ({track.length})
          </button>
        )}
      </div>
      <details className="lfo-details">
        <summary>{lfo ? `LFO: ${lfo.type}` : "LFO"}</summary>
        <div className="lfo-controls">
          <label>
            Type
            <select
              value={lfo?.type ?? "sine"}
              onChange={(e) =>
                setLFO(obj.id, prop, {
                  type: e.target.value as LFOType,
                  amplitude: lfo?.amplitude ?? 0.2,
                  frequency: lfo?.frequency ?? 0.5,
                  phase: lfo?.phase ?? 0,
                })
              }
            >
              {LFO_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label>
            Amplitude
            <input
              type="number"
              step="0.01"
              value={lfo?.amplitude ?? 0}
              onChange={(e) =>
                setLFO(obj.id, prop, {
                  type: lfo?.type ?? "sine",
                  amplitude: Number(e.target.value),
                  frequency: lfo?.frequency ?? 0.5,
                  phase: lfo?.phase ?? 0,
                })
              }
            />
          </label>
          <label>
            Freq (Hz)
            <input
              type="number"
              step="0.05"
              value={lfo?.frequency ?? 0}
              onChange={(e) =>
                setLFO(obj.id, prop, {
                  type: lfo?.type ?? "sine",
                  amplitude: lfo?.amplitude ?? 0.2,
                  frequency: Number(e.target.value),
                  phase: lfo?.phase ?? 0,
                })
              }
            />
          </label>
          {lfo && (
            <button onClick={() => setLFO(obj.id, prop, null)}>Remove LFO</button>
          )}
        </div>
      </details>
    </div>
  );
}

export function PropertiesPanel() {
  const scene = useStore((s) => s.scene);
  const selectedId = useStore((s) => s.selectedId);
  const updateObject = useStore((s) => s.updateObject);
  const removeObject = useStore((s) => s.removeObject);

  const obj = scene.objects.find((o) => o.id === selectedId);

  if (!obj) {
    return (
      <div className="properties-panel">
        <p className="hint">No object selected.</p>
      </div>
    );
  }

  return (
    <div className="properties-panel">
      <label>
        Name
        <input value={obj.name} onChange={(e) => updateObject(obj.id, { name: e.target.value })} />
      </label>

      <AnimatedRow obj={obj} prop="x" label="X" min={-1.5} max={1.5} step={0.01} />
      <AnimatedRow obj={obj} prop="y" label="Y" min={-1.5} max={1.5} step={0.01} />
      <AnimatedRow obj={obj} prop="rotation" label="Rotation" min={-180} max={180} step={1} />
      <AnimatedRow obj={obj} prop="scale" label="Scale" min={0.05} max={3} step={0.01} />
      <AnimatedRow obj={obj} prop="intensity" label="Intensity" min={0} max={1} step={0.01} />

      <label>
        Color
        <input
          type="color"
          value={rgbToHex(obj.color)}
          onChange={(e) => updateObject(obj.id, { color: hexToRgb(e.target.value) })}
        />
      </label>

      <label className="row">
        <input
          type="checkbox"
          checked={obj.visible}
          onChange={(e) => updateObject(obj.id, { visible: e.target.checked })}
        />
        Visible
      </label>

      <button className="danger" onClick={() => removeObject(obj.id)}>
        Delete
      </button>
    </div>
  );
}
