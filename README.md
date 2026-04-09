# PacificaPilot 🤖⛓️

> **An autonomous AI trading agent for Pacifica Perpetual Futures with immutable on-chain decision logging via HashKey Chain — powered by Gemini AI and Elfa social intelligence.**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11+-green.svg)](https://python.org)
[![Node](https://img.shields.io/badge/node-18+-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/react-19-blue.svg)](https://react.dev)
[![Track](https://img.shields.io/badge/track-AI%20%C3%97%20DeFi-orange.svg)]()
[![HashKey](https://img.shields.io/badge/HashKey%20Chain-Horizon%20Hackathon%202026-purple.svg)]()

**🏆 HashKey Chain On-Chain Horizon Hackathon** — AI × DeFi Track  
**🏆 Pacifica Hackathon** — Trading Applications & Bots · Most Innovative Use of Pacifica

---

## 🎥 Demo

| Resource | Link |
|----------|------|
| **Live Dashboard** | [pacificia-trading-bot.vercel.app](https://pacificia-trading-bot.vercel.app) |
| **Backend API** | [pacificia-trading-bot.onrender.com](https://pacificia-trading-bot.onrender.com) |
| **Demo Video** | [https://youtu.be/fC0dN6DwH4k](https://youtu.be/fC0dN6DwH4k) |
| **HashKey Chain Contract** | [`0xEe39002BF9783DB5dac224Df968D0e3c5CE39a2B`](https://testnet-explorer.hsk.xyz/address/0xEe39002BF9783DB5dac224Df968D0e3c5CE39a2B) |
| **Block Explorer** | [testnet-explorer.hsk.xyz](https://testnet-explorer.hsk.xyz/address/0xEe39002BF9783DB5dac224Df968D0e3c5CE39a2B) |

---

## The Problem

AI trading bots are a black box. They execute trades silently, log decisions to private databases, and offer no way for users — or anyone else — to verify what the AI actually decided, or why. When things go wrong, there is no audit trail.

At the same time, most retail traders on perpetual futures DEXs lack the tooling to process social signals, monitor funding rates, and execute decisions at institutional speed. Existing bots either require handing over your private keys to a third party, or operate on price data alone.

**PacificaPilot solves both problems.** It is a fully autonomous, non-custodial AI trading agent that:
1. Combines on-chain market data, Gemini AI reasoning, and Elfa social sentiment to trade Pacifica perpetuals
2. Logs every AI decision permanently and verifiably on **HashKey Chain** — creating a tamper-proof, public audit trail of what the AI decided, why, and at what confidence

---

## What It Does

PacificaPilot runs a continuous decision loop for each symbol you configure:

1. **Fetches live market data** from Pacifica — mark price, RSI (5m + 1h), funding rate, basis spread
2. **Pulls social sentiment** from Elfa AI — token mention counts, engagement scores, trending rank
3. **Sends everything to Gemini 2.5 Flash** — AI reasons across all signals and returns LONG / SHORT / HOLD with confidence score and plain-English reasoning
4. **Executes the trade** on Pacifica if confidence clears your threshold
5. **Logs the decision on-chain** to the HashKey Chain `TradeLogger` contract — immutably and publicly
6. **Monitors open positions** with trailing stop-loss and take-profit, closes when triggered, logs realized PnL
7. **Streams all activity** to a live React dashboard — every decision, every trade, every log line, verifiable on-chain

---

## Why It's Different

| Feature | PacificaPilot | Typical Trading Bot |
|---------|--------------|---------------------|
| AI Reasoning Engine | ✅ Gemini 2.5 Flash | ❌ Rule-based only |
| On-Chain Audit Trail | ✅ HashKey Chain — every decision logged | ❌ Private DB only |
| Social Sentiment Layer | ✅ Elfa AI integration | ❌ Price data only |
| Non-custodial by design | ✅ Keys never leave your machine | ❌ Often requires key upload |
| Transparent AI Reasoning | ✅ Publicly verifiable on-chain | ❌ Black box |
| Live PnL Dashboard | ✅ Real-time unrealized + realized PnL | ❌ Terminal output or none |
| Dry Run / Paper Mode | ✅ Default ON | ⚠️ Rarely included |
| Resilient Fallback | ✅ Binance kline circuit breaker | ❌ Fails silently |

---

## HashKey Chain Integration

### Deployed Contract

| Property | Value |
|----------|-------|
| **Contract** | `TradeLogger` |
| **Network** | HashKey Chain Testnet |
| **Address** | [`0xEe39002BF9783DB5dac224Df968D0e3c5CE39a2B`](https://testnet-explorer.hsk.xyz/address/0xEe39002BF9783DB5dac224Df968D0e3c5CE39a2B) |
| **Explorer** | [testnet-explorer.hsk.xyz](https://testnet-explorer.hsk.xyz/address/0xEe39002BF9783DB5dac224Df968D0e3c5CE39a2B) |

### What Gets Logged On-Chain

Every AI trading decision is stored permanently with:

| Field | Type | Description |
|-------|------|-------------|
| `symbol` | string | e.g. "BTC", "ETH" |
| `action` | string | "LONG", "SHORT", "HOLD", or "EXIT" |
| `price` | uint256 | Mark price × 1e6 |
| `pnlUsdc` | int256 | Realized PnL × 1e6 |
| `confidence` | uint8 | AI confidence 0–100 |
| `rsi5m` | int16 | RSI 5-minute × 100 |
| `rsi1h` | int16 | RSI 1-hour × 100 |
| `reasoning` | string | Gemini's plain-English explanation |
| `dryRun` | bool | true = paper trade, false = live |

### On-Chain Audit Flow

```
AGENT (Python)
  Every 5 min per symbol:
  1. Fetch Pacifica market data
  2. Fetch Elfa AI sentiment
  3. Gemini 2.5 Flash → decision + reasoning
  4. Execute order on Pacifica
  5. hashkey_logger.log_to_chain()
         │
         │  web3.py transaction (Ed25519 signed)
         ▼
HASHKEY CHAIN TESTNET
  TradeLogger: 0xEe39...9a2B
  • logDecision() stores full decision struct
  • addDetails() stores RSI + reasoning
  • DecisionLogged event emitted
         │
         │  immutable on-chain record
         ▼
VERIFICATION
  • Anyone can verify at testnet-explorer.hsk.xyz
  • Frontend queries contract via viem/wagmi
  • Decisions tab shows on-chain history
```

### Verify On-Chain Decisions

1. Visit the contract: **[testnet-explorer.hsk.xyz/address/0xEe39002BF9783DB5dac224Df968D0e3c5CE39a2B](https://testnet-explorer.hsk.xyz/address/0xEe39002BF9783DB5dac224Df968D0e3c5CE39a2B)**
2. Click the **Events** tab
3. Filter by `DecisionLogged`
4. See every AI decision with timestamp, action, confidence, and reasoning

### Why HashKey Chain

| Benefit | Why It Matters |
|---------|---------------|
| **Tamper-Proof Audit** | Every AI decision is permanently on-chain — no one can alter or delete it |
| **Transparent AI** | Unlike black-box bots, Gemini's reasoning is publicly verifiable by anyone |
| **EVM Compatible** | Standard web3.py + viem tooling works seamlessly |
| **Low Gas Fees** | Cost-effective for logging every decision in a frequent trading loop |
| **Compliant Infrastructure** | Aligns with HashKey's compliance-first, financial infrastructure focus |

### HashKey Chain Agent Config

Add to `agent/.env`:

```env
HASHKEY_RPC_URL=https://testnet.hsk.xyz
HASHKEY_PRIVATE_KEY=0x<your_evm_wallet_private_key>
TRADE_LOGGER_ADDRESS=0xEe39002BF9783DB5dac224Df968D0e3c5CE39a2B
```

---

## Architecture

PacificaPilot uses a **hybrid security model** for the web stack — but the trading agent always runs on your own machine. Your Pacifica private key signs transactions locally and is never transmitted anywhere.

### Full System Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                   YOUR MACHINE  (Required)                   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                   AGENT  (Python)                      │  │
│  │                                                        │  │
│  │  MAIN LOOP per symbol (every 5 min):                   │  │
│  │  1. Fetch config from backend                          │  │
│  │  2. Get market snapshot (RSI 5m+1h, funding, price)    │  │
│  │  3. Fetch Elfa AI sentiment                            │  │
│  │  4. Ask Gemini for decision (LONG/SHORT/HOLD)          │  │
│  │  5. Execute order on Pacifica                          │  │
│  │  6. Log decision to HashKey Chain ← NEW                │  │
│  │  7. Send heartbeat + stream logs to backend            │  │
│  │                                                        │  │
│  │  market.py   sentiment.py   strategy.py   executor.py  │  │
│  └─────────────────────┬──────────────────────────────────┘  │
│                        │ HTTPS + x-agent-key                 │
└────────────────────────┼─────────────────────────────────────┘
                         │                        │
              ┌──────────▼──────────┐    ┌────────▼──────────┐
              │   BACKEND (Render)  │    │  HASHKEY CHAIN    │
              │   Express + JWT     │    │  TradeLogger.sol  │
              └──────────┬──────────┘    │  0xEe39...9a2B    │
                 ┌───────┴──────┐        └───────────────────┘
          ┌──────▼──────┐ ┌─────▼──────┐
          │  MongoDB    │ │  FRONTEND  │
          │  (Atlas)    │ │  (Vercel)  │
          │  Configs +  │ │  Dashboard │
          │  Trade Logs │ │  + PnL     │
          └─────────────┘ └────────────┘
```

| We Provide (Hosted) | You Run (Your Machine — Required) |
|---------------------|-----------------------------------|
| Frontend Dashboard (Vercel) | Agent (Python script) |
| Backend API (Render) | Your Pacifica private keys |
| MongoDB (configs, trade history) | Full control of funds |
| Authentication via Privy | Local `.env` configuration |

---

## Sponsor Tools Used

| Sponsor | Integration |
|---------|------------|
| **Pacifica** | Core DEX — all market data, order execution, and position management via Pacifica REST + WebSocket API |
| **Elfa AI** | Social intelligence — token mention counts, engagement scores, and trending rank fed directly into Gemini prompt |
| **Privy** | Wallet-based auth — users connect Ethereum wallet; all dashboard routes JWT-protected via Privy server SDK |
| **HashKey Chain** | On-chain audit layer — every AI decision logged permanently to `TradeLogger` contract on HashKey testnet |

---

## Features

### 🧠 AI Decision Engine
- Gemini 2.5 Flash receives RSI (5m + 1h), funding rate, basis spread vs Binance, and Elfa sentiment in a single structured prompt
- Returns: direction (LONG / SHORT / HOLD), confidence (0–100%), position size (25/50/75/100%), and 2–3 sentence written reasoning
- Rule-based fallback activates automatically if the Gemini call fails — no silent failures

### ⛓️ On-Chain Decision Audit (HashKey Chain)
- Every AI decision — including reasoning, RSI values, confidence, and PnL — logged to `TradeLogger` contract
- Publicly verifiable on the HashKey Chain testnet block explorer
- Dashboard Decisions tab queries the contract directly via viem/wagmi

### 📊 Live PnL Dashboard (4 tabs)
- **Portfolio** — open positions, collateral balances, unrealized PnL per trade updated in real time
- **Decisions** — every AI decision with full reasoning, confidence score, on-chain tx hash, and outcome
- **Logs** — live Server-Sent Events (SSE) stream of all agent activity with text filtering
- **Config** — edit all trading parameters from the browser; agent picks up changes on next cycle without restart

### 🔒 Non-Custodial Security
- Pacifica private keys stored only in your local `agent/.env` — never transmitted to backend or chain
- HashKey logging uses a separate EVM wallet with no trading permissions
- Backend stores no private keys; AES-256-CBC encryption applied only if you optionally save API keys via dashboard

### ⚙️ Risk Management
- Trailing stop-loss with high-water mark tracking to lock in profits automatically
- Hard position size cap (configurable, default $50 USDC), capped at 90% of available collateral
- Minimum AI confidence gate — no trade placed below your threshold
- Dry run mode ON by default — zero real orders until explicitly disabled
- Circuit breaker: auto-fallback to Binance klines if Pacifica data API is unavailable

### 🔄 Multi-Symbol Parallel Execution
- Independent decision loops per symbol (BTC, ETH, SOL, and more)
- Each symbol has its own position state, trailing stop tracker, and cycle timer
- State persists across agent restarts via `positions.json`

---

## Tech Stack

### Agent (Python)
| Library | Purpose |
|---------|---------|
| `google-generativeai` | Gemini 2.5 Flash AI decisions |
| `requests` | Pacifica + Elfa API calls |
| `solders` | Solana keypair and transaction signing |
| `web3.py` | HashKey Chain contract interaction |
| `websockets` | Pacifica WebSocket price feed |
| `python-dotenv` | Local environment config |

### Backend (Node.js)
| Library | Purpose |
|---------|---------|
| `express` 5.x | REST API server |
| `mongoose` 9.x | MongoDB ODM |
| `@privy-io/server-auth` | JWT verification |
| `crypto` (AES-256-CBC) | Key encryption at rest |

### Frontend (React)
| Library | Purpose |
|---------|---------|
| `react` 19 + `vite` | UI framework and build tooling |
| `@privy-io/react-auth` | Wallet connect and auth flow |
| `viem` + `wagmi` | HashKey Chain contract queries |
| `framer-motion` 12.x | Animated dashboard transitions |
| `tailwindcss` 4.x | Styling |

### External APIs
| Service | Purpose |
|---------|---------|
| **Pacifica** | Perpetual futures DEX — trading, market data, positions |
| **Elfa AI** | Social sentiment — Twitter/X mentions and engagement |
| **Google Gemini 2.5 Flash** | AI trading decisions |
| **HashKey Chain** | On-chain immutable decision logging |
| **Privy** | Wallet authentication |
| **Binance** | Fallback kline data |

---

## Getting Started

### Prerequisites
- [Pacifica Testnet account](https://test-app.pacifica.fi) — use code `Pacifica`
- [Google Gemini API key](https://aistudio.google.com/app/apikey)
- [Elfa AI API key](https://elfa.ai) *(optional but strongly recommended)*
- EVM wallet with HashKey Chain testnet HSK for gas
- Node.js 18+ and Python 3.11+

### 1. Clone

```bash
git clone https://github.com/MayurK-cmd/Pacifica-Trading-Bot.git
cd Pacifica-Trading-Bot
```

### 2. Install Dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
cd ../agent && pip install -r requirements.txt
```

### 3. Configure Environment Files

**`backend/.env`**
```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/pacifica-pilot
PRIVY_APP_ID=<your_privy_app_id>
PRIVY_APP_SECRET=<your_privy_app_secret>
ENCRYPTION_SECRET=<random_32_char_hex>
AGENT_API_SECRET=<secure_random_string>
```

**`frontend/.env`**
```env
VITE_API_URL=http://localhost:3001
VITE_PRIVY_APP_ID=<your_privy_app_id>
```

**`agent/.env`**
```env
# Backend
BACKEND_URL=http://localhost:3001
AGENT_API_SECRET=<same_as_backend>

# Pacifica (stays local — never transmitted)
PACIFICA_BASE_URL=https://test-api.pacifica.fi/api/v1
PACIFICA_WS_URL=wss://test-ws.pacifica.fi/ws
PACIFICA_PRIVATE_KEY=<your_base58_private_key>
PACIFICA_AGENT_PRIVATE_KEY=<agent_wallet_secret>
PACIFICA_AGENT_PUBLIC_KEY=<agent_api_key>

# AI
GEMINI_API_KEY=<your_gemini_key>
ELFA_API_KEY=<your_elfa_key>

# HashKey Chain on-chain logging
HASHKEY_RPC_URL=https://testnet.hsk.xyz
HASHKEY_PRIVATE_KEY=0x<your_evm_wallet_key>
TRADE_LOGGER_ADDRESS=0xEe39002BF9783DB5dac224Df968D0e3c5CE39a2B

# Safety
DRY_RUN=true
```

### 4. Run

```bash
# Terminal 1 — Backend
cd backend && npm start          # → http://localhost:3001

# Terminal 2 — Frontend
cd frontend && npm run dev       # → http://localhost:5173

# Terminal 3 — Agent (runs locally; Pacifica key stays on your machine)
cd agent && python main.py
```

Open the dashboard, connect your wallet, configure your parameters, and watch the agent trade — with every decision recorded on HashKey Chain.

---

## Trading Logic

### Decision Cycle (per symbol, every 5 min by default)

```
FETCH market data  (Pacifica)
  └─► FETCH sentiment  (Elfa AI)
        └─► PROMPT Gemini 2.5 Flash with all signals
              └─► IF confidence > threshold AND no open position
                    └─► PLACE market order  (Pacifica)
                          ├─► LOG decision  (HashKey Chain ← on-chain)
                          └─► TRACK with trailing stop-loss
                                └─► CLOSE on SL/TP hit → LOG realized PnL
```

### Signal Reference

| Signal | Source | Bullish | Bearish |
|--------|--------|---------|---------|
| RSI-14 (1h) | Pacifica / Binance fallback | < 35 (oversold) | > 65 (overbought) |
| RSI-14 (5m) | Pacifica / Binance fallback | < 35 | > 65 |
| Funding Rate | Pacifica | Negative (shorts pay longs) | Positive (longs pay shorts) |
| Basis Spread | Pacifica vs Binance | Pacifica < Binance | > 2% premium flag |
| Social Engagement | Elfa AI | High score + trending | Low / falling score |

### Risk Profiles

| Profile | Stop Loss | Take Profit | Min Confidence |
|---------|-----------|-------------|----------------|
| Conservative | 2% | 4% | 75% |
| Balanced (default) | 3% | 6% | 60% |
| Aggressive | 5% | 10% | 45% |

---

## Pacifica API Integration

| Endpoint | Purpose |
|----------|---------|
| `POST /order/create_market` | Execute LONG / SHORT trades |
| `GET /api/v1/info/prices` | Real-time mark prices |
| `GET /api/v1/position` | Fetch open positions |
| `GET /api/v1/balance` | Account balance and equity |
| `GET /api/v1/trades` | Trade history |
| `GET /api/v1/funding` | Funding rate data |
| `GET /api/v1/orderbook` | Order book depth |

**Authentication:** Ed25519-signed requests using Pacifica API keypair.

---

## Configuration Reference

All parameters editable live from the **Config tab** — no agent restart needed.

| Parameter | Default | Description |
|-----------|---------|-------------|
| Symbols | BTC, ETH | Comma-separated trading pairs |
| Loop Interval | 300s | Seconds between decision cycles |
| Max Position | $50 USDC | Hard cap per trade |
| Min Confidence | 60% | AI confidence gate |
| Stop Loss | 3% | Trailing stop distance |
| Take Profit | 6% | Exit target |
| Risk Level | Balanced | conservative / balanced / aggressive |
| Dry Run | true | Paper trade with real market data |
| Binance Fallback | true | Use Binance klines if Pacifica unavailable |

---

## API Reference

### User Routes (JWT via Privy)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/sync` | Register / sync wallet user |
| POST | `/api/auth/keys` | Save encrypted Pacifica keys |
| GET | `/api/auth/me` | Get user profile |
| GET | `/api/config` | Fetch trading config |
| POST | `/api/config` | Update trading config |
| GET | `/api/trades` | Full trade history |
| GET | `/api/trades/stats` | Aggregated PnL stats |
| GET | `/api/portfolio` | Portfolio balances + open positions |

### Agent Routes (`x-agent-key` header)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agent/config` | Pull current config |
| POST | `/api/agent/heartbeat` | Send liveness ping |
| POST | `/api/agent/toggle` | Enable / disable agent |
| POST | `/api/trades` | Log executed trade + PnL |
| POST | `/api/logs` | Push log entry |

### Public Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agent/status` | Agent online / offline |
| GET | `/api/logs` | Recent log entries |
| GET | `/api/logs/stream` | SSE live log stream |

---

## Database Schema

### Users Collection
```javascript
{
  privyUserId: String,            // unique
  walletAddress: String,          // Ethereum wallet from Privy
  pacificaAddress: String,        // Solana wallet pubkey
  pacificaPrivateKey: String,     // AES-256 encrypted
  pacificaApiKey: String,         // AES-256 encrypted
  onboarded: Boolean,
  createdAt: Date
}
```

### Config Collection
```javascript
{
  userId: ObjectId,
  symbols: [String],              // ["BTC", "ETH"]
  loopIntervalSeconds: Number,    // 300
  maxPositionUsdc: Number,        // 50
  minConfidence: Number,          // 0.6
  stopLossPct: Number,            // 3.0
  takeProfitPct: Number,          // 6.0
  riskLevel: String,              // conservative/balanced/aggressive
  dryRun: Boolean,                // true
  enabled: Boolean,               // false
  useBinanceFallback: Boolean     // true
}
```

### Trades Collection
```javascript
{
  userId: ObjectId,
  symbol: String,
  action: String,                 // LONG / SHORT / HOLD / EXIT
  confidence: Number,
  reasoning: String,
  size_pct: Number,
  mark_price: Number,
  rsi_14: Number,
  rsi_1h: Number,
  funding_rate: Number,
  sentiment_score: Number,
  pnl_usdc: Number,
  dry_run: Boolean,
  onchain_tx: String,             // HashKey Chain tx hash
  createdAt: Date
}
```

---

## Security Model

| Asset | Where It Lives | Protection |
|-------|---------------|------------|
| Pacifica private key | Your local `agent/.env` | Never transmitted |
| Pacifica agent key | Your local `agent/.env` | Never transmitted |
| HashKey logging key | Your local `agent/.env` | Separate wallet, no trading permissions |
| User wallet | Browser (Privy-managed) | Privy handles custody |
| Optional stored API keys | MongoDB Atlas | AES-256-CBC encrypted |
| Agent ↔ Backend | `x-agent-key` over HTTPS | Shared secret |
| User ↔ Backend | JWT | Signed by Privy wallet |

---

## Project Structure

```
pacifica-pilot/
├── agent/
│   ├── main.py              # Main trading loop
│   ├── executor.py          # Pacifica order execution
│   ├── market.py            # Market data + RSI
│   ├── sentiment.py         # Elfa AI sentiment
│   ├── strategy.py          # Gemini AI decisions
│   ├── hashkey_logger.py    # HashKey Chain logging ← NEW
│   └── logger.py            # SSE log streaming
│
├── backend/
│   ├── index.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Config.js
│   │   └── Trade.js         # Includes onchain_tx field
│   ├── routes/
│   │   ├── auth.js
│   │   ├── config.js
│   │   ├── trades.js
│   │   ├── portfolio.js
│   │   ├── agent.js
│   │   └── logs.js
│   └── middleware/
│       ├── auth.js
│       └── crypto.js
│
├── contracts/
│   └── TradeLogger.sol      # HashKey Chain contract ← NEW
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── Dashboard.jsx
│   │   ├── LoginPage.jsx
│   │   ├── Onboarding.jsx
│   │   └── tabs/
│   │       ├── PortfolioTab.jsx
│   │       ├── ConfigTab.jsx
│   │       ├── DecisionsTab.jsx  # Queries HashKey contract
│   │       └── LogsTab.jsx
│   └── vercel.json
│
└── README.md
```

---

## Deployment

The backend and frontend can be hosted. **The agent must run on your local machine** — your Pacifica private key signs all transactions locally and never touches any remote server.

### Backend → Render
```
Root Directory: backend
Build:  npm install
Start:  npm start
```

### Frontend → Vercel
```
Root Directory: frontend
Build:  npm run build
Output: dist
```

### Agent → Your Machine Only
```bash
cd agent && python main.py
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Agent shows Offline | Toggle "Enabled" ON in Config tab |
| Agent won't connect | Verify `BACKEND_URL` and `AGENT_API_SECRET` match on both sides |
| No market data | Check Pacifica keys; enable Binance fallback in Config |
| Login fails | Verify Privy App ID / Secret; check MongoDB connection |
| PnL not updating | Confirm agent is running and heartbeating; check Logs tab |
| Circuit breaker active | Pacifica API degraded; Binance fallback takes over automatically |
| HashKey tx failing | Check `HASHKEY_PRIVATE_KEY` has testnet HSK for gas |
| On-chain decisions not showing | Verify `TRADE_LOGGER_ADDRESS` in agent `.env`; check block explorer |

Enable verbose agent logging:
```python
# agent/main.py
DEBUG = True
```

---

## Contributing

1. Fork the repo
2. `git checkout -b feature/your-feature`
3. `git commit -am 'Add feature'`
4. `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

MIT — see [LICENSE](LICENSE)

---

## Acknowledgements

Built during the [HashKey Chain On-Chain Horizon Hackathon 2026](https://dorahacks.io/hackathon/2045) and [Pacifica Hackathon 2026](https://pacifica.gitbook.io/docs/hackathon/pacifica-hackathon).

| Tool | Role |
|------|------|
| [HashKey Chain](https://hsk.xyz) | On-chain immutable decision audit trail |
| [Pacifica](https://pacifica.fi) | Perpetuals DEX + trading API |
| [Elfa AI](https://elfa.ai) | Social sentiment intelligence |
| [Privy](https://privy.io) | Wallet authentication |
| [Google Gemini](https://ai.google.dev) | AI reasoning engine |

---

## Disclaimer

Trading perpetual futures involves substantial risk, including potential loss of your entire position. Always run in **dry run mode** first and verify behaviour before switching to live trading. Past strategy performance does not guarantee future results. You are solely responsible for your trading decisions.