import { useState, useEffect, useCallback } from 'react'
import type { WarStatus, WarInfo, MajorOrder, PlanetFull, PlanetInfo, PlanetStatusFlat, Campaign } from '../types/helldivers'

const BASE = import.meta.env.VITE_API_BASE_URL
const PROXY = import.meta.env.VITE_CORS_PROXY

async function fetchJSON<T>(url: string, headers?: Record<string, string>): Promise<T> {
  const proxied = `${PROXY}${encodeURIComponent(url)}`
  const res = await fetch(proxied, headers ? { headers } : undefined)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const json = await res.json()
    if ('contents' in json) return JSON.parse(json.contents) as T
    return json as T
  }
  const text = await res.text()
  return JSON.parse(text) as T
}

const V1_HEADERS = {
  'X-Super-Client': 'GotYeahHellDashboard',
  'X-Super-Contact': 'contact@gotyeahstudios.com',
  'Accept-Language': 'en-US',
}

export interface WarData {
  planets: PlanetFull[]
  campaigns: Campaign[]
  majorOrders: MajorOrder[]
  status: WarStatus | null
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  countdown: number
  sectorNames: Record<number, string>
}

export function useWarData(refreshInterval = 60_000): WarData {
  const [planets, setPlanets] = useState<PlanetFull[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [status, setStatus] = useState<WarStatus | null>(null)
  const [majorOrders, setMajorOrders] = useState<MajorOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [countdown, setCountdown] = useState(refreshInterval / 1000)
  const [sectorNames, setSectorNames] = useState<Record<number, string>>({})

  const load = useCallback(async () => {
    try {
      setError(null)

      type LocalizedMsg = Record<string, string>
      type V1Planet = { index: number; name: string | LocalizedMsg; sector: string | LocalizedMsg; position?: { x: number; y: number } }

      function extractStr(val: string | LocalizedMsg | undefined): string {
        if (!val) return ''
        if (typeof val === 'string') return val
        return val['en-US'] ?? val['fr-FR'] ?? Object.values(val)[0] ?? ''
      }

      // Fetch tout en parallèle — v1 en best-effort (catch → tableau vide)
      const [statusData, infoData, ordersData, v1Planets] = await Promise.all([
        fetchJSON<WarStatus>(`${BASE}/status`),
        fetchJSON<WarInfo>(`${BASE}/info`),
        fetchJSON<MajorOrder[]>(`${BASE}/major-orders`),
        fetchJSON<V1Planet[]>('https://api.helldivers2.dev/api/v1/planets', V1_HEADERS)
          .catch(() => [] as V1Planet[]),
      ])

      // Maps v1 : index → { name, sector }
      const v1NameMap = new Map<number, string>()
      const builtSectorNames: Record<number, string> = {}
      for (const p of v1Planets) {
        if (p.index != null) {
          const nameStr = extractStr(p.name)
          const sectorStr = extractStr(p.sector)
          if (nameStr)   v1NameMap.set(p.index, nameStr)
          if (sectorStr) builtSectorNames[p.index] = sectorStr
        }
      }

      // L'API /info retourne { planetInfos: [...] } (ou planets selon version)
      const infoPlanets = Array.isArray(infoData)
        ? (infoData as unknown as PlanetInfo[])
        : (infoData.planetInfos ?? infoData.planets ?? [])

      const infoMap = new Map(infoPlanets.map(p => [p.index, p]))

      const rawPlanets = statusData.planetStatus ?? (statusData as unknown as { planets: typeof statusData.planetStatus }).planets ?? []

      const enriched: PlanetFull[] = rawPlanets.map(ps => {
        const isFlat = !('planet' in ps)
        const flat = isFlat ? (ps as unknown as PlanetStatusFlat) : null
        const planetInfo: PlanetInfo = isFlat
          ? { index: flat!.index, name: flat!.name, sector: flat!.sector, biome: flat!.biome, environmentals: flat!.environmentals ?? [], maxHealth: flat!.maxHealth }
          : (ps as { planet: PlanetInfo }).planet

        const info = infoMap.get(planetInfo.index)
        const rawLib = typeof ps.liberation === 'number' ? ps.liberation : parseFloat(String(ps.liberation ?? 0))
        const lib = isNaN(rawLib) ? 0 : rawLib > 1 ? rawLib : rawLib * 100

        // Nom + secteur : v1 API en priorité (source la plus fiable), fallback planetInfo
        const name = v1NameMap.get(planetInfo.index) ?? planetInfo.name ?? info?.name ?? ''
        const sector = builtSectorNames[planetInfo.index] ?? planetInfo.sector ?? info?.sector

        return {
          ...ps,
          liberation: lib,
          planet: { ...planetInfo, ...(info ?? {}), name, sector },
          positionX: info?.position?.x ?? info?.positionX ?? planetInfo.position?.x ?? planetInfo.positionX ?? 0,
          positionY: info?.position?.y ?? info?.positionY ?? planetInfo.position?.y ?? planetInfo.positionY ?? 0,
          waypoints: info?.waypoints ?? planetInfo.waypoints ?? [],
        }
      })

      const rawCampaigns = statusData.campaigns
        ?? (statusData as unknown as { activeElectionPolicyEffects?: unknown; campaigns?: Campaign[] }).campaigns
        ?? []

      setStatus(statusData)
      setPlanets(enriched)
      setCampaigns(rawCampaigns)
      setMajorOrders(Array.isArray(ordersData) ? ordersData : [])
      setSectorNames(builtSectorNames)
      setLastUpdated(new Date())
      setCountdown(refreshInterval / 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signal interféré')
    } finally {
      setLoading(false)
    }
  }, [refreshInterval])

  useEffect(() => {
    void load()
    const interval = setInterval(() => void load(), refreshInterval)
    return () => clearInterval(interval)
  }, [load, refreshInterval])

  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown(c => (c <= 1 ? refreshInterval / 1000 : c - 1))
    }, 1000)
    return () => clearInterval(tick)
  }, [refreshInterval])

  return { planets, campaigns, status, majorOrders, loading, error, lastUpdated, countdown, sectorNames }
}
