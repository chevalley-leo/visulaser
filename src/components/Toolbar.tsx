import { useRef } from "react";
import { useStore, exportScene, importScene } from "../store";
import type { Tool } from "../types";

const TOOLS: { id: Tool; label: string }[] = [
  { id: "select", label: "Select" },
  { id: "point", label: "Point" },
  { id: "line", label: "Line" },
  { id: "rect", label: "Rectangle" },
  { id: "circle", label: "Circle" },
  { id: "polygon", label: "Polygon" },
];

export function Toolbar() {
  const tool = useStore((s) => s.tool);
  const setTool = useStore((s) => s.setTool);
  const previewMode = useStore((s) => s.previewMode);
  const setPreviewMode = useStore((s) => s.setPreviewMode);
  const scene = useStore((s) => s.scene);
  const newScene = useStore((s) => s.newScene);
  const setScene = useStore((s) => s.setScene);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={tool === t.id ? "active" : ""}
            onClick={() => setTool(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="toolbar-group">
        <button className={previewMode === "2d" ? "active" : ""} onClick={() => setPreviewMode("2d")}>
          2D Preview
        </button>
        <button className={previewMode === "beam" ? "active" : ""} onClick={() => setPreviewMode("beam")}>
          Beam Preview
        </button>
        <button className={previewMode === "ilda" ? "active" : ""} onClick={() => setPreviewMode("ilda")}>
          ILDA Preview
        </button>
      </div>
      <div className="toolbar-group">
        <button onClick={newScene}>New</button>
        <button onClick={() => exportScene(scene)}>Save</button>
        <button onClick={() => fileInputRef.current?.click()}>Load</button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const loaded = await importScene(file);
            setScene(loaded);
            e.target.value = "";
          }}
        />
      </div>
      {tool === "polygon" && <p className="hint">Click to add points, Enter to finish, Esc to cancel.</p>}
    </div>
  );
}
