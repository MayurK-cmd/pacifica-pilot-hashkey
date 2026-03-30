import { useState, useEffect } from "react";
import { useApi } from "../useApi";

const PACIFICA_API  = "https://test-api.pacifica.fi/api/v1";
const INTERVALS     = [
  { v: 60,   l: "1 min"  },
  { v: 300,  l: "5 min"  },
  { v: 900,  l: "15 min" },
  { v: 3600, l: "1 hour" },
];
const DEFAULT = {
  symbols:             ["BTC", "ETH"],
  loopIntervalSeconds: 300,
  maxPositionUsdc:     50,
  minConfidence:       0.6,
  dryRun:              true,
  riskLevel:           "balanced",
  stopLossPct:         3.0,
  takeProfitPct:       6.0,
  useBinanceFallback:  true,
  enabled:             false,
};

export default function ConfigTab() {
  const api = useApi();

  const [cfg,         setCfg]         = useState(DEFAULT);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [error,       setError]       = useState("");
  const [allSymbols,  setAllSymbols]  = useState([]);
  const [symLoading,  setSymLoading]  = useState(true);
  const [symError,    setSymError]    = useState("");

  // Load user config from backend
  useEffect(() => {
    api.get("/api/config")
      .then(c => setCfg({ ...DEFAULT, ...c }))
      .catch(() => {});
  }, []);

  // Fetch live tradeable symbols from Pacifica API
  useEffect(() => {
    setSymLoading(true);
    setSymError("");
    fetch(`${PACIFICA_API}/info/prices`)
      .then(r => r.json())
      .then(raw => {
        // Response is { success, data: [ { symbol, mark, ... }, ... ] }
        const items = raw?.data || raw || [];
        const syms  = items
          .map(item => item?.symbol || item?.ticker || "")
          .filter(Boolean)
          .sort();
        if (syms.length === 0) throw new Error("No symbols returned");
        setAllSymbols(syms);
      })
      .catch(e => {
        setSymError("Could not load symbols from Pacifica — showing defaults");
        // Fallback: known Pacifica symbols as of March 2026
        setAllSymbols([
          "BTC","ETH","SOL","AVAX","BNB","ARB","OP","MATIC",
          "DOGE","LINK","SUI","APT","INJ","TIA","SEI","WIF",
          "JUP","PYTH","kBONK","kPEPE","NEAR","FTM","LTC",
          "XRP","ADA","DOT","ATOM","SAND","MANA","GMX",
        ]);
      })
      .finally(() => setSymLoading(false));
  }, []);

  const update    = (k, v) => setCfg(c => ({ ...c, [k]: v }));

  const toggleSym = (sym) => {
    const cur = cfg.symbols;
    if (cur.includes(sym)) {
      if (cur.length === 1) return; // must keep at least one
      update("symbols", cur.filter(s => s !== sym));
    } else {
      if (cur.length >= 10) return; // cap at 10 symbols
      update("symbols", [...cur, sym]);
    }
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await api.post("/api/config", cfg);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2>Agent config</h2>

      {/* ── Agent control ──────────────────────────────────────────── */}
      <section>
        <h3>Agent control</h3>
        <label>
          <input
            type="checkbox"
            checked={cfg.enabled}
            onChange={e => update("enabled", e.target.checked)}
          />
          {" "}Enabled
        </label>
        {"  "}
        <label>
          <input
            type="checkbox"
            checked={cfg.dryRun}
            onChange={e => update("dryRun", e.target.checked)}
          />
          {" "}Dry run (simulate only — no real orders)
        </label>
        {"  "}
        <label>
          <input
            type="checkbox"
            checked={cfg.useBinanceFallback}
            onChange={e => update("useBinanceFallback", e.target.checked)}
          />
          {" "}Binance kline fallback
        </label>
      </section>

      {/* ── Markets ────────────────────────────────────────────────── */}
      <section>
        <h3>
          Markets
          {symLoading && (
            <span style={{ fontSize: "12px", color: "var(--text)", marginLeft: "8px" }}>
              Loading from Pacifica...
            </span>
          )}
        </h3>

        {symError && (
          <p style={{ fontSize: "12px", color: "#f59e0b", margin: "0 0 8px" }}>
            ⚠ {symError}
          </p>
        )}

        <p style={{ fontSize: "12px", color: "var(--text)", margin: "0 0 8px" }}>
          Selected: {cfg.symbols.join(", ")} ({cfg.symbols.length}/10 max)
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {allSymbols.map(s => {
            const selected = cfg.symbols.includes(s);
            return (
              <button
                key={s}
                onClick={() => toggleSym(s)}
                style={{
                  padding:      "4px 10px",
                  borderRadius: "6px",
                  border:       `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                  background:   selected ? "var(--accent-bg)" : "transparent",
                  color:        selected ? "var(--accent)" : "var(--text)",
                  fontWeight:   selected ? 600 : 400,
                  fontSize:     "13px",
                  cursor:       "pointer",
                  transition:   "all 0.15s",
                }}
              >
                {s}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Loop interval ──────────────────────────────────────────── */}
      <section>
        <h3>Loop interval</h3>
        <div style={{ display: "flex", gap: "8px" }}>
          {INTERVALS.map(i => (
            <button
              key={i.v}
              onClick={() => update("loopIntervalSeconds", i.v)}
              disabled={cfg.loopIntervalSeconds === i.v}
              style={{
                padding:      "4px 12px",
                borderRadius: "6px",
                border:       "1px solid var(--border)",
                background:   cfg.loopIntervalSeconds === i.v ? "var(--accent-bg)" : "transparent",
                color:        cfg.loopIntervalSeconds === i.v ? "var(--accent)" : "var(--text)",
                cursor:       cfg.loopIntervalSeconds === i.v ? "default" : "pointer",
              }}
            >
              {i.l}
            </button>
          ))}
        </div>
      </section>

      {/* ── Position sizing ────────────────────────────────────────── */}
      <section>
        <h3>Position sizing</h3>
        <label style={{ display: "block", marginBottom: "12px" }}>
          Max position USDC: <strong>${cfg.maxPositionUsdc}</strong>
          <br />
          <input
            type="range" min={5} max={500} step={5}
            value={cfg.maxPositionUsdc}
            onChange={e => update("maxPositionUsdc", +e.target.value)}
            style={{ width: "100%", maxWidth: "300px" }}
          />
        </label>
        <label style={{ display: "block" }}>
          Min confidence: <strong>{Math.round(cfg.minConfidence * 100)}%</strong>
          <br />
          <input
            type="range" min={50} max={95} step={5}
            value={Math.round(cfg.minConfidence * 100)}
            onChange={e => update("minConfidence", e.target.value / 100)}
            style={{ width: "100%", maxWidth: "300px" }}
          />
        </label>
      </section>

      {/* ── Risk management ────────────────────────────────────────── */}
      <section>
        <h3>Risk management</h3>
        <label style={{ display: "block", marginBottom: "12px" }}>
          Risk level:{" "}
          <select
            value={cfg.riskLevel}
            onChange={e => update("riskLevel", e.target.value)}
          >
            <option value="conservative">Conservative</option>
            <option value="balanced">Balanced</option>
            <option value="aggressive">Aggressive</option>
          </select>
        </label>
        <label style={{ display: "block", marginBottom: "12px" }}>
          Stop-loss: <strong>{cfg.stopLossPct}%</strong>
          <br />
          <input
            type="range" min={0.5} max={10} step={0.5}
            value={cfg.stopLossPct}
            onChange={e => update("stopLossPct", +e.target.value)}
            style={{ width: "100%", maxWidth: "300px" }}
          />
        </label>
        <label style={{ display: "block" }}>
          Take-profit: <strong>{cfg.takeProfitPct}%</strong>
          <br />
          <input
            type="range" min={1} max={20} step={0.5}
            value={cfg.takeProfitPct}
            onChange={e => update("takeProfitPct", +e.target.value)}
            style={{ width: "100%", maxWidth: "300px" }}
          />
        </label>
      </section>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <button
        onClick={save}
        disabled={saving}
        style={{
          marginTop:    "16px",
          padding:      "8px 24px",
          borderRadius: "8px",
          border:       "none",
          background:   "var(--accent)",
          color:        "#fff",
          cursor:       saving ? "wait" : "pointer",
          fontWeight:   600,
        }}
      >
        {saving ? "Saving..." : saved ? "✓ Saved!" : "Save config"}
      </button>
    </div>
  );
}