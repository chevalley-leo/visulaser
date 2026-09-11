import { useState } from "react";
import { useStore } from "../store";
import { generateScene } from "../generators/scene";
import type { ColorMode } from "../generators/scene";
import { STYLE_PRESETS } from "../styles";
import type { SceneStyle } from "../styles";
import { SeedControls } from "./RandomizeControls";

const STYLES = Object.keys(STYLE_PRESETS) as SceneStyle[];

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label>
      {label} ({value.toFixed(2)})
      <input type="range" min={0} max={1} step={0.01} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

export function SceneGenerator() {
  const setScene = useStore((s) => s.setScene);
  const [style, setStyle] = useState<SceneStyle>("geometric");
  const [complexity, setComplexity] = useState(0.5);
  const [density, setDensity] = useState(0.5);
  const [movement, setMovement] = useState(0.5);
  const [chaos, setChaos] = useState(0.3);
  const [buildUp, setBuildUp] = useState(0.4);
  const [colorMode, setColorMode] = useState<ColorMode>("mono");
  const [duration, setDuration] = useState(10);
  const [seed, setSeed] = useState(0);

  function generate() {
    setScene(generateScene({ style, complexity, density, movement, chaos, buildUp, colorMode, duration, seed }));
  }

  function generateVariation() {
    const delta = Math.floor(Math.random() * 1000) + 1;
    setSeed(seed + delta);
    setScene(generateScene({ style, complexity, density, movement, chaos, buildUp, colorMode, duration, seed: seed + delta }));
  }

  return (
    <div className="beam-panel">
      <h4>Scene Generator</h4>
      <label>
        Style
        <select value={style} onChange={(e) => setStyle(e.target.value as SceneStyle)}>
          {STYLES.map((s) => (
            <option key={s} value={s}>
              {STYLE_PRESETS[s].label}
            </option>
          ))}
        </select>
      </label>

      <Slider label="Complexity" value={complexity} onChange={setComplexity} />
      <Slider label="Density" value={density} onChange={setDensity} />
      <Slider label="Movement" value={movement} onChange={setMovement} />
      <Slider label="Chaos" value={chaos} onChange={setChaos} />
      <Slider label="Build-up" value={buildUp} onChange={setBuildUp} />

      <div className="row">
        <label>
          Color mode
          <select value={colorMode} onChange={(e) => setColorMode(e.target.value as ColorMode)}>
            <option value="mono">Mono</option>
            <option value="complementary">Complementary</option>
            <option value="rainbow">Rainbow</option>
          </select>
        </label>
        <label>
          Duration (s)
          <input type="number" min={1} step={1} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
        </label>
      </div>

      <SeedControls seed={seed} onChange={setSeed} />

      <div className="row">
        <button onClick={generate}>Generate Scene</button>
        <button onClick={generateVariation}>Generate Variation</button>
      </div>
      <p className="hint">
        "Generate Scene" remplace la scène actuelle. "Generate Variation" garde les réglages et dérive un nouveau
        seed proche. Build-up = 0 : tout apparaît d'un coup. Plus haut : les éléments entrent en fondu, étalés sur la
        scène.
      </p>
    </div>
  );
}
