# 🌿 SHADOW RUN
### The First Private Multiplayer Trading Game on Midnight Network
**Full Product Overview — Midnight Assemble Program 2025**

---

## Table of Contents

1. [The Problem](#1-the-problem)
2. [The Solution — What Shadow Run Is](#2-the-solution--what-shadow-run-is)
3. [Why This Is Only Possible on Midnight](#3-why-this-is-only-possible-on-midnight)
4. [What Is Buildable on Preprod Today](#4-what-is-buildable-on-preprod-today)
5. [The Game Story & World](#5-the-game-story--world)
6. [Full Feature Set](#6-full-feature-set)
7. [UI Layer — The Jungle Experience](#7-ui-layer--the-jungle-experience)
8. [Technical Architecture](#8-technical-architecture--midnight-primitives-used)
9. [4-Week MVP Build Plan](#9-4-week-mvp-build-plan)
10. [Startup Path — Post Hackathon](#10-startup-path--post-hackathon)
11. [Hackathon Track Coverage](#11-hackathon-track-coverage)
12. [The One-Line Pitch](#12-the-one-line-pitch)

---

## 1. The Problem

Every DEX, bridge, and crypto exchange today is a boring form. You paste an address, type an amount, click approve, and wait. That is the entire user experience — for a technology that promises to revolutionize finance.

But the deeper problem is this: every single one of these tools is fully transparent. Anyone can see:

- What you swapped, how much, and when
- Your wallet's full transaction history
- Who you traded with
- Your approximate net worth based on on-chain data
- Your trading strategy and asset allocation in real time

This means that every DeFi user today is making financial decisions in a glass house. Whales get front-run. Retail users get targeted. Traders leak strategy. And nobody has any recourse — because transparency is baked into the protocol itself. There is no fix at the app layer.

Meanwhile, every gamified DeFi product that exists (DeFi Land, Aavegotchi, Axie) gamifies the **rewards** — not the transaction itself. The underlying swap is still a boring form. The game is a skin on top of the same broken, exposed infrastructure.

**There is no privacy-native consumer trading experience that is also fun, engaging, and viral. Shadow Run builds exactly that.**

---

## 2. The Solution — What Shadow Run Is

> **Shadow Run is a living jungle adventure game where every real crypto transaction is a mission through the forest. The transaction IS the gameplay. Privacy is the path.**

Players are Runners — explorers navigating a living, breathing jungle network where every trail is a transaction route and every checkpoint is a blockchain proof. Instead of interacting with a boring DEX form, every financial action maps to a real jungle mission: cross a river, navigate a canopy, find a hidden grove — all with real assets moving privately underneath.

Nobody sees your route, your assets, or your trail. Not other players. Not the network. Not even Shadow Run itself. Every move is cryptographically private by default — because it runs entirely on Midnight Network.

**This is not a game with a DeFi layer bolted on. This is a DeFi protocol with a game built around it.** The distinction matters enormously for user retention, virality, and long-term startup value. The jungle is the product. The transactions are the gameplay.

---

## 3. Why This Is Only Possible on Midnight

Shadow Run's core mechanics depend on three Midnight-native primitives that do not exist on any other chain:

### 3.1 Zswap — Native Private Atomic Swaps

Midnight's Zswap protocol (`docs.midnight.network/concepts/zswap`) enables atomic asset swaps that are confidential by default. Unlike Ethereum DEXs where swap amounts, routes, and wallet addresses are fully visible on-chain, Zswap merges transactions using zero-knowledge proofs — meaning the blockchain only sees that a valid swap occurred, never the amounts or parties involved.

This is the technical foundation for Shadow Run's **River Crossing** mission — two runners swap assets atomically, with ZK proof of execution, and zero details exposed to anyone watching the chain.

| Feature | What It Enables in Shadow Run |
|---|---|
| **Confidential amounts** | Trade size never revealed — no front-running possible |
| **Sender/receiver privacy** | Neither runner's wallet is linkable to the trade |
| **Atomic execution** | All-or-nothing — the mission either completes or doesn't |
| **Multi-asset support** | Runners can trade different token types in one mission |
| **ZK proof of correctness** | Verifiable completion without revealing trade details |
| **Non-interactive merging** | Transactions merge off-chain before submission — MEV resistant |

**Doc reference:** `docs.midnight.network/concepts/zswap` | `docs.midnight.network/concepts/how-midnight-works/zswap`

### 3.2 Dual Public/Private State — The Core Privacy Architecture

Midnight maintains two parallel ledger states (`docs.midnight.network/what-is-midnight`):

- **Public state:** Transaction proofs, contract code, verifiable outputs — visible to all network participants
- **Private state:** Encrypted data stored locally by users — never exposed to the network under any circumstances

For Shadow Run, this means: the game leaderboard (public) can prove your rank without ever revealing your wallet activity (private). Your trail score is publicly verifiable. Your actual transaction history is cryptographically hidden. This is architecturally impossible on any transparent chain — not just impractical, but mathematically impossible.

**Doc reference:** `docs.midnight.network/what-is-midnight`

### 3.3 Compact Smart Contracts + ZK Proofs — Mission Verification

Midnight's Compact language (`docs.midnight.network/compact`) compiles TypeScript-like code into zero-knowledge circuits automatically. Developers write familiar logic — Compact generates the ZK proofs. No cryptography expertise required.

For Shadow Run, every mission completion is verified by a Compact contract that:

- Confirms the transaction occurred correctly on-chain
- Verifies mission conditions were met (time limit, amount threshold, sequence order)
- Updates the runner's trail score on the public ledger
- Does all of this without revealing any private inputs to anyone

**Doc reference:** `docs.midnight.network/concepts/how-midnight-works/keeping-data-private` | `docs.midnight.network/concepts/how-midnight-works/smart-contracts`

### 3.4 Commitment/Nullifier Pattern — Single-Use Secret Missions

Midnight's `HistoricMerkleTree` + nullifier `Set` pattern enables single-use authenticated tokens. An asset can be locked with a commitment (hash of a secret), and claimed only by someone who knows the secret — provably, without revealing the secret itself. The nullifier prevents double-claiming.

This powers Shadow Run's **Stone Drop** mission — the most technically sophisticated mission type, and a direct implementation of the same underlying pattern that powers Zswap itself.

**Doc reference:** `docs.midnight.network/concepts/how-midnight-works/keeping-data-private` — commitment/nullifier section

---

## 4. What Is Buildable on Preprod Today

This section is the honest technical scoping. Every feature marked ✅ is buildable using Midnight's current Preprod capabilities — no simulation, no hardcoding, no faking.

| Feature | Midnight Primitive Used | Buildable Today? |
|---|---|---|
| Private token send (Ghost Trail) | Shielded UTXO transfers via Zswap | ✅ Yes |
| P2P Atomic Swap (River Crossing) | Zswap atomic swap + escrow contract | ✅ Yes |
| Token splitting to multiple wallets (Canopy Split) | Multiple private outputs in one transaction | ✅ Yes |
| Trail score per transaction | Compact contract updating public ledger Counter | ✅ Yes |
| ZK-verified mission completion | Compact circuit + ZK proof of transaction | ✅ Yes |
| Private leaderboard (rank visible, route hidden) | Public counter + private state separation | ✅ Yes |
| Custom token issuance (Runner NFTs) | Token types via contract address hash (Zswap) | ✅ Yes |
| Commitment/nullifier single-use tokens (Stone Drop) | HistoricMerkleTree + nullifier Set pattern | ✅ Yes |
| Runner authentication without identity reveal | Hash-based secret key authentication in Compact | ✅ Yes |
| Expedition membership (private group) | MerkleTree authorization pattern | ✅ Yes |
| Multi-step mission sequences (Deep Run) | Sequential Compact contract calls | ✅ Yes |
| Cross-chain bridge (Cardano ↔ Midnight) | Native Cardano bridge — post-mainnet | ⚠️ Post-mainnet |
| External price oracle / AMM pricing | No oracle infrastructure on Preprod yet | ❌ Not yet |

The two non-green features are honest gaps. Shadow Run's MVP does not claim them. The 11 green rows are more than enough to demonstrate a compelling, fully working product that no other team in the hackathon will come close to.

---

## 5. The Game Story & World

### The World of Shadow Run

Deep in the Midnight Forest, every path is a transaction and every tree holds a secret. The forest is alive — roots carry value, rivers carry swaps, and the canopy hides the identity of every Runner who passes through.

Above the forest, CHAIN drones circle — surveillance machines that scan every public blockchain for exposed transactions. On Ethereum, Solana, every transparent chain — every move is visible. CHAIN sees all of it. But in the Midnight Forest, the trees generate zero-knowledge cover. CHAIN can hear the forest. It cannot see inside it.

You are a Runner. You move assets through the forest, complete missions at ancient stone checkpoints, and leave no trail. The deeper you go, the higher your Trail Score. The higher your score, the more the forest reveals to you — new paths, ancient groves, rare runner abilities, and the respect of every other agent in the network.

Other runners are out there too. Some will trade with you at the river market. Some will leave stone drops for you in hidden clearings. Some will run expeditions with you through the densest parts of the canopy. But CHAIN never rests. And the forest rewards only those who move without leaving a trace.

### Runner Rank Progression

| Runner Rank | Trail Score Threshold | Narrative & Unlock |
|---|---|---|
| 🌱 **Seedling** | 0–999 | New to the forest. Learning basic ghost trails and simple river crossings. CHAIN drones barely register your presence. Unlocks: Ghost Trail and River Crossing missions. |
| 🌿 **Tracker** | 1,000–4,999 | You've completed your first canopy run. Your trail score is growing. CHAIN starts watching the northern region. Unlocks: Canopy Split missions and basic expedition access. |
| 🍃 **Pathfinder** | 5,000–14,999 | Mid-tier runner. You navigate multi-step missions — splitting assets, coordinating with other runners through the grove network. CHAIN deploys a regional scanner. Unlocks: Deep Run missions and Stone Drop access. |
| 🌳 **Forest Ghost** | 15,000–39,999 | Elite runner. You've evaded CHAIN's scanner three times. Other runners seek to join your expedition. Unlocks: Full expedition leadership, custom Runner NFT traits activated. |
| 🌑 **Shadow Runner** | 40,000+ | Top of the Ancient Map leaderboard. Your ZK-proven rank is visible to all. Your identity and every trail you've ever run are completely invisible. CHAIN has a region-wide alert — but can never find you. |

### The Factions

**The Runners** — You and your expedition. Moving assets, earning trail scores, staying invisible.

**CHAIN** — The antagonist. Represents public blockchain surveillance. In-game events: CHAIN "high alert" periods where certain mission types earn bonus multipliers for completing successfully under heightened surveillance.

**The Ancients** — Mythical past runners who set the trail records etched into the Hall of Legends stone monument. Their routes are studied, their scores are revered.

**The Merchants** — NPCs at the River Market who post standing swap offers when player liquidity is low, ensuring the market is never empty.

---

## 6. Full Feature Set

### 6.1 Mission Types — The Core Gameplay Loop

Every mission maps a real Midnight transaction to a jungle narrative action. All missions are verified by Compact contracts with ZK proofs. Nothing is simulated.

| Mission Name | Real Transaction | Jungle Narrative | Trail Score Base |
|---|---|---|---|
| **Ghost Trail** | Private token send (shielded UTXO) | Move through the Whispering Grove without disturbing a single leaf. Send assets privately — no footprints on-chain. | 100 pts |
| **River Crossing** | P2P atomic swap via Zswap | Two runners meet at the river bend. They trade what they carry, atomically. Neither leaves a trace on the other's path. | 200 pts |
| **Canopy Split** | Split transfer to 3+ wallets simultaneously | Scatter your assets across three hidden groves simultaneously before CHAIN's drone reaches your position. | 180 pts |
| **Vine Wrap** | Custom token wrap via contract issuance | Transform your asset into a new form using an ancient forest contract. Change its identity — same value, new disguise. | 150 pts |
| **The Deep Run** | Multi-step: split → swap → ghost send in timed sequence | A 3-part expedition through the densest part of the forest. Split at the canopy, cross at the river, ghost-trail to the ancient grove — all within a single sunset. | 500 pts |
| **Stone Drop** | Commitment/nullifier single-use locked asset | Leave an asset at an ancient stone marker. Carve in the moss-secret. Only someone who knows the exact carving can claim it. One-time. Untraceable. | 300 pts |

### 6.2 Mission Modifiers

Each mission has additional conditions that modify the trail score earned:

| Modifier | Condition | Score Effect |
|---|---|---|
| **Silent Crossing** | Zero on-chain metadata correlation | +25% trail score bonus |
| **Sunrise Sprint** | Complete within 50% of time limit | +20% trail score bonus |
| **CHAIN Alert** | Complete during a high-alert event | +40% trail score bonus |
| **Canopy Streak** | 5+ missions completed in same session | +15% cumulative bonus |
| **Deep Forest** | Use a route through the hardest terrain tier | +30% trail score bonus |
| **Failed Mission** | Transaction fails or times out | 0 pts — assets returned, no penalty |

### 6.3 Trail Score System

Every mission earns a **Trail Score** — a ZK-verified number stored as a public `Counter` in a Compact contract that proves your performance without revealing your route, amounts, or transaction history.

**How scoring works:**
- Base score is earned for every completed mission
- Modifiers stack multiplicatively
- Score is stored publicly on Midnight's ledger — verifiable by anyone
- The private inputs that generated the score are stored locally — never on-chain
- This asymmetry (public score, private proof) is architecturally only possible on Midnight

**Weekly season:** Trail scores reset every 7 days. Cumulative all-time score is also tracked separately for the Hall of Legends.

**Doc reference:** `docs.midnight.network/concepts/how-midnight-works/smart-contracts` — public Counter pattern

### 6.4 Jungle League — ZK Weekly Leaderboard

Every week is a new season. Top runners by trail score win token rewards. Rankings are publicly verifiable. Individual routes are permanently invisible.

- Weekly reset — new season every Sunday at midnight UTC
- Top 10 runners featured on the Ancient Map monument
- Each rank is ZK-proven: a cryptographic badge confirming the score is real and Midnight-verified
- Rewards distributed automatically via Compact contract at season end — no manual intervention
- Hall of Legends: All-time top Shadow Runners preserved permanently on Midnight's public ledger
- Season history: Past seasons archived and viewable — showing rank evolution over time

### 6.5 Runner NFTs — Equippable Characters with Real Protocol Bonuses

Runner NFTs are custom tokens issued via Midnight's contract-based token type system (`docs.midnight.network/concepts/how-midnight-works/zswap` — token types section). Each character is a unique forest explorer with traits that provide real in-game mechanics — not just cosmetics.

| NFT Rarity | Trait Name | Real In-Game Effect |
|---|---|---|
| Common 🌱 | **Moss Cloak** | +15% trail score on Ghost Trail missions |
| Common 🌱 | **Light Step** | -10% time penalty on all missions |
| Uncommon 🍃 | **Swift Vine** | -20% time penalty on Deep Run chains |
| Uncommon 🍃 | **Stone Keeper** | Stone Drop missions earn double trail points |
| Rare 🌳 | **River Whisperer** | River Crossing P2P matches found 30% faster |
| Rare 🌳 | **Canopy Eyes** | +40% score multiplier during CHAIN high-alert events |
| Legendary 🌑 | **Ancient Root** | All mission types earn +10% permanently + unique visual trail effect |

Runner NFTs are tradeable between players via Shadow Run's own **River Crossing** P2P swap — meaning the NFT marketplace is itself a live Shadow Run mission. Buying and selling an NFT earns trail score.

### 6.6 Expedition System — Cooperative Missions

Runners form **Expeditions** — private groups that coordinate on multi-step Deep Run missions together. Groups of 2–5 runners.

**How expeditions work:**
- Expedition state is stored on Midnight's public ledger — membership list stored as commitments in a `MerkleTree`
- Expedition members can see each other's active missions — outsiders see nothing
- Cooperative Deep Runs: all expedition members must complete their assigned leg within the time window to unlock the ancient grove reward
- Expedition trail score: aggregate of all member scores — published weekly as a team on the Ancient Map
- Expedition identity is private: members are ZK-proven participants without any wallet address revealed
- Expedition leader can add/remove members using Merkle tree insert/revoke pattern

**Doc reference:** `docs.midnight.network/concepts/how-midnight-works/keeping-data-private` — MerkleTree authorization pattern

### 6.7 Stone Drop — The Commitment/Nullifier Mission (Deep Technical Detail)

The most technically sophisticated mission type. Built directly on Midnight's commitment/nullifier pattern — the same cryptographic foundation underlying Zswap itself.

**Full flow:**
1. Runner A decides to leave a Stone Drop at a chosen location on the Ancient Map
2. Runner A chooses a secret phrase (the "moss carving") — this stays completely local
3. Runner A calls `deposit()` on `StoneDrop.compact` with a **commitment** = `persistentCommit(secret, randomness)` — only the hash goes on-chain
4. The drop appears on the map as a glowing stone marker — visible to all, claimable by none without the secret
5. Runner A shares the secret with Runner B through any off-chain channel (message, QR code, word of mouth)
6. Runner B calls `claim()` — the Compact contract generates a ZK proof that Runner B knows the secret matching the commitment, **without revealing the secret itself**
7. A **nullifier** = `persistentHash(secret)` is added to an on-chain `Set` — preventing any future claims
8. Assets transfer to Runner B. Both runners earn trail score. Neither runner's identity or the asset amount appears on-chain.

**Why this is powerful:** Neither the amount, nor Runner A's identity, nor Runner B's identity, nor the secret itself is ever exposed. The chain only records that a valid claim was made against a commitment. CHAIN sees nothing actionable.

---

## 7. UI Layer — The Jungle Experience

Shadow Run's UI is built around a **light, organic forest aesthetic** — the visual language of Temple Run meets the strategic depth of a trading game. Warm greens, earthy browns, dappled sunlight filtering through canopy, hand-drawn map elements, and living forest animations.

**Design principles:**
- Light theme — warm parchment background, soft leaf greens, earth tones
- No dark terminals, no neon, no cyberpunk grids
- Hand-drawn illustration style — not flat UI, not 3D render
- Every DeFi concept is given a forest metaphor — no crypto jargon visible to the user
- The jungle is alive — wind, light, weather, ambient sound all respond to game state

### 7.1 The Ancient Map — Home Screen

The primary interface. A top-down illustrated jungle map — hand-drawn parchment style, warm cream background with aged edges. Mission locations are glowing stone checkpoints scattered across forest clearings, river bends, rope bridges, and dense canopy sections.

**Layout:**

**Top bar:**
- Runner's chosen pseudonym in carved-wood typography
- Rank leaf badge (Seedling 🌱 → Shadow Runner 🌑) with rank name
- Trail score in golden numerals with a small leaf icon
- Weekly leaderboard position: "🏆 #4 this season"
- Season timer: a burning torch showing days remaining

**Map center — The Living Forest:**
- Illustrated jungle paths connecting mission nodes
- Active mission checkpoints glow soft bioluminescent green
- Completed checkpoints show a small moss-covered stone marker with your trail score etched in
- Locked missions (above your rank) are shrouded in vine shadow with a lock icon
- Rivers, canopy sections, rope bridges, stone ruins visible across the terrain
- CHAIN alert zones pulse red when a high-alert event is active — bonus multiplier shown

**Left panel — Expedition Board:**
- Active expedition missions your group is currently running
- Each co-op run shows a group icon, mission name, how many legs are complete, time remaining
- "Join Expedition" button for open invitations from other runners

**Right panel — Stone Drops Waiting:**
- Incoming drops left for you by other runners — shown as pulsing stone markers
- Each shows: time since drop was left, which region of the forest, no other details
- Tap to open claiming flow

**Bottom feed — Trail Activity:**
- Scrolling log: "Ghost Trail complete — +120 Trail Points" / "River Crossing matched — +240 Trail Points"
- Zero transaction data shown — only mission type and score delta
- Expedition activity shown when co-op missions complete

**Weather and time system:**
- Real-time day/night cycle based on UTC time
- Weather changes the map visually — morning mist, golden hour canopy glow, night forest with fireflies
- Each time period affects mission modifiers: Dawn missions earn Sunrise Sprint bonus, Night missions earn Shadow Veil bonus
- Rain events: temporary CHAIN interference — all missions earn +15% during rain

**Ambient design:**
- Rustling leaves, distant river, bird calls — ambient sound layer
- Wind direction changes with game events
- Canopy sways when CHAIN drones pass overhead

### 7.2 Mission Card — The Jungle Briefing

When a runner taps a mission node on the Ancient Map, a mission card slides up from the bottom — styled as a weathered parchment scroll with hand-drawn illustrations of the specific mission terrain.

**Card layout (using Ghost Trail as example):**

**Top section:**
- Full-width hand-drawn illustration: a runner's silhouette disappearing into forest fog between ancient trees
- Mission type icon: 👣 Ghost Trail

**Mission name:** Carved-stone typography
> "Ghost Trail — Silent Crossing"

**Flavour text (italic, earthy tone):**
> *"Move through the Whispering Grove without disturbing a single leaf. Leave no trace on the ancient paths. CHAIN drones are scanning the northern canopy — they cannot see what they cannot find."*

**Mission details row:**
- 🌿 Trail reward: estimated points (glowing gold number)
- ⏳ Time limit: forest timer (vine withering left to right)
- 🍃 Difficulty: leaf icons (1 = Calm Grove, 5 = Storm Run)
- ⚡ Active modifiers: any bonus conditions currently active

**Risk disclosure (always shown, styled as stone inscription):**
> *"If the mission fails: trail score unchanged. Your assets return to the grove. No loss."*

**Bottom buttons:**
- Primary (carved stone, dark green): **"Enter the Forest"** — begins the mission
- Secondary (parchment, outlined): **"Read the Stones"** — expands full technical details for advanced runners

**River Crossing card (P2P Swap) additional elements:**
- "Runners at the river right now: 3 offers available" — live count
- Preview of best available swap ratio
- Estimated match time based on current liquidity

**Stone Drop card additional elements:**
- Option to create a new drop OR claim an existing one
- If claiming: field to enter the moss-carved secret received from another runner

### 7.3 Mission Execution — The Run

Once a runner accepts a mission, the Ancient Map zooms into the specific trail section and the full execution flow begins. This is the most immersive screen in Shadow Run — Temple Run visual language, but each obstacle is a real on-chain step.

**Stage 1 — Into the Forest (Briefing & Confirmation)**
- Map camera zooms into the mission trail section with a smooth pan animation
- A stone tablet rises from the forest floor with the full mission objective
- Terrain preview: the specific path the runner will take — illustrated as a route through the forest
- Runner taps **"Begin the Run"** — the path opens and vines part

**Stage 2 — The Trail Setup (Transaction Configuration)**
- The runner moves through a stylised jungle corridor in the foreground
- At a forest clearing, a carved wooden post appears with the transaction inputs
- Inputs are styled as forest coordinates — not DeFi forms:
  - *Destination Grove:* (recipient address — shown as a forest coordinate, not a hex string)
  - *Asset Bundle:* (amount — shown as "bundles of forest stones")
  - *Route:* (auto-selected private route through Midnight's Zswap)
- ZK proof generation is animated as **tree roots spreading underground** from the runner's feet
- Text overlay: *"The forest is hiding your trail... roots are spreading..."*
- Progress: roots reach a glowing underground node = proof generated

**Stage 3 — The Crossing (Transaction Execution)**
- Real-time jungle animation mapped to actual blockchain confirmation steps:
  - Ghost Trail: runner disappears between trees, reappears in target grove
  - River Crossing: two runners cross a rope bridge simultaneously from opposite ends, meet in the middle, exchange bundles, continue to opposite sides
  - Canopy Split: runner throws three seed pods in different directions, each travels to a different grove
  - Stone Drop: runner carves a marking into a stone, locks a bundle beneath it, steps away
- Progress bar: a vine growing across the bottom of the screen
- Each confirmed block = vine grows one segment
- CHAIN drone sweep visible in the sky — but the forest canopy blocks the view

**Stage 4 — The Clearing (Mission Complete)**
- Runner emerges into a sun-drenched clearing
- Ancient stone tablet rises: **MISSION COMPLETE** in carved typography
- Trail score earned shown in large glowing gold: **+240 Trail Points**
- Modifier bonuses listed below (Silent Crossing +60, Sunrise Sprint +48)
- Rank update shown if threshold was crossed: leaf badge upgrades with animation
- Runner NFT drop: if earned, a glowing seed pod falls from the canopy, cracks open, new character revealed
- Season rank update: "You moved from #8 to #5 this week"
- **Zero transaction data shown anywhere on this screen — only the score and outcome**

**Mission Failure Screen:**
- Dark forest, rain begins
- Stone tablet: **MISSION INCOMPLETE — The trail was lost**
- Assets shown returning to runner's grove (confirmed)
- Encouragement: *"The forest remembers every runner who tried. Return at sunrise."*

### 7.4 River Market — P2P Swap Interface

The atomic swap interface — styled as a busy riverside trading post where runners exchange goods anonymously. Wooden market stalls, handwritten offer boards nailed to bark, baskets of goods on rough-hewn tables. No seller names visible anywhere.

**Layout:**

**Market Header:**
- Location: "The River Bend Market — Whispering River, Eastern Trail"
- Active runners at market: "12 runners trading right now"
- Your current bundles: shows your available assets as illustrated pouches

**Offer Board — The Cork Wall:**
- Large corkboard covered in handwritten trade notes pinned to bark with wooden pins
- Each offer card is a hand-illustrated trade note:
  - Asset icon + amount (illustrated as pouches, not numbers)
  - Exchange ratio: "Offering River Crystals for Forest Stones — ratio 2:1"
  - Time remaining: burning candle icon showing time before offer expires
  - Stealth rating of the last runner who posted this type of offer (anonymous)
  - No wallet address. No runner identity.
- Offers sorted by: Best Ratio / Freshest / Fastest Match

**Match Flow:**
1. Runner taps an offer card — it highlights with a green border
2. Preview overlay: "You give: [X]. You receive: [Y]. Route: Hidden."
3. Runner confirms — **"Cross the River"** button
4. River Crossing mission executes immediately with the rope-bridge animation
5. Post-completion: Silent Crossing badge shown if stealth criteria met

**Post Your Own Offer:**
- Button: **"Carve Your Offer"**
- Styled as carving a message into a wooden board: set your asset bundle, desired exchange, expiry time
- Your offer appears on the corkboard for other runners — anonymously

**Liquidity Mechanics:**
- If no human offers available: Merchant NPCs maintain standing offers at wider ratios
- This ensures the market is never empty and missions never fail due to lack of counterparties
- NPC offers are clearly marked as "Forest Merchant" with a trader avatar — distinguishable from runner offers

**Privacy note (shown subtly at bottom of screen):**
> *"The river remembers no names. Only the forest knows a crossing happened."*

### 7.5 Runner's Journal — Agent Profile

The runner's personal private record — styled as a hand-drawn expedition journal with sketched maps, pressed leaves, and handwritten notes. Visible only to the runner. Never synced to any server.

**Journal Cover:**
- Runner's chosen pseudonym embossed on a leather cover
- Rank badge leaf pressed onto the cover
- Total trail score embossed in gold on the spine

**Page 1 — The Runner:**
- Full illustrated portrait of the runner's equipped NFT character
- Character name, rarity tier, all active traits listed with effect values
- Swap NFT button — opens the NFT River Market

**Page 2 — The Trail Log:**
- Hand-drawn timeline of completed missions as a winding path through forest sketches
- Each mission marked as a stone on the path with: mission type icon, difficulty leaf rating, trail points earned
- No amounts. No addresses. Only mission outcomes.
- Filter by mission type, time period, expedition vs solo

**Page 3 — Expedition Notes:**
- Current expedition: name, members shown as forest silhouettes (no identities)
- Active co-op runs: which leg you are responsible for, time remaining
- Past expeditions: results and collective trail score earned
- Invite link: a QR code carved in bark — share with other runners to join your expedition

**Page 4 — Stone Drop Map:**
- Personal treasure map showing:
  - Red X marks: drops you have left for others (pending/claimed status)
  - Green leaf marks: drops waiting for you to claim (with hint of which region)
  - Gold star marks: drops you have successfully claimed in the past
- No amounts or identities shown on this page

**Page 5 — Personal Bests:**
- Fastest Deep Run time
- Longest mission streak
- Highest single-mission trail score
- Total missions per type (Ghost Trail: 47, River Crossing: 23, etc.)
- Rarest Runner NFT collected
- Best season rank achieved

### 7.6 Ancient Map Monument — Jungle League Leaderboard

The public leaderboard — the only fully public screen in all of Shadow Run. Styled as a clearing in the deepest part of the forest where an ancient stone monument stands, with runner names carved in descending order.

**Layout:**

**The Monument:**
- Tall carved stone pillar in the center of a jungle clearing
- Sunlight filters through the canopy onto the monument
- Top 10 runner names carved into the stone face in gold lettering
- Names are pseudonyms only — never wallet addresses, never real identities
- Beside each name: a glowing leaf seal = ZK proof badge (confirmed on Midnight's public ledger)
- Trail score bar: a carved horizontal groove showing relative score — wider groove = more points

**Season Status:**
- Sundial in the clearing showing days remaining in current season
- Reward seed pods shown at the top: what top 3 runners receive when the season ends
- Current rewards pool growing in real time as more missions are completed

**ZK Proof Badge (the critical detail):**
- Each runner's name has a small leaf icon that pulses
- Hovering shows: *"This score is ZK-verified on Midnight Network — cryptographic proof that this rank is real and has not been manipulated"*
- The proof is publicly readable on the Midnight ledger
- The transaction history that generated it is permanently private

**Hall of Legends:**
- Below the active season monument, ancient stone tablets lie half-buried in moss
- All-time top Shadow Runners carved permanently — dates, pseudonyms, peak trail scores
- These records are written to Midnight's public ledger and cannot be altered or removed
- New legends are carved in a ceremony animation when a runner breaks an all-time record

**Expedition Rankings:**
- Separate stone tablet for expedition collective scores
- Top 5 expeditions per season shown
- Same ZK-verified badge system

---

## 8. Technical Architecture — Midnight Primitives Used

### 8.1 The Three Core Compact Contracts

| Contract | Purpose | Key Functions | Midnight Primitives |
|---|---|---|---|
| **ShadowRunner.compact** | Runner state management | `createRunner()`, `completeMission()`, `updateRank()`, `getRank()` | Public `Counter` for trail score, private state for history, hash-based auth |
| **RiverCrossing.compact** | P2P atomic swap escrow | `createOffer()`, `acceptOffer()`, `executeSwap()`, `cancelOffer()`, `expireOffer()` | Zswap atomic merge, shielded UTXO inputs/outputs |
| **StoneDrop.compact** | Commitment/nullifier drops | `deposit()`, `claim()`, `revoke()` | `persistentCommit()`, `HistoricMerkleTree`, nullifier `Set` |

All three contracts use Midnight's dual-state model: public counters and verifiable proofs on the public ledger, private inputs and secrets stored locally by the user — never touching any server.

### 8.2 Data Flow — How a Ghost Trail Mission Works End to End

1. Runner opens Ghost Trail mission card in the Ancient Map
2. Runner enters destination grove (recipient address) and asset bundle (amount) — locally
3. Compact circuit runs locally: generates ZK proof that "a valid private transfer of this structure was authorised"
4. Proof + public outputs submitted to Midnight Preprod via Web3 SDK (`docs.midnight.network/concepts/web3`)
5. Midnight validators verify the ZK proof — they confirm correctness without seeing amounts or addresses
6. Public ledger updates: transaction hash recorded, runner's trail score Counter incremented
7. Private ledger updates locally: runner's mission history, private balance updated on their device
8. Game UI shows: Mission Complete + trail points. Zero transaction detail.

### 8.3 Full Midnight Doc Reference Map

| Shadow Run Feature | Midnight Documentation to Study |
|---|---|
| Private token transfers (Ghost Trail) | `docs.midnight.network/concepts/zswap` — shielded UTXO outputs |
| P2P atomic swap escrow (River Crossing) | `docs.midnight.network/concepts/zswap` — atomic swap merging + offer system |
| Trail score public counter | `docs.midnight.network/concepts/how-midnight-works/smart-contracts` |
| ZK mission verification | `docs.midnight.network/concepts/how-midnight-works/keeping-data-private` |
| Stone Drop commitment pattern | `keeping-data-private` — commitment/nullifier section specifically |
| Runner auth without identity reveal | `keeping-data-private` — authenticating with hashes section |
| Expedition membership (private set) | `keeping-data-private` — MerkleTree authorization pattern |
| Custom token — Runner NFTs | `docs.midnight.network/concepts/how-midnight-works/zswap` — token types section |
| Building all Compact contracts | `docs.midnight.network/compact` |
| DApp + wallet integration (UI) | `docs.midnight.network/concepts/web3` |
| Example: counter pattern for trail score | `docs.midnight.network/examples/dapps/counter` |
| Example: state + auth patterns | `docs.midnight.network/examples/dapps/bboard` |
| Ledger dual-state architecture | `docs.midnight.network/concepts/ledgers` |
| UTXO model for token management | `docs.midnight.network/concepts/utxo` |
| Kachina proving system | `docs.midnight.network/concepts/kachina` |

### 8.4 Frontend Tech Stack

| Layer | Technology |
|---|---|
| Game UI | React + TypeScript |
| Jungle map & animations | Canvas API or Pixi.js (2D WebGL) |
| Wallet connection | Midnight Web3 SDK + Lace wallet connector |
| Contract interaction | `@midnight-ntwrk/midnight-js` SDK |
| State management | Local state (private) + Midnight public ledger (public) |
| Styling | Tailwind CSS with custom jungle design tokens |

---

## 9. 4-Week MVP Build Plan

| Week | What Gets Built | Doc References |
|---|---|---|
| **Week 1** | `ShadowRunner.compact` — trail score counter, runner auth via hash-based secret key, public/private state setup. Hello World familiarity fully established. Ancient Map wireframe sketched in Figma. | `getting-started`, `examples/dapps/counter`, `keeping-data-private` (auth section) |
| **Week 2** | `RiverCrossing.compact` — P2P atomic swap escrow using Zswap primitives. Ancient Map home screen UI with jungle art assets. Ghost Trail mission fully playable end-to-end on Preprod. | `concepts/zswap`, `concepts/web3`, `compact` |
| **Week 3** | `StoneDrop.compact` — commitment/nullifier pattern implementation. River Market UI with offer board. Runner's Journal profile screen. At least 3 mission types working end-to-end. | `keeping-data-private` (commitment section), `concepts/utxo` |
| **Week 4** | Jungle League leaderboard with ZK-verified stone monument UI. Expedition system basics (MerkleTree membership). Runner NFT custom tokens. Full demo polish. All mission types playable. Presentation-ready. | `keeping-data-private` (MerkleTree section), `zswap` (token types) |

**What judges see at demo:** A fully styled living jungle game running on Midnight Preprod. Real private transactions executing as jungle missions. Real ZK proofs verifying mission completions. Real leaderboard with ZK-proven ranks. A complete world — not a prototype form, not a mock UI, not a simulated blockchain.

---

## 10. Startup Path — Post Hackathon

| Revenue Stream | How It Works | Scale Potential |
|---|---|---|
| **Protocol fee** | 0.1–0.3% on every River Crossing swap routed through `RiverCrossing.compact` | Scales with transaction volume — no cap |
| **Runner NFT sales** | Season-exclusive characters + limited legendary drops — sold via Shadow Run's own private marketplace | One-time + secondary market royalties |
| **Expedition subscriptions** | Premium expedition features: larger groups, advanced co-op mission types, priority CHAIN alert notifications — monthly fee | Recurring SaaS revenue |
| **Shadow Run SDK** | Other game developers license the private transaction mission framework — integrate jungle-themed private DeFi into their games | B2B licensing, long-term moat |
| **Season pass** | Cosmetic upgrades: trail skins, canopy effects, exclusive mission narrative chains, enhanced monument visibility | Consumer subscription model |
| **Midnight Grant** | Shadow Run is exactly what Midnight's Startup Request Program is looking for — first consumer DeFi product on the network | Non-dilutive funding |

**Long-term vision:** Shadow Run becomes the consumer front-end for all of Midnight's DeFi ecosystem — the fun, viral, privacy-native interface that onboards millions of users to zero-knowledge finance without them needing to understand a single cryptographic concept. The jungle is the product. Midnight is the engine.

---

## 11. Hackathon Track Coverage

| Track | Why Shadow Run Wins It |
|---|---|
| **🎮 Gaming & Consumer** | It is a living jungle game — the most playable, most memorable, most viral project in the room. Judges will remember the forest long after every other demo. No other team will have a working game with real transactions on Midnight. |
| **💰 Finance & DeFi** | Every mission is a real DeFi primitive — private swap, atomic exchange, token issuance, multi-output split. Built directly on Zswap, Midnight's own native DeFi layer. Not a wrapper. Not a UI. The protocol itself. |
| **🆔 Identity & Governance** | Runner identity is ZK-proven. Trail rank is publicly verifiable without wallet exposure. Expedition membership uses Merkle tree authorization. Hall of Legends is permanent on-chain identity — pseudonymous but verified. |
| **🤖 AI Track** | Optional Week 4 extension: AI-generated mission narrative text based on real on-chain game state. Different flavour text for every player based on their runner rank, recent missions, and current CHAIN alert status. Pure frontend addition — no additional contracts needed. |

**Key advantage:** Shadow Run is the only project in the hackathon that can legitimately claim all four tracks. Judges evaluating any single track will still encounter a project built for all four.

---

## 12. The One-Line Pitch

> *"Every DEX gamifies the rewards. We gamified the transaction itself. Shadow Run is a living jungle adventure where every private swap, split, and ghost send is a mission — your trail score is ZK-proven on Midnight, and nobody, not even CHAIN, can trace your path through the forest."*

---

## Appendix A — Why Shadow Run Beats Every Other Possible Entry

| What Other Teams Build | What Shadow Run Is |
|---|---|
| Another KYC / identity wallet | A game millions of people want to play |
| Another private voting system | A DeFi protocol disguised as entertainment |
| Another ZK credential tool | The first consumer face of Midnight's entire DeFi ecosystem |
| Another DEX interface | The transaction IS the game — not a skin on top |
| A technically correct but boring demo | The most visually memorable project in the room |

---

## Appendix B — Glossary (For Non-Crypto Judges)

| Shadow Run Term | What It Actually Means |
|---|---|
| Ghost Trail | A private token transfer — sending assets with no trace |
| River Crossing | A peer-to-peer atomic swap — two parties exchange assets simultaneously |
| Canopy Split | Sending assets to multiple destinations in one transaction |
| Stone Drop | A commitment/nullifier locked asset — claimable only with a secret |
| Trail Score | ZK-verified performance score stored publicly on Midnight's blockchain |
| ZK Proof | Mathematical proof that an action occurred correctly, without revealing the details |
| Expedition | A private group of runners coordinating on cooperative missions |
| CHAIN | The in-game antagonist — represents blockchain surveillance on public networks |
| Runner NFT | A custom token with real in-game utility, tradeable between players |
| Ancient Map Monument | The public leaderboard — the only fully visible screen in the game |

---

*Built on Midnight Network — Privacy by Default*
*docs.midnight.network*

🌿 *The forest remembers no names. Only the trail score is eternal.* 🌿
