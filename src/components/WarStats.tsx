import type { GalaxyStats } from '../types/helldivers'

interface Props {
  stats: GalaxyStats
}

function fmtBig(n: number): string {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + ' Bi'
  if (n >= 1e9) return (n / 1e9).toFixed(1) + ' Md'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + ' M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + ' k'
  return String(Math.round(n))
}

function fmtPercent(n: number): string {
  return (n * 100).toFixed(1) + ' %'
}

function fmtDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  return `${days.toLocaleString('fr-FR')} jours`
}

interface StatCard {
  icon: string
  label: string
  value: string
  color: string
}

export function WarStats({ stats }: Props) {
  const cards: StatCard[] = [
    {
      icon: '⚔',
      label: 'Ennemis de la Démocratie éliminés',
      value: fmtBig(stats.casualtiesEnemy),
      color: 'var(--red)',
    },
    {
      icon: '✠',
      label: 'Helldivers tombés pour la Démocratie',
      value: fmtBig(stats.deaths),
      color: 'var(--amber)',
    },
    {
      icon: '◎',
      label: 'Munitions expendées pour la liberté',
      value: fmtBig(stats.bulletsFired),
      color: 'var(--text)',
    },
    {
      icon: '●',
      label: 'Munitions qui ont servi la Démocratie',
      value: fmtBig(stats.bulletsHit),
      color: 'var(--cyan)',
    },
    {
      icon: '★',
      label: 'Opérations démocratiques réussies',
      value: fmtBig(stats.missionsWon),
      color: 'var(--green)',
    },
    {
      icon: '↩',
      label: 'Retraites tactiques',
      value: fmtBig(stats.missionsLost),
      color: 'var(--red)',
    },
    {
      icon: '%',
      label: 'Taux de réussite démocratique',
      value: fmtPercent(stats.missionSuccessRate),
      color: 'var(--green)',
    },
    {
      icon: '♦',
      label: 'Incidents démocratiques collatéraux',
      value: fmtBig(stats.friendlies),
      color: 'var(--amber-dim)',
    },
    {
      icon: '+',
      label: 'Helldivers remis sur pied',
      value: fmtBig(stats.revives),
      color: 'var(--cyan)',
    },
    {
      icon: '◷',
      label: 'Temps sacrifié pour la Démocratie',
      value: fmtDuration(stats.timePlayed),
      color: 'var(--text-dim)',
    },
  ]

  return (
    <div
      style={{
        background: 'var(--bg2)',
        borderBottom: '1px solid var(--border)',
        padding: '0.75rem 1rem',
      }}
    >
      <div
        style={{
          fontFamily: 'Orbitron',
          fontSize: '0.6rem',
          color: 'var(--text-dim)',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginBottom: '0.6rem',
          borderLeft: '2px solid var(--amber)',
          paddingLeft: '0.5rem',
        }}
      >
        Bilan de Guerre Galactique
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '0.5rem',
        }}
      >
        {cards.map((card) => (
          <div
            key={card.label}
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '2px',
              padding: '0.5rem 0.6rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
              <span style={{ color: card.color, fontSize: '0.8rem' }}>{card.icon}</span>
              <span
                style={{
                  fontFamily: 'Orbitron',
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: card.color,
                  letterSpacing: '0.04em',
                }}
              >
                {card.value}
              </span>
            </div>
            <div
              style={{
                fontFamily: 'Share Tech Mono',
                fontSize: '0.6rem',
                color: 'var(--text-dim)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                lineHeight: 1.3,
              }}
            >
              {card.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
