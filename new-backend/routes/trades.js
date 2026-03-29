// routes/trades.js
const express  = require("express");
const router   = express.Router();
const mongoose = require("mongoose");

// Schema matches exactly what logger.py posts to /api/trades
const tradeSchema = new mongoose.Schema({
  // Core decision
  symbol:          { type: String, required: true, uppercase: true, trim: true },
  action:          { type: String, required: true, enum: ["LONG","SHORT","HOLD","EXIT"] },
  confidence:      { type: Number, default: null },
  reasoning:       { type: String, default: "" },
  size_pct:        { type: Number, default: 0 },
  mark_price:      { type: Number, default: null },

  // Market data at decision time
  rsi_14:          { type: Number, default: null },
  rsi_1h:          { type: Number, default: null },
  funding_rate:    { type: Number, default: null },
  change_24h:      { type: Number, default: null },

  // Sentiment data
  sentiment_score: { type: Number, default: null },
  mention_count:   { type: Number, default: null },
  trending_score:  { type: Number, default: null },

  // Order result (null for HOLD)
  order:           { type: mongoose.Schema.Types.Mixed, default: null },
  dry_run:         { type: Boolean, default: true },

  // PnL tracking
  pnl_usdc:        { type: Number, default: null },
  open_position:   { type: String, default: null },
  unrealized_pnl:  { type: String, default: null },
}, { timestamps: true });

tradeSchema.index({ symbol: 1, createdAt: -1 });
tradeSchema.index({ action: 1 });

const Trade = mongoose.models.Trade || mongoose.model("Trade", tradeSchema);

// GET /api/trades
// Query params: symbol, action, limit (default 50), skip (default 0)
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.symbol) filter.symbol = req.query.symbol.toUpperCase();
    if (req.query.action) filter.action = req.query.action.toUpperCase();

    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const skip  = parseInt(req.query.skip) || 0;

    const [trades, total] = await Promise.all([
      Trade.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Trade.countDocuments(filter),
    ]);

    res.json({ total, limit, skip, trades });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/trades/stats
router.get("/stats", async (req, res) => {
  try {
    const all      = await Trade.countDocuments({});
    const byAction = await Trade.aggregate([
      { $group: { _id: "$action", count: { $sum: 1 } } }
    ]);
    const withPnl  = await Trade.find({ pnl_usdc: { $ne: null } }).select("pnl_usdc").lean();
    const totalPnl = withPnl.reduce((s, t) => s + (t.pnl_usdc || 0), 0);

    res.json({
      totalDecisions: all,
      byAction: Object.fromEntries(byAction.map(r => [r._id, r.count])),
      totalPnlUsdc: parseFloat(totalPnl.toFixed(4)),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/trades/:id
router.get("/:id", async (req, res) => {
  try {
    const trade = await Trade.findById(req.params.id).lean();
    if (!trade) return res.status(404).json({ error: "Trade not found" });
    res.json(trade);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/trades  — called by logger.py, protected by x-agent-key in index.js
router.post("/", async (req, res) => {
  try {
    const { symbol, action } = req.body;
    if (!symbol || !action) {
      return res.status(400).json({ error: "symbol and action are required" });
    }
    const trade = await Trade.create(req.body);
    res.status(201).json(trade);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

module.exports = router;