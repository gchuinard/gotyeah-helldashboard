interface Props {
  connected: boolean
  countdown: number
  warId: number | undefined
}

const S = {
  bar: {
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    height: '26px',
    background: '#0d0d10',
    borderTop: '1px solid rgba(245,158,11,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: '9px',
    letterSpacing: '1px',
    color: '#7a6a45',
    userSelect: 'none' as const,
  },
  left: { display: 'flex', alignItems: 'center', gap: '24px' },
  val: { color: '#f59e0b' },
}

export function StatusBar({ connected, countdown, warId }: Props) {
  return (
    <div style={S.bar}>
      <div style={S.left}>
        <span>
          RÉSEAU SUPER TERRE:{' '}
          <span style={{ color: connected ? '#22c55e' : '#ef4444' }}>
            {connected ? 'CONNECTÉ' : 'DÉGRADÉ'}
          </span>
        </span>
        <span>
          SOURCE: <span style={S.val}>API COMMUNAUTAIRE</span>
        </span>
        <span>
          PROCHAIN RAPPORT: <span style={S.val}>{String(countdown).padStart(2, '0')}s</span>
        </span>
      </div>
      <span>
        GUERRE GALACTIQUE N°: <span style={S.val}>{warId ?? 801}</span>
      </span>
    </div>
  )
}
