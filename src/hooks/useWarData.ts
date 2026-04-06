import { useState, useEffect, useCallback } from 'react'
import type { WarStatus, MajorOrder } from '../types/helldivers'

const BASE = import.meta.env.VITE_API_BASE_URL
const PROXY = import.meta.env.VITE_CORS_PROXY

async function fetchJSON<T>(url: string): Promise<T> {
  const proxied = `${PROXY}${encodeURIComponent(url)}`
  const res = await fetch(proxied)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  // allorigins.win retourne { contents: "..." }
  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const json = await res.json()
    if ('contents' in json) return JSON.parse(json.contents) as T
    return json as T
  }
  const text = await res.text()
  return JSON.parse(text) as T
}

export interface WarData {
  status: WarStatus | null
  majorOrders: MajorOrder[]
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

export function useWarData(refreshInterval = 60_000): WarData {
  const [status, setStatus] = useState<WarStatus | null>(null)
  const [majorOrders, setMajorOrders] = useState<MajorOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const [statusData, ordersData] = await Promise.all([
        fetchJSON<WarStatus>(`${BASE}/status`),
        fetchJSON<MajorOrder[]>(`${BASE}/major-orders`),
      ])

      // Normaliser liberation 0–100
      if (statusData.planetStatus) {
        for (const ps of statusData.planetStatus) {
          if (ps.liberation <= 1) ps.liberation = ps.liberation * 100
        }
      }

      setStatus(statusData)
      setMajorOrders(Array.isArray(ordersData) ? ordersData : [])
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signal interféré')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const interval = setInterval(() => void load(), refreshInterval)
    return () => clearInterval(interval)
  }, [load, refreshInterval])

  return { status, majorOrders, loading, error, lastUpdated }
}
