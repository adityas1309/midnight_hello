import { useState, useEffect } from 'react';
import type { MarketOffer } from '../services/gameState';
import { fetchMarketState } from '../services/gameState';
import { useGameStore } from '../game/store';
import { multiplayerService } from '../services/multiplayer';
import * as contractService from '../services/contractService';

function shortenHash(hash: string): string {
  if (hash.length <= 19) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
}

export default function RiverMarket() {
  const { setOverlay, activeOffers, swapStatus, swapStatusMessage, runnerInfo } = useGameStore();

  const [market, setMarket] = useState<MarketOffer | null>(null);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [requestAmount, setRequestAmount] = useState('');
  const [offeredAsset, setOfferedAsset] = useState('tDUST');
  const [wantAsset, setWantAsset] = useState('NIGHT');

  const [contractLoading, setContractLoading] = useState(false);
  const [contractError, setContractError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchMarketState();
      setMarket(data);
    } catch (e) {
      console.error('Failed to load market data:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading || !market) {
    return (
      <div className="modal-overlay" style={{ pointerEvents: 'auto' }}>
         <div className="river-market" style={{ margin: 'auto', textAlign: 'center', padding: 40 }}>
            <p style={{ color: 'var(--color-gold)' }}>Approaching the River...</p>
         </div>
      </div>
    );
  }

  // Combine on-chain offers with P2P swap offers
  const onChainOffers = market.offerActive ? [{
      id: 'live',
      offeredAsset: market.offeredAsset || 'tDUST',
      wantAsset: market.wantAsset || 'NIGHT',
      offeredAmount: market.offeredAmount,
      requestedAmount: market.requestedAmount,
      creator: market.offerCreator,
      isLive: true,
      age: 'Just now',
  }] : [];

  const handleCreateOffer = async () => {
    const amount = parseFloat(offerAmount);
    const reqAmount = parseFloat(requestAmount);
    if (isNaN(amount) || isNaN(reqAmount) || amount <= 0 || reqAmount <= 0) return;

    setContractLoading(true);
    setContractError(null);

    try {
      const walletApi = await contractService.getConnectedWalletApi();
      const creatorName = runnerInfo?.runnerName || 'Runner';
      const result = await contractService.createSwapOffer(
        walletApi, offeredAsset, amount, wantAsset, reqAmount, creatorName
      );

      // Record the on-chain swap creation
      useGameStore.getState().addTxRecord({
        txHash: result.txId,
        missionType: 'river_crossing_create',
        points: 0,
        timestamp: Date.now(),
        status: 'pending',
        description: `Swap offer created: ${amount} ${offeredAsset} → ${reqAmount} ${wantAsset}`,
      });

      setTimeout(() => {
        useGameStore.getState().updateTxStatus(result.txId, 'confirmed');
      }, 5000);

      // Also broadcast via multiplayer
      multiplayerService.createSwapOffer(offeredAsset, amount, wantAsset, reqAmount, 'river_crossing');

      setShowCreate(false);
      setOfferAmount('');
      setRequestAmount('');
      loadData(); // Refresh market state
    } catch (err) {
      setContractError(err instanceof Error ? err.message : String(err));
    } finally {
      setContractLoading(false);
    }
  };

  const handleAcceptOffer = (offerId: string) => {
    multiplayerService.acceptSwapOffer(offerId);
  };

  const handleConfirmSwap = async () => {
    const match = useGameStore.getState().pendingSwapMatch;
    if (!match) return;

    setContractLoading(true);
    setContractError(null);

    try {
      const walletApi = await contractService.getConnectedWalletApi();
      const acceptorName = runnerInfo?.runnerName || 'Runner';
      const result = await contractService.acceptSwapOffer(walletApi, acceptorName);

      const offerId = (match as Record<string, string>).offerId || '';
      multiplayerService.confirmSwapCompleted(offerId, result.txId);

      // Record the swap transaction
      useGameStore.getState().addTxRecord({
        txHash: result.txId,
        missionType: 'river_crossing_swap',
        points: 0,
        timestamp: Date.now(),
        status: 'pending',
        description: `P2P Swap completed at the River Crossing`,
      });

      // Auto-confirm after 5 seconds
      setTimeout(() => {
        useGameStore.getState().updateTxStatus(result.txId, 'confirmed');
      }, 5000);

      loadData(); // Refresh market state
    } catch (err) {
      setContractError(err instanceof Error ? err.message : String(err));
    } finally {
      setContractLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ pointerEvents: 'auto' }} onClick={(e) => e.target === e.currentTarget && setOverlay('none')}>
      <div className="river-market" style={{ margin: 'auto', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button className="btn" onClick={() => setOverlay('none')} style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
          Close (ESC)
        </button>

        <div className="river-market__header">
          <h2 className="river-market__title">🌊 The River Bend Market</h2>
          <p className="river-market__subtitle">
            Whispering River, Eastern Trail — {onChainOffers.length + activeOffers.length} active offers
          </p>
          <p style={{ fontSize: '0.75rem', marginTop: 8, opacity: 0.7 }}>
            Total swaps completed on contract: {market.totalSwapsCompleted || 0}
          </p>
        </div>

        {/* Swap Status Message */}
        {swapStatusMessage && (
          <div style={{
            padding: '10px 24px',
            textAlign: 'center',
            fontSize: '0.85rem',
            fontFamily: 'Crimson Text, serif',
            fontStyle: 'italic',
            color: swapStatus === 'matched' ? '#d4a745' : swapStatus === 'completed' ? '#6bbd6b' : '#e8a040',
            background: 'rgba(0,0,0,0.2)',
          }}>
            {swapStatusMessage}
          </div>
        )}

        {/* Contract Error */}
        {contractError && (
          <div style={{
            padding: '10px 24px',
            textAlign: 'center',
            fontSize: '0.85rem',
            color: '#e85040',
            background: 'rgba(180,40,20,0.15)',
          }}>
            {contractError}
          </div>
        )}

        {/* Pending Match — Confirm Button */}
        {swapStatus === 'matched' && (
          <div style={{ padding: '12px 24px', textAlign: 'center' }}>
            {contractLoading ? (
              <p style={{
                fontFamily: 'Crimson Text, serif',
                fontStyle: 'italic',
                fontSize: '0.9rem',
                color: '#a0b890',
              }}>
                Sealing your swap on Midnight... ZK proof generating... (20–60 seconds)
              </p>
            ) : (
              <button className="btn btn--gold" onClick={handleConfirmSwap} style={{ padding: '10px 24px' }}>
                🌑 Confirm on Midnight
              </button>
            )}
          </div>
        )}

        {/* Offer Board */}
        <div className="river-market__board">
          {onChainOffers.length === 0 && activeOffers.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-moss-light)', fontStyle: 'italic' }}>
              <p>The riverbank is quiet.</p>
              <p style={{ fontSize: '0.9rem', marginTop: 8 }}>There are no active swap contracts posted right now.</p>
            </div>
          ) : (
            <>
              {/* On-chain offers */}
              {onChainOffers.map(offer => (
                <div
                  key={offer.id}
                  className="offer-card"
                  style={{ borderColor: 'var(--color-moss)' }}
                >
                  <div style={{ position: 'absolute', top: 8, right: 8, fontSize: '0.65rem', background: 'var(--color-forest-light)', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>
                    LIVE ON MIDNIGHT
                  </div>

                  <div className="offer-card__exchange">
                    <span>{offer.offeredAmount} {offer.offeredAsset}</span>
                    <span className="offer-card__arrow">→</span>
                    <span>{offer.requestedAmount} {offer.wantAsset}</span>
                  </div>

                  <div className="offer-card__amounts">
                    <span>Ratio: {(offer.offeredAmount / offer.requestedAmount).toFixed(2)}:1</span>
                  </div>

                  <div className="offer-card__meta">
                    <span>Creator: {offer.creator.slice(0, 8)}...</span>
                    <span>{offer.age}</span>
                  </div>

                  <button
                    className="btn btn--primary"
                    style={{ width: '100%', fontSize: '0.8rem', padding: '8px' }}
                  >
                    🌊 Cross the River (Fill Order)
                  </button>
                </div>
              ))}

              {/* P2P swap offers */}
              {activeOffers.map(offer => (
                <div
                  key={offer.id}
                  className="offer-card"
                  style={{ borderColor: '#5588aa' }}
                >
                  <div style={{ position: 'absolute', top: 8, right: 8, fontSize: '0.65rem', background: '#3a5a7a', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>
                    P2P OFFER
                  </div>

                  <div className="offer-card__exchange">
                    <span>{offer.offeredAmount} {offer.offeredAsset}</span>
                    <span className="offer-card__arrow">→</span>
                    <span>{offer.wantedAmount} {offer.wantedAsset}</span>
                  </div>

                  <div className="offer-card__amounts">
                    <span>Ratio: {(offer.offeredAmount / offer.wantedAmount).toFixed(2)}:1</span>
                  </div>

                  <div className="offer-card__meta">
                    <span>By: {offer.creatorName}</span>
                  </div>

                  <button
                    className="btn btn--primary"
                    style={{ width: '100%', fontSize: '0.8rem', padding: '8px' }}
                    onClick={() => handleAcceptOffer(offer.id)}
                  >
                    🤝 Accept Swap Offer
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Create Offer Section */}
        <div className="create-offer">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 className="create-offer__title">✏️ Carve Your Offer</h3>
            <button
              className="btn btn--secondary"
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              onClick={() => setShowCreate(!showCreate)}
            >
              {showCreate ? 'Cancel' : 'New Contract'}
            </button>
          </div>

          {showCreate ? (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>You Lock</label>
                  <select value={offeredAsset} onChange={e => setOfferedAsset(e.target.value)}>
                    <option value="tDUST">tDUST</option>
                    <option value="NIGHT">NIGHT</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Amount</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={offerAmount}
                    onChange={e => setOfferAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>You Require</label>
                  <select value={wantAsset} onChange={e => setWantAsset(e.target.value)}>
                    <option value="NIGHT">NIGHT</option>
                    <option value="tDUST">tDUST</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Amount</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={requestAmount}
                    onChange={e => setRequestAmount(e.target.value)}
                  />
                </div>
              </div>
              <button
                className="btn btn--gold"
                style={{ width: '100%' }}
                disabled={!offerAmount || !requestAmount}
                onClick={handleCreateOffer}
              >
                📜 Submit P2P Swap Offer
              </button>
            </>
          ) : null}
        </div>

        <p style={{
          textAlign: 'center',
          padding: '16px',
          fontSize: '0.78rem',
          fontFamily: 'Crimson Text, serif',
          fontStyle: 'italic',
          color: 'var(--color-text-muted)',
        }}>
          "The river remembers no names. Only the forest knows a crossing happened."
        </p>
      </div>
    </div>
  );
}
