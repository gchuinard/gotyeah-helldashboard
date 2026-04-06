import { useWarData } from './hooks/useWarData'
import { MetricsBar } from './components/MetricsBar'
import { WarStats } from './components/WarStats'

function App() {
  const { status, loading, error, lastUpdated } = useWarData()

  const planets = status?.planetStatus ?? []
  const stats = status?.galaxyStats ?? status?.warStats ?? null

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <span style={{ fontFamily: 'Orbitron', color: 'var(--amber)', letterSpacing: '0.15em' }}>
          CONNEXION AU MINISTÈRE DE LA PAIX…
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <span style={{ fontFamily: 'Share Tech Mono', color: 'var(--red)' }}>
          SIGNAL INTERFÉRÉ — {error}
        </span>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header
        style={{
          padding: '0.5rem 1rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg2)',
        }}
      >
        <span style={{ fontFamily: 'Orbitron', fontSize: '0.75rem', color: 'var(--amber)', letterSpacing: '0.2em' }}>
          SUPER TERRE — MINISTÈRE DE LA PAIX
        </span>
        {lastUpdated && (
          <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.65rem', color: 'var(--text-dim)' }}>
            MAJ {lastUpdated.toLocaleTimeString('fr-FR')}
          </span>
        )}
      </header>

      {/* Métriques top */}
      <MetricsBar planets={planets} />

      {/* Bilan de guerre */}
      {stats && <WarStats stats={stats} />}

      {/* Contenu principal (à venir) */}
      <main style={{ flex: 1, padding: '1rem', display: 'flex', gap: '1rem' }}>
        <div
          style={{
            flex: 1,
            border: '1px solid var(--border)',
            borderRadius: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-dim)',
            fontFamily: 'Share Tech Mono',
            fontSize: '0.7rem',
          }}
        >
          CARTE GALACTIQUE — À VENIR
        </div>
        <div
          style={{
            width: '280px',
            border: '1px solid var(--border)',
            borderRadius: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-dim)',
            fontFamily: 'Share Tech Mono',
            fontSize: '0.7rem',
          }}
        >
          FRONTS ACTIFS — À VENIR
        </div>
      </main>
    </div>
  )
}

export default App
