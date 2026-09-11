import { useStore } from "../store";

export function SceneList() {
  const scene = useStore((s) => s.scene);
  const selectedId = useStore((s) => s.selectedId);
  const selectObject = useStore((s) => s.selectObject);
  const updateObject = useStore((s) => s.updateObject);
  const renameScene = useStore((s) => s.renameScene);

  return (
    <div className="scene-list">
      <input
        className="scene-name"
        value={scene.name}
        onChange={(e) => renameScene(e.target.value)}
      />
      <ul>
        {scene.objects.map((o) => (
          <li key={o.id} className={o.id === selectedId ? "active" : ""}>
            <input
              type="checkbox"
              checked={o.visible}
              onChange={(e) => updateObject(o.id, { visible: e.target.checked })}
            />
            <span onClick={() => selectObject(o.id)}>{o.name}</span>
          </li>
        ))}
        {scene.objects.length === 0 && <li className="hint">No objects yet.</li>}
      </ul>
    </div>
  );
}
