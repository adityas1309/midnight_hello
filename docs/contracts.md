# Smart Contract Deep Dive

All application state logic in **Shadow Run** is codified in the specialized ZK language provided by Midnight Network: **Compact**. Currently, we deploy three fully functional Compact contracts to the Preprod environment. 

Below is a detailed analysis of their behaviors and internal state requirements.

## 1. `ShadowRunner.compact`
The state layer of the gaming application. This manages user progression, proving user engagement without revealing user history.

### Core Variables
- `public_state: Counter`: A ledger-level incrementer storing the player's total Trail Score.
- `private_state: RunnerLog`: The user's local instance tracking the sequence, timestamps, and specific transaction metadata of their completed runs.

### Core Methods
- `registerRunner(hash)`: Maps a player to a verifiable identity marker without exposing their Lace shielded address.
- `completeMission(...)`: Updates the Trail Score if the client can supply a valid ZK proof that a `Zswap` transfer natively resolved perfectly.

## 2. `RiverCrossing.compact`
The fundamental decentralized OTC primitive. This removes AMM slippage and MEV vectors out of the trading experience entirely.

### Escrow Mechanics
Instead of pooling liquidity publicly, `river-crossing` relies on Maker and Taker mechanics.
1. The **Maker** initiates a contract state change locking their shielded output against an intent.
2. The **Taker** reads the public intent (from our Express Node indexer) and resolves the contract locally, supplying the inputs for the execution proof. 
3. If the ZK proof proves that the taker's assets match the initial criteria, the contract uses `sendImmediateShielded` to swap both sets of assets securely without moving to public ledgers.
4. **Result:** An atomic P2P exchange indistinguishable from standard networking noise.

## 3. `StoneDrop.compact`
The most advanced commitment primitive, proving single-use cryptographic logic over the Midnight Layer.

### Merkle Integration
`StoneDrop` directly relies upon a `HistoricMerkleTree`. When a commitment is created (`deposit()`), it hashes a `Secret + Randomness` integer into a leaf. 
When the `claim()` is executed, the contract generates a **Nullifier** (the hashed equivalent of just the `Secret`). The contract checks if this Nullifier string is already present in a consumed `Set`. Because ZK operations hide the inputs, the `claim()` proof evaluates the statement: "I possess a secret corresponding to a valid leaf in the tree, and my nullifier is unused." 

Once the proof resolves, the `sendShielded` method releases the locked asset.
