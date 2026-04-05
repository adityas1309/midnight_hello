import { Suspense, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { useGameStore } from './game/store';
import { connectWallet, fetchRunnerState } from './services/gameState';
import { multiplayerService } from './services/multiplayer';
import { STORAGE_KEYS, readStorageItem } from './services/storage';
import GameWorld from './components/GameWorld';
import HUD from './components/HUD';
import WalletConnect from './components/WalletConnect';
import RegistrationScreen from './components/RegistrationScreen';
import MissionCard from './components/MissionCard';
import MissionExecution from './components/MissionExecution';
import Leaderboard from './components/Leaderboard';
import Journal from './components/Journal';
import RiverMarket from './components/RiverMarket';
import { MISSIONS } from './services/contracts';
import { CAMERA } from './game/constants';

export default function App() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(
    () => Boolean(readStorageItem(STORAGE_KEYS.runnerName)),
  );
  const { activeOverlay, activeZoneId, setRunnerInfo } = useGameStore();

  useEffect(() => {
    const savedAddress = readStorageItem(STORAGE_KEYS.walletAddress) || '';
    if (!savedAddress) {
      return;
    }

    setConnected(true);
    useGameStore.getState().setWalletAddress(savedAddress);

    const initReturningUser = async () => {
      try {
        const state = await fetchRunnerState();
        setRunnerInfo(state);
        multiplayerService.connect(
          savedAddress,
          state.runnerName || 'Runner',
          state.trailScore || 0,
          state.currentRank || 'Seedling',
        );
      } catch (error) {
        console.error('Failed to initialize returning user:', error);
        multiplayerService.connect(savedAddress, 'Runner', 0, 'Seedling');
      }
    };

    void initReturningUser();
  }, [setRunnerInfo]);

  const handleConnect = async () => {
    setConnecting(true);

    try {
      const result = await connectWallet();
      if (!result.connected || !result.address) {
        return;
      }

      setConnected(true);
      useGameStore.getState().setWalletAddress(result.address);

      try {
        const state = await fetchRunnerState();
        setRunnerInfo(state);
        multiplayerService.connect(
          result.address,
          state.runnerName || 'Runner',
          state.trailScore || 0,
          state.currentRank || 'Seedling',
        );
      } catch {
        multiplayerService.connect(result.address, 'Runner', 0, 'Seedling');
      }
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setConnecting(false);
    }
  };

  useEffect(() => {
    if (!connected) {
      return;
    }

    const load = async () => {
      try {
        const state = await fetchRunnerState();
        setRunnerInfo(state);
      } catch (error) {
        console.error('Failed to refresh runner state:', error);
      }
    };

    void load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [connected, setRunnerInfo]);

  useEffect(() => {
    if (!connected) {
      return;
    }

    const interval = setInterval(() => {
      const store = useGameStore.getState();
      const now = Date.now();
      const expired = store.narrativeEvents.filter((event) => now - event.timestamp > 8000);
      expired.forEach((event) => store.removeNarrativeEvent(event.id));
    }, 2000);

    return () => clearInterval(interval);
  }, [connected]);

  if (!connected) {
    return <WalletConnect onConnect={handleConnect} loading={connecting} />;
  }

  if (!isRegistered) {
    return (
      <RegistrationScreen
        onRegistered={(name) => {
          setIsRegistered(true);
          const store = useGameStore.getState();
          store.setRunnerInfo({
            runnerName: name,
            currentRank: 'Seedling',
            rankEmoji: '🌱',
            isRegistered: true,
            trailScore: 0,
            weeklyScore: 0,
            totalMissions: 0,
            lastMissionType: '',
          });
          multiplayerService.connect(store.walletAddress, name, 0, 'Seedling');
        }}
      />
    );
  }

  const currentMission = activeZoneId
    ? Object.values(MISSIONS).find((mission) => mission.id === activeZoneId) ?? null
    : null;

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Canvas
        style={{ position: 'absolute', inset: 0 }}
        shadows={{ type: THREE.PCFShadowMap }}
        gl={{ antialias: true, alpha: false }}
        camera={{ fov: CAMERA.fov, near: 0.1, far: 200 }}
      >
        <Suspense fallback={null}>
          <GameWorld />
        </Suspense>
      </Canvas>

      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
        <HUD />
      </div>

      {activeOverlay === 'mission_card' && currentMission && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 20 }}>
          <MissionCard missionId={currentMission.id} />
        </div>
      )}
      {activeOverlay === 'mission_execution' && currentMission && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 20 }}>
          <MissionExecution missionId={currentMission.id} />
        </div>
      )}
      {activeOverlay === 'leaderboard' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 20 }}>
          <Leaderboard />
        </div>
      )}
      {activeOverlay === 'journal' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 20 }}>
          <Journal />
        </div>
      )}
      {activeOverlay === 'market' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 20 }}>
          <RiverMarket />
        </div>
      )}
    </div>
  );
}
