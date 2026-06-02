import { useState, useMemo, useRef, useCallback } from 'react'
import { Delaunay } from 'd3-delaunay'
import type { PlanetFull, FactionId, Campaign } from '../types/helldivers'
import { ZoneDetail, type ZoneId } from './ZoneDetail'

interface Props {
  planets: PlanetFull[]
  onPlanetClick: (planet: PlanetFull) => void
  sectorNames: Record<number, string>
  campaigns: Campaign[]
}

const VB_W = 810
const VB_H = 920
const VB_Y = -50
const CENTER_X = 405
const CENTER_Y = 392
const SCALE_X = 380
const SCALE_Y = 370

function toSvgX(x: number): number { return CENTER_X + x * SCALE_X }
function toSvgY(y: number): number { return CENTER_Y - y * SCALE_Y }

const FACTION_COLOR: Record<FactionId, string> = {
  1: '#06b6d4',
  2: '#22c55e',
  3: '#ef4444',
  4: '#c084fc',
}
const FACTION_LABEL: Record<FactionId, string> = {
  1: 'Super Terre',
  2: 'Terminiide',
  3: 'Automate',
  4: 'Illuminé',
}

interface SectorCell {
  id: string
  name: string
  path: string
  planets: PlanetFull[]
  dominantOwner: FactionId
  isActive: boolean
  totalPlayers: number
}

// ─── Helpers algo fusion Voronoi ─────────────────────────────────────────────
//
// Changement clé : buildPolygonPath ne "projette" plus les vertices proches
// du bord. Il calcule l'intersection exacte de chaque arête avec le cercle,
// vire tous les vertices extérieurs, et ne garde que :
//   - les vertices intérieurs (→ segments droits)
//   - les points d'intersection avec le cercle (→ arcs SVG)
// Résultat : chaque segment est soit une droite pure, soit un arc pur.

const GALAXY_R = 360

function vtxKey(x: number, y: number): string {
  return `${x.toFixed(4)},${y.toFixed(4)}`
}

function polyArea(pts: [number, number][]): number {
  let area = 0
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    area += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1])
  }
  return area / 2
}

function distFromCenter(x: number, y: number): number {
  return Math.sqrt((x - CENTER_X) ** 2 + (y - CENTER_Y) ** 2)
}

function projectToCircle(x: number, y: number): [number, number] {
  const dx = x - CENTER_X
  const dy = y - CENTER_Y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 0.01) return [CENTER_X + GALAXY_R, CENTER_Y]
  return [CENTER_X + (dx / dist) * GALAXY_R, CENTER_Y + (dy / dist) * GALAXY_R]
}

// ─── Intersection segment ↔ cercle ──────────────────────────────────────────

function findCircleIntersections(
  x1: number, y1: number,
  x2: number, y2: number,
  R: number,
): number[] {
  const dx = x2 - x1
  const dy = y2 - y1
  const fx = x1 - CENTER_X
  const fy = y1 - CENTER_Y

  const a = dx * dx + dy * dy
  if (a < 1e-10) return []

  const b = 2 * (fx * dx + fy * dy)
  const c = fx * fx + fy * fy - R * R

  const disc = b * b - 4 * a * c
  if (disc < 0) return []

  const sqrtD = Math.sqrt(disc)
  const EPS = 0.0005
  const results: number[] = []

  const t1 = (-b - sqrtD) / (2 * a)
  const t2 = (-b + sqrtD) / (2 * a)

  if (t1 > EPS && t1 < 1 - EPS) results.push(t1)
  if (t2 > EPS && t2 < 1 - EPS && Math.abs(t2 - t1) > EPS) results.push(t2)

  return results.sort((a, b) => a - b)
}

// ─── Path builder : droites + arcs, zéro zigzag ─────────────────────────────

interface Vert {
  x: number
  y: number
  onCircle: boolean
}

function fmtV(v: Vert): string {
  return `${v.x.toFixed(2)},${v.y.toFixed(2)}`
}

function arcCmd(x1: number, y1: number, x2: number, y2: number): string {
  const R = GALAXY_R
  const cross = (x1 - CENTER_X) * (y2 - CENTER_Y) - (y1 - CENTER_Y) * (x2 - CENTER_X)
  const sweep = cross > 0 ? 1 : 0
  const dot = (x1 - CENTER_X) * (x2 - CENTER_X) + (y1 - CENTER_Y) * (y2 - CENTER_Y)
  const cosA = Math.max(-1, Math.min(1, dot / (R * R)))
  const largeArc = Math.acos(cosA) > Math.PI ? 1 : 0
  return ` A${R},${R} 0 ${largeArc},${sweep} ${x2.toFixed(2)},${y2.toFixed(2)}`
}

function segmentCmd(prev: Vert, curr: Vert): string {
  return (prev.onCircle && curr.onCircle)
    ? arcCmd(prev.x, prev.y, curr.x, curr.y)
    : ` L${fmtV(curr)}`
}

function buildPolygonPath(rawPoly: [number, number][]): string {
  const R = GALAXY_R
  const n = rawPoly.length
  if (n < 3) return ''

  const augmented: Vert[] = []

  for (let i = 0; i < n; i++) {
    const [x1, y1] = rawPoly[i]
    const [x2, y2] = rawPoly[(i + 1) % n]
    const d1 = distFromCenter(x1, y1)

    if (d1 <= R + 0.5) {
      augmented.push({ x: x1, y: y1, onCircle: false })
    }

    const intersections = findCircleIntersections(x1, y1, x2, y2, R)
    for (const t of intersections) {
      const ix = x1 + t * (x2 - x1)
      const iy = y1 + t * (y2 - y1)
      const [px, py] = projectToCircle(ix, iy)
      augmented.push({ x: px, y: py, onCircle: true })
    }
  }

  if (augmented.length < 3) return ''

  const firstInterior = augmented.findIndex(v => !v.onCircle)
  const verts = firstInterior > 0
    ? [...augmented.slice(firstInterior), ...augmented.slice(0, firstInterior)]
    : augmented

  const deduped: Vert[] = [verts[0]]
  for (let i = 1; i < verts.length; i++) {
    const prev = deduped[deduped.length - 1]
    const curr = verts[i]
    const dx = curr.x - prev.x
    const dy = curr.y - prev.y
    if (dx * dx + dy * dy > 0.5) {
      deduped.push(curr)
    }
  }

  const m = deduped.length
  if (m < 3) return ''

  let d = `M${fmtV(deduped[0])}`
  for (let j = 1; j < m; j++) d += segmentCmd(deduped[j - 1], deduped[j])
  d += segmentCmd(deduped[m - 1], deduped[0])
  d += ' Z'
  return d
}

export function GalaxyMap({ planets, onPlanetClick, sectorNames, campaigns }: Props) {
  const [hovered, setHovered] = useState<number | null>(null)
  const [selectedZone, setSelectedZone] = useState<ZoneId | null>(null)
  const [hoveredSectorId, setHoveredSectorId] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; sectorId: string } | null>(null)
  const [debugPanel, setDebugPanel] = useState<{ sectorName: string; campaigns: Campaign[] } | null>(null)
  const [showSectorList, setShowSectorList] = useState(false)
  const [showPlanetList, setShowPlanetList] = useState(false)
  const [planetTooltip, setPlanetTooltip] = useState<{ x: number; y: number; planet: PlanetFull } | null>(null)

  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 })
  const svgRef = useRef<SVGSVGElement>(null)

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    setZoom(z => Math.min(8, Math.max(0.5, z * factor)))
  }, [])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    dragging.current = true
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y }
  }, [pan])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return
    const scale = svgRef.current ? VB_W / svgRef.current.clientWidth : 1
    setPan({
      x: dragStart.current.px + (e.clientX - dragStart.current.mx) * scale,
      y: dragStart.current.py + (e.clientY - dragStart.current.my) * scale,
    })
  }, [])

  const onMouseUp = useCallback(() => { dragging.current = false }, [])
  const resetView = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }) }, [])

  const planetByIndex = useMemo(
    () => new Map(planets.map(p => [p.planet.index, p])),
    [planets],
  )

  const superEarth = planets.find(p => p.planet.index === 0) ?? null

  const zonePlanets = useMemo(() => ({
    bugs: planets.filter(p => p.positionX > 0.05),
    cyborgs: planets.filter(p => p.positionX < -0.05),
    illuminate: planets.filter(p => p.positionY < -0.25),
  }), [planets])

  // Voronoi sur toutes les planètes → fusion des cellules par secteur (algo Opus)
  // Garantie : zéro superposition, zéro trou, frontières = droites
  const sectorCells = useMemo((): SectorCell[] => {
    if (planets.length === 0) return []

    // 1. Voronoi sur TOUTES les planètes — bounding box surdimensionné de 200px
    //    Les cellules de bord s'étendent bien au-delà du cercle → pas d'artefacts de coins
    const points: [number, number][] = planets.map(p => [toSvgX(p.positionX), toSvgY(p.positionY)])
    const delaunay = Delaunay.from(points)
    const voronoi = delaunay.voronoi([
      CENTER_X - GALAXY_R - 200,
      CENTER_Y - GALAXY_R - 200,
      CENTER_X + GALAXY_R + 200,
      CENTER_Y + GALAXY_R + 200,
    ])

    // 2. Grouper les indices de planètes par nom de secteur (string v1 API)
    const sectorGroups = new Map<string, number[]>()
    for (let i = 0; i < planets.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pi = (planets[i] as any).planet as Record<string, unknown>
      const raw = pi?.sector
      // Secteur = nom string depuis v1 API. Fallback sur string de l'ID numérique.
      const sectorKey = raw != null ? String(raw) : null
      if (!sectorKey || sectorKey === 'undefined' || sectorKey === 'NaN') continue
      if (!sectorGroups.has(sectorKey)) sectorGroups.set(sectorKey, [])
      sectorGroups.get(sectorKey)!.push(i)
    }

    // Index des planètes en campagne active (front actif)
    const campaignPlanetIndices = new Set(campaigns.map(c => c.planetIndex))

    const result: SectorCell[] = []

    for (const [sectorId, indices] of sectorGroups) {  // sectorId = nom string du secteur
      // 3. Fusionner les cellules : supprimer les arêtes internes (partagées entre 2 planètes du même secteur)
      const edgeMap = new Map<string, { x1: number; y1: number; x2: number; y2: number }>()

      for (const idx of indices) {
        const cell = voronoi.cellPolygon(idx)
        if (!cell) continue

        for (let j = 0; j < cell.length - 1; j++) {
          const [x1, y1] = cell[j] as [number, number]
          const [x2, y2] = cell[j + 1] as [number, number]
          const fwd = `${vtxKey(x1, y1)}>${vtxKey(x2, y2)}`
          const rev = `${vtxKey(x2, y2)}>${vtxKey(x1, y1)}`

          if (edgeMap.has(rev)) {
            edgeMap.delete(rev)   // arête interne → on supprime
          } else {
            edgeMap.set(fwd, { x1, y1, x2, y2 })
          }
        }
      }

      if (edgeMap.size === 0) continue

      // 4. Chaîner les arêtes frontières en polygone(s) fermé(s)
      const adj = new Map<string, Array<{ x1: number; y1: number; x2: number; y2: number; key: string }>>()
      for (const [key, e] of edgeMap) {
        const from = vtxKey(e.x1, e.y1)
        if (!adj.has(from)) adj.set(from, [])
        adj.get(from)!.push({ ...e, key })
      }

      const used = new Set<string>()
      const polygons: [number, number][][] = []

      for (const [key, edge] of edgeMap) {
        if (used.has(key)) continue
        const poly: [number, number][] = []
        let current = edge
        used.add(key)
        poly.push([current.x1, current.y1])
        const startVtx = vtxKey(edge.x1, edge.y1)
        let safety = edgeMap.size + 1

        while (--safety > 0) {
          const nextVtx = vtxKey(current.x2, current.y2)
          if (nextVtx === startVtx) break
          poly.push([current.x2, current.y2])
          const candidates = adj.get(nextVtx)
          if (!candidates) break
          const next = candidates.find(c => !used.has(c.key))
          if (!next) break
          used.add(next.key)
          current = next
        }

        if (poly.length >= 3) polygons.push(poly)
      }

      if (polygons.length === 0) continue

      // Trier le plus grand polygone en premier
      polygons.sort((a, b) => Math.abs(polyArea(b)) - Math.abs(polyArea(a)))

      // Projection sur le cercle + arcs SVG sur le périmètre
      const path = polygons.map(buildPolygonPath).join(' ')

      const sectorPlanets = indices.map(i => planets[i])

      // dominantOwner : p.owner fourni directement par planetStatus (API)
      // La faction avec le plus de planètes dans le secteur gagne.
      const ownerCounts: Record<number, number> = {}
      for (const p of sectorPlanets) {
        ownerCounts[p.owner] = (ownerCounts[p.owner] ?? 0) + 1
      }
      const dominantOwner = Number(
        Object.entries(ownerCounts).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] ?? 1
      ) as FactionId

      // Le nom du secteur = la clé de groupement (déjà le nom string de l'API v1)
      const name = sectorId

      // Secteur actif = au moins une planète du secteur a une campagne active
      const isActive = sectorPlanets.some(p => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pi = (p as any).planet as Record<string, unknown>
        const pIdx = typeof pi?.index === 'number' ? pi.index : -1
        return campaignPlanetIndices.has(pIdx)
      })

      result.push({
        id: sectorId, name, path,
        planets: sectorPlanets, dominantOwner,
        isActive,
        totalPlayers: sectorPlanets.reduce((s, p) => s + p.players, 0),
      })
    }

    return result
  }, [planets, sectorNames, campaigns])

  // Lignes de ravitaillement
  const supplyLines = useMemo(() => {
    const seen = new Set<string>()
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number; key: string }> = []
    for (const p of planets) {
      for (const waypointIdx of p.waypoints) {
        const target = planetByIndex.get(waypointIdx)
        if (!target) continue
        const key = [p.planet.index, waypointIdx].sort((a, b) => a - b).join('-')
        if (seen.has(key)) continue
        seen.add(key)
        lines.push({
          x1: toSvgX(p.positionX), y1: toSvgY(p.positionY),
          x2: toSvgX(target.positionX), y2: toSvgY(target.positionY),
          key,
        })
      }
    }
    return lines
  }, [planets, planetByIndex])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <svg
        ref={svgRef}
        viewBox={`0 ${VB_Y} ${VB_W} ${VB_H}`}
        style={{ width: '100%', height: '100%', display: 'block', cursor: 'grab', userSelect: 'none' }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <defs>
          <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0d0d18" />
            <stop offset="100%" stopColor="#070709" />
          </radialGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glowStrong" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <clipPath id="galaxyClip">
            <circle cx={CENTER_X} cy={CENTER_Y} r={360} />
          </clipPath>

          {/* Patterns hachures par faction — utilisés sur les secteurs en combat */}
          {([
            [1, '#06b6d4'],
            [2, '#22c55e'],
            [3, '#ef4444'],
            [4, '#c084fc'],
          ] as [number, string][]).map(([ownerId, col]) => (
            <pattern
              key={ownerId}
              id={`hatch-${ownerId}`}
              patternUnits="userSpaceOnUse"
              width="10"
              height="10"
              patternTransform="rotate(45)"
            >
              <rect width="10" height="10" fill={col} fillOpacity="0.07" />
              <line x1="0" y1="0" x2="0" y2="10" stroke={col} strokeWidth="2.5" strokeOpacity="0.5" />
            </pattern>
          ))}

          <style>{`
            @keyframes pulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
            @keyframes supplyPulse { 0%,100%{opacity:0.15} 50%{opacity:0.4} }
            @keyframes hatchPulse { 0%,100%{opacity:0.75} 50%{opacity:1} }
            .supply-line{animation:supplyPulse 3s ease-in-out infinite}
            .planet-pulse{animation:pulse 2s ease-in-out infinite}
            .sector-combat{animation:hatchPulse 2.5s ease-in-out infinite}
          `}</style>
        </defs>

        <rect x={0} y={VB_Y} width={VB_W} height={VB_H} fill="url(#bgGrad)" />

        <g transform={`translate(${CENTER_X + pan.x},${CENTER_Y + pan.y}) scale(${zoom}) translate(${-CENTER_X},${-CENTER_Y})`}>

          {/* Étoiles */}
          {STARS.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="white" opacity={s.o} />
          ))}

          {/* 1. LAYER SECTEURS — bounding boxes rectangulaires par secteur */}
          <g clipPath="url(#galaxyClip)">
          {sectorCells.map(cell => {
            const isHov = hoveredSectorId === cell.id
            const anyHov = hoveredSectorId !== null
            const color = FACTION_COLOR[cell.dominantOwner]
            const isSuperTerreSector = cell.dominantOwner === 1
            const useHatch = cell.isActive

            const baseSo = isSuperTerreSector && !cell.isActive ? 0.35 : (cell.isActive ? 0.7 : 0.2)
            const so = anyHov ? (isHov ? 0.9 : baseSo * 0.25) : baseSo

            // Hachures : fillOpacity contrôle l'intensité globale du pattern
            const hatchOpacity = anyHov ? (isHov ? 1 : 0.25) : 0.85
            // Solide : opacité de base pour secteurs calmes ou Super Terre
            const baseFo = isSuperTerreSector && !cell.isActive ? 0.13 : 0.06
            const fo = anyHov ? (isHov ? Math.min(0.45, baseFo + 0.18) : baseFo * 0.3) : baseFo

            return (
              <path
                key={cell.id}
                d={cell.path}
                fill={useHatch ? `url(#hatch-${cell.dominantOwner})` : color}
                fillOpacity={useHatch ? hatchOpacity : fo}
                stroke={color}
                strokeOpacity={so}
                strokeWidth={isHov ? 1.5 : 0.6}
                className={useHatch ? 'sector-combat' : undefined}
                style={{ transition: 'fill-opacity 0.15s, stroke-opacity 0.15s', cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation()
                  const sectorPlanetIndices = new Set(cell.planets.map(p => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const pi = (p as any).planet as Record<string, unknown>
                    return pi?.index as number
                  }))
                  const sectorCampaigns = campaigns.filter(c => sectorPlanetIndices.has(c.planetIndex))
                  setDebugPanel({ sectorName: cell.name, campaigns: sectorCampaigns })
                }}
                onMouseEnter={(e) => {
                  setHoveredSectorId(cell.id)
                  setTooltip({ x: e.clientX + 12, y: e.clientY + 12, sectorId: cell.id })
                }}
                onMouseMove={(e) => {
                  setTooltip(prev => prev ? { ...prev, x: e.clientX + 12, y: e.clientY + 12 } : null)
                }}
                onMouseLeave={() => {
                  setHoveredSectorId(null)
                  setTooltip(null)
                }}
              />
            )
          })}
          </g>

          {/* Super Terre */}
          <circle id="sector-superearth" cx="402.72" cy="392.12" r="27"
            fill="#06b6d4" fillOpacity="0.3" stroke="#06b6d4" strokeOpacity="0.6" strokeWidth="0.8"
          />

          {/* 2. Lignes de ravitaillement */}
          {supplyLines.map(line => (
            <line
              key={line.key}
              x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
              stroke="rgba(245,158,11,0.3)" strokeWidth="0.5"
              className="supply-line"
            />
          ))}

          {/* 3. Planètes */}
          {planets.map(p => {
            const cx = toSvgX(p.positionX)
            const cy = toSvgY(p.positionY)
            const color = FACTION_COLOR[p.owner]
            const isContested = p.owner !== 1 && p.players > 0
            const isHoveredPlanet = hovered === p.planet.index
            const isSuperEarth = p.planet.index === 0

            return (
              <g
                key={p.planet.index}
                style={{ cursor: 'pointer' }}
                onClick={() => onPlanetClick(p)}
                onMouseEnter={(e) => {
                  setHovered(p.planet.index)
                  setPlanetTooltip({ x: e.clientX + 14, y: e.clientY + 14, planet: p })
                }}
                onMouseMove={(e) => {
                  setPlanetTooltip(prev => prev ? { ...prev, x: e.clientX + 14, y: e.clientY + 14 } : null)
                }}
                onMouseLeave={() => {
                  setHovered(null)
                  setPlanetTooltip(null)
                }}
              >
                {isContested && (
                  <circle cx={cx} cy={cy} r={6} fill="none"
                    stroke={color} strokeWidth="1" opacity="0.6"
                    className="planet-pulse"
                  />
                )}
                <circle
                  cx={cx} cy={cy}
                  r={isSuperEarth ? 8 : isHoveredPlanet ? 6 : 4}
                  fill={color} opacity={isSuperEarth ? 1 : 0.85}
                  filter={isHoveredPlanet || isSuperEarth ? 'url(#glowStrong)' : 'url(#glow)'}
                  style={{ transition: 'r 0.15s' }}
                />
                {isHoveredPlanet && !isSuperEarth && (
                  <text x={cx} y={cy - 10} textAnchor="middle"
                    fill={color} fontSize="8" fontFamily="Share Tech Mono"
                    style={{ pointerEvents: 'none' }}
                    stroke="rgba(7,7,9,0.8)" strokeWidth="2.5" paintOrder="stroke"
                  >
                    {p.planet.name} — {p.owner === 1 ? 'Libéré' : p.players > 0 ? 'Front actif' : FACTION_LABEL[p.owner] ?? 'Occupation'}
                  </text>
                )}
                {isSuperEarth && (
                  <text x={cx} y={cy - 14} textAnchor="middle"
                    fill="#06b6d4" fontSize="8" fontFamily="Orbitron"
                    style={{ pointerEvents: 'none' }}
                  >SUPER TERRE</text>
                )}
              </g>
            )
          })}

        </g>
      </svg>

      {/* Popup zone de secteur */}
      {selectedZone && (
        <ZoneDetail
          zone={selectedZone}
          planets={zonePlanets[selectedZone]}
          onClose={() => setSelectedZone(null)}
        />
      )}

      {/* Contrôles zoom */}
      <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        {[
          { label: '+', action: () => setZoom(z => Math.min(8, z * 1.3)) },
          { label: '−', action: () => setZoom(z => Math.max(0.5, z / 1.3)) },
          { label: '⌂', action: resetView },
        ].map(btn => (
          <button key={btn.label} onClick={btn.action} style={{
            width: '24px', height: '24px', background: 'var(--bg2)',
            border: '1px solid var(--border)', color: 'var(--amber)',
            fontFamily: 'Orbitron', fontSize: '0.75rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{btn.label}</button>
        ))}
        <div style={{ fontFamily: 'Share Tech Mono', fontSize: '0.55rem', color: 'var(--text-dim)', textAlign: 'center' }}>
          {Math.round(zoom * 100)}%
        </div>

        {/* Bouton liste des secteurs API */}
        <button
          onClick={() => setShowSectorList(v => !v)}
          title="Lister tous les secteurs API"
          style={{
            marginTop: '0.3rem',
            width: '24px', height: '24px', background: showSectorList ? 'rgba(245,158,11,0.2)' : 'var(--bg2)',
            border: `1px solid ${showSectorList ? 'rgba(245,158,11,0.8)' : 'var(--border)'}`,
            color: 'var(--amber)', fontFamily: 'Orbitron', fontSize: '0.55rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >§</button>

        {/* Panneau liste secteurs */}
        {showSectorList && (() => {
          const rows = sectorCells
            .map(c => ({ id: c.id, name: c.name, planetCount: c.planets.length, isActive: c.isActive, dominantOwner: c.dominantOwner }))
            .sort((a, b) => a.name.localeCompare(b.name))

          return (
            <div style={{
              position: 'absolute', top: 0, left: '30px',
              width: '320px', maxHeight: '70vh',
              background: 'rgba(7,7,9,0.97)',
              border: '1px solid rgba(245,158,11,0.4)',
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: '10px', zIndex: 700,
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{
                padding: '5px 8px', borderBottom: '1px solid rgba(245,158,11,0.3)',
                background: 'rgba(245,158,11,0.08)', color: '#f59e0b', fontSize: '10px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span>SECTEURS API ({rows.length})</span>
                <button onClick={() => setShowSectorList(false)}
                  style={{ background: 'none', border: 'none', color: '#7a6a45', cursor: 'pointer', fontSize: '14px', lineHeight: 1 }}
                >×</button>
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(245,158,11,0.05)', color: '#7a6a45', fontSize: '9px' }}>
                      <th style={{ padding: '3px 8px', textAlign: 'left', fontWeight: 'normal' }}>NOM</th>
                      <th style={{ padding: '3px 8px', textAlign: 'right', fontWeight: 'normal' }}>PL.</th>
                      <th style={{ padding: '3px 8px', textAlign: 'right', fontWeight: 'normal' }}>OWNER</th>
                      <th style={{ padding: '3px 8px', textAlign: 'left', fontWeight: 'normal' }}>FACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ id, name, planetCount, isActive, dominantOwner }) => (
                      <tr key={id} style={{ borderTop: '1px solid rgba(245,158,11,0.08)' }}>
                        <td style={{ padding: '2px 8px', color: isActive ? '#f59e0b' : '#e8d5a3' }}>{name}</td>
                        <td style={{ padding: '2px 8px', color: '#7a6a45', textAlign: 'right' }}>{planetCount}</td>
                        <td style={{ padding: '2px 8px', color: FACTION_COLOR[dominantOwner], textAlign: 'right', fontWeight: 'bold' }}>{dominantOwner}</td>
                        <td style={{ padding: '2px 8px', color: FACTION_COLOR[dominantOwner] }}>{FACTION_LABEL[dominantOwner]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })()}

        {/* Bouton liste des planètes API */}
        <button
          onClick={() => setShowPlanetList(v => !v)}
          title="Lister toutes les planètes API (id - name)"
          style={{
            marginTop: '0.2rem',
            width: '24px', height: '24px', background: showPlanetList ? 'rgba(245,158,11,0.2)' : 'var(--bg2)',
            border: `1px solid ${showPlanetList ? 'rgba(245,158,11,0.8)' : 'var(--border)'}`,
            color: 'var(--amber)', fontFamily: 'Orbitron', fontSize: '0.55rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >P</button>

        {/* Panneau debug planètes — JSON brut des 3 premières */}
        {showPlanetList && (
          <div style={{
            position: 'absolute', top: 0, left: '30px',
            width: '320px', maxHeight: '70vh',
            background: 'rgba(7,7,9,0.97)',
            border: '1px solid rgba(245,158,11,0.4)',
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: '10px', zIndex: 700,
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              padding: '5px 8px', borderBottom: '1px solid rgba(245,158,11,0.3)',
              background: 'rgba(245,158,11,0.08)', color: '#f59e0b', fontSize: '10px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>RAW planets[0..2] ({planets.length} total)</span>
              <button onClick={() => setShowPlanetList(false)}
                style={{ background: 'none', border: 'none', color: '#7a6a45', cursor: 'pointer', fontSize: '14px', lineHeight: 1 }}
              >×</button>
            </div>
            <pre style={{
              margin: 0, padding: '8px',
              color: '#e8d5a3', overflowY: 'auto', flex: 1,
              whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '9px',
            }}>
              {JSON.stringify(planets.slice(0, 3), null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Légende */}
      <div style={{ position: 'absolute', bottom: '0.5rem', left: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        {(Object.entries(FACTION_LABEL) as Array<[string, string]>)
          .filter(([id]) => planets.some(p => p.owner === Number(id)))
          .map(([id, label]) => (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: FACTION_COLOR[Number(id) as FactionId] }} />
              <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.6rem', color: 'var(--text-dim)' }}>{label}</span>
            </div>
          ))}
      </div>

      {/* Compteur */}
      {superEarth && (
        <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', fontFamily: 'Share Tech Mono', fontSize: '0.6rem', color: 'var(--text-dim)' }}>
          {planets.length} planètes · {sectorCells.length} secteurs
        </div>
      )}

      {/* Panneau debug secteur (clic) */}
      {debugPanel && (
        <div style={{
          position: 'absolute', bottom: '0.5rem', right: '0.5rem',
          width: '340px', maxHeight: '55%',
          background: 'rgba(7,7,9,0.97)',
          border: '1px solid rgba(245,158,11,0.5)',
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: '10px',
          zIndex: 600,
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '5px 10px', borderBottom: '1px solid rgba(245,158,11,0.3)',
            background: 'rgba(245,158,11,0.08)',
          }}>
            <span style={{ color: '#f59e0b', fontSize: '11px' }}>Campaigns — {debugPanel.sectorName}</span>
            <button
              onClick={() => setDebugPanel(null)}
              style={{ background: 'none', border: 'none', color: '#7a6a45', cursor: 'pointer', fontSize: '14px', lineHeight: 1 }}
            >×</button>
          </div>
          <pre style={{
            margin: 0, padding: '8px 10px',
            color: '#e8d5a3', overflowY: 'auto',
            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            flex: 1,
          }}>
            {debugPanel.campaigns.length === 0
              ? '// Aucune campagne active dans ce secteur'
              : JSON.stringify(debugPanel.campaigns, null, 2)
            }
          </pre>
        </div>
      )}

      {/* Tooltip planète (hover) */}
      {planetTooltip && !tooltip && (() => {
        const p = planetTooltip.planet
        const color = FACTION_COLOR[p.owner]
        const factionLabel = FACTION_LABEL[p.owner] ?? 'Inconnu'
        const sectorName = sectorNames[p.planet.index] ?? null
        const libPct = Math.round(p.liberation)
        const biomeSlug = (p.planet.biome as { slug?: string })?.slug ?? null
        const envs: Array<{ name: string }> = Array.isArray(p.planet.environmentals) ? p.planet.environmentals : []
        const isLiberated = p.owner === 1
        const statusColor = isLiberated ? '#22c55e' : p.players > 0 ? '#ef4444' : '#7a6a45'
        const statusLabel = isLiberated ? 'LIBÉRÉ' : p.players > 0 ? 'FRONT ACTIF' : 'SOUS OCCUPATION'

        return (
          <div style={{
            position: 'fixed',
            left: planetTooltip.x,
            top: planetTooltip.y,
            background: 'rgba(7,7,9,0.97)',
            border: `1px solid ${color}88`,
            padding: '10px 14px',
            fontFamily: "'Share Tech Mono', monospace",
            pointerEvents: 'none',
            zIndex: 510,
            lineHeight: 1.7,
            minWidth: '190px',
            maxWidth: '240px',
          }}>
            {/* Nom */}
            <div style={{ color, fontSize: '13px', fontFamily: 'Orbitron', letterSpacing: '0.1em', marginBottom: '4px' }}>
              {p.planet.name}
            </div>

            {/* Statut */}
            <div style={{ color: statusColor, fontSize: '9px', marginBottom: '6px', letterSpacing: '0.05em' }}>
              {statusLabel}
            </div>

            {/* Faction + secteur */}
            <div style={{ color: '#9a8a6a', fontSize: '10px' }}>
              {factionLabel}{sectorName ? ` · ${sectorName}` : ''}
            </div>

            {/* Barre de libération */}
            <div style={{ marginTop: '6px', marginBottom: '2px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#7a6a45', marginBottom: '2px' }}>
                <span>DÉMOCRATIE</span>
                <span style={{ color: '#e8d5a3' }}>{libPct}%</span>
              </div>
              <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '1px' }}>
                <div style={{ height: '100%', width: `${libPct}%`, background: color, borderRadius: '1px', transition: 'width 0.3s' }} />
              </div>
            </div>

            {/* Helldivers */}
            {p.players > 0 && (
              <div style={{ fontSize: '10px', color: '#e8d5a3', marginTop: '5px' }}>
                {p.players.toLocaleString('fr-FR')} Helldivers déployés
              </div>
            )}

            {/* Biome */}
            {biomeSlug && (
              <div style={{ fontSize: '9px', color: '#7a6a45', marginTop: '3px' }}>
                Biome : {biomeSlug}
              </div>
            )}

            {/* Dangers */}
            {envs.length > 0 && (
              <div style={{ fontSize: '9px', color: '#7a6a45', marginTop: '2px' }}>
                {envs.map(e => e.name).join(' · ')}
              </div>
            )}

            <div style={{ fontSize: '8px', color: '#4a3a25', marginTop: '6px' }}>
              clic pour détails complets
            </div>
          </div>
        )
      })()}

      {/* Tooltip secteur */}
      {tooltip && (() => {
        const cell = sectorCells.find(c => c.id === tooltip.sectorId)
        if (!cell) return null

        const displayName = cell.name ? cell.name.toUpperCase() : `SECTEUR ${cell.id}`
        const factionLabel = FACTION_LABEL[cell.dominantOwner] ?? 'Inconnu'
        const statusLabel = cell.planets.every(p => p.owner === 1) ? 'Libéré'
          : cell.isActive ? 'Front actif'
          : 'Sous occupation'

        return (
          <div style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            background: 'rgba(7,7,9,0.95)',
            border: '1px solid rgba(245,158,11,0.6)',
            padding: '8px 12px',
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: '10px',
            pointerEvents: 'none',
            zIndex: 500,
            lineHeight: 1.6,
            minWidth: '160px',
          }}>
            <div style={{ color: '#f59e0b', fontSize: '12px', marginBottom: '3px' }}>{displayName}</div>
            <div style={{ color: '#9a8a6a', fontSize: '9px', marginBottom: '4px' }}>
              {factionLabel} · {statusLabel}
            </div>
            <div style={{ color: '#e8d5a3', fontSize: '10px' }}>
              {cell.planets.length} planète{cell.planets.length > 1 ? 's' : ''} · {cell.totalPlayers.toLocaleString('fr-FR')} Helldivers
            </div>
          </div>
        )
      })()}
    </div>
  )
}

const STARS = Array.from({ length: 160 }, (_, i) => {
  const t = i * 2.399963
  const r = Math.sqrt(i / 160)
  return {
    x: Math.round(CENTER_X + r * Math.cos(t) * SCALE_X * 1.05),
    y: Math.round(CENTER_Y + r * Math.sin(t) * SCALE_Y * 1.05),
    r: i % 7 === 0 ? 1.2 : 0.7,
    o: 0.2 + (i % 5) * 0.1,
  }
})
