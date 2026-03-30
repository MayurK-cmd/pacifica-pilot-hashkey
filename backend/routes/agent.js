// routes/agent.js
const express = require("express");
const router  = express.Router();
const { requireAuth } = require("../middleware/auth");
const Config = require("../models/Config");

// In-memory agent heartbeat state
let state = {
  running:         false,
  lastCycleAt:     null,
  cyclesCompleted: 0,
  lastSymbol:      null,
  lastError:       null,
};

// POST /api/agent/heartbeat — called by Python agent every symbol cycle
// Protected by requireAgentKey in index.js
router.post("/heartbeat", (req, res) => {
  const { symbol, cyclesCompleted, error } = req.body || {};

  state.running         = true;
  state.lastCycleAt     = new Date().toISOString();
  state.lastSymbol      = symbol || state.lastSymbol;
  state.lastError       = error  || null;

  if (typeof cyclesCompleted === "number") {
    state.cyclesCompleted = cyclesCompleted;
  } else {
    state.cyclesCompleted += 1;
  }

  res.json({ ok: true, state });
});

// GET /api/agent/status — polled by frontend
// Returns running=false if no heartbeat received in last 10 minutes
router.get("/status", (req, res) => {
  const STALE_MS = 10 * 60 * 1000;
  const isStale  = !state.lastCycleAt ||
    (Date.now() - new Date(state.lastCycleAt).getTime() > STALE_MS);

  res.json({
    ...state,
    running: state.running && !isStale,
  });
});

// POST /api/agent/toggle — called by frontend to enable/disable agent
// Requires JWT auth (this is a user action, not an agent action)
router.post("/toggle", requireAuth, async (req, res) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== "boolean") {
      return res.status(400).json({ error: "enabled must be a boolean" });
    }

    const cfg = await Config.findOneAndUpdate(
      { userId: req.user._id },
      { $set: { enabled } },
      { new: true, upsert: true }
    );

    res.json({ ok: true, enabled: cfg.enabled });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;