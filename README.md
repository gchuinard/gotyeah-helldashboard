# gotyeah-helldashboard

Dashboard de guerre galactique en temps réel pour **Helldivers 2**, thématisé "Ministère de la Paix — Super Terre".

## Aperçu

Interface militaire qui agrège les données de l'API communautaire Helldivers 2 et les affiche sous forme de tableau de bord tactique :

- **Carte galactique** — visualisation SVG interactive des secteurs (algorithme Voronoi via d3-delaunay) avec code couleur par faction
- **Métriques en temps réel** — Helldivers déployés, planètes contestées, contrôle par faction (Terminiides, Automates, Illuminés)
- **Bilan de guerre** — statistiques globales : missions, victimes, balles tirées, temps de jeu
- **Fronts actifs** — liste scrollable des planètes en campagne, triées par présence de joueurs
- **Ordres majeurs** — directive courante de Super Terre
- **Détail planète** — popup avec biome, dangers environnementaux, progression de libération
- **Barre de statut** — état de connexion, countdown avant prochain refresh, numéro de guerre

Rafraîchissement automatique toutes les **60 secondes**.

## Stack

| Outil | Version |
|---|---|
| React | 19 |
| TypeScript | ~5.7 |
| Vite | 6 |
| Tailwind CSS | 4 |
| d3-delaunay | 6 |

Polices : **Orbitron** + **Share Tech Mono**

## Démarrage

```bash
npm install
npm run dev
```

## Variables d'environnement

Créer un fichier `.env.local` à la racine :

```env
VITE_API_BASE_URL=<URL de base de l'API Helldivers 2>
VITE_CORS_PROXY=<URL du proxy CORS>
```

## Scripts

```bash
npm run dev      # Serveur de développement
npm run build    # Build de production (tsc + vite)
npm run preview  # Prévisualisation du build
npm run lint     # ESLint
```

## Architecture

```
src/
├── components/
│   ├── GalaxyMap.tsx      # Carte SVG avec secteurs Voronoi et planètes cliquables
│   ├── MetricsBar.tsx     # Barre de métriques top (5 compteurs)
│   ├── PlanetDetail.tsx   # Popup détail d'une planète
│   ├── PlanetList.tsx     # Panel droit : ordres majeurs + fronts actifs
│   ├── StatusBar.tsx      # Barre de statut fixe en bas de page
│   ├── WarStats.tsx       # Bilan de guerre (galaxyStats)
│   └── ZoneDetail.tsx     # Tooltip de zone/secteur sur la carte
├── hooks/
│   └── useWarData.ts      # Fetch + fusion des données API (v1 + v2)
├── types/
│   └── helldivers.ts      # Types TypeScript (PlanetFull, WarStatus, Campaign…)
└── App.tsx
```

### Sources de données

Le hook `useWarData` interroge en parallèle :
- API communautaire v2 (`/status`, `/info`, `/major-orders`)
- API Helldivers2.dev v1 (`/api/v1/planets`) — noms et secteurs localisés (priorité)
- API raw `/WarSeason/801/Status` — stats de guerre brutes (best-effort)

## Factions

| ID | Faction | Couleur |
|---|---|---|
| 1 | Super Terre | Cyan |
| 2 | Terminiides | Vert |
| 3 | Automates | Rouge |
| 4 | Illuminés | Violet |
