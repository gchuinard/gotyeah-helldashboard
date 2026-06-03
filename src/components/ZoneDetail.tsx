import type { PlanetFull } from '../types/helldivers'

export type ZoneId = 'bugs' | 'cyborgs' | 'illuminate'

interface Props {
  zone: ZoneId
  planets: PlanetFull[]
  onClose: () => void
}

const ZONE_LABEL: Record<ZoneId, string> = {
  bugs: 'Zone Terminiide',
  cyborgs: 'Zone Automate',
  illuminate: 'Zone Illuminée',
}

const ZONE_COLOR: Record<ZoneId, string> = {
  bugs: '#f59e0b',
  cyborgs: '#ef4444',
  illuminate: '#c084fc',
}

const OWNER_LABEL: Record<number, string> = {
  1: 'Super Terre',
  2: 'Terminiides',
  3: 'Automates',
  4: 'Illuminés',
}

export function ZoneDetail({ zone, planets, onClose }: Props) {
  const color = ZONE_COLOR[zone]
  const label = ZONE_LABEL[zone]

  const sorted = [...planets].sort((a, b) => b.players - a.players)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg2)',
          border: `1px solid ${color}`,
          boxShadow: `0 0 24px ${color}30`,
          width: '520px',
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '0.75rem 1rem',
          borderBottom: `1px solid ${color}40`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontFamily: 'Orbitron', fontSize: '0.75rem', color, letterSpacing: '0.1em' }}>
              {label}
            </div>
            <div style={{ fontFamily: 'Share Tech Mono', fontSize: '0.6rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
              {planets.length} planètes — {planets.reduce((s, p) => s + p.players, 0).toLocaleString('fr-FR')} Helldivers déployés
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-dim)',
            fontFamily: 'Share Tech Mono', fontSize: '1rem', cursor: 'pointer',
          }}>✕</button>
        </div>

        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 110px 80px 70px',
          padding: '0.4rem 1rem',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          {['Planète', 'Faction', 'Helldivers', 'Démocratie'].map(h => (
            <span key={h} style={{ fontFamily: 'Share Tech Mono', fontSize: '0.55rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {sorted.map(p => {
            const libColor = p.owner === 1 ? '#22c55e' : p.liberation > 50 ? '#f59e0b' : '#ef4444'
            return (
              <div key={p.planet.index} style={{
                display: 'grid',
                gridTemplateColumns: '1fr 110px 80px 70px',
                padding: '0.35rem 1rem',
                borderBottom: '1px solid var(--border)',
                alignItems: 'center',
              }}>
                <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.65rem', color: 'var(--text)' }}>
                  {p.planet.name ?? `#${p.planet.index}`}
                </span>
                <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.6rem', color: 'var(--text-dim)' }}>
                  {OWNER_LABEL[p.owner] ?? `owner:${p.owner}`}
                </span>
                <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.6rem', color: p.players > 0 ? 'var(--amber)' : 'var(--text-dim)' }}>
                  {p.players.toLocaleString('fr-FR')}
                </span>
                <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.6rem', color: libColor }}>
                  {p.liberation.toFixed(1)} %
                </span>
              </div>
            )
          })}
        </div>

        {/* Raw JSON toggle */}
        <details style={{ flexShrink: 0, borderTop: '1px solid var(--border)' }}>
          <summary style={{
            padding: '0.4rem 1rem',
            fontFamily: 'Share Tech Mono',
            fontSize: '0.6rem',
            color: 'var(--text-dim)',
            cursor: 'pointer',
            userSelect: 'none',
          }}>
            Données API brutes
          </summary>
          <pre style={{
            margin: 0,
            padding: '0.5rem 1rem',
            fontFamily: 'Share Tech Mono',
            fontSize: '0.55rem',
            color: 'var(--text-dim)',
            overflowX: 'auto',
            maxHeight: '200px',
            overflowY: 'auto',
            background: 'var(--bg)',
          }}>
            {JSON.stringify(sorted.map(p => ({
              index: p.planet.index,
              name: p.planet.name,
              owner: p.owner,
              players: p.players,
              health: p.health,
              liberation: p.liberation,
              sector: p.planet.sector,
              biome: p.planet.biome?.slug,
              position: { x: p.positionX, y: p.positionY },
            })), null, 2)}
          </pre>
        </details>
      </div>
    </div>
  )
}
