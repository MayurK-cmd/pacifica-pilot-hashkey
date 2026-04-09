# PacificaPilot Frontend 🤖⛓️

> Real-time dashboard for the autonomous AI trading agent with on-chain decision verification via HashKey Chain.

## Features

- **Portfolio Tab** — Live positions, balances, and unrealized PnL
- **Decisions Tab** — Every AI decision with reasoning, confidence, and HashKey Chain tx verification
- **Logs Tab** — Real-time SSE stream of agent activity
- **Config Tab** — Edit trading parameters live without restarting the agent
- **Wallet Auth** — Privy-based authentication
- **On-Chain Audit** — Verify AI decisions directly on HashKey Chain block explorer

## Tech Stack

| Library | Purpose |
|---------|---------|
| React 19 | UI framework |
| Vite | Build tool + dev server |
| @privy-io/react-auth | Wallet authentication |
| framer-motion | Dashboard animations |
| tailwindcss v4 | Styling |
| viem + wagmi | HashKey Chain contract queries |

## Quick Start

```bash
# Install
npm install

# Dev
npm run dev

# Build
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001
VITE_PRIVY_APP_ID=<your_privy_app_id>
```

For production deployment, set `VITE_API_URL` to your Render backend URL.

## Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

The `vercel.json` configures:
- SPA rewrites for React Router
- Security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)
- Vite build configuration

## HashKey Chain Integration

The Decisions tab queries the `TradeLogger` contract at:
- **Network:** HashKey Chain Testnet
- **Address:** `0xEe39002BF9783DB5dac224Df968D0e3c5CE39a2B`
- **Explorer:** [testnet-explorer.hsk.xyz](https://testnet-explorer.hsk.xyz/address/0xEe39002BF9783DB5dac224Df968D0e3c5CE39a2B)

## Live Demo

[pacificia-trading-bot.vercel.app](https://pacificia-trading-bot.vercel.app)

---

Built for the [HashKey Chain On-Chain Horizon Hackathon 2026](https://dorahacks.io/hackathon/2045) 🏆
