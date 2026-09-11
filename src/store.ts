import { create } from "zustand";
import type { AnimatableProp, LaserObject, LFOConfig, Scene, Tool } from "./types";
import { makeId } from "./shapes";

const STORAGE_KEY = "visulaser.scene";

function emptyScene(): Scene {
  return { id: makeId(), name: "Untitled Scene", duration: 10, objects: [] };
}

function loadFromStorage(): Scene {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const scene = JSON.parse(raw) as Scene;
      return { ...scene, duration: scene.duration ?? 10 };
    }
  } catch {
    // ignore corrupt storage
  }
  return emptyScene();
}

interface StoreState {
  scene: Scene;
  selectedId: string | null;
  tool: Tool;
  previewMode: "2d" | "beam" | "ilda";
  currentTime: number;
  isPlaying: boolean;
  isLooping: boolean;
  setTool: (tool: Tool) => void;
  setPreviewMode: (mode: "2d" | "beam" | "ilda") => void;
  addObject: (obj: LaserObject) => void;
  updateObject: (id: string, partial: Partial<LaserObject>) => void;
  removeObject: (id: string) => void;
  selectObject: (id: string | null) => void;
  newScene: () => void;
  setScene: (scene: Scene) => void;
  renameScene: (name: string) => void;
  setDuration: (seconds: number) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  toggleLoop: () => void;
  setCurrentTime: (t: number) => void;
  addKeyframe: (objId: string, prop: AnimatableProp, time: number, value: number) => void;
  removeKeyframe: (objId: string, prop: AnimatableProp, keyframeId: string) => void;
  clearTrack: (objId: string, prop: AnimatableProp) => void;
  setLFO: (objId: string, prop: AnimatableProp, lfo: LFOConfig | null) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  scene: loadFromStorage(),
  selectedId: null,
  tool: "select",
  previewMode: "2d",
  currentTime: 0,
  isPlaying: false,
  isLooping: true,
  setTool: (tool) => set({ tool }),
  setPreviewMode: (previewMode) => set({ previewMode }),
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
  newScene: () => set({ scene: emptyScene(), selectedId: null, currentTime: 0, isPlaying: false }),
  setScene: (scene) => set({ scene, selectedId: null, currentTime: 0, isPlaying: false }),
  renameScene: (name) => set((s) => ({ scene: { ...s.scene, name } })),
  setDuration: (seconds) => set((s) => ({ scene: { ...s.scene, duration: Math.max(0.5, seconds) } })),
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  stop: () => set({ isPlaying: false, currentTime: 0 }),
  toggleLoop: () => set((s) => ({ isLooping: !s.isLooping })),
  setCurrentTime: (t) => set({ currentTime: Math.max(0, Math.min(get().scene.duration, t)) }),
  addKeyframe: (objId, prop, time, value) =>
    set((s) => ({
      scene: {
        ...s.scene,
        objects: s.scene.objects.map((o) => {
          if (o.id !== objId) return o;
          const existing = o.tracks?.[prop] ?? [];
          const withoutSameTime = existing.filter((k) => Math.abs(k.time - time) > 1e-3);
          const track = [...withoutSameTime, { id: makeId(), time, value }];
          return { ...o, tracks: { ...o.tracks, [prop]: track } };
        }),
      },
    })),
  removeKeyframe: (objId, prop, keyframeId) =>
    set((s) => ({
      scene: {
        ...s.scene,
        objects: s.scene.objects.map((o) => {
          if (o.id !== objId || !o.tracks?.[prop]) return o;
          const track = o.tracks[prop]!.filter((k) => k.id !== keyframeId);
          return { ...o, tracks: { ...o.tracks, [prop]: track } };
        }),
      },
    })),
  clearTrack: (objId, prop) =>
    set((s) => ({
      scene: {
        ...s.scene,
        objects: s.scene.objects.map((o) => {
          if (o.id !== objId) return o;
          const tracks = { ...o.tracks };
          delete tracks[prop];
          return { ...o, tracks };
        }),
      },
    })),
  setLFO: (objId, prop, lfo) =>
    set((s) => ({
      scene: {
        ...s.scene,
        objects: s.scene.objects.map((o) => {
          if (o.id !== objId) return o;
          const lfos = { ...o.lfos };
          if (lfo) lfos[prop] = lfo;
          else delete lfos[prop];
          return { ...o, lfos };
        }),
      },
    })),
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
