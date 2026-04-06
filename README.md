# PacificaPilot — AI Trading Agent on HashKey Chain

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![HashKey Chain](https://img.shields.io/badge/Chain-HashKey%20Chain%20Testnet-blue)](https://hashkeychain.org)
[![DoraHacks](https://img.shields.io/badge/Submission-DoraHacks%20Hackathon-purple)](https://dorahacks.io/hackathon/2045/detail)

**PacificaPilot** is an autonomous AI trading agent for Pacifica, a perpetual futures DEX on Solana. Every trading decision is logged to **HashKey Chain**, creating an immutable, verifiable audit trail of AI strategy performance.

---

## Table of Contents

- [Features](#features)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [File Structure](#file-structure)
- [Tech Stack](#tech-stack)
- [Deployment Options](#deployment-options)
- [Quick Start - Local Setup](#quick-start---local-setup)
- [Cloud Agent Setup](#cloud-agent-setup)
- [HashKey Chain Integration](#hashkey-chain-integration)
- [DoraHacks Submission](#dohacks-submission)
- [Documentation](#documentation)

---

## Features

- **AI-Powered Decisions**: Gemini 2.5 Flash analyzes market signals and social sentiment
- **Real-Time Data**: RSI-14, funding rates, basis spread, Elfa AI sentiment
- **On-Chain Audit**: Every decision logged to HashKey Chain via TradeLogger contract
- **Risk Management**: Trailing stops, position limits, confidence thresholds
- **Dual Modes**: Paper trading (DRY_RUN) and live execution
- **Multi-Asset Support**: BTC and ETH perpetual futures
- **Parallel Processing**: Concurrent analysis of multiple symbols

---

## How It Works

### The Trading Cycle

PacificaPilot operates in continuous loops, typically every 5 minutes:

1. **Config Fetch**: Agent polls the backend API for user-configured parameters (max position size, min confidence, stop-loss, take-profit)

2. **Market Data Scan**: For each symbol (BTC/ETH):
   - Fetches RSI-14 on 5-minute and 1-hour timeframes
   - Retrieves funding rates from Pacifica DEX
   - Calculates basis spread (Pacifica price vs Binance)

3. **Sentiment Analysis**: Queries Elfa AI API for:
   - Social engagement scores
   - Mention counts
   - Trending rankings

4. **AI Inference**: Sends consolidated data to Google Gemini 2.5 Flash:
   - Market indicators (RSI, funding, basis)
   - Sentiment metrics
   - Current positions and account balance
   - Gemini returns: action (LONG/SHORT/HOLD/EXIT), confidence score, and plain-English reasoning

5. **Order Execution**: If action is LONG/SHORT and confidence exceeds threshold:
   - Signs order with Ed25519 Pacifica agent key
   - Broadcasts to Pacifica DEX
   - Records entry price for trailing stop-loss/take-profit

6. **On-Chain Logging**: Every decision is sent to HashKey Chain:
   - `hashkey_logger.py` converts decision to contract call
   - Transaction signed with EVM wallet
   - TradeLogger contract stores immutable record
   - Frontend can query and display audit trail

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PACIFICA PILOT SYSTEM                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│  React UI    │ ◄─────► │  Express API │ ◄─────► │   MongoDB    │
│  (Vite)      │  JWT    │  (Node.js)  │  AES-256 │  (Encrypted) │
└──────────────┘         └──────┬───────┘         └──────────────┘
                                │
                                │ x-agent-key
                                ▼
                        ┌───────────────┐
                        │ Python Agent  │
                        │  (main.py)    │
                        └───────┬───────┘
           ┌────────────────────┼────────────────────┐
           │                    │                    │
    ┌──────▼──────┐     ┌──────▼──────┐     ┌───────▼────────┐
    │  Gemini AI  │     │  Pacifica   │     │ HashKey Chain  │
    │  2.5 Flash  │     │  DEX API    │     │ TradeLogger    │
    │  (Reasoning)│     │  (Solana)   │     │ (0xEe39...9a2B)│
    └─────────────┘     └─────────────┘     └────────────────┘
           │                    │                    │
           │                    │                    │
    ┌──────▼──────┐     ┌──────▼──────┐     ┌───────▼────────┐
    │  Elfa AI    │     │  Pacifica   │     │  Block Explorer│
    │  Sentiment  │     │  WebSocket  │     │  Verification  │
    └─────────────┘     └─────────────┘     └────────────────┘
```

---

## File Structure

```
pacifica-pilot-hashkey/
│
├── agent/                          # Python trading agent runtime
│   ├── main.py                     # Main loop with parallel symbol processing
│   ├── strategy.py                 # Gemini AI decision logic & prompt engineering
│   ├── market.py                   # Pacifica market data fetcher (REST + WebSocket)
│   ├── sentiment.py                # Elfa AI social sentiment analysis
│   ├── executor.py                 # Pacifica order execution & position management
│   ├── hashkey_logger.py           # On-chain logging to HashKey Chain
│   ├── logger.py                   # Internal logging & backend sync
│   ├── positions.json              # Local position tracking cache
│   ├── .env.example                # Agent environment template
│   └── requirements.txt            # Python dependencies
│
├── backend/                        # Node.js API server
│   ├── index.js                    # Express server entry point
│   ├── middleware/
│   │   ├── auth.js                 # JWT authentication for users
│   │   └── crypto.js               # AES-256 encryption for sensitive data
│   ├── models/
│   │   ├── User.js                 # MongoDB user schema (wallet, Pacifica keys)
│   │   └── Config.js               # Trading config schema (per-user settings)
│   ├── routes/
│   │   ├── agent.js                # Agent-facing endpoints (config, heartbeat)
│   │   ├── auth.js                 # Privy wallet authentication
│   │   ├── config.js               # User config CRUD
│   │   ├── logs.js                 # Decision logs retrieval
│   │   ├── portfolio.js            # Portfolio PnL calculations
│   │   └── trades.js               # Trade history
│   ├── .env.example                # Backend environment template
│   └── package.json
│
├── frontend/                       # React + Vite UI
│   ├── src/
│   │   ├── main.jsx                # React entry point
│   │   ├── App.jsx                 # Root component with routing
│   │   ├── useApi.js               # API client hook
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx     # Landing page
│   │   │   ├── LoginPage.jsx       # Wallet connect via Privy
│   │   │   ├── Onboarding.jsx      # Pacifica key setup wizard
│   │   │   ├── Dashboard.jsx       # Main trading dashboard
│   │   │   └── DocsPage.jsx        # Documentation
│   │   ├── layouts/
│   │   │   ├── MainLayout.jsx      # App shell
│   │   │   └── AppLayout.jsx       # Dashboard layout
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Top navigation
│   │   │   └── AgentStatusBar.jsx  # Agent connection indicator
│   │   └── tabs/
│   │       ├── DecisionsTab.jsx    # On-chain decision history
│   │       ├── LogsTab.jsx         # Agent activity logs
│   │       ├── PortfolioTab.jsx    # PnL and positions
│   │       └── ConfigTab.jsx       # Trading parameters
│   ├── .env.example                # Frontend environment template
│   └── package.json
│
├── contracts/                      # Solidity smart contracts
│   ├── TradeLogger.sol             # On-chain audit log contract
│   └── README.md                   # Contract documentation
│
├── README.md                       # This file
└── trades.json                     # Historical trade data (for analysis)
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18 + Vite | Fast, modern UI with hot reload |
| | TailwindCSS | Utility-first styling |
| | Framer Motion | Smooth animations |
| | React Router | Client-side routing |
| | wagmi/viem | HashKey Chain contract interaction |
| **Backend** | Node.js + Express | RESTful API server |
| | MongoDB Atlas | Encrypted user data storage |
| | Privy | Wallet authentication |
| | AES-256 | Pacifica key encryption |
| **Agent** | Python 3.11 | Trading runtime |
| | web3.py | HashKey Chain contract calls |
| | requests | HTTP client for APIs |
| | ThreadPoolExecutor | Parallel symbol processing |
| **AI/ML** | Google Gemini 2.5 Flash | Trading decision reasoning |
| | Elfa AI | Social sentiment analysis |
| **DEX** | Pacifica | Solana perpetual futures |
| **Blockchain** | HashKey Chain | On-chain audit trail |

---

## Deployment Options

### Option 1: Full Local Setup (Recommended for Development)

Run everything on your machine. Best for understanding the system and testing.

**Requirements:**
- Python 3.11+
- Node.js 18+
- MongoDB Atlas account (free tier works)

**Steps:**
1. Clone and install all dependencies
2. Configure backend, frontend, and agent `.env` files
3. Start all three services in separate terminals
4. Access frontend at `http://localhost:5173`

### Option 2: Cloud Agent + Dev's Backend/Frontend

Run only the Python agent on your cloud server (AWS, GCP, DigitalOcean, etc.) while using the developer's deployed backend and frontend.

**Use Case:** You want to trade with your own AI agent but don't want to host the infrastructure.

**Requirements:**
- Cloud server with Python 3.11+
- Agent configuration only

**Steps:**
1. Clone repository (agent folder only is sufficient)
2. Install Python dependencies: `pip install -r requirements.txt`
3. Configure `agent/.env`:
   ```bash
   BACKEND_URL=https://your-dev-backend-url.com
   AGENT_API_SECRET=provided_by_developer
   # ... Pacifica and AI keys
   ```
4. Run agent: `python main.py`

**Benefits:**
- No need to manage backend/frontend infrastructure
- Agent runs 24/7 on your cloud server
- Lower latency to Pacifica API (if server is geographically close)
- Developer handles database, auth, and UI updates

### Option 3: Self-Hosted Everything (Production)

Deploy all components to your own infrastructure for full control.

**Components to Deploy:**
- Backend: VPS, AWS EC2, or container (Docker + Kubernetes)
- Frontend: Vercel, Netlify, or static hosting
- Agent: Same VPS as backend or separate cloud instance
- Database: MongoDB Atlas or self-hosted MongoDB

---

## Quick Start - Local Setup

### Step 1: Clone and Install

```bash
# Clone repository
git clone https://github.com/MayurK-cmd/pacifica-pilot-hashkey.git
cd pacifica-pilot-hashkey

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install agent dependencies
cd ../agent
pip install -r requirements.txt
```

### Step 2: Configure Backend

Create `backend/.env`:

```bash
# MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/pacifica_pilot

# Privy Authentication (https://privy.io)
PRIVY_APP_ID=app_id_from_privy_dashboard
PRIVY_APP_SECRET=secret_from_privy_dashboard

# Encryption key (32 random hex characters)
ENCRYPTION_SECRET=32_random_hex_characters_here

# Agent authentication secret
AGENT_API_SECRET=secure_random_string_for_agent_auth
```

Generate secrets:
```bash
# Generate AGENT_API_SECRET
openssl rand -hex 32

# Generate ENCRYPTION_SECRET
openssl rand -hex 16
```

### Step 3: Configure Frontend

Create `frontend/.env`:

```bash
# Local development
VITE_BACKEND_URL=http://localhost:3001
VITE_PRIVY_APP_ID=app_id_from_privy_dashboard

# Or use deployed backend
# VITE_BACKEND_URL=https://your-backend-url.com
```

### Step 4: Configure Agent

Create `agent/.env`:

```bash
# Backend connection
BACKEND_URL=http://localhost:3001
AGENT_API_SECRET=<same_as_backend.env>

# Pacifica Testnet API
PACIFICA_BASE_URL=https://test-api.pacifica.fi/api/v1
PACIFICA_WS_URL=wss://test-ws.pacifica.fi/ws

# Pacifica Wallet Keys (set after onboarding)
PACIFICA_PRIVATE_KEY=<your_main_wallet_private_key>
PACIFICA_AGENT_PRIVATE_KEY=<agent_wallet_private_key>
PACIFICA_AGENT_API_KEY=<agent_api_key_from_pacifica>

# AI Services
GEMINI_API_KEY=<google_gemini_api_key>
ELFA_API_KEY=<elfa_ai_api_key>

# HashKey Chain Configuration
HASHKEY_RPC_URL=https://testnet.hsk.xyz
HASHKEY_PRIVATE_KEY=0xyour_evm_wallet_private_key
TRADE_LOGGER_ADDRESS=0xEe39002BF9783DB5dac224Df968D0e3c5CE39a2B

# Trading Mode
DRY_RUN=true
```

### Step 5: Start Services

```bash
# Terminal 1: Backend API
cd backend
npm start

# Terminal 2: Frontend UI
cd frontend
npm run dev

# Terminal 3: Trading Agent
cd agent
python main.py
```

### Step 6: Complete Onboarding

1. Open `http://localhost:5173`
2. Connect wallet via Privy
3. Enter Pacifica wallet address
4. Enter Pacifica Agent private key (Secret from apikey page)
5. Save and continue to dashboard

---

## Cloud Agent Setup

To run only the agent on a cloud server while using the developer's backend/frontend:

### Step 1: Server Setup

```bash
# SSH into your cloud server
ssh user@your-server-ip

# Clone repository (or just copy agent folder)
git clone https://github.com/MayurK-cmd/pacifica-pilot-hashkey.git
cd pacifica-pilot-hashkey/agent

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Step 2: Configure Agent

Create `agent/.env`:

```bash
# Use developer's deployed backend
BACKEND_URL=https://dev-backend.pacifica-pilot.com
AGENT_API_SECRET=request_from_developer

# Pacifica Testnet API
PACIFICA_BASE_URL=https://test-api.pacifica.fi/api/v1
PACIFICA_WS_URL=wss://test-ws.pacifica.fi/ws

# Pacifica Wallet Keys
PACIFICA_PRIVATE_KEY=<your_main_wallet_private_key>
PACIFICA_AGENT_PRIVATE_KEY=<agent_wallet_private_key>
PACIFICA_AGENT_API_KEY=<agent_api_key_from_pacifica>

# AI Services
GEMINI_API_KEY=<your_gemini_api_key>
ELFA_API_KEY=<your_elfa_api_key>

# HashKey Chain Configuration
HASHKEY_RPC_URL=https://testnet.hsk.xyz
HASHKEY_PRIVATE_KEY=0xyour_evm_wallet_private_key
TRADE_LOGGER_ADDRESS=0xEe39002BF9783DB5dac224Df968D0e3c5CE39a2B

# Trading Mode (start with paper trading)
DRY_RUN=true
```

### Step 3: Run Agent

```bash
# Direct execution
python main.py

# Or use screen/tmux for persistent execution
screen -S pacifica-agent
python main.py
# Ctrl+A, D to detach

# Or use systemd service (production)
sudo nano /etc/systemd/system/pacifica-agent.service
```

Example systemd service:

```ini
[Unit]
Description=PacificaPilot Trading Agent
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/home/your-user/pacifica-pilot-hashkey/agent
Environment="PATH=/home/your-user/pacifica-pilot-hashkey/agent/venv/bin"
ExecStart=/home/your-user/pacifica-pilot-hashkey/agent/venv/bin/python main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start
sudo systemctl enable pacifica-agent
sudo systemctl start pacifica-agent
sudo systemctl status pacifica-agent
```

### Step 4: Monitor

```bash
# View logs
tail -f agent/logs/trading.log

# Or journalctl for systemd
journalctl -u pacifica-agent -f
```

---

## HashKey Chain Integration

### What is HashKey Chain?

**HashKey Chain** is an EVM-compatible Layer 1 blockchain that provides secure, scalable infrastructure for Web3 applications. PacificaPilot uses HashKey Chain as an immutable audit layer for all AI trading decisions.

### Why HashKey Chain?

1. **Tamper-Proof Audit Trail**: Every AI decision is permanently recorded on-chain
2. **Transparent AI**: Unlike black-box trading bots, PacificaPilot's reasoning is publicly verifiable
3. **EVM Compatibility**: Standard web3.py tooling works seamlessly
4. **Low Gas Fees**: Cost-effective for frequent logging
5. **Fast Finality**: Quick confirmation times for real-time audit updates

### Deployed Contract

The TradeLogger contract is deployed on HashKey Chain testnet at:

```
0xEe39002BF9783DB5dac224Df968D0e3c5CE39a2B
```

**Network Details:**
- Network: HashKey Chain Testnet
- RPC URL: `https://testnet.hsk.xyz`
- Chain ID: 17069
- Block Explorer: `https://testnet.hsk.xyz/address/0xEe39002BF9783DB5dac224Df968D0e3c5CE39a2B`

### What Gets Logged

Every trading decision is stored on HashKey Chain:

| Field | Type | Description |
|-------|------|-------------|
| `id` | uint256 | Unique decision ID |
| `agent` | address | EVM wallet address of logging agent |
| `symbol` | string | "BTC" or "ETH" |
| `action` | string | "LONG", "SHORT", "HOLD", or "EXIT" |
| `price` | uint256 | Mark price × 1e6 (fixed-point) |
| `pnlUsdc` | int256 | Realized PnL × 1e6 (negative = loss) |
| `confidence` | uint8 | AI confidence score (0-100) |
| `rsi5m` | int16 | RSI 5-minute × 100 (-1 if unavailable) |
| `rsi1h` | int16 | RSI 1-hour × 100 (-1 if unavailable) |
| `reasoning` | string | AI's plain-English explanation |
| `dryRun` | bool | true = paper trade, false = live |
| `timestamp` | uint256 | Block timestamp |

### How Logging Works

```python
# From agent/hashkey_logger.py

def log_to_chain(symbol, action, mark_price, pnl_usdc, confidence, 
                 rsi_5m, rsi_1h, reasoning, dry_run):
    # 1. Convert floats to fixed-point integers
    price_int = int(round(mark_price * 1_000_000))
    pnl_int = int(round(pnl_usdc * 1_000_000))
    conf_int = max(0, min(100, int(round(confidence * 100))))
    
    # 2. Build contract call
    tx = contract.functions.logDecision(
        symbol, action, price_int, pnl_int, conf_int, dry_run
    )
    
    # 3. Sign and broadcast
    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
    
    # 4. Wait for confirmation
    w3.eth.wait_for_transaction_receipt(tx_hash)
    
    # 5. Log additional details (RSI, reasoning)
    contract.functions.addDetails(decision_id, rsi5m, rsi1h, reasoning)
```

### Verify On-Chain

View logged decisions on HashKey Chain block explorer:

1. Visit: `https://testnet.hsk.xyz/address/0xEe39002BF9783DB5dac224Df968D0e3c5CE39a2B`
2. Click "Events" tab
3. Filter by `DecisionLogged` event
4. See all AI decisions with timestamps, actions, and reasoning

---

## DoraHacks Submission

This project is submitted to the **DoraHacks HashKey Hackathon**.

### What Makes PacificaPilot Unique

1. **Transparent AI**: Unlike black-box trading bots, every decision's reasoning is publicly verifiable on HashKey Chain
2. **Hybrid Architecture**: Combines Solana speed (Pacifica DEX) with EVM auditability (HashKey Chain)
3. **Multi-Modal Signals**: Fuses technical indicators (RSI, funding) with social sentiment (Elfa AI)
4. **Risk-First Design**: Trailing stops, confidence thresholds, and position limits protect capital
5. **Dual Deployment**: Run locally or split agent to cloud while using hosted backend/frontend

### Judges: How to Verify

1. **View Deployed Contract**:
   - HashKey Chain Testnet: `0xEe39002BF9783DB5dac224Df968D0e3c5CE39a2B`
   - Block Explorer: https://testnet.hsk.xyz/address/0xEe39002BF9783DB5dac224Df968D0e3c5CE39a2B

2. **Run Agent Locally**:
   ```bash
   git clone https://github.com/MayurK-cmd/pacifica-pilot-hashkey.git
   cd pacifica-pilot-hashkey/agent
   pip install -r requirements.txt
   # Configure .env with your keys
   python main.py
   ```

3. **View Live Decisions**:
   - Frontend Decisions tab shows on-chain data
   - Filter by action, symbol, or confidence

4. **Check Code Quality**:
   - Clean, documented Python agent
   - Production-ready Express backend
   - Modern React frontend with TailwindCSS

---

## Documentation

Full in-app documentation available at `/docs` route in the frontend.

### Additional Resources

- [Contracts README](contracts/README.md) - Detailed smart contract documentation
- [Frontend Docs Page](frontend/src/pages/DocsPage.jsx) - In-app documentation source
- [HashKey Chain Docs](https://hashkeychain.org/docs) - Official HashKey Chain documentation
- [Pacifica Docs](https://docs.pacifica.fi) - Pacifica DEX API reference

---

## License

MIT License

---

## Contact

- **GitHub**: [@MayurK-cmd](https://github.com/MayurK-cmd)
- **DoraHacks**: [Submission Page](https://dorahacks.io/hackathon/2045/detail)
- **HashKey Chain**: [Official Website](https://hashkeychain.org)

---

**Built with HashKey Chain** - Powering transparent, verifiable AI trading.
