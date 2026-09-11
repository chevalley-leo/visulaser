// ponytail: seedable value-noise (smoothstep-interpolated hash), not true Perlin/simplex —
// cheap and deterministic, good enough for organic wobble; upgrade if directional bias shows.

function hash1D(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function hash2D(x: number, y: number): number {
  return hash1D(x * 12.9898 + y * 78.233);
}

export function noise1D(x: number, seed = 0): number {
  const xs = x + seed * 1000;
  const i = Math.floor(xs);
  const f = xs - i;
  const a = hash1D(i);
  const b = hash1D(i + 1);
  const smooth = f * f * (3 - 2 * f);
  return (a + (b - a) * smooth) * 2 - 1; // -1..1
}

export function noise2D(x: number, y: number, seed = 0): number {
  const xs = x + seed * 1000;
  const ys = y + seed * 1000;
  const x0 = Math.floor(xs);
  const y0 = Math.floor(ys);
  const fx = xs - x0;
  const fy = ys - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const n00 = hash2D(x0, y0);
  const n10 = hash2D(x0 + 1, y0);
  const n01 = hash2D(x0, y0 + 1);
  const n11 = hash2D(x0 + 1, y0 + 1);
  const ix0 = n00 + (n10 - n00) * sx;
  const ix1 = n01 + (n11 - n01) * sx;
  return (ix0 + (ix1 - ix0) * sy) * 2 - 1; // -1..1
}
