import { useState } from 'react'
import { useWarData } from './hooks/useWarData'
import { MetricsBar } from './components/MetricsBar'
import { WarStats } from './components/WarStats'
import { GalaxyMap } from './components/GalaxyMap'
import { PlanetDetail } from './components/PlanetDetail'
import { PlanetList } from './components/PlanetList'
import { StatusBar } from './components/StatusBar'
import type { PlanetFull } from './types/helldivers'

function App() {
  const { planets, campaigns, status, majorOrders, loading, error, lastUpdated, countdown, sectorNames } = useWarData()
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetFull | null>(null)

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
    <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', paddingBottom: '26px', boxSizing: 'border-box' }}>

      {/* Header */}
      <header style={{
        padding: '0.5rem 1rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg2)',
        flexShrink: 0,
      }}>
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

      {/* Carte + panel droit */}
      <main style={{ flex: 1, display: 'flex', minHeight: 0, padding: '1rem', gap: '1rem' }}>

        {/* Carte galactique */}
        <div style={{
          flex: 1,
          border: '1px solid var(--border)',
          borderRadius: '2px',
          overflow: 'hidden',
          background: 'var(--bg)',
          minWidth: 0,
        }}>
          <GalaxyMap planets={planets} onPlanetClick={setSelectedPlanet} sectorNames={sectorNames} campaigns={campaigns} />
        </div>

        {/* Panel droit */}
        <div style={{
          width: '260px',
          flexShrink: 0,
          border: '1px solid var(--border)',
          borderRadius: '2px',
          background: 'var(--bg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <PlanetList
            planets={planets}
            campaigns={campaigns}
            majorOrders={majorOrders}
            onPlanetClick={setSelectedPlanet}
          />
        </div>

      </main>

      {/* Popup détail planète */}
      {selectedPlanet && (
        <PlanetDetail planet={selectedPlanet} onClose={() => setSelectedPlanet(null)} />
      )}

      <StatusBar connected={!error} countdown={countdown} warId={status?.warId} />
    </div>
  )
}

export default App
