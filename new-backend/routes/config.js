const express = require("express");
const router  = express.Router();
const Config  = require("../models/Config");

router.get("/", async (req, res) => {
  try {
    let cfg = await Config.findOne({ userId: "default" });
    if (!cfg) cfg = await Config.create({ userId: "default" });
    res.json(cfg);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/", async (req, res) => {
  try {
    const allowed = [
      "symbols","loopIntervalSeconds","maxPositionUsdc","minConfidence",
      "dryRun","riskLevel","enabled","stopLossPct","takeProfitPct","useBinanceFallback",
    ];
    const update = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    }
    if (update.symbols) {
      update.symbols = update.symbols.map(s => String(s).toUpperCase().trim()).filter(Boolean).slice(0,10);
    }
    if (update.loopIntervalSeconds) update.loopIntervalSeconds = Math.max(60,   Math.min(3600,  +update.loopIntervalSeconds));
    if (update.maxPositionUsdc)     update.maxPositionUsdc     = Math.max(1,    Math.min(10000, +update.maxPositionUsdc));
    if (update.minConfidence)       update.minConfidence       = Math.max(0.5,  Math.min(0.95,  +update.minConfidence));
    if (update.stopLossPct)         update.stopLossPct         = Math.max(0.5,  Math.min(20,    +update.stopLossPct));
    if (update.takeProfitPct)       update.takeProfitPct       = Math.max(1,    Math.min(50,    +update.takeProfitPct));

    const cfg = await Config.findOneAndUpdate(
      { userId: "default" }, { $set: update }, { new: true, upsert: true }
    );
    res.json(cfg);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

module.exports = router;