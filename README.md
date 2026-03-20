# Shadow Run

**Shadow Run** is an immersive, gamified private transaction experience built on the **Midnight Network**. It leverages zero-knowledge (ZK) technology and smart contracts to ensure privacy while providing an engaging multiplayer environment. 

Players navigate a dynamic world, managing secure transactions, maintaining anonymity, and interacting with specialized smart contracts designed specifically for the Midnight ecosystem.

## 🌟 Key Features

- **Privacy-First Architecture**: Utilizes Midnight Network's ZK capabilities to keep player interactions and transactions completely shielded.
- **Smart Contract Driven**: Powered by custom Compact smart contracts (`shadow-runner`, `river-crossing`, `stone-drop`) that govern in-game assets and paths.
- **Multiplayer Ready**: Designed to handle real-time states and concurrent interactions gracefully.
- **Seamless Integrations**: Employs `@midnight-ntwrk` SDKs for a robust, secure link between the user interface and the decentralized ledger.
- **Beautiful & Dynamic UI**: A modern React-based interface tailored for immersive gameplay and fluid wallet interactions.

## 📂 Project Structure

```text
shadow-run/
├── contracts/          # Compact smart contracts (game logic, shielded states)
│   ├── managed/        # Auto-generated contract bindings
│   └── *.compact       # Core ZK contracts
├── deployments/        # Managed deploy configurations and artifacts
├── docs/               # Technical specifications and game mechanics design
├── server/             # Backend infrastructure and API layers
├── src/                # Shared utilities and smart contract deployment scripts
├── test-results/       # Automated contract testing outputs
└── ui/                 # React and Vite-powered frontend application
    ├── public/assets/  # Game UI assets, textures, and sprites
    └── src/            # Components, services, and game state management
```

## 🛠 Tech Stack

- **Blockchain Engine**: Midnight Network (Compact, Ledger V8)
- **Frontend**: React, UI Components, Vite
- **Backend & Scripting**: TypeScript, Node.js, TSX
- **Cryptography Implementation**: Web Cryptography API & Midnight SDKs
- **Testing**: Native Midnight proof-server instances
