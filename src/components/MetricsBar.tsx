import type { PlanetStatus } from '../types/helldivers'

interface Props {
  planets: PlanetStatus[]
}

interface Metric {
  label: string
  value: number
  color: string
}

export function MetricsBar({ planets }: Props) {
  const deployed = planets.reduce((sum, p) => sum + p.players, 0)
  const contested = planets.filter(p => p.owner !== 1 && p.players > 0).length
  const terminid = planets.filter(p => p.owner === 2).length
  const automaton = planets.filter(p => p.owner === 3).length

  const metrics: Metric[] = [
    {
      label: 'Helldivers déployés',
      value: deployed,
      color: 'var(--amber)',
    },
    {
      label: 'Planètes en manque de Démocratie',
      value: contested,
      color: 'var(--red)',
    },
    {
      label: 'Infestées Terminiide',
      value: terminid,
      color: 'var(--green)',
    },
    {
      label: 'Occupées Automate',
      value: automaton,
      color: 'var(--cyan)',
    },
  ]

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {metrics.map((m) => (
        <div
          key={m.label}
          style={{
            padding: '0.75rem 1rem',
            borderRight: '1px solid var(--border)',
            background: 'var(--bg2)',
          }}
        >
          <div
            style={{
              fontFamily: 'Orbitron',
              fontSize: '1.5rem',
              fontWeight: 700,
              color: m.color,
              letterSpacing: '0.05em',
              textShadow: `0 0 12px ${m.color}`,
            }}
          >
            {m.value.toLocaleString('fr-FR')}
          </div>
          <div
            style={{
              fontFamily: 'Share Tech Mono',
              fontSize: '0.65rem',
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginTop: '0.2rem',
            }}
          >
            {m.label}
          </div>
        </div>
      ))}
    </div>
  )
}
