# Implementation Status

This page is the code-accurate implementation snapshot for the current repository. It is intentionally conservative: it separates what is fully working from what is partially implemented or still unstable.

## Current Scope

Shadow Run currently consists of:

- Three Compact contracts:
  - `shadow-runner`
  - `river-crossing`
  - `stone-drop`
- A Node/Express + Socket.IO coordination server
- A React + Three.js browser client
- Midnight SDK-based deploy and integration test scripts

## Network and Deployment

The project is currently configured for Midnight local `undeployed` by default.

Deployed contract artifacts present in the repository:

- `shadow-runner`: `12b2804a3e4b56fca64c89886c28d9086c7a734ed4370fe5d8e5064b4cfa8a56`
- `river-crossing`: `e5f42dadc593d013354011452ec4dd35b76649d0a4c344f381f52b10103c8c6a`
- `stone-drop`: `59341aa430f5a16cdce8a7d94276f834ea259b2554e3bc2c6512e540e866541b`

## What Is Working Reliably

### 1. Shadow Runner registration and score writes

`shadow-runner` supports:

- `registerRunner`
- `completeMission`
- `resetWeeklyScore`

The current implementation reliably demonstrates registration and mission-score recording.

### 2. Ghost Trail

Ghost Trail is implemented as:

1. A real shielded transfer
2. A `shadow-runner.completeMission("ghost_trail", ...)` score write

The repository test history shows successful transfer and score-recording runs.

### 3. Canopy Split

Canopy Split is implemented as:

1. A real multi-output shielded transfer
2. A `shadow-runner.completeMission("canopy_split", ...)` score write

The repository test history shows successful transfer and score-recording runs.

### 4. River Crossing offer lock

`river-crossing.createOffer(...)` successfully demonstrates:

- witness-backed shielded coin intake
- contract-side coin locking
- public offer metadata update

### 5. Stone Drop deposit

`stone-drop.deposit(...)` successfully demonstrates:

- witness-backed shielded coin intake
- insertion of a commitment into the on-chain Merkle tree
- incrementing deposit counters

## What Is Implemented but Not Yet Stable

### 1. River Crossing full continuation flow

The contract includes:

- `createOffer`
- `acceptOffer`
- `cancelOffer`

But test evidence currently supports stable success for `createOffer` only. Follow-up calls such as `cancelOffer` still fail with contract-local-state and Merkle replay issues.

### 2. Stone Drop claim / revoke flow

The contract includes:

- `deposit`
- `claim`
- `revoke`

`deposit` is working. `claim` and related continuation paths still show repeated failures in the integration log.

### 3. Browser witness-heavy contract flows

The browser contains service functions for:

- `createSwapOffer`
- `acceptSwapOffer`
- `cancelSwapOffer`
- `depositStoneDrop`
- `claimStoneDrop`
- `revokeStoneDrop`

The service layer is implemented, but continuation-heavy flows are still constrained by in-memory private state and witness/local-state replay complexity.

## Important Demo Caveat

Ghost Trail and Canopy Split currently submit the transfer leg through the backend server, not directly from the connected Lace wallet.

In the current UI:

- the recipient addresses come from the user
- the server endpoint `/api/midnight/shielded-transfer` creates and submits the transfer
- the backend uses a fixed test wallet seed
- score recording still goes through the browser wallet contract flow

This is acceptable for a demo, but it should be described accurately. It is not yet a pure user-wallet-only end-to-end flow.

## Multiplayer Status

The multiplayer layer is implemented and working as a coordination and presentation system:

- player join/leave
- movement sync
- narrative events
- swap matchmaking
- swap completion notifications
- live leaderboard updates

This multiplayer state is server-driven and ephemeral. It should not be described as fully trustless on-chain game state.

## Architecture Reality Check

The repository docs describe a strong vision for privacy-first gameplay on Midnight. The current implementation already proves several real Midnight primitives, but some claims should be scoped carefully:

- Real today:
  - Compact contracts
  - contract deployment
  - score writes
  - private transfers
  - multi-output private transfers
  - escrow/deposit primitives
- Not yet stable end-to-end:
  - continuation spending of prior contract-owned outputs
  - fully user-wallet-owned Ghost Trail / Canopy Split transfer execution
  - multi-user trustless leaderboard semantics in one shared `shadow-runner` instance

## Best One-Line Summary

Shadow Run is a real Midnight-powered gameplay demo with working private transfer and contract-deposit primitives, plus a polished multiplayer UI, while the most complex witness-driven continuation flows are implemented but still being hardened.
