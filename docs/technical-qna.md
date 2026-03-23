# Technical Q&A

This Q&A is based on the current code in this repository, not on the aspirational docs alone. It is meant to prepare for technical review of the implemented Shadow Run / Midnight demo.

## 1. What is actually implemented on-chain?

**Answer:** Three Compact contracts are implemented and deployed on the local `undeployed` Midnight network:

- `shadow-runner.compact`: runner registration, score updates, weekly score reset.
- `river-crossing.compact`: maker locks funds, taker accepts, contract supports cancel.
- `stone-drop.compact`: deposit into a Merkle tree, claim, and revoke with nullifier protection.

Reference:
- `contracts/shadow-runner.compact`
- `contracts/river-crossing.compact`
- `contracts/stone-drop.compact`
- `deployments/shadow-runner.json`
- `deployments/river-crossing.json`
- `deployments/stone-drop.json`

## 2. Which contracts are currently deployed?

**Answer:** The repo has deployment artifacts for all three contracts on the local `undeployed` network:

- `shadow-runner`: `12b2804a3e4b56fca64c89886c28d9086c7a734ed4370fe5d8e5064b4cfa8a56`
- `river-crossing`: `e5f42dadc593d013354011452ec4dd35b76649d0a4c344f381f52b10103c8c6a`
- `stone-drop`: `59341aa430f5a16cdce8a7d94276f834ea259b2554e3bc2c6512e540e866541b`

Reference:
- `deployments/shadow-runner.json`
- `deployments/river-crossing.json`
- `deployments/stone-drop.json`

## 3. Is this using Midnight primitives directly or simulating them?

**Answer:** It uses Midnight SDK packages directly. The root package depends on Midnight contract/runtime/provider/wallet SDK packages, and the deploy/test scripts use those packages to deploy contracts, generate proofs, query indexer state, and submit transactions.

Reference:
- `package.json`
- `src/utils.ts`

## 4. What network is the project configured for?

**Answer:** The backend/test harness is hardcoded to `undeployed`, labeled as `Midnight Local (Undeployed)`. The UI also defaults to `undeployed` unless overridden by `VITE_NETWORK_ID`.

Reference:
- `src/utils.ts`
- `ui/src/services/contracts.ts`

## 5. What external Midnight services does it depend on?

**Answer:** The project expects:

- Indexer HTTP: `http://127.0.0.1:8088/api/v4/graphql` in backend scripts.
- Indexer WS: `ws://127.0.0.1:8088/api/v4/graphql/ws` in backend scripts.
- Node: `http://127.0.0.1:9944`
- Proof server: `http://127.0.0.1:6300`

The UI has similar defaults, but currently points to `api/v3/graphql` unless env vars override it.

Reference:
- `src/utils.ts`
- `ui/src/services/contracts.ts`

## 6. How does wallet integration work in the backend scripts?

**Answer:** The scripts derive keys from a fixed test seed, build a shielded wallet, unshielded wallet, and dust wallet, then wrap them with `WalletFacade`. They also manage wallet sync, DUST registration, and funding from a hardcoded genesis sender when needed.

Reference:
- `src/utils.ts`

## 7. How does `shadow-runner` work at contract level?

**Answer:** `shadow-runner` is a public ledger state contract. It stores:

- `trailScore`
- `weeklyScore`
- `runnerName`
- `totalMissions`
- `currentRank`
- `isRegistered`
- `lastMissionType`
- `adminHash`

It exposes:

- `registerRunner(name, initialRank, adminSecret)`
- `completeMission(missionType, newRank, points, newTrailScore, newWeeklyScore)`
- `resetWeeklyScore(adminSecret)`

Important caveat: `points` is accepted as an argument but is not used to derive the stored scores. The client computes `newTrailScore` and `newWeeklyScore` and passes them in.

Reference:
- `contracts/shadow-runner.compact`

## 8. Does `shadow-runner` validate mission logic on-chain?

**Answer:** Not deeply. It records mission completion metadata and scores, but the contract does not independently verify a transfer, route, timestamp, or amount bounds. The client decides the new totals and rank, then submits them.

This is one of the biggest differences between the narrative docs and the implemented contract.

Reference:
- `contracts/shadow-runner.compact`
- `src/test-shadow-runner.ts`

## 9. How is rank determined?

**Answer:** Rank is a UI/client concept. The UI computes rank from thresholds:

- `0-999`: Seedling
- `1000-4999`: Tracker
- `5000-14999`: Pathfinder
- `15000-39999`: Forest Ghost
- `40000+`: Shadow Runner

The chosen rank string is then passed into `completeMission` and stored on-chain.

Reference:
- `ui/src/services/contracts.ts`
- `contracts/shadow-runner.compact`

## 10. Is runner registration tied cryptographically to a wallet identity?

**Answer:** Not strongly. Registration stores a runner name, rank, and admin secret hash in public ledger state. It does not store or verify a wallet address mapping inside the contract.

The UI later decides whether fetched contract state belongs to the current user by comparing the locally stored runner name with the contract runner name.

Reference:
- `contracts/shadow-runner.compact`
- `ui/src/services/gameState.ts`

## 11. Can multiple users each have independent runner state?

**Answer:** Not with the current `shadow-runner` storage model as written. The contract exports single ledger fields, not a map keyed by wallet or runner id. That means the contract instance behaves like one shared runner record, not a per-user registry.

Reference:
- `contracts/shadow-runner.compact`

## 12. How does `river-crossing` work at contract level?

**Answer:** `river-crossing` is a shielded escrow/swap primitive.

- `createOffer` calls `receiveShielded` to lock the maker coin into the contract.
- `acceptOffer` calls `receiveShielded` for taker funds, then:
  - `sendShielded` releases maker locked coin to taker.
  - `sendImmediateShielded` releases taker coin to maker.
- `cancelOffer` returns the locked maker coin via `sendShielded`.

Public ledger fields track offer metadata and swap completion counters.

Reference:
- `contracts/river-crossing.compact`

## 13. Does `river-crossing` use witness functions?

**Answer:** Yes. It depends on witness callbacks for coin info, pubkeys, and return values:

- `get_offer_coin`
- `get_taker_coin`
- `get_maker_locked_coin`
- `get_maker_pubkey`
- `get_taker_pubkey`
- `get_maker_receive_value`
- `get_taker_receive_value`
- `get_cancel_coin`
- `get_cancel_pubkey`
- `get_cancel_value`

Those witnesses are wired in TypeScript during deployment/tests.

Reference:
- `contracts/river-crossing.compact`
- `src/test-river-crossing.ts`
- `src/deploy-river-crossing.ts`

## 14. Is `river-crossing` fully working end-to-end right now?

**Answer:** Partially.

- `createOffer` has repeated PASS results in `test-results/local-test-log.txt`.
- `cancelOffer` repeatedly fails after that, with several different local-state / Merkle-tree / submission errors.
- The repo includes UI flows for create and accept, but the test evidence does not support claiming stable end-to-end success for the full swap lifecycle.

Reference:
- `src/test-river-crossing.ts`
- `test-results/local-test-log.txt`
- `ui/src/components/RiverMarket.tsx`

## 15. What is the practical state of swap acceptance in the UI?

**Answer:** The UI exposes `acceptSwapOffer`, but the proof/witness-heavy path is much less proven than `createOffer`. The multiplayer server coordinates a match, then the browser tries to submit the contract call through `submitBrowserContractCall`.

Because the tested backend path already struggles on continuation/local-state handling for similar flows, this should be described as implemented but not yet fully production-stable.

Reference:
- `ui/src/components/RiverMarket.tsx`
- `ui/src/services/contractService.ts`
- `test-results/local-test-log.txt`

## 16. How does `stone-drop` work at contract level?

**Answer:** `stone-drop` combines:

- `HistoricMerkleTree<4, Bytes<32>>`
- `Set<Bytes<32>>` for nullifiers
- counters for deposits, claims, and revokes

`deposit`:
- locks a shielded coin with `receiveShielded`
- computes `persistentCommit(secret, randomness)`
- inserts commitment into the tree

`claim`:
- recomputes the commitment
- verifies a Merkle root/path
- computes a nullifier from `secret`
- rejects reuse
- sends the locked asset to recipient with `sendShielded`

`revoke`:
- follows the same proof/nullifier pattern
- returns the locked asset instead

Reference:
- `contracts/stone-drop.compact`

## 17. Is `stone-drop` fully working end-to-end right now?

**Answer:** Also partially.

- `deposit` has repeated PASS results in the test log.
- `claim` repeatedly fails afterward with local-state replay, sparse Merkle index, insufficient funds, unreachable, and submission errors.
- `revoke` exists in the contract and browser service, but the current UI flow only exposes deposit, not claim/revoke.

Reference:
- `src/test-stone-drop.ts`
- `test-results/local-test-log.txt`
- `ui/src/components/MissionExecution.tsx`
- `ui/src/services/contractService.ts`

## 18. Are Ghost Trail and Canopy Split separate contracts?

**Answer:** No. They are mission wrappers built from:

- a real transfer flow
- then a `shadow-runner.completeMission(...)` score write

They do not have dedicated Compact contracts.

Reference:
- `src/test-ghost-trail.ts`
- `src/test-canopy-split.ts`
- `ui/src/services/contractService.ts`

## 19. Are Ghost Trail and Canopy Split working?

**Answer:** Yes, with a very important caveat.

The test log shows PASS results for:

- `ghost-trail.shielded-transfer`
- `ghost-trail.completeMission`
- `canopy-split.multi-output-send`
- `canopy-split.completeMission`

Reference:
- `src/test-ghost-trail.ts`
- `src/test-canopy-split.ts`
- `test-results/local-test-log.txt`

## 20. What is the caveat on Ghost Trail and Canopy Split in the browser app?

**Answer:** In the UI, the transfer step is not submitted directly from the connected Lace wallet. It is sent to the backend endpoint `/api/midnight/shielded-transfer`, and the server performs the transfer using `createWallet(TEST_SEED)`.

So in the current implementation:

- recipient addresses come from the UI
- the actual transfer signer/funder is the backend test wallet
- the score recording still uses the browser wallet contract flow

That is fine for a demo, but it is not the same as a user-owned end-to-end wallet flow.

Reference:
- `ui/src/services/contractService.ts`
- `server/index.ts`
- `src/utils.ts`

## 21. How does the backend transfer endpoint work?

**Answer:** `POST /api/midnight/shielded-transfer`:

- validates recipient shielded addresses and amounts
- creates a wallet from `TEST_SEED`
- ensures the server wallet has enough shielded balance
- builds a shielded transfer transaction with multiple outputs if needed
- finalizes and submits it
- returns `{ txId, transferCount }`

Reference:
- `server/index.ts`

## 22. What multiplayer features are implemented?

**Answer:** The server supports:

- player join/leave
- player movement sync
- leaderboard updates
- narrative events
- P2P swap offer creation
- P2P swap matching
- swap completion notifications
- periodic CHAIN alert state
- swap history persistence to `server/data/swaps.json`

Reference:
- `server/index.ts`
- `ui/src/services/multiplayer.ts`

## 23. Is the multiplayer server the source of truth for swaps?

**Answer:** It is the source of truth for lobby/matchmaking state, not for the asset transfer itself. The server tracks offers and match timeouts in memory and persists completed swap history, but the actual on-chain swap is still supposed to be performed by the Midnight contract transaction.

Reference:
- `server/index.ts`
- `ui/src/components/RiverMarket.tsx`

## 24. How does the browser contract adapter work?

**Answer:** The browser layer uses `submitCallTxAsync` from `@midnight-ntwrk/midnight-js-contracts`, a browser provider adapter around Lace, and an in-memory private state provider.

Flow:

1. Connect to Lace.
2. Create browser providers.
3. Load compiled contract from `contracts/managed/...`.
4. Initialize missing private state.
5. Call `submitCallTxAsync(...)`.
6. Poll the public data provider for finalization.
7. On success, persist the returned next private state in memory.

Reference:
- `ui/src/services/contractService.ts`

## 25. How is browser private state stored?

**Answer:** In memory only. The browser contract service creates an in-memory `PrivateStateProvider`, scoped by contract address and `privateStateId`.

That means browser private state does not survive reloads. This is especially relevant for witness-heavy continuation flows such as `river-crossing.cancelOffer` and `stone-drop.claim/revoke`.

Reference:
- `ui/src/services/contractService.ts`

## 26. Why do some complex flows fail?

**Answer:** The test log points to a combination of issues:

- continuation/local-state replay problems
- sparse Merkle tree index errors
- rehash / prior output replay errors
- insufficient funds during follow-up proofs
- witness serialization mismatches in earlier iterations

This is consistent with the hardest part of Midnight flows: not initial deposits, but correct replay of contract-owned outputs and local/private state across subsequent witness-backed calls.

Reference:
- `src/test-river-crossing.ts`
- `src/test-stone-drop.ts`
- `src/utils.ts`
- `test-results/local-test-log.txt`

## 27. How are compiled contracts loaded?

**Answer:** The backend imports compiled contract modules from `contracts/managed/{contract}/contract/index.js`. The browser uses `import.meta.glob` to bundle and load those same compiled artifacts.

Reference:
- `src/utils.ts`
- `ui/src/services/contractService.ts`

## 28. How are contracts deployed?

**Answer:** Each deploy script:

1. Loads the compiled contract.
2. Creates a wallet from `TEST_SEED`.
3. Waits for sync and unshielded funds.
4. Registers for DUST generation.
5. Calls `deployContract(...)`.
6. Writes a deployment JSON file under `deployments/`.

Witness-heavy contracts use stub witness implementations during deployment because witnesses are only needed at execution time.

Reference:
- `src/deploy-shadow-runner.ts`
- `src/deploy-river-crossing.ts`
- `src/deploy-stone-drop.ts`

## 29. How do state reads work in the UI?

**Answer:** The UI reads public contract state from the Midnight indexer via GraphQL and derives frontend models from that data:

- runner state from `shadow-runner`
- market state from `river-crossing`
- drop counters from `stone-drop`

Reference:
- `ui/src/services/gameState.ts`

## 30. Is the leaderboard truly multi-user and on-chain?

**Answer:** The live leaderboard shown in multiplayer is primarily a server/socket-driven ephemeral leaderboard based on `score_update` events. The on-chain `shadow-runner` contract itself, as currently written, does not support per-player rows inside one contract instance.

So the answer is:

- there is a real on-chain score field
- but the multiplayer leaderboard is not a trustless multi-user on-chain leaderboard yet

Reference:
- `server/index.ts`
- `ui/src/services/multiplayer.ts`
- `contracts/shadow-runner.compact`

## 31. Does the UI support runner registration?

**Answer:** Yes. `RegistrationScreen` calls `contractService.registerRunner(...)`, and on success stores the runner name locally.

Reference:
- `ui/src/components/RegistrationScreen.tsx`
- `ui/src/services/contractService.ts`

## 32. Does the UI support Stone Drop claim and revoke?

**Answer:** Service functions exist for both `claimStoneDrop` and `revokeStoneDrop`, but the mission execution UI currently exposes deposit only. It stores the generated secret and randomness in local storage after deposit, but there is no complete in-app claim/revoke screen wired from that flow.

Reference:
- `ui/src/services/contractService.ts`
- `ui/src/components/MissionExecution.tsx`
- `ui/src/services/storage.ts`

## 33. Does the UI support River Crossing cancel?

**Answer:** There is a service function for `cancelSwapOffer`, but the current `RiverMarket` component does not expose a cancel action in the interface.

Reference:
- `ui/src/services/contractService.ts`
- `ui/src/components/RiverMarket.tsx`

## 34. Is there any persistence beyond the chain?

**Answer:** Yes:

- Browser local storage:
  - runner name
  - stone drop secrets/randomness records
  - tx history
  - wallet address
- Server filesystem:
  - completed swap history JSON
- Backend/private Midnight state:
  - LevelDB private state store for backend scripts

Reference:
- `ui/src/services/storage.ts`
- `server/index.ts`
- `src/utils.ts`

## 35. What is the cleanest way to describe the current maturity of the demo?

**Answer:** A technically accurate summary is:

- `shadow-runner` registration and mission score writes are working.
- Ghost Trail and Canopy Split demo flows are working, but browser transfers currently route through a backend test wallet.
- `river-crossing` and `stone-drop` successfully demonstrate deposit/offer-lock behavior on-chain.
- Continuation flows for witness-heavy contract-owned outputs (`cancel`, `claim`, likely `accept`) are implemented but not yet stable end-to-end.
- Multiplayer coordination and presentation are working, but not all gameplay state is trustless on-chain state.

## 36. If asked “what is the strongest proof that this is real and not mocked?”, what should we say?

**Answer:** The strongest evidence in the repo is:

- real Compact contracts
- real deployment artifacts
- Midnight SDK-backed deploy/test scripts
- repeated PASS logs for:
  - runner registration / mission score writes
  - Ghost Trail private transfer
  - Canopy Split multi-output private transfer
  - Stone Drop deposit
  - River Crossing createOffer

What should not be overstated:

- stable end-to-end success for `stone-drop.claim`
- stable end-to-end success for `river-crossing.cancelOffer`
- user-owned direct browser signing for Ghost Trail/Canopy Split transfer legs

Reference:
- `contracts/*.compact`
- `deployments/*.json`
- `test-results/local-test-log.txt`

## 37. If asked “what are the biggest technical gaps left?”, what should we say?

**Answer:** The main gaps are:

1. Per-user contract state design for `shadow-runner`.
2. Stable witness/local-state continuation for `river-crossing` and `stone-drop`.
3. Moving Ghost Trail / Canopy Split transfer signing from backend test wallet to the connected user wallet.
4. Persistent browser private state instead of in-memory only.
5. Full claim/revoke and cancel UI exposure.
6. Stronger contract-side validation rather than trusting client-computed score totals.

## 38. If asked “what is the architecture in one sentence?”, what should we say?

**Answer:** It is a React/Three.js multiplayer game UI with Socket.IO coordination, a Node backend for matchmaking and demo transfer orchestration, and Midnight Compact contracts plus Midnight SDK services for private transaction and proof-backed contract execution.

Reference:
- `docs/architecture.md`
- `server/index.ts`
- `ui/package.json`
- `src/utils.ts`
