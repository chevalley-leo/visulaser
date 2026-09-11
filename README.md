# Visulaser — Mode d'emploi

Éditeur de show laser (2D pour l'instant, sortie ILDA plus tard). Voir
`PLAN.md` pour la roadmap complète.

## Installation (une seule fois)

Dans un terminal, à la racine du projet :

```bash
npm install
```

## Lancer l'application

Trois façons, du plus simple au plus abouti :

### 1. Mode web (le plus rapide pour bosser)

```bash
npm run dev
```

Puis ouvrir l'URL affichée dans le terminal (`http://localhost:5173`, ou un
autre port si celui-ci est déjà pris) dans un navigateur.

### 2. Fenêtre desktop (Electron)

```bash
npm run electron:dev
```

Une seule commande : elle démarre le serveur puis ouvre une vraie fenêtre
d'application. Pas besoin de lancer `npm run dev` en plus.

⚠️ Si vous lancez cette commande depuis le terminal intégré de VS Code et que
la fenêtre ne s'ouvre pas (l'app se comporte comme si elle tournait sans
interface), c'est parce que VS Code (lui-même basé sur Electron) peut
transmettre la variable d'environnement `ELECTRON_RUN_AS_NODE` à ses
terminaux enfants, ce qui empêche Electron de démarrer en mode graphique.
Le script `electron/dev.cjs` la retire automatiquement avant de lancer la
fenêtre ; si le problème persiste, essayez depuis un terminal Windows
classique (pas celui de VS Code).

### 3. Exécutable Windows packagé

```bash
npm run dist:win
```

Puis lancer `dist\win-unpacked\Visulaser.exe` directement (double-clic, pas
besoin de terminal une fois que c'est construit).

## Utiliser l'interface

- **Colonne de gauche** : outils de dessin (Select, Point, Line, Rectangle,
  Circle, Polygon), bascule de mode d'affichage (`2D Preview` / `Beam
  Preview` — ce dernier simule un rendu plus proche d'un vrai laser dans la
  brume), et boutons New / Save / Load de scène.
- **Centre** : le canvas. Cliquer-glisser pour dessiner une forme avec l'outil
  actif ; avec `Select`, cliquer un objet pour le sélectionner puis le
  glisser pour le déplacer. `Suppr`/`Retour` supprime l'objet sélectionné.
  Pour un polygone : clic pour chaque point, `Entrée` pour terminer, `Échap`
  pour annuler.
- **Colonne de droite**, du haut vers le bas :
  - **Properties** : nom, position/rotation/échelle/intensité de l'objet
    sélectionné, couleur, visibilité. Chaque propriété animable a un bouton
    `+ Key` (ajoute une keyframe à l'instant du curseur de lecture) et un
    panneau `LFO` dépliable (oscillateur : sinus/triangle/carré/dent de
    scie/bruit, avec amplitude et fréquence) pour une animation continue sans
    keyframes.
  - **Beam Generator** : génère automatiquement des faisceaux (Fan, Sweep,
    Radial, Tunnel, Spiral) à partir de quelques paramètres (nombre, longueur,
    angle, vitesse de rotation, couleur, intensité). Les objets générés sont
    ajoutés à la scène et restent éditables comme n'importe quel objet.
  - **Scenes** : liste des scènes, renommage, sélection.
- **Bas d'écran** : la timeline. Play/Pause/Stop/Loop, durée de la scène,
  règle temporelle, une ligne par objet avec ses keyframes (cliquer une
  keyframe pour la supprimer). Cliquer/glisser dans la timeline déplace le
  curseur de lecture.

## Sauvegarde

La scène en cours est sauvegardée automatiquement dans le navigateur
(`localStorage`) — elle est restaurée si vous rechargez la page. Le bouton
**Save** exporte la scène en fichier `.json` ; **Load** en réimporte un.
