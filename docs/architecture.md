# System Architecture

Shadow Run's architecture bridges a real-time multiplayer networking layer, a 3D interface, and Midnight Network’s complex zero-knowledge (ZK) infrastructure. 

```
graph TD
    classDef Midnight fill:#1E293B,stroke:#8B5CF6,stroke-width:2px,color:#F8FAFC
    classDef Client fill:#064E3B,stroke:#10B981,stroke-width:2px,color:#F8FAFC
    classDef Server fill:#7C2D12,stroke:#F59E0B,stroke-width:2px,color:#F8FAFC

    subgraph Client [Browser Client Environment]
        UI[React/Three.js Engine]:::Client
        State[Zustand Session DB]:::Client
        WalletSDK[Lace Midnight Facade]:::Client
        
        UI --> |Triggers| WalletSDK
        UI --> |Syncs| State
    end

    subgraph Backend [Multiplayer & Coordination Layer]
        WS[Socket.IO Event Sync]:::Server
        DB[(Swap Matcher Engine)]:::Server
        
        WS --> DB
        UI <-- "P2P Lobby Events" --> WS
    end

    subgraph MidnightProtocol [Midnight Network (Preprod)]
        Proof[Midnight Proof Server]:::Midnight
        Indexer[Midnight Indexer API]:::Midnight
        Ledger[(Dual-State Ledger)]:::Midnight
        
        WalletSDK --> |Tx Data| Proof
        Proof --> |Generates ZK Proof| Ledger
        Indexer --> |Reads Public State| WalletSDK
    end
```

## The Dual-State Requirement
Midnight maintains two parallel ledgers:
1. **Public State:** Contract execution verification, counters, and deterministic outcomes.
2. **Private State:** Encrypted user data held locally that never reaches network nodes.

Shadow Run leverages this perfectly through the **Jungle League Leaderboard**:
- Local clients run a Compact circuit simulating a successful mission (i.e., verifying the recipient address, the amount boundaries, and the timestamp).
- The client generates a ZK proof of this execution.
- The `shadow-runner.compact` smart contract verifies the proof and increments the public `Counter` representing the player's **Trail Score**.
- The public ledger displays `Runner_73A2: 2500 points`. No network node knows *how* or *where* those points were acquired.

## Tech Stack Overview
1. **Frontend:** React 18, Vite, React Three Fiber (Three.js WebGL engine).
2. **Backend Matchmaking:** Express Node server with Socket.IO for ephemeral P2P trade matching (escrow creation/acceptance).
3. **ZK Computation:** `@midnight-ntwrk/midnight-js` SDK running against the local Lace bridge.
4. **Smart Contracts:** Midnight Compact compiling Typescript-like subsets directly into SNARK circuits (`shadow-runner`, `river-crossing`, `stone-drop`).
