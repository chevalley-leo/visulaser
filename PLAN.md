# Visulaser — Plan de développement

Basé sur le cahier des charges. Chaque phase construit sur la précédente sans
réécriture : le modèle `LaserObject`/`Scene` (voir `src/types.ts`) reste la
source de vérité, tout converge vers lui avant d'être rendu par
`CanvasView`. On ne saute pas de phase sauf demande explicite.

Pipeline cible (stable depuis la Phase 1) :
`Scene → Objects (Shape+Transform+Color+Animation+Effects) → Generators → Timeline → Vector Paths → Laser Points → ILDA`

## Décisions transverses

- Pas de nouvelle dépendance quand une implémentation maison (PRNG seedable,
  bruit de Perlin, interpolation) suffit — moins de surface, plus facile à
  seed/déboguer.
- Chaque générateur (beam, shape, scene) est une fonction pure
  `(params, seed) → LaserObject[]`, indépendante de l'UI et testable seule.
- Le rendu (`CanvasView`) ne doit jamais connaître un type de générateur
  spécifique : tout passe par `LaserObject` avant d'être dessiné.

## Phase 1 — Prototype ✅

Éditeur canvas : formes (point/line/rect/circle/polygon), transform, RGB,
scènes, save/load JSON, export Electron `.exe`.

## Phase 2 — Animation ✅

- `LaserObject.tracks` : keyframes par propriété (`{time, value}[]`),
  interpolation linéaire.
- `LaserObject.lfo` : modulateur optionnel par propriété (sine/triangle/
  square/saw/noise, amplitude, fréquence), synchronisé au temps de la scène.
- `Scene.duration` + état de lecture (temps courant, play/pause/loop) dans
  le store.
- `evaluateObjectAtTime(obj, t)` : fusionne base + tracks + LFO → objet
  "effectif", consommé tel quel par `CanvasView`.
- UI : composant `Timeline` (règle, une ligne par objet, playhead,
  Play/Pause/Stop/Loop), ajout de keyframe au playhead depuis
  `PropertiesPanel`, panneau LFO par propriété.

## Phase 3 — Beam Engine ✅

- `src/generators/beams.ts` : `fan`, `sweep`, `radial`, `tunnel`,
  `spiralBeam` — chacun `(params) → LaserObject[]` (des lignes/segments
  depuis un centre).
- Panneau "Beam Generator" avec les paramètres du cahier des charges
  (nombre de faisceaux, angle, vitesse, rotation, couleur...) et bouton
  Generate qui insère les objets dans la scène (éditables ensuite).
- Mode preview "Beam" dans `CanvasView` (cône glow additif par segment,
  simule la brume) en plus du mode "2D" existant.
- `src/camera3d.ts` : caméra perspective fixe "public dans la foule" —
  "Beam" projette désormais avec un vrai point de vue 3D (faisceaux du
  fixture (z proche) vers l'écran lointain (z loin)), plutôt que la
  même projection vue-de-dessus que "2D". "2D"/"ILDA" restent en
  projection plate (plan de travail).

## Phase 4 — Procedural Engine ✅

- Extension de `src/shapes.ts` : polygones/étoiles radiaux avec variation
  de rayon, symétrie, distortion, bruit.
- `src/generators/wave.ts`, `spiral.ts` : générateurs dédiés, combinables.
- `src/noise.ts` : bruit de Perlin/simplex maison (léger), réutilisé par
  wave/distortion/particles.
- Particles : points dont position/opacité sont pilotées par tracks/LFO
  existants (pas de nouveau système de rendu).

## Phase 5 — Random Engine

- `src/random.ts` : PRNG seedable (mulberry32), distributions uniforme et
  gaussienne (Box-Muller), tirage pondéré.
- Chaque générateur (Phase 3/4) accepte un `seed` optionnel → reproductible.
- Champ Seed + bouton "Randomize Seed" par générateur.
- Panneau de randomisation contrôlée : cases à cocher par paramètre avec
  plage `±`, applicable à un objet, un groupe, ou tous les faisceaux.

## Phase 6 — Scene Generator

- `src/generators/scene.ts` : `(style, complexity, density, movement,
  chaos, colorMode, duration, seed) → Scene` complète, composée des
  générateurs de beam/shape existants.
- `src/styles.ts` : presets de paramètres (Geometric/Organic/Chaotic/
  Energetic/Ambient/Techno) — des jeux de paramètres, pas des animations
  figées.
- UI "Generate Scene" (sliders + Generate) et "Generate Variation"
  (réutilise le seed de base ± delta).
- Live Generator : boucle qui étend la timeline en avance en gardant
  palette/complexité cohérentes, pour un show qui ne boucle jamais à
  l'identique.

## Phase 7 — Laser Renderer ✅

- `src/render/toLaserPoints.ts` : `Scene` + temps → `LaserPoint[]`
  (`x, y, r, g, b, intensity, blanking`).
- Interpolation/résample selon vitesse de scan cible, blanking entre
  objets, optimisation de trajectoire (tri par proximité, greedy
  nearest-neighbor).
- Nouveau mode preview "ILDA" dans `CanvasView` : dessine directement la
  sortie de `toLaserPoints` (segments allumés + trajets blanked en
  pointillés + compteur de points), donc ce qu'on valide à l'écran est
  le pipeline réel, pas une simulation séparée.

## Phase 8 — Sortie ILDA

- Intégration DAC (à déterminer selon le hardware réel derrière le
  Stairville — recherche du protocole/lib nécessaire côté Electron main
  process pour l'accès USB, déjà en place).
- Sécurités : limite d'intensité, coupure d'urgence, vérification du
  blanking aux bords de trajectoire.

## Phase 9 — Show System

- Playlist de scènes (séquentiel/boucle/scène par scène).
- Audio-réactif (Web Audio API, analyse d'amplitude simple), MIDI (Web
  MIDI API), OSC (petit serveur Node côté Electron main si besoin).
