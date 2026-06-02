// Factions : 1=Super Terre, 2=Terminiides, 3=Automates, 4=Illuminés
export type FactionId = 1 | 2 | 3 | 4

export interface Biome {
  slug: string
  description?: string
}

export interface Environmental {
  name: string
  description?: string
}

export interface PlanetPosition {
  x: number
  y: number
}

export interface PlanetInfo {
  index: number
  name: string
  sector: number | string
  biome: Biome
  environmentals: Environmental[]
  maxHealth: number
  waypoints?: number[]
  position?: PlanetPosition
  // Variantes selon version API
  positionX?: number
  positionY?: number
}

// Selon la version d'API, les planètes peuvent être imbriquées ({ planet: {...}, owner, players })
// ou à plat ({ index, name, owner, players, ... })
export interface PlanetStatusNested {
  planet: PlanetInfo
  owner: FactionId
  players: number
  health: number
  liberation: number
  regenPerSecond?: number
}

export interface PlanetStatusFlat extends PlanetInfo {
  owner: FactionId
  players: number
  health: number
  liberation: number
  regenPerSecond?: number
}

export type PlanetStatus = PlanetStatusNested | PlanetStatusFlat

export interface Campaign {
  id: number
  planetIndex: number
  type: number
  count: number
}

export interface MajorOrder {
  id32: number
  expiresIn: number
  setting: {
    taskDescription: string
    overrideBrief: string
    overrideTitle: string
    reward?: {
      type: number
      id32: number
      amount: number
    }
  }
}

export interface GalaxyStats {
  missionsWon: number
  missionsLost: number
  missionSuccessRate: number
  casualtiesFriendly: number
  casualtiesEnemy: number
  bulletsFired: number
  bulletsHit: number
  timePlayed: number
  deaths: number
  revives: number
  friendlies: number
  missionTime: number
}

// Réponse de /info
export interface WarInfo {
  warId?: number
  planetInfos?: PlanetInfo[]
  planets?: PlanetInfo[]  // fallback
}

// Planète enrichie (status + position depuis /info)
export interface PlanetFull extends PlanetStatus {
  positionX: number
  positionY: number
  waypoints: number[]
}

export interface PlanetRegionStatus {
  planetIndex: number
  regionIndex: number
  owner: number          // FactionId : 1=Super Terre, 2=Terminiides, 3=Automates, 4=Illuminés
  health: number
  regerPerSecond: number // typo dans la spec API officielle
  availabilityFactor: number
  isAvailable: boolean
  players: number
}

export interface WarStatus {
  warId?: number
  time?: number
  impactMultiplier?: number
  storyBeatId32?: number
  planetStatus?: PlanetStatus[]
  planets?: PlanetStatus[]  // alias selon version API
  campaigns?: Campaign[]
  galaxyStats?: GalaxyStats
  warStats?: GalaxyStats
  planetRegions?: PlanetRegionStatus[]
}
