const express = require("express");
const router  = express.Router();
const { requireAuth } = require("../middleware/auth");
const User = require("../models/User");

const BASE_URL = process.env.PACIFICA_BASE_URL || "https://test-api.pacifica.fi/api/v1";

router.use(requireAuth);

// GET /api/portfolio
// Actual Pacifica response shape:
// { success, data: {
//     balance, account_equity, spot_collateral,
//     available_to_spend, available_to_withdraw,
//     total_margin_used, cross_mmr,
//     positions_count, orders_count,
//     spot_balances: [{ symbol, amount, available_to_withdraw }],
//     updated_at
// }}
router.get("/", async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const pacificaAddress = user.pacificaAddress;

    if (!pacificaAddress) {
      return res.status(400).json({
        error: "Solana wallet address not configured.",
        hint:  "Add your Phantom wallet pubkey to your user record as 'pacificaAddress'.",
      });
    }

    const pacificaRes = await fetch(
      `${BASE_URL}/account?account=${pacificaAddress}`,
      {
        headers: { "Accept": "application/json" },
        signal:  AbortSignal.timeout(10_000),
      }
    );

    if (!pacificaRes.ok) {
      const text = await pacificaRes.text();
      return res.status(pacificaRes.status).json({
        error: `Pacifica error: ${text}`,
        hint:  pacificaRes.status === 404
          ? "Wallet not found on Pacifica. Go to test-app.pacifica.fi → Faucet → Deposit."
          : "Unexpected Pacifica API error.",
      });
    }

    const json = await pacificaRes.json();
    const d    = json.data || json;

    // spot_balances: [{ symbol: "WIF", amount: "100", available_to_withdraw: "100" }]
    const spotBalances = (d.spot_balances || []).map(b => ({
      symbol:             b.symbol,
      amount:             parseFloat(b.amount              || 0),
      availableToWithdraw: parseFloat(b.available_to_withdraw || 0),
    }));

    // Perp positions — currently positions_count=0 so empty,
    // but structure is ready when agent opens positions
    const positions = (d.positions || [])
      .filter(p => parseFloat(p.size || 0) !== 0)
      .map(p => ({
        symbol:        p.symbol,
        side:          parseFloat(p.size) > 0 ? "LONG" : "SHORT",
        size:          Math.abs(parseFloat(p.size || 0)),
        entryPrice:    parseFloat(p.entry_price    || 0),
        markPrice:     parseFloat(p.mark_price     || 0),
        unrealisedPnl: parseFloat(p.unrealized_pnl || 0),
        margin:        parseFloat(p.margin         || 0),
      }));

    res.json({
      pacificaAddress,
      // Core balances — exact field names from Pacifica API
      usdcBalance:         parseFloat(d.balance              || 0), // USDC deposited
      accountEquity:       parseFloat(d.account_equity       || 0), // USDC + spot collateral + unrealised PnL
      spotCollateral:      parseFloat(d.spot_collateral      || 0), // value of spot tokens (BTC, WIF etc)
      availableToSpend:    parseFloat(d.available_to_spend   || 0), // free to open new perp positions
      availableToWithdraw: parseFloat(d.available_to_withdraw|| 0),
      usedMargin:          parseFloat(d.total_margin_used    || 0),
      // Spot token balances (BTC, WIF, etc held on Pacifica)
      spotBalances,
      // Open perp positions
      positions,
      totalUnrealisedPnl: positions.reduce((s, p) => s + p.unrealisedPnl, 0),
      // Meta
      positionsCount: d.positions_count || 0,
      ordersCount:    d.orders_count    || 0,
      updatedAt:      d.updated_at      || null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;