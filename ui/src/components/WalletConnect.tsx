import { LACE_NETWORK_LABEL, NETWORK_LABEL } from '../services/contracts';

interface Props {
  onConnect: () => void;
  loading: boolean;
}

export default function WalletConnect({ onConnect, loading }: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: 'url(/assets/wallet_connect_bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(5, 15, 8, 0.6)',
        }}
      />

      <div style={{ position: 'relative', textAlign: 'center', color: '#f5e6c8' }}>
        <div style={{ fontSize: 72, marginBottom: 8 }}>🌿</div>
        <h1
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: 52,
            fontWeight: 700,
            color: '#d4a745',
            textShadow: '0 0 30px rgba(212,167,69,0.5)',
            margin: '0 0 8px',
          }}
        >
          SHADOW RUN
        </h1>
        <p
          style={{
            fontFamily: 'Crimson Text, serif',
            fontStyle: 'italic',
            fontSize: 20,
            color: '#a0b890',
            marginBottom: 16,
          }}
        >
          The forest awaits. Leave no trace.
        </p>
        <p
          style={{
            fontFamily: 'Crimson Text, serif',
            fontStyle: 'italic',
            fontSize: 14,
            color: 'rgba(160, 184, 144, 0.8)',
            maxWidth: 480,
            lineHeight: 1.7,
            marginBottom: 48,
          }}
        >
          2047. Every transaction on every public chain is visible to CHAIN - the surveillance
          corporation that built its empire on financial transparency. The Midnight forest is the
          only network they cannot see into. You are a Runner. Your job is to move assets through
          the dark canopy without leaving a trace. The forest does not record your name. Only your
          score is eternal.
        </p>
        <button
          onClick={onConnect}
          disabled={loading}
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: 18,
            fontWeight: 600,
            padding: '16px 48px',
            background: 'linear-gradient(135deg, #d4a745, #a07830)',
            color: '#0a1410',
            border: 'none',
            borderRadius: 8,
            cursor: loading ? 'wait' : 'pointer',
            boxShadow: '0 0 30px rgba(212,167,69,0.4)',
            transition: 'all 0.3s ease',
          }}
        >
          {loading ? 'Connecting...' : '🌑 Enter the Forest'}
        </button>
        <p
          style={{
            marginTop: 24,
            fontSize: 13,
            color: 'rgba(245,230,200,0.5)',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Requires Lace wallet · {NETWORK_LABEL}
          <br />
          Select "{LACE_NETWORK_LABEL}" in Lace and keep the local services on ports 9944, 8088,
          and 6300 running.
        </p>
      </div>
    </div>
  );
}
