# Mission Systems & Primitives

Every interaction in **Shadow Run** maps a real Midnight Network transaction to an intuitive jungle metaphor. Below are the three core missions, the Midnight network primitives they exercise, and the cryptographic flow for each.

## 1. Ghost Trail (Shielded Transfers)

**The Metaphor:** The runner navigates a dense section of the forest without leaving a footprint.
**The Technical Reality:** A shielded UTXO transfer. This proves Midnight can process private asset movements without publishing source or destination constraints.

### The Flow
```
sequenceDiagram
    participant Player as 🎮 Runner
    participant Lace as 🛡️ Midnight Lace
    participant Contract as 📄 ShadowRunner.compact
    participant Ledger as ⛓️ Dual-State Ledger

    Player->>Lace: Inputs Recipient & Asset Bundle
    Lace->>Lace: Queries Shielded Balance (Off-chain)
    Lace->>Contract: Computes `completeMission(GhostTrail)` locally
    Contract->>Lace: Returns Execution Proof
    Lace->>Ledger: Submits ZK Proof + Network Tx
    Ledger->>Ledger: Verifies ZK Proof (Miner nodes)
    Ledger-->>Player: Tx Success & Asset Moved Privately
    Ledger-->>Player: +150 Public Trail Score
```

---

## 2. River Crossing (P2P Atomic Swaps)

**The Metaphor:** Two runners meet at a rope bridge over the river. They trade what they carry simultaneously, atomically, and anonymously.
**The Technical Reality:** The `Zswap` Atomic Merging protocol using `river-crossing.compact`. 

Unlike a traditional decentralized exchange (DEX), this acts as a trust-minimized Over-The-Counter (OTC) contract. Neither Runner A’s identity nor Runner B’s identity is linked to the transaction outcome.

### The Flow
```
sequenceDiagram
    participant P1 as 🧑‍🎤 Maker (Offer)
    participant Engine as ⚙️ P2P Matchmaker
    participant Contract as 📄 RiverCrossing.compact
    participant P2 as 🦸‍♂️ Taker (Accept)

    %% Setup
    P1->>Contract: `createOffer(wantAsset, giveAsset)`
    Contract-->>P1: Locks Maker Funds (Shielded output) 
    
    %% Matchmaking
    P1->>Engine: Post intent anonymously
    P2->>Engine: Browses River Market
    
    %% Execution
    P2->>Contract: `acceptOffer(OfferID)`
    Contract->>Contract: Validates Asset Match
    Contract-->>P1: Sends `giveAsset` via `sendImmediateShielded`
    Contract-->>P2: Sends Maker's asset via `sendImmediateShielded`
    Note over Contract: Both transfers execute simultaneously in zero-knowledge.
```

---

## 3. Stone Drop (Commitment/Nullifier Private Claims)

**The Metaphor:** A runner carves a secret rune into a mossy stone and hides an asset beneath it. Later, a stranger equipped with only that secret rune can claim it.
**The Technical Reality:** Midnight’s `HistoricMerkleTree` combined with a Cryptographic Nullifier `Set`.

This demonstrates single-use authenticated tokens, proving how a user can receive assets without giving away a static public address or needing on-chain permission lists.

### The Flow
```
sequenceDiagram
    participant A as Runner A (Depositor)
    participant Contract as 📄 StoneDrop.compact
    participant Ledger as ⛓️ MerkleTree
    participant B as Runner B (Claimer)
    
    A->>A: Generates `Secret` & `Randomness` Locally
    A->>Contract: `deposit(persistentCommit(Secret, Randomness))`
    Contract->>Ledger: Insert `Commitment Hash`
    A-->>B: Off-chain sharing of `Secret` (QR, text)
    
    B->>Contract: `claim(Secret)`
    Contract->>Contract: Computes `persistentHash(Secret)` as Nullifier
    Contract->>Ledger: Verifies Secret matches Historic Tree Segment
    Contract->>Contract: Ensures Nullifier != used
    Contract->>Ledger: Adds Nullifier to used `Set`
    Contract-->>B: Unlocks Asssets Privately
```
