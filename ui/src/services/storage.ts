import { NETWORK_ID } from './contracts';

const STORAGE_PREFIX = `shadowrun:${NETWORK_ID}`;

export const STORAGE_KEYS = {
  runnerName: `${STORAGE_PREFIX}:runner_name`,
  stoneDrops: `${STORAGE_PREFIX}:stone_drops`,
  txHistory: `${STORAGE_PREFIX}:tx_history`,
  walletAddress: `${STORAGE_PREFIX}:wallet_address`,
} as const;

export function readStorageItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorageItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures such as private browsing mode.
  }
}

export function removeStorageItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage failures such as private browsing mode.
  }
}
