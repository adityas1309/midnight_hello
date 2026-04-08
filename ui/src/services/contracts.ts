import shadowRunnerDeployment from '../../../deployments/shadow-runner.json';
import riverCrossingDeployment from '../../../deployments/river-crossing.json';
import stoneDropDeployment from '../../../deployments/stone-drop.json';

type DeploymentRecord = {
  contractAddress?: string;
  contractName?: string;
  network?: string;
  deployedAt?: string;
};

type ContractDefinition = {
  address: string;
  envVar: string;
  name: string;
};

type ContractKey = 'shadowRunner' | 'riverCrossing' | 'stoneDrop';

const env = import.meta.env as Record<string, string | undefined>;

function readEnv(key: string): string {
  return env[key]?.trim() ?? '';
}

function formatNetworkLabel(networkId: string): string {
  if (networkId === 'undeployed') {
    return 'Midnight Local (Undeployed)';
  }

  return `Midnight ${networkId.charAt(0).toUpperCase()}${networkId.slice(1)}`;
}

function resolveContractAddress(
  deployment: DeploymentRecord,
  envVar: string,
): string {
  const envAddress = readEnv(envVar);
  if (envAddress) {
    return envAddress;
  }

  if (deployment.network === NETWORK_ID && deployment.contractAddress) {
    return deployment.contractAddress.trim();
  }

  return '';
}

function buildContractDefinition(
  name: string,
  envVar: string,
  deployment: DeploymentRecord,
): ContractDefinition {
  return {
    address: resolveContractAddress(deployment, envVar),
    envVar,
    name,
  };
}

export const NETWORK_ID = readEnv('VITE_NETWORK_ID') || 'undeployed';
export const IS_LOCAL_NETWORK = NETWORK_ID === 'undeployed';
export const NETWORK_LABEL = formatNetworkLabel(NETWORK_ID);
export const LACE_NETWORK_LABEL = IS_LOCAL_NETWORK ? 'Undeployed' : NETWORK_ID;
export const EXPLORER_TX_BASE_URL =
  readEnv('VITE_EXPLORER_TX_BASE_URL') ||
  (IS_LOCAL_NETWORK ? '' : 'https://explorer.midnight.network/transactions');

export const CONTRACTS = {
  shadowRunner: buildContractDefinition(
    'shadow-runner',
    'VITE_SHADOW_RUNNER_ADDRESS',
    shadowRunnerDeployment as DeploymentRecord,
  ),
  riverCrossing: buildContractDefinition(
    'river-crossing',
    'VITE_RIVER_CROSSING_ADDRESS',
    riverCrossingDeployment as DeploymentRecord,
  ),
  stoneDrop: buildContractDefinition(
    'stone-drop',
    'VITE_STONE_DROP_ADDRESS',
    stoneDropDeployment as DeploymentRecord,
  ),
} as const satisfies Record<ContractKey, ContractDefinition>;

export const NETWORK = {
  indexer: readEnv('VITE_INDEXER_URL') || 'http://127.0.0.1:8088/api/v3/graphql',
  indexerWS: readEnv('VITE_INDEXER_WS_URL') || 'ws://127.0.0.1:8088/api/v3/graphql/ws',
  node: readEnv('VITE_NODE_URL') || 'http://127.0.0.1:9944',
  proofServer: readEnv('VITE_PROOF_SERVER_URL') || 'http://127.0.0.1:6300',
} as const;

export function hasConfiguredContractAddress(contractKey: ContractKey): boolean {
  return CONTRACTS[contractKey].address.length > 0;
}

export function requireContractAddress(contractKey: ContractKey): string {
  const contract = CONTRACTS[contractKey];
  if (contract.address) {
    return contract.address;
  }

  throw new Error(
    `No ${contract.name} address is configured for ${NETWORK_LABEL}. ` +
      `Deploy it on the local network so deployments/${contract.name}.json is refreshed, ` +
      `or set ${contract.envVar} in ui/.env.`,
  );
}

export function getTransactionUrl(txId: string): string | null {
  if (!EXPLORER_TX_BASE_URL) {
    return null;
  }

  return `${EXPLORER_TX_BASE_URL.replace(/\/+$/, '')}/${txId}`;
}

export const RANK_THRESHOLDS = [
  { min: 0, max: 999, rank: 'Seedling', emoji: '🌱' },
  { min: 1000, max: 4999, rank: 'Tracker', emoji: '🌿' },
  { min: 5000, max: 14999, rank: 'Pathfinder', emoji: '🍃' },
  { min: 15000, max: 39999, rank: 'Forest Ghost', emoji: '🌳' },
  { min: 40000, max: Infinity, rank: 'Shadow Runner', emoji: '🌑' },
] as const;

export function getRankForScore(score: number): typeof RANK_THRESHOLDS[number] {
  return RANK_THRESHOLDS.find((rank) => score >= rank.min && score <= rank.max) ?? RANK_THRESHOLDS[0];
}

export const MISSIONS = {
  ghost_trail: {
    id: 'ghost_trail',
    name: 'Ghost Trail',
    icon: '👣',
    basePoints: 100,
    narrative: 'Move through the Whispering Grove without disturbing a single leaf. Send assets privately - no footprints on-chain.',
    flavour: `"The canopy closes behind you. CHAIN's drones scan the northern ridge - but between the ancient trees, you are wind and shadow. Leave no trace."`,
    difficulty: 1,
    timeLimit: '5 min',
    contract: 'shadowRunner' as const,
  },
  river_crossing: {
    id: 'river_crossing',
    name: 'River Crossing',
    icon: '🌊',
    basePoints: 200,
    narrative: 'Two runners meet at the river bend. They trade what they carry, atomically. Neither leaves a trace on the other\'s path.',
    flavour: `"The rope bridge sways over the dark water. On the far bank, another runner waits. You will exchange bundles mid-crossing - no names, no records, just two shadows passing in the mist."`,
    difficulty: 2,
    timeLimit: '8 min',
    contract: 'riverCrossing' as const,
  },
  canopy_split: {
    id: 'canopy_split',
    name: 'Canopy Split',
    icon: '🌿',
    basePoints: 180,
    narrative: 'Scatter your assets across three hidden groves simultaneously before CHAIN\'s drone reaches your position.',
    flavour: `"Three seed pods, three groves, one heartbeat. The canopy parts above you - CHAIN's scanner pulse ripples through the leaves. Throw fast."`,
    difficulty: 3,
    timeLimit: '6 min',
    contract: 'shadowRunner' as const,
  },
  stone_drop: {
    id: 'stone_drop',
    name: 'Stone Drop',
    icon: '🪨',
    basePoints: 300,
    narrative: 'Leave an asset at an ancient stone marker. Carve in the moss-secret. Only someone who knows the exact carving can claim it. One-time. Untraceable.',
    flavour: `"The clearing opens before you - an ancient stone, moss-covered and weathered by centuries. You press your secret into the soft green surface. Only the one who knows the pattern will find what you leave here."`,
    difficulty: 3,
    timeLimit: '10 min',
    contract: 'stoneDrop' as const,
  },
} as const;

export type MissionId = keyof typeof MISSIONS;
