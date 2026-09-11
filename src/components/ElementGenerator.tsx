import { useState } from "react";
import { useStore } from "../store";
import { fan, radial, spiralBeam, sweep, tunnel } from "../generators/beams";
import type { BeamParams } from "../generators/beams";
import { createRadialShapeObject } from "../shapes";
import { wave } from "../generators/wave";
import { spiral } from "../generators/spiral";
import { particles } from "../generators/particles";
import { hexToRgb, rgbToHex } from "../color";
import { applyRandomization, RandomizeRow, SeedControls } from "./RandomizeControls";
import type { RandomState } from "./RandomizeControls";
import type { RGB } from "../types";

type Kind = "fan" | "sweep" | "radial" | "tunnel" | "spiralBeam" | "star" | "wave" | "spiralShape" | "particles";

const BEAM_GENERATORS: Record<"fan" | "sweep" | "radial" | "tunnel" | "spiralBeam", (p: BeamParams) => ReturnType<typeof fan>> = {
  fan,
  sweep,
  radial,
  tunnel,
  spiralBeam,
};

const SHOWS_ANGLE: Partial<Record<Kind, boolean>> = { fan: true, sweep: true };

function isBeamKind(kind: Kind): kind is keyof typeof BEAM_GENERATORS {
  return kind in BEAM_GENERATORS;
}

// Beams and procedural shapes used to live in two separate, disconnected
// panels even though they share the same color/intensity/seed controls —
// one panel makes "which generator do I want" a single decision.
export function ElementGenerator() {
  const addObject = useStore((s) => s.addObject);
  const [kind, setKind] = useState<Kind>("fan");
  const [color, setColor] = useState<RGB>({ r: 0, g: 255, b: 80 });
  const [intensity, setIntensity] = useState(1);
  const [seed, setSeed] = useState(0);

  // beams
  const [beamCount, setBeamCount] = useState(8);
  const [length, setLength] = useState(1);
  const [angleSpread, setAngleSpread] = useState(60);
  const [rotationOffset, setRotationOffset] = useState(0);
  const [rotationSpeed, setRotationSpeed] = useState(0);
  const [randomState, setRandomState] = useState<RandomState>({
    length: { on: false, range: 0.2 },
    angleSpread: { on: false, range: 10 },
    rotationOffset: { on: false, range: 15 },
    rotationSpeed: { on: false, range: 0.1 },
  });

  // star
  const [points, setPoints] = useState(5);
  const [innerRatio, setInnerRatio] = useState(0.5);
  const [radius, setRadius] = useState(0.6);
  const [distortion, setDistortion] = useState(0);

  // wave
  const [width, setWidth] = useState(1.6);
  const [amplitude, setAmplitude] = useState(0.4);
  const [frequency, setFrequency] = useState(3);
  const [waveNoise, setWaveNoise] = useState(0);
  const [waveScrollSpeed, setWaveScrollSpeed] = useState(0);

  // spiral shape
  const [turns, setTurns] = useState(3);
  const [arms, setArms] = useState(1);
  const [spiralNoise, setSpiralNoise] = useState(0);

  // particles
  const [particleCount, setParticleCount] = useState(30);
  const [spread, setSpread] = useState(0.8);
  const [flicker, setFlicker] = useState(true);

  function setRandom(key: string, spec: RandomState[string]) {
    setRandomState((s) => ({ ...s, [key]: spec }));
  }

  function generate() {
    if (isBeamKind(kind)) {
      const jittered = applyRandomization({ length, angleSpread, rotationOffset, rotationSpeed }, randomState, seed);
      BEAM_GENERATORS[kind]({ count: beamCount, ...jittered, color, intensity }).forEach(addObject);
    } else if (kind === "star") {
      addObject(
        createRadialShapeObject({ x: 0, y: 0 }, { x: radius, y: 0 }, { points, innerRatio, distortion, seed, color, intensity }),
      );
    } else if (kind === "wave") {
      wave({ width, amplitude, frequency, noiseAmount: waveNoise, scrollSpeed: waveScrollSpeed, seed, color, intensity }).forEach(
        addObject,
      );
    } else if (kind === "spiralShape") {
      spiral({ turns, length: radius, arms, noiseAmount: spiralNoise, seed, color, intensity }).forEach(addObject);
    } else {
      particles({ count: particleCount, spread, flicker, seed, color, intensity }).forEach(addObject);
    }
  }

  return (
    <div className="beam-panel">
      <h4>Element Generator</h4>
      <label>
        Type
        <select value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
          <optgroup label="Beams">
            <option value="fan">Fan</option>
            <option value="sweep">Sweep</option>
            <option value="radial">Radial</option>
            <option value="tunnel">Tunnel</option>
            <option value="spiralBeam">Spiral Beam</option>
          </optgroup>
          <optgroup label="Procedural">
            <option value="star">Star / Radial Shape</option>
            <option value="wave">Wave</option>
            <option value="spiralShape">Spiral Shape</option>
            <option value="particles">Particles</option>
          </optgroup>
        </select>
      </label>

      {isBeamKind(kind) && (
        <>
          <div className="row">
            <label>
              Count
              <input type="number" min={1} max={64} value={beamCount} onChange={(e) => setBeamCount(Number(e.target.value))} />
            </label>
            <label>
              Length
              <input type="number" min={0.05} max={2} step={0.05} value={length} onChange={(e) => setLength(Number(e.target.value))} />
            </label>
          </div>
          {SHOWS_ANGLE[kind] && (
            <label>
              Angle spread (°)
              <input type="number" min={1} max={360} value={angleSpread} onChange={(e) => setAngleSpread(Number(e.target.value))} />
            </label>
          )}
          <div className="row">
            <label>
              Rotation offset (°)
              <input type="number" value={rotationOffset} onChange={(e) => setRotationOffset(Number(e.target.value))} />
            </label>
            <label>
              Rotation speed (rev/s)
              <input type="number" step={0.05} value={rotationSpeed} onChange={(e) => setRotationSpeed(Number(e.target.value))} />
            </label>
          </div>
        </>
      )}

      {kind === "star" && (
        <>
          <div className="row">
            <label>
              Points
              <input type="number" min={3} max={32} value={points} onChange={(e) => setPoints(Number(e.target.value))} />
            </label>
            <label>
              Radius
              <input type="number" min={0.05} max={2} step={0.05} value={radius} onChange={(e) => setRadius(Number(e.target.value))} />
            </label>
          </div>
          <div className="row">
            <label>
              Inner ratio
              <input type="number" min={0.05} max={1} step={0.05} value={innerRatio} onChange={(e) => setInnerRatio(Number(e.target.value))} />
            </label>
            <label>
              Distortion
              <input type="number" min={0} max={1} step={0.05} value={distortion} onChange={(e) => setDistortion(Number(e.target.value))} />
            </label>
          </div>
        </>
      )}

      {kind === "wave" && (
        <>
          <div className="row">
            <label>
              Width
              <input type="number" min={0.1} max={2} step={0.1} value={width} onChange={(e) => setWidth(Number(e.target.value))} />
            </label>
            <label>
              Amplitude
              <input type="number" min={0.01} max={1} step={0.01} value={amplitude} onChange={(e) => setAmplitude(Number(e.target.value))} />
            </label>
          </div>
          <label>
            Frequency (cycles)
            <input type="number" min={0.5} max={20} step={0.5} value={frequency} onChange={(e) => setFrequency(Number(e.target.value))} />
          </label>
          <div className="row">
            <label>
              Noise
              <input type="number" min={0} max={1} step={0.05} value={waveNoise} onChange={(e) => setWaveNoise(Number(e.target.value))} />
            </label>
            <label>
              Scroll speed (Hz)
              <input type="number" min={0} max={5} step={0.1} value={waveScrollSpeed} onChange={(e) => setWaveScrollSpeed(Number(e.target.value))} />
            </label>
          </div>
        </>
      )}

      {kind === "spiralShape" && (
        <div className="row">
          <label>
            Turns
            <input type="number" min={0.5} max={10} step={0.5} value={turns} onChange={(e) => setTurns(Number(e.target.value))} />
          </label>
          <label>
            Length
            <input type="number" min={0.05} max={2} step={0.05} value={radius} onChange={(e) => setRadius(Number(e.target.value))} />
          </label>
          <label>
            Arms
            <input type="number" min={1} max={12} value={arms} onChange={(e) => setArms(Number(e.target.value))} />
          </label>
          <label>
            Noise
            <input type="number" min={0} max={1} step={0.05} value={spiralNoise} onChange={(e) => setSpiralNoise(Number(e.target.value))} />
          </label>
        </div>
      )}

      {kind === "particles" && (
        <>
          <div className="row">
            <label>
              Count
              <input type="number" min={1} max={200} value={particleCount} onChange={(e) => setParticleCount(Number(e.target.value))} />
            </label>
            <label>
              Spread
              <input type="number" min={0.05} max={1.5} step={0.05} value={spread} onChange={(e) => setSpread(Number(e.target.value))} />
            </label>
          </div>
          <label className="row">
            <input type="checkbox" checked={flicker} onChange={(e) => setFlicker(e.target.checked)} />
            Flicker
          </label>
        </>
      )}

      <SeedControls seed={seed} onChange={setSeed} />

      {isBeamKind(kind) && (
        <details className="lfo-details">
          <summary>Randomize</summary>
          <div className="lfo-controls" style={{ flexDirection: "column" }}>
            <RandomizeRow label="Length" spec={randomState.length} onChange={(s) => setRandom("length", s)} />
            {SHOWS_ANGLE[kind] && (
              <RandomizeRow label="Angle spread" spec={randomState.angleSpread} onChange={(s) => setRandom("angleSpread", s)} />
            )}
            <RandomizeRow label="Rotation offset" spec={randomState.rotationOffset} onChange={(s) => setRandom("rotationOffset", s)} />
            <RandomizeRow label="Rotation speed" spec={randomState.rotationSpeed} onChange={(s) => setRandom("rotationSpeed", s)} />
          </div>
        </details>
      )}

      <div className="row">
        <label>
          Color
          <input type="color" value={rgbToHex(color)} onChange={(e) => setColor(hexToRgb(e.target.value))} />
        </label>
        <label>
          Intensity
          <input type="range" min={0} max={1} step={0.01} value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} />
        </label>
      </div>

      <button onClick={generate}>Generate</button>
    </div>
  );
}
