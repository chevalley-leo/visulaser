import { mulberry32, uniform } from "../random";

export interface RandomSpec {
  on: boolean;
  range: number; // ± around the base value
}

export type RandomState = Record<string, RandomSpec>;

// Applies checked ± ranges to a base params object using a seeded RNG — same
// seed always reproduces the same jittered result.
export function applyRandomization<T extends Record<string, number>>(
  base: T,
  spec: RandomState,
  seed: number,
): T {
  const rng = mulberry32(seed);
  const result = { ...base };
  for (const key of Object.keys(spec)) {
    const s = spec[key];
    if (s?.on && key in result) {
      result[key as keyof T] = uniform(rng, result[key] - s.range, result[key] + s.range) as T[keyof T];
    }
  }
  return result;
}

export function RandomizeRow({
  label,
  spec,
  onChange,
}: {
  label: string;
  spec: RandomSpec;
  onChange: (spec: RandomSpec) => void;
}) {
  return (
    <label className="row randomize-row">
      <input type="checkbox" checked={spec.on} onChange={(e) => onChange({ ...spec, on: e.target.checked })} />
      {label} ±
      <input
        type="number"
        min={0}
        step={0.05}
        value={spec.range}
        disabled={!spec.on}
        onChange={(e) => onChange({ ...spec, range: Number(e.target.value) })}
      />
    </label>
  );
}

export function SeedControls({ seed, onChange }: { seed: number; onChange: (seed: number) => void }) {
  return (
    <div className="row">
      <label>
        Seed
        <input type="number" value={seed} onChange={(e) => onChange(Number(e.target.value))} />
      </label>
      <button type="button" onClick={() => onChange(Math.floor(Math.random() * 100000))}>
        Randomize Seed
      </button>
    </div>
  );
}
