const express = require("express");
const router  = express.Router();

// In-memory circular buffer — last 500 log lines
const MAX_LOGS = 500;
const logBuffer = [];
const sseClients = new Set();

function pushLog(line) {
  const entry = { ts: new Date().toISOString(), line };
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOGS) logBuffer.shift();
  // Broadcast to all SSE clients
  const data = `data: ${JSON.stringify(entry)}\n\n`;
  for (const res of sseClients) {
    try { res.write(data); } catch { sseClients.delete(res); }
  }
}

// POST /api/logs  — called by Python agent to push a log line
router.post("/", (req, res) => {
  const { line } = req.body;
  if (line) pushLog(String(line));
  res.json({ ok: true });
});

// GET /api/logs  — returns last N logs
router.get("/", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 200, MAX_LOGS);
  res.json(logBuffer.slice(-limit));
});

// GET /api/logs/stream  — SSE stream for live logs
router.get("/stream", (req, res) => {
  res.set({
    "Content-Type":  "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection":    "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  // Send last 50 lines on connect so client catches up
  const recent = logBuffer.slice(-50);
  for (const entry of recent) {
    res.write(`data: ${JSON.stringify(entry)}\n\n`);
  }

  sseClients.add(res);
  req.on("close", () => sseClients.delete(res));
});

module.exports = { router, pushLog };