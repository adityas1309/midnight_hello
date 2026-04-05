import { useState } from 'react';
import type { ContractCallResult } from '../services/contractService';
import * as contractService from '../services/contractService';
import { NETWORK_LABEL, getTransactionUrl } from '../services/contracts';
import { STORAGE_KEYS, writeStorageItem } from '../services/storage';

interface Props {
  onRegistered: (name: string) => void;
}

export default function RegistrationScreen({ onRegistered }: Props) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txResult, setTxResult] = useState<ContractCallResult | null>(null);

  const isValid = /^[a-zA-Z0-9_]{1,20}$/.test(name);
  const txUrl = txResult ? getTransactionUrl(txResult.txId) : null;

  const handleRegister = async () => {
    if (!isValid) {
      return;
    }

    setLoading(true);
    setError(null);
    console.log(`[RegistrationScreen] Starting runner registration for "${name}"...`);

    try {
      const walletApi = await contractService.getConnectedWalletApi();
      const result = await contractService.registerRunner(walletApi, name);
      setTxResult(result);
      console.log('[RegistrationScreen] Runner registration succeeded:', result);
      writeStorageItem(STORAGE_KEYS.runnerName, name);
    } catch (err) {
      console.error('[RegistrationScreen] Runner registration failed:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const shortenHash = (hash: string) => {
    if (hash.length <= 19) {
      return hash;
    }

    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

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

      <div
        style={{
          position: 'relative',
          textAlign: 'center',
          color: '#f5e6c8',
          maxWidth: 500,
          padding: '0 24px',
        }}
      >
        <div style={{ fontSize: 72, marginBottom: 8 }}>🌿</div>
        <h1
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: 48,
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
            fontSize: 18,
            color: '#a0b890',
            marginBottom: 32,
          }}
        >
          Your name will be carved into the forest forever.
        </p>

        {txResult && (
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                fontSize: 48,
                marginBottom: 12,
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            >
              ✨
            </div>
            <p
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: 22,
                color: '#6bbd6b',
                marginBottom: 12,
              }}
            >
              {txResult.status === 'finalized'
                ? `Your identity is sealed on ${NETWORK_LABEL}`
                : `Your transaction is submitted on ${NETWORK_LABEL}`}
            </p>
            {txResult.status === 'submitted' && (
              <p
                style={{
                  fontFamily: 'Crimson Text, serif',
                  fontStyle: 'italic',
                  fontSize: 15,
                  color: '#a0b890',
                  marginBottom: 12,
                }}
              >
                Finalization is still catching up. Keep the local node and indexer running while
                Midnight finishes indexing your registration.
              </p>
            )}
            <div
              style={{
                padding: '10px 16px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: 8,
                border: '1px solid rgba(74,122,74,0.4)',
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontSize: '0.72rem',
                  color: 'rgba(245,230,200,0.5)',
                  marginBottom: 4,
                }}
              >
                Transaction Hash
              </div>
              {txUrl ? (
                <a
                  href={txUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    color: '#6bbd6b',
                    textDecoration: 'none',
                  }}
                >
                  {shortenHash(txResult.txId)} ↗
                </a>
              ) : (
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    color: '#6bbd6b',
                  }}
                >
                  {shortenHash(txResult.txId)}
                </span>
              )}
            </div>
            <button
              onClick={() => onRegistered(name)}
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: 18,
                fontWeight: 600,
                padding: '16px 48px',
                background: 'linear-gradient(135deg, #d4a745, #a07830)',
                color: '#0a1410',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                boxShadow: '0 0 30px rgba(212,167,69,0.4)',
                transition: 'all 0.3s ease',
              }}
            >
              🌑 Enter the Forest
            </button>
          </div>
        )}

        {!txResult && (
          <>
            <label
              style={{
                display: 'block',
                fontFamily: 'Crimson Text, serif',
                fontStyle: 'italic',
                fontSize: 14,
                color: 'rgba(160, 184, 144, 0.8)',
                marginBottom: 8,
              }}
            >
              Choose your Runner name - this is carved into the forest forever
            </label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value.slice(0, 20))}
              placeholder="RunnerName"
              disabled={loading}
              style={{
                width: '100%',
                maxWidth: 360,
                padding: '14px 20px',
                fontFamily: 'Cinzel, serif',
                fontSize: 18,
                fontWeight: 600,
                textAlign: 'center',
                background: 'rgba(10, 20, 10, 0.7)',
                border: `2px solid ${
                  isValid && name.length > 0
                    ? '#6bbd6b'
                    : name.length > 0
                      ? '#b42814'
                      : 'rgba(74,122,74,0.4)'
                }`,
                borderRadius: 8,
                color: '#f5e6c8',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.3s ease',
              }}
            />
            {name.length > 0 && !isValid && (
              <p style={{ fontSize: 12, color: '#b42814', marginTop: 6 }}>
                Only letters, numbers, and underscores allowed (max 20 characters)
              </p>
            )}

            {loading && (
              <div style={{ marginTop: 24 }}>
                <div
                  style={{
                    fontSize: 32,
                    animation: 'pulse 1.5s ease-in-out infinite',
                    marginBottom: 8,
                  }}
                >
                  🪨
                </div>
                <p
                  style={{
                    fontFamily: 'Crimson Text, serif',
                    fontStyle: 'italic',
                    fontSize: 16,
                    color: '#a0b890',
                  }}
                >
                  Carving your name into the ancient stone... (30-60 seconds)
                </p>
              </div>
            )}

            {error && (
              <div style={{ marginTop: 16 }}>
                <p
                  style={{
                    fontSize: 14,
                    color: '#e85040',
                    padding: '10px 16px',
                    background: 'rgba(180,40,20,0.15)',
                    borderRadius: 8,
                    border: '1px solid rgba(180,40,20,0.3)',
                    lineHeight: 1.5,
                  }}
                >
                  {error}
                </p>
              </div>
            )}

            {!loading && (
              <button
                onClick={handleRegister}
                disabled={!isValid || name.length === 0}
                style={{
                  marginTop: 24,
                  fontFamily: 'Cinzel, serif',
                  fontSize: 18,
                  fontWeight: 600,
                  padding: '16px 48px',
                  background:
                    isValid && name.length > 0
                      ? 'linear-gradient(135deg, #d4a745, #a07830)'
                      : 'rgba(100,100,100,0.3)',
                  color:
                    isValid && name.length > 0
                      ? '#0a1410'
                      : 'rgba(245,230,200,0.3)',
                  border: 'none',
                  borderRadius: 8,
                  cursor: isValid && name.length > 0 ? 'pointer' : 'not-allowed',
                  boxShadow:
                    isValid && name.length > 0 ? '0 0 30px rgba(212,167,69,0.4)' : 'none',
                  transition: 'all 0.3s ease',
                }}
              >
                {error ? '🔄 Retry Registration' : '🪨 Register as Runner'}
              </button>
            )}
          </>
        )}

        <p
          style={{
            marginTop: 24,
            fontSize: 13,
            color: 'rgba(245,230,200,0.5)',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Connected to {NETWORK_LABEL} · Registration is on-chain
        </p>
      </div>
    </div>
  );
}
