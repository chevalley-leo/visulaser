import { create } from "zustand";
import type { LaserObject, Scene, Tool } from "./types";
import { makeId } from "./shapes";

const STORAGE_KEY = "visulaser.scene";

function emptyScene(): Scene {
  return { id: makeId(), name: "Untitled Scene", objects: [] };
}

function loadFromStorage(): Scene {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Scene;
  } catch {
    // ignore corrupt storage
  }
  return emptyScene();
}

interface StoreState {
  scene: Scene;
  selectedId: string | null;
  tool: Tool;
  setTool: (tool: Tool) => void;
  addObject: (obj: LaserObject) => void;
  updateObject: (id: string, partial: Partial<LaserObject>) => void;
  removeObject: (id: string) => void;
  selectObject: (id: string | null) => void;
  newScene: () => void;
  setScene: (scene: Scene) => void;
  renameScene: (name: string) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  scene: loadFromStorage(),
  selectedId: null,
  tool: "select",
  setTool: (tool) => set({ tool }),
  addObject: (obj) =>
    set((s) => ({ scene: { ...s.scene, objects: [...s.scene.objects, obj] }, selectedId: obj.id })),
  updateObject: (id, partial) =>
    set((s) => ({
      scene: {
        ...s.scene,
        objects: s.scene.objects.map((o) => (o.id === id ? { ...o, ...partial } : o)),
      },
    })),
  removeObject: (id) =>
    set((s) => ({
      scene: { ...s.scene, objects: s.scene.objects.filter((o) => o.id !== id) },
      selectedId: get().selectedId === id ? null : get().selectedId,
    })),
  selectObject: (id) => set({ selectedId: id }),
  newScene: () => set({ scene: emptyScene(), selectedId: null }),
  setScene: (scene) => set({ scene, selectedId: null }),
  renameScene: (name) => set((s) => ({ scene: { ...s.scene, name } })),
}));

useStore.subscribe((state) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.scene));
});

export function exportScene(scene: Scene) {
  const blob = new Blob([JSON.stringify(scene, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${scene.name || "scene"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importScene(file: File): Promise<Scene> {
  return file.text().then((text) => JSON.parse(text) as Scene);
}
