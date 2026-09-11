import { useStore } from "../store";

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
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

      <div className="row">
        <label>
          X
          <input
            type="number"
            step="0.01"
            value={obj.x}
            onChange={(e) => updateObject(obj.id, { x: Number(e.target.value) })}
          />
        </label>
        <label>
          Y
          <input
            type="number"
            step="0.01"
            value={obj.y}
            onChange={(e) => updateObject(obj.id, { y: Number(e.target.value) })}
          />
        </label>
      </div>

      <label>
        Rotation ({obj.rotation.toFixed(0)}°)
        <input
          type="range"
          min={-180}
          max={180}
          value={obj.rotation}
          onChange={(e) => updateObject(obj.id, { rotation: Number(e.target.value) })}
        />
      </label>

      <label>
        Scale ({obj.scale.toFixed(2)})
        <input
          type="range"
          min={0.05}
          max={3}
          step={0.01}
          value={obj.scale}
          onChange={(e) => updateObject(obj.id, { scale: Number(e.target.value) })}
        />
      </label>

      <label>
        Color
        <input
          type="color"
          value={rgbToHex(obj.color.r, obj.color.g, obj.color.b)}
          onChange={(e) => updateObject(obj.id, { color: hexToRgb(e.target.value) })}
        />
      </label>

      <label>
        Intensity ({obj.intensity.toFixed(2)})
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={obj.intensity}
          onChange={(e) => updateObject(obj.id, { intensity: Number(e.target.value) })}
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
