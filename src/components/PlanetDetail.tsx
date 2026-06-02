import type { PlanetFull, FactionId } from '../types/helldivers'

interface Props {
  planet: PlanetFull
  onClose: () => void
}

const FACTION_LABEL: Record<FactionId, string> = {
  1: 'Super Terre',
  2: 'Terminiides',
  3: 'Automates',
  4: 'Illuminés',
}

const FACTION_COLOR: Record<FactionId, string> = {
  1: '#06b6d4',
  2: '#22c55e',
  3: '#ef4444',
  4: '#a855f7',
}

export function PlanetDetail({ planet, onClose }: Props) {
  const color = FACTION_COLOR[planet.owner]
  const rawLib = typeof planet.liberation === 'number' && !isNaN(planet.liberation) ? planet.liberation : 0
  const libClamped = Math.min(100, Math.max(0, rawLib))
  const liberationPct = libClamped.toFixed(1)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
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
          boxShadow: `0 0 24px ${color}40`,
          width: '340px',
          padding: '1.2rem',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Fermer */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '0.6rem',
            right: '0.8rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-dim)',
            fontFamily: 'Share Tech Mono',
            fontSize: '1rem',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>

        {/* Titre */}
        <div style={{ marginBottom: '0.8rem' }}>
          <div style={{ fontFamily: 'Orbitron', fontSize: '1rem', fontWeight: 700, color, letterSpacing: '0.1em' }}>
            {planet.planet.name ?? '—'}
          </div>
          <div style={{ fontFamily: 'Share Tech Mono', fontSize: '0.6rem', color: 'var(--text-dim)', marginTop: '0.2rem', letterSpacing: '0.05em' }}>
            {planet.owner === 1
              ? '✓ SOUS CONTRÔLE DÉMOCRATIQUE'
              : planet.players > 0
                ? `⚠ FRONT ACTIF — ${FACTION_LABEL[planet.owner]?.toUpperCase()}`
                : `${FACTION_LABEL[planet.owner]?.toUpperCase()} — OCCUPATION`}
          </div>
        </div>

        {/* Infos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Row label="Faction" value={FACTION_LABEL[planet.owner]} color={color} />
          <Row label="Secteur" value={`#${planet.planet.sector}`} />
          <Row label="Helldivers au sol" value={planet.players.toLocaleString('fr-FR')} />
          <Row label="Taux de Démocratie" value={`${liberationPct} %`} color={planet.owner === 1 ? '#22c55e' : '#ef4444'} />
          <Row label="Biome" value={planet.planet.biome?.slug ?? '—'} />

          {/* Dangers */}
          {planet.planet.environmentals?.length > 0 && (
            <div>
              <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                Dangers environnementaux
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.3rem' }}>
                {planet.planet.environmentals.map(e => (
                  <span
                    key={e.name}
                    style={{
                      fontFamily: 'Share Tech Mono',
                      fontSize: '0.6rem',
                      color: '#f59e0b',
                      border: '1px solid rgba(245,158,11,0.3)',
                      padding: '0.1rem 0.4rem',
                    }}
                  >
                    {e.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Barre de libération */}
          <div style={{ marginTop: '0.4rem' }}>
            <div style={{ fontFamily: 'Share Tech Mono', fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
              Progression
            </div>
            <div style={{ height: '6px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <div
                style={{
                  height: '100%',
                  width: `${libClamped}%`,
                  background: planet.owner === 1 ? '#22c55e' : color,
                  transition: 'width 0.5s',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.75rem', color: color ?? 'var(--text)' }}>
        {value}
      </span>
    </div>
  )
}
