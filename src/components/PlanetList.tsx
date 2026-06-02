import type { PlanetFull, Campaign, MajorOrder, FactionId } from '../types/helldivers'

interface Props {
  planets: PlanetFull[]
  campaigns: Campaign[]
  majorOrders: MajorOrder[]
  onPlanetClick: (planet: PlanetFull) => void
}

const FACTION_COLOR: Record<FactionId, string> = {
  1: '#06b6d4',
  2: '#22c55e',
  3: '#ef4444',
  4: '#c084fc',
}
const FACTION_LABEL: Record<FactionId, string> = {
  1: 'Super Terre',
  2: 'Terminiides',
  3: 'Automates',
  4: 'Illuminés',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getField(p: PlanetFull, ...keys: string[]): any {
  const obj = p as unknown as Record<string, unknown>
  for (const key of keys) {
    const val = key.split('.').reduce((o: unknown, k) => (o as Record<string, unknown>)?.[k], obj)
    if (val != null) return val
  }
  return undefined
}

function getPlanetIndex(p: PlanetFull): number {
  return getField(p, 'planet.index', 'index') ?? -1
}

function getPlanetName(p: PlanetFull, idx: number): string {
  return getField(p, 'planet.name', 'name', 'planetName') ?? `#${idx}`
}

function getLiberation(p: PlanetFull): number {
  const raw = p.liberation
  const lib = raw != null && !isNaN(raw)
    ? (raw > 1 ? raw : raw * 100)
    : (1 - p.health / (getField(p, 'planet.maxHealth', 'maxHealth') ?? 1_000_000)) * 100
  return Math.round(Math.min(100, Math.max(0, lib)) * 10) / 10
}

// Hauteur d'un item (px) × 10 items visibles
const ITEM_H = 62
const VISIBLE = 10

export function PlanetList({ planets, campaigns, majorOrders, onPlanetClick }: Props) {
  // Log diagnostic (premier rendu)
  if (planets.length > 0) {
    console.debug('[PlanetList] planet[0] raw:', planets[0])
    console.debug('[PlanetList] campaigns[0]:', campaigns[0])
  }

  const campaignIndices = new Set(
    campaigns.map(c =>
      (c as unknown as { planet?: { index: number } }).planet?.index
      ?? c.planetIndex
      ?? -1
    )
  )

  let activeFronts = planets.filter(p => campaignIndices.has(getPlanetIndex(p)))
  if (activeFronts.length === 0) {
    activeFronts = planets.filter(p => p.owner !== 1 && p.players > 0)
  }
  const sorted = [...activeFronts].sort((a, b) => b.players - a.players)

  const order = majorOrders[0] ?? null
  const orderText = order?.setting?.overrideBrief
    || order?.setting?.taskDescription
    || order?.setting?.overrideTitle
    || null
  const orderTitle = order?.setting?.overrideTitle || 'DIRECTIVE DE SUPER TERRE'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Major Order */}
      <div style={{
        padding: '0.6rem 0.75rem',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg2)',
        flexShrink: 0,
      }}>
        <div style={{ fontFamily: 'Orbitron', fontSize: '0.55rem', color: 'var(--amber)', letterSpacing: '0.15em', marginBottom: '0.4rem' }}>
          {orderTitle}
        </div>
        {orderText
          ? <p style={{ fontFamily: 'Share Tech Mono', fontSize: '0.6rem', color: 'var(--text)', lineHeight: 1.5, margin: 0 }}>{orderText}</p>
          : <p style={{ fontFamily: 'Share Tech Mono', fontSize: '0.6rem', color: 'var(--text-dim)', margin: 0 }}>Aucune directive active</p>
        }
      </div>

      {/* Header fronts avec total */}
      <div style={{
        padding: '0.4rem 0.75rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
        background: 'var(--bg2)',
      }}>
        <span style={{ fontFamily: 'Orbitron', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.12em' }}>
          FRONTS ACTIFS ({sorted.length})
        </span>
      </div>

      {/* Liste — 10 items visibles, scroll pour le reste */}
      <div style={{
        maxHeight: `${ITEM_H * VISIBLE}px`,
        overflowY: 'auto',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(245,158,11,0.4) transparent',
      }}>
        {sorted.length === 0 ? (
          <div style={{ padding: '1rem 0.75rem', fontFamily: 'Share Tech Mono', fontSize: '0.6rem', color: 'var(--text-dim)' }}>
            AUCUN FRONT ACTIF DÉTECTÉ
          </div>
        ) : sorted.map(p => {
          const color = FACTION_COLOR[p.owner]
          const idx = getPlanetIndex(p)
          const name = getPlanetName(p, idx)
          const lib = getLiberation(p)

          return (
            <div
              key={idx}
              onClick={() => onPlanetClick(p)}
              style={{
                padding: '0.45rem 0.75rem',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'background 0.15s',
                minHeight: `${ITEM_H}px`,
                boxSizing: 'border-box',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,158,11,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.65rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>
                  {name}
                </span>
                <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.55rem', color }}>
                  {FACTION_LABEL[p.owner]}
                </span>
              </div>

              <div style={{ height: '3px', background: 'var(--bg)', marginBottom: '0.25rem' }}>
                <div style={{ height: '100%', width: `${lib}%`, background: color, transition: 'width 0.3s' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.55rem', color: 'var(--text-dim)' }}>
                  ⚡ {p.players.toLocaleString('fr-FR')}
                </span>
                <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.55rem', color }}>
                  {lib.toFixed(1)} %
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Compteurs faction en bas */}
      <div style={{
        marginTop: 'auto',
        borderTop: '1px solid var(--border)',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1px',
        background: 'var(--border)',
        flexShrink: 0,
      }}>
        {([2, 3, 4, 1] as FactionId[]).map(ownerId => {
          const count = planets.filter(p => p.owner === ownerId).length
          return (
            <div key={ownerId} style={{ padding: '0.35rem 0.5rem', background: 'var(--bg2)', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', color: FACTION_COLOR[ownerId] }}>{count}</span>
              <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.5rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                {FACTION_LABEL[ownerId]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
