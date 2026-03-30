import { useState, useEffect } from "react";
import { useApi } from "../useApi";

/**
 * AgentStatusBar — shows live agent status + enable/disable toggle.
 * Sits at the top of the Dashboard below the nav bar.
 *
 * - Polls /api/agent/status every 10s to show live/stale state
 * - Toggle calls /api/agent/toggle which sets Config.enabled in DB
 * - The Python agent picks up the change on its next 30s sleep cycle
 */
export default function AgentStatusBar() {
  const api = useApi();

  const [status,   setStatus]   = useState(null);   // from /api/agent/status
  const [enabled,  setEnabled]  = useState(null);   // from /api/config
  const [toggling, setToggling] = useState(false);
  const [error,    setError]    = useState("");

  // Load initial enabled state from config
  useEffect(() => {
    api.get("/api/config")
      .then(cfg => setEnabled(cfg.enabled))
      .catch(() => {});
  }, []);

  // Poll agent status every 10s
  useEffect(() => {
    const poll = () => {
      fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/agent/status`)
        .then(r => r.json())
        .then(s => setStatus(s))
        .catch(() => setStatus(null));
    };
    poll();
    const id = setInterval(poll, 10_000);
    return () => clearInterval(id);
  }, []);

  async function toggle() {
    if (toggling || enabled === null) return;
    setToggling(true);
    setError("");
    try {
      const res = await api.post("/api/agent/toggle", { enabled: !enabled });
      setEnabled(res.enabled);
    } catch (e) {
      setError(e.message);
    } finally {
      setToggling(false);
    }
  }

  // Derive display values
  const isRunning  = status?.running ?? false;
  const lastCycle  = status?.lastCycleAt
    ? new Date(status.lastCycleAt).toLocaleTimeString()
    : "Never";
  const cycles     = status?.cyclesCompleted ?? 0;
  const lastSymbol = status?.lastSymbol ?? "—";
  const lastError  = status?.lastError;

  // Status dot color:
  // green  = enabled + running (heartbeat fresh)
  // yellow = enabled + not running (agent offline / starting up)
  // grey   = disabled
  const dotColor = !enabled
    ? "#6b7280"
    : isRunning
      ? "#22c55e"
      : "#f59e0b";

  const statusLabel = !enabled
    ? "Disabled"
    : isRunning
      ? `Running — ${lastSymbol}`
      : "Enabled (agent offline)";

  return (
    <div style={{
      display:        "flex",
      alignItems:     "center",
      justifyContent: "space-between",
      padding:        "10px 20px",
      borderBottom:   "1px solid var(--border)",
      background:     "var(--code-bg)",
      fontSize:       "13px",
      gap:            "16px",
      flexWrap:       "wrap",
    }}>
      {/* Left — status indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {/* Pulsing dot */}
        <span style={{
          width:        "10px",
          height:       "10px",
          borderRadius: "50%",
          background:   dotColor,
          display:      "inline-block",
          boxShadow:    isRunning ? `0 0 0 3px ${dotColor}33` : "none",
          transition:   "background 0.3s",
        }} />

        <span style={{ color: "var(--text-h)", fontWeight: 500 }}>
          Agent: {statusLabel}
        </span>

        {isRunning && (
          <span style={{ color: "var(--text)", fontSize: "12px" }}>
            {cycles} cycles · last {lastCycle}
          </span>
        )}

        {lastError && (
          <span style={{ color: "#ef4444", fontSize: "12px" }}>
            ⚠ {lastError}
          </span>
        )}
      </div>

      {/* Right — toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {error && (
          <span style={{ color: "#ef4444", fontSize: "12px" }}>{error}</span>
        )}

        <span style={{ color: "var(--text)", fontSize: "12px" }}>
          {enabled ? "Disable" : "Enable"} agent
        </span>

        {/* Toggle switch */}
        <button
          onClick={toggle}
          disabled={toggling || enabled === null}
          style={{
            width:        "44px",
            height:       "24px",
            borderRadius: "12px",
            border:       "none",
            cursor:       toggling ? "wait" : "pointer",
            background:   enabled ? "var(--accent)" : "var(--border)",
            position:     "relative",
            transition:   "background 0.2s",
            padding:      0,
          }}
          title={enabled ? "Click to disable agent" : "Click to enable agent"}
        >
          <span style={{
            position:     "absolute",
            top:          "3px",
            left:         enabled ? "23px" : "3px",
            width:        "18px",
            height:       "18px",
            borderRadius: "50%",
            background:   "#fff",
            transition:   "left 0.2s",
            display:      "block",
          }} />
        </button>
      </div>
    </div>
  );
}