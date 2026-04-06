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

export interface PlanetInfo {
  index: number
  name: string
  sector: number
  biome: Biome
  environmentals: Environmental[]
  maxHealth: number
  waypoints?: number[]
  positionX?: number
  positionY?: number
}

export interface PlanetStatus {
  planet: PlanetInfo
  owner: FactionId
  players: number
  health: number
  liberation: number // normalisé 0–100
  regenPerSecond?: number
}

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

export interface WarStatus {
  warId: number
  time: number
  impactMultiplier: number
  storyBeatId32: number
  planetStatus: PlanetStatus[]
  campaigns: Campaign[]
  galaxyStats?: GalaxyStats
  warStats?: GalaxyStats
}
