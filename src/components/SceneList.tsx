import { useState } from "react";
import { useStore } from "../store";
import { mulberry32, uniform } from "../random";
import { groupObjects } from "../groups";
import { SeedControls } from "./RandomizeControls";

export function SceneList() {
  const scene = useStore((s) => s.scene);
  const selectedId = useStore((s) => s.selectedId);
  const selectObject = useStore((s) => s.selectObject);
  const updateObject = useStore((s) => s.updateObject);
  const renameScene = useStore((s) => s.renameScene);
  const [allSeed, setAllSeed] = useState(0);
  const [posRange, setPosRange] = useState(0.1);
  const [rotRange, setRotRange] = useState(10);
  // absence = collapsed by default, so freshly generated groups start minimized
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  function toggleGroup(groupId: string) {
    setExpandedGroups((s) => {
      const next = new Set(s);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  function randomizeAll() {
    const rng = mulberry32(allSeed);
    for (const o of scene.objects) {
      updateObject(o.id, {
        x: uniform(rng, o.x - posRange, o.x + posRange),
        y: uniform(rng, o.y - posRange, o.y + posRange),
        rotation: uniform(rng, o.rotation - rotRange, o.rotation + rotRange),
      });
    }
  }

  return (
    <div className="scene-list">
      <input
        className="scene-name"
        value={scene.name}
        onChange={(e) => renameScene(e.target.value)}
      />
      <ul>
        {groupObjects(scene.objects).map((g) => {
          const isGroup = g.members.length > 1;
          const expanded = expandedGroups.has(g.groupId);
          const allVisible = g.members.every((m) => m.visible);
          return (
            <li key={g.groupId} className="group">
              <div className={`group-row${g.members.some((m) => m.id === selectedId) ? " active" : ""}`}>
                {isGroup && (
                  <button className="group-toggle" onClick={() => toggleGroup(g.groupId)}>
                    {expanded ? "▾" : "▸"}
                  </button>
                )}
                <input
                  type="checkbox"
                  checked={allVisible}
                  onChange={(e) => g.members.forEach((m) => updateObject(m.id, { visible: e.target.checked }))}
                />
                <span onClick={() => selectObject(g.members[0].id)}>
                  {isGroup ? `${g.groupName} (${g.members.length})` : g.groupName}
                </span>
              </div>
              {isGroup && expanded && (
                <ul className="group-members">
                  {g.members.map((o) => (
                    <li key={o.id} className={o.id === selectedId ? "active" : ""}>
                      <input
                        type="checkbox"
                        checked={o.visible}
                        onChange={(e) => updateObject(o.id, { visible: e.target.checked })}
                      />
                      <span onClick={() => selectObject(o.id)}>{o.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
        {scene.objects.length === 0 && <li className="hint">No objects yet.</li>}
      </ul>
      {scene.objects.length > 0 && (
        <details className="lfo-details">
          <summary>Randomize All Objects</summary>
          <div className="lfo-controls" style={{ flexDirection: "column" }}>
            <SeedControls seed={allSeed} onChange={setAllSeed} />
            <label className="row">
              Position ±
              <input type="number" min={0} step={0.01} value={posRange} onChange={(e) => setPosRange(Number(e.target.value))} />
            </label>
            <label className="row">
              Rotation ±
              <input type="number" min={0} step={1} value={rotRange} onChange={(e) => setRotRange(Number(e.target.value))} />
            </label>
            <button onClick={randomizeAll}>Apply to All</button>
          </div>
        </details>
      )}
    </div>
  );
}
