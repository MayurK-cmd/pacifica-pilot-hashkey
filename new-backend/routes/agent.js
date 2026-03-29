// routes/agent.js
const express = require("express");
const router  = express.Router();

// In-memory agent state — persists as long as the Node process is alive
let state = {
  running:         false,
  lastCycleAt:     null,   // ISO string
  cyclesCompleted: 0,
  lastSymbol:      null,
  lastError:       null,
};

// POST /api/agent/heartbeat  — called by Python agent every symbol cycle
// Body: { symbol?: string, cyclesCompleted?: number, error?: string }
// Protected by requireApiKey in index.js
router.post("/heartbeat", (req, res) => {
  const { symbol, cyclesCompleted, error } = req.body || {};

  state.running         = true;
  state.lastCycleAt     = new Date().toISOString();
  state.lastSymbol      = symbol  || state.lastSymbol;
  state.lastError       = error   || null;

  // Accept the agent's own counter if provided, otherwise increment
  if (typeof cyclesCompleted === "number") {
    state.cyclesCompleted = cyclesCompleted;
  } else {
    state.cyclesCompleted += 1;
  }

  res.json({ ok: true, state });
});

// GET /api/agent/status  — polled by App.jsx every 10s
// Returns running=false if no heartbeat received in last 10 minutes
router.get("/status", (req, res) => {
  const STALE_MS = 10 * 60 * 1000; // 10 minutes

  const isStale = !state.lastCycleAt ||
    (Date.now() - new Date(state.lastCycleAt).getTime() > STALE_MS);

  res.json({
    ...state,
    running: state.running && !isStale,
  });
});

module.exports = router;