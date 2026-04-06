# Helldivers 2 — Dashboard de Guerre Galactique
## Contexte pour continuer le développement dans Cursor

---

## Ce qui existe déjà

Un dashboard HTML/CSS/JS standalone (`helldivers2-dashboard.html`) avec :

- **Écran de chargement** séquencé avec messages HD2 en français
- **Header** avec horloge en temps réel, statut de guerre, titre
- **4 métriques top bar** : Helldivers déployés / Planètes en manque de Démocratie / Infestées Terminiide / Occupées Automate
- **Carte galactique SVG** interactive : planètes colorées par faction, lignes d'approvisionnement pulsantes, Super Terre au centre, pulse animé sur planètes en combat
- **Popup de détail** au clic sur une planète : faction, secteur, Helldivers au sol, taux de Démocratie, biome, dangers environnementaux, mini graphe
- **Panel droit** : Directive de Super Terre (Major Order), liste des fronts actifs triés par joueurs, vue secteurs galactiques
- **Barre de statut** fixe en bas
- **Auto-refresh** toutes les 60 secondes
- **Gestion d'erreur** si l'API est down

### Stack technique (prototype actuel)
- HTML/CSS/JS vanilla, zéro dépendance
- Fonts : `Orbitron` (titres), `Share Tech Mono` (monospace), `Rajdhani` (corps)
- Effets : scanlines animées, glow ambre/rouge/cyan, SVG animé
- CORS proxy : `https://corsproxy.io/?` + URL encodée

### Stack cible (migration recommandée)
- **Vite + React + TypeScript + Tailwind CSS**
- Raison : meilleure maintenabilité, composants isolés, typage de l'API, assistance IA optimale sur cette stack
- Déploiement : **Vercel** (gratuit, CI/CD automatique depuis GitHub)

```bash
npm create vite@latest helldivers-dashboard -- --template react-ts
cd helldivers-dashboard
npm install -D tailwindcss @tailwindcss/vite
npm run dev
```

#### Structure de projet cible
```
helldivers-dashboard/
├── src/
│   ├── components/
│   │   ├── GalaxyMap.tsx       ← carte SVG interactive
│   │   ├── MetricsBar.tsx      ← 4 compteurs du haut
│   │   ├── WarStats.tsx        ← stats globales de guerre
│   │   ├── PlanetList.tsx      ← panel droit / fronts actifs
│   │   └── PlanetDetail.tsx    ← popup détail planète
│   ├── hooks/
│   │   └── useWarData.ts       ← fetch + auto-refresh 60s
│   ├── types/
│   │   └── helldivers.ts       ← types Planet, Campaign, WarStats…
│   └── App.tsx
```

> **Note pour Claude Code** : toujours définir les types TypeScript en premier (`helldivers.ts`) avant de générer les composants — ça évite qu'il invente des champs qui n'existent pas dans l'API.

---

## API utilisée

**Base URL** : `https://helldiverstrainingmanual.com/api/v1/war`

| Endpoint | Contenu |
|---|---|
| `/status` | Statut de toutes les planètes, joueurs, campagnes actives |
| `/info` | Infos statiques des planètes (secteur, biome, etc.) |
| `/major-orders` | Ordre(s) Majeur(s) actifs |
| `/history/[planetIndex]` | Historique de libération d'une planète (intervalles 5min, 24h) |
| `/news` | Fil d'actualité in-game |

**Exemple de fetch avec CORS proxy :**
```js
const PROXY = 'https://corsproxy.io/?';
const BASE = 'https://helldiverstrainingmanual.com/api/v1/war';

async function fetchJSON(url) {
  const res = await fetch(PROXY + encodeURIComponent(url));
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}
```

**Structure d'un objet planète (depuis `/status`) :**
```js
{
  planet: {
    index: 64,
    name: "Fenrir III",
    sector: 7,
    biome: { slug: "tundra" },
    environmentals: [{ name: "Blizzards extrêmes" }],
    maxHealth: 1000000
  },
  owner: 3,        // 1=Super Terre, 2=Terminiides, 3=Automates, 4=Illuminés
  players: 4821,
  health: 650000,
  liberation: 35.0 // % de libération
}
```

**Structure d'un objet stats globales (depuis `/status`) :**
```js
// Dans data.galaxyStats ou data.warStats (varie selon version API)
{
  missionsWon: 12500000,
  missionsLost: 3200000,
  missionSuccessRate: 0.79,
  casualtiesFriendly: 850000000,
  casualtiesEnemy: 42000000000,
  bulletsFired: 990000000000,
  bulletsHit: 210000000000,
  timePlayed: 8800000000,
  deaths: 850000000,
  revives: 120000000,
  friendlies: 9000000,
  missionTime: 450000000
}
```

---

## Palette de couleurs (CSS variables)

```css
--amber: #f59e0b;        /* Couleur principale, Super Terre */
--amber-dim: #92400e;
--amber-glow: rgba(245,158,11,0.15);
--red: #ef4444;          /* Automates / danger */
--cyan: #06b6d4;         /* Super Terre / planètes libérées */
--green: #22c55e;        /* Libération / positif */
--bg: #070709;           /* Fond principal */
--bg2: #0d0d10;
--border: rgba(245,158,11,0.25);
--border-bright: rgba(245,158,11,0.6);
--text: #e8d5a3;
--text-dim: #7a6a45;
```

---

## Vocabulaire HD2 à respecter

| Terme générique | Terme HD2 |
|---|---|
| Joueurs | Helldivers / Citoyens déployés |
| Ennemis tués | Ennemis de la Démocratie éliminés |
| Morts (alliés) | Helldivers tombés pour la Démocratie |
| Planète contestée | Planète en manque de Démocratie |
| Planète ennemie (Terminiides) | Planète infestée |
| Planète ennemie (Automates) | Planète sous occupation Automate |
| Planète libérée | Planète sous contrôle démocratique |
| Taux de libération | Taux de Démocratie |
| Ordre Majeur | Directive de Super Terre |
| Erreur réseau | Signal interféré |
| Factions ennemies | Terminiides (insectes) / Automates (robots) / Illuminés |
| Missions réussies | Opérations démocratiques réussies |
| Missions échouées | Retraites tactiques |
| Tirs amis | Incidents démocratiques collatéraux |
| Balles tirées | Munitions expendées pour la liberté |

---

## Prochaine feature à implémenter : Stats globales de guerre

### Objectif
Ajouter une section "BILAN DE GUERRE GALACTIQUE" sous les métriques existantes (ou dans un panneau dédié), affichant les statistiques cumulées de tous les Helldivers depuis le début de la guerre.

### Données à afficher

| Stat API | Label HD2 |
|---|---|
| `casualtiesEnemy` | Ennemis de la Démocratie éliminés |
| `deaths` / `casualtiesFriendly` | Helldivers tombés pour la Démocratie |
| `bulletsFired` | Munitions expendées pour la liberté |
| `bulletsHit` | Munitions qui ont servi la Démocratie |
| `missionsWon` | Opérations démocratiques réussies |
| `missionsLost` | Retraites tactiques |
| `missionSuccessRate` | Taux de réussite démocratique |
| `friendlies` | Incidents démocratiques collatéraux (tirs amis) |
| `revives` | Helldivers remis sur pied |
| `timePlayed` | Temps total sacrifié pour la Démocratie |

### Design suggéré
- Bande horizontale sous les 4 métriques actuelles, fond `--bg2`, border-top ambre
- Grille de cartes avec `Orbitron` pour les valeurs, formatées en notation courte (ex: `42,3 Md` pour milliards, `990 Md` pour les balles)
- Valeur principale grande + label petit dessous + icône ASCII optionnelle (ex: `⚔` kills, `✠` morts, `◎` balles)
- Même style `metric-cell` que les métriques existantes mais plus compact
- Fonction de formatage :
```js
function fmtBig(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + ' Bi';
  if (n >= 1e9)  return (n / 1e9).toFixed(1) + ' Md';
  if (n >= 1e6)  return (n / 1e6).toFixed(1) + ' M';
  if (n >= 1e3)  return (n / 1e3).toFixed(1) + ' k';
  return String(Math.round(n));
}
```

### Où chercher les stats dans l'API
Les stats globales sont dans `data.galaxyStats` ou `data.warStats` de la réponse `/status`. Tester les deux clés et fallback gracieux si absent.

```js
const stats = data.galaxyStats || data.warStats || null;
if (stats) renderWarStats(stats);
```

---

## Structure du code existant (repères)

```
runLoadingSequence()     → séquence de boot
loadData()               → fetch API, appelle processStatus() + processMajorOrder()
processStatus(data)      → construit STATE.planets et STATE.campaigns
renderAll()              → appelle renderMetrics(), renderMap(), renderPlanetList(), renderFactionCounts()
renderMetrics()          → met à jour les 4 métriques du top
renderMap()              → dessine la carte SVG
renderPlanetList()       → liste des fronts actifs dans le panel droit
renderSectors()          → vue secteurs dans le panel droit
showPlanetDetail(planet) → popup de détail planète
renderMiniChart(lib)     → mini graphe dans le popup
startRefreshCountdown()  → compte à rebours 60s puis reload
renderFallback()         → affichage dégradé si API down
```

---

## Workflow Git

- **1 feature = 1 branche** : toujours créer une branche dédiée avant de commencer une feature (`git checkout -b feat/<nom>`)
- Merger dans `main` uniquement quand la feature est terminée et testée
- Nommage : `feat/metrics-bar`, `feat/war-stats`, `feat/galaxy-map`, etc.

---

## Notes techniques

- Le CORS proxy `corsproxy.io` peut être lent ou down — prévoir un fallback sur `https://api.allorigins.win/get?url=` (retourne `{contents: "..."}` → `JSON.parse(data.contents)`)
- Les valeurs de `liberation` peuvent être entre 0 et 1 **ou** entre 0 et 100 selon la version d'API — toujours normaliser : `if (lib > 1) lib = lib; else lib = lib * 100`
- Les stats globales sont potentiellement absentes si l'API change — toujours `?.` et fallback à 0
- L'API retourne parfois `planetStatus` et parfois `planets` — tester les deux