import { useState, useEffect, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
const KEY  = import.meta.env.VITE_AGENT_KEY || "";

const SYMBOLS   = ["BTC","ETH","SOL","ARB","OP","DOGE","AVAX","LINK","SUI","APT"];
const INTERVALS = [{v:60,l:"1 min"},{v:300,l:"5 min"},{v:900,l:"15 min"},{v:3600,l:"1 hour"}];

const DEFAULT_CFG = {
  symbols:             ["BTC","ETH"],
  loopIntervalSeconds: 300,
  maxPositionUsdc:     50,
  minConfidence:       0.6,
  dryRun:              true,
  stopLossPct:         3.0,
  takeProfitPct:       6.0,
  useBinanceFallback:  true,
  enabled:             false,
};

const ACTION_COLOR = {
  LONG:  { bg:"#052e16", border:"#16a34a", text:"#4ade80", dot:"#22c55e" },
  SHORT: { bg:"#450a0a", border:"#dc2626", text:"#f87171", dot:"#ef4444" },
  HOLD:  { bg:"#0c1a2e", border:"#1e3a5f", text:"#7dd3fc", dot:"#38bdf8" },
  EXIT:  { bg:"#431407", border:"#c2410c", text:"#fb923c", dot:"#f97316" },
};

function lineColor(line) {
  if (/LONG/.test(line))                         return "#4ade80";
  if (/SHORT/.test(line))                        return "#f87171";
  if (/EXIT/.test(line))                         return "#fb923c";
  if (/error|Error|failed|FALLBACK/i.test(line)) return "#f87171";
  if (/Sleeping/.test(line))                     return "#334155";
  if (/HOLD/.test(line))                         return "#94a3b8";
  if (/Price:|RSI|Funding/.test(line))           return "#7dd3fc";
  if (/Sentiment|Engagement/.test(line))         return "#a78bfa";
  if (/Gemini|Asking/.test(line))                return "#fbbf24";
  if (/Cycle #/.test(line))                      return "#38bdf8";
  if (/={3,}/.test(line))                        return "#1e3a5f";
  return "#475569";
}

function fmt(n, digits=2) {
  if (n == null) return "—";
  return Number(n).toFixed(digits);
}

function timeAgo(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)  return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  return `${Math.floor(diff/3600)}h ago`;
}

// ── Decision Card ─────────────────────────────────────────────────────────────
function DecisionCard({ t }) {
  const [open, setOpen] = useState(false);
  const ac = ACTION_COLOR[t.action] || ACTION_COLOR.HOLD;
  const conf = t.confidence != null ? Math.round(t.confidence * 100) : null;
  const isFallback = (t.reasoning || "").startsWith("[Fallback]");

  return (
    <div style={{
      background: ac.bg,
      border: `1px solid ${ac.border}`,
      borderRadius: "10px",
      marginBottom: "10px",
      overflow: "hidden",
      transition: "box-shadow 0.15s",
    }}>
      {/* Header row — always visible */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "12px 14px", cursor: "pointer",
        }}
      >
        {/* Action badge */}
        <span style={{
          background: ac.border, color: "#fff",
          padding: "2px 10px", borderRadius: "5px",
          fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em",
          flexShrink: 0,
        }}>{t.action}</span>

        {/* Symbol + price */}
        <span style={{ color: ac.text, fontWeight: 700, fontSize: "13px", flexShrink: 0 }}>
          {t.symbol}
        </span>
        <span style={{ color: "#94a3b8", fontSize: "12px", flexShrink: 0 }}>
          ${t.mark_price ? Number(t.mark_price).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) : "—"}
        </span>

        {/* Confidence bar */}
        {conf != null && (
          <div style={{ display:"flex", alignItems:"center", gap:"6px", flexShrink:0 }}>
            <div style={{ width:"60px", height:"4px", background:"#1e293b", borderRadius:"2px", overflow:"hidden" }}>
              <div style={{ width:`${conf}%`, height:"100%", background: ac.dot, borderRadius:"2px" }} />
            </div>
            <span style={{ color:"#64748b", fontSize:"11px" }}>{conf}%</span>
          </div>
        )}

        {/* Fallback badge */}
        {isFallback && (
          <span style={{ fontSize:"10px", color:"#64748b", background:"#0f172a", padding:"1px 7px", borderRadius:"4px", border:"1px solid #1e293b" }}>
            fallback
          </span>
        )}

        {/* PnL */}
        {t.pnl_usdc != null && (
          <span style={{ fontSize:"11px", color: t.pnl_usdc >= 0 ? "#4ade80" : "#f87171", marginLeft:"auto", flexShrink:0 }}>
            {t.pnl_usdc >= 0 ? "+" : ""}${fmt(t.pnl_usdc, 4)}
          </span>
        )}

        {/* Time */}
        <span style={{ color:"#334155", fontSize:"11px", marginLeft: t.pnl_usdc != null ? "8px" : "auto", flexShrink:0 }}>
          {timeAgo(t.createdAt)}
        </span>

        {/* Chevron */}
        <span style={{ color:"#334155", fontSize:"11px", marginLeft:"6px", transition:"transform 0.2s", transform: open?"rotate(180deg)":"rotate(0deg)" }}>▼</span>
      </div>

      {/* Expanded detail */}
      {open && (
        <div style={{ padding:"0 14px 14px", borderTop:`1px solid ${ac.border}22` }}>

          {/* Reasoning */}
          <div style={{
            background:"#050d18", border:"1px solid #1e293b",
            borderRadius:"7px", padding:"10px 12px",
            marginTop:"12px", marginBottom:"12px",
            fontSize:"12px", color:"#cbd5e1", lineHeight:1.7,
          }}>
            <div style={{ fontSize:"10px", color:"#334155", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"6px" }}>
              {isFallback ? "Rule-based reasoning" : "Gemini reasoning"}
            </div>
            {(t.reasoning || "No reasoning available.").replace("[Fallback] ", "").replace(/^(LONG|SHORT|HOLD|EXIT): /, "")}
          </div>

          {/* Metrics grid */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"8px" }}>
            <Metric label="RSI 5m"       value={fmt(t.rsi_14)}        accent={rsiColor(t.rsi_14)} />
            <Metric label="RSI 1h"       value={fmt(t.rsi_1h)}        accent={rsiColor(t.rsi_1h)} />
            <Metric label="Funding"      value={t.funding_rate != null ? t.funding_rate.toFixed(6) : "—"} />
            <Metric label="24h change"   value={t.change_24h != null ? `${fmt(t.change_24h)}%` : "—"} accent={t.change_24h > 0 ? "#4ade80" : t.change_24h < 0 ? "#f87171" : null} />
            <Metric label="Engagement"   value={fmt(t.sentiment_score, 3)} />
            <Metric label="Mentions"     value={t.mention_count ?? "—"} />
            <Metric label="Trending"     value={t.trending_score != null ? `${fmt(t.trending_score, 0)}/100` : "—"} />
            <Metric label="Size"         value={t.size_pct ? `${Math.round(t.size_pct*100)}%` : "—"} />
            <Metric label="Dry run"      value={t.dry_run ? "yes" : "live"} accent={t.dry_run ? "#38bdf8" : "#f59e0b"} />
          </div>

          {/* Open position */}
          {t.open_position && t.open_position !== "None" && (
            <div style={{ marginTop:"10px", fontSize:"11px", color:"#64748b" }}>
              Position at decision: <span style={{ color:"#94a3b8" }}>{t.open_position}</span>
              {t.unrealized_pnl && t.unrealized_pnl !== "N/A" && (
                <span style={{ marginLeft:"10px" }}>Unrealised: <span style={{ color:"#cbd5e1" }}>{t.unrealized_pnl}</span></span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, accent }) {
  return (
    <div style={{ background:"#080f1a", borderRadius:"6px", padding:"7px 10px" }}>
      <div style={{ fontSize:"10px", color:"#334155", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"3px" }}>{label}</div>
      <div style={{ fontSize:"13px", color: accent || "#7dd3fc", fontWeight:500 }}>{value}</div>
    </div>
  );
}

function rsiColor(v) {
  if (v == null) return null;
  if (v < 35)  return "#4ade80";
  if (v > 65)  return "#f87171";
  return "#94a3b8";
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [cfg,      setCfg]      = useState(DEFAULT_CFG);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [logs,     setLogs]     = useState([]);
  const [trades,   setTrades]   = useState([]);
  const [stats,    setStats]    = useState(null);
  const [status,   setStatus]   = useState(null);
  const [tab,      setTab]      = useState("config");
  const [symFilter,setSymFilter]= useState("ALL");
  const logRef  = useRef(null);
  const autoRef = useRef(true);

  // Load config
  useEffect(() => {
    fetch(`${API}/api/config`).then(r=>r.json()).then(c => setCfg({
      symbols:             c.symbols             ?? DEFAULT_CFG.symbols,
      loopIntervalSeconds: c.loopIntervalSeconds ?? DEFAULT_CFG.loopIntervalSeconds,
      maxPositionUsdc:     c.maxPositionUsdc     ?? DEFAULT_CFG.maxPositionUsdc,
      minConfidence:       c.minConfidence       ?? DEFAULT_CFG.minConfidence,
      dryRun:              c.dryRun              ?? DEFAULT_CFG.dryRun,
      stopLossPct:         c.stopLossPct         ?? DEFAULT_CFG.stopLossPct,
      takeProfitPct:       c.takeProfitPct       ?? DEFAULT_CFG.takeProfitPct,
      useBinanceFallback:  c.useBinanceFallback  ?? DEFAULT_CFG.useBinanceFallback,
      enabled:             c.enabled             ?? DEFAULT_CFG.enabled,
    })).catch(()=>{});
  }, []);

  // Agent status poll
  useEffect(() => {
    const poll = () => fetch(`${API}/api/agent/status`).then(r=>r.json()).then(setStatus).catch(()=>{});
    poll();
    const id = setInterval(poll, 10_000);
    return () => clearInterval(id);
  }, []);

  // SSE log stream
  useEffect(() => {
    fetch(`${API}/api/logs?limit=200`).then(r=>r.json())
      .then(entries => setLogs(entries.map(e=>e.line))).catch(()=>{});
    const es = new EventSource(`${API}/api/logs/stream`);
    es.onmessage = (e) => {
      try {
        const { line } = JSON.parse(e.data);
        setLogs(prev => { const n=[...prev,line]; return n.length>500?n.slice(-500):n; });
      } catch {}
    };
    return () => es.close();
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (autoRef.current && logRef.current)
      logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  // Load decisions when tab is active
  useEffect(() => {
    if (tab !== "decisions") return;
    const load = () => {
      const sym = symFilter !== "ALL" ? `&symbol=${symFilter}` : "";
      fetch(`${API}/api/trades?limit=100${sym}`).then(r=>r.json())
        .then(d => setTrades(d.trades || [])).catch(()=>{});
      fetch(`${API}/api/trades/stats`).then(r=>r.json())
        .then(setStats).catch(()=>{});
    };
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [tab, symFilter]);

  const update = (k,v) => setCfg(c=>({...c,[k]:v}));
  const toggleSym = (sym) => {
    const cur = cfg.symbols;
    if (cur.includes(sym)) { if (cur.length===1) return; update("symbols", cur.filter(s=>s!==sym)); }
    else update("symbols", [...cur, sym]);
  };

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/config`, {
        method:"POST",
        headers:{"Content-Type":"application/json","x-agent-key":KEY},
        body: JSON.stringify(cfg),
      });
      if (!r.ok) throw new Error(await r.text());
      setSaved(true); setTimeout(()=>setSaved(false), 2500);
    } catch(e) { alert("Save failed: "+e.message); }
    finally { setSaving(false); }
  };

  const alive = status?.running &&
    status?.lastCycleAt &&
    Date.now() - new Date(status.lastCycleAt).getTime() < 10*60*1000;

  const TABS = ["config","decisions","logs"];

  return (
    <div style={{ minHeight:"100vh", background:"#080f1a", color:"#e2e8f0", fontFamily:"'JetBrains Mono','Fira Code',monospace", fontSize:"13px" }}>

      {/* Topbar */}
      <div style={{ background:"#0d1a2d", borderBottom:"1px solid #1e3a5f", padding:"0 1.5rem", height:"48px", display:"flex", alignItems:"center", gap:"1.5rem" }}>
        <span style={{ color:"#38bdf8", fontWeight:700, fontSize:"15px", letterSpacing:"0.08em" }}>◆ PACIFICAPILOT</span>
        <div style={{ display:"flex", gap:"0.25rem" }}>
          {TABS.map(t => (
            <button key={t} onClick={()=>setTab(t)} style={{
              background: tab===t?"#1e3a5f":"transparent", border:"none",
              color: tab===t?"#38bdf8":"#475569",
              padding:"0.3rem 1rem", borderRadius:"6px", cursor:"pointer",
              fontFamily:"inherit", fontSize:"12px",
              textTransform:"uppercase", letterSpacing:"0.06em",
            }}>{t}</button>
          ))}
        </div>
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:"10px" }}>
          <span style={{ width:"8px", height:"8px", borderRadius:"50%", background:alive?"#22c55e":"#475569", display:"inline-block" }} />
          <span style={{ color:alive?"#22c55e":"#475569", fontSize:"11px" }}>
            {alive ? `RUNNING · cycle #${status?.cyclesCompleted}` : "OFFLINE"}
          </span>
          {cfg.dryRun && <span style={{ fontSize:"10px", padding:"1px 8px", background:"#1e3a5f", color:"#38bdf8", borderRadius:"20px", border:"0.5px solid #38bdf8" }}>DRY RUN</span>}
        </div>
      </div>

      {/* ── CONFIG TAB ───────────────────────────────────────────────────── */}
      {tab === "config" && (
        <div style={{ maxWidth:"680px", margin:"0 auto", padding:"2rem 1rem" }}>

          <Section title="Agent control">
            <Row label="Agent enabled" desc="Start/stop the agent loop">
              <Toggle value={cfg.enabled} onChange={v=>update("enabled",v)} color="#22c55e" />
            </Row>
            <Row label="Dry run" desc="Simulate orders, no real execution">
              <Toggle value={cfg.dryRun} onChange={v=>update("dryRun",v)} color="#38bdf8" />
            </Row>
            <Row label="Binance kline fallback" desc="Use Binance for RSI when Pacifica /kline is unavailable">
              <Toggle value={cfg.useBinanceFallback} onChange={v=>update("useBinanceFallback",v)} color="#a78bfa" />
            </Row>
          </Section>

          <Section title="Markets">
            <Label>Symbols to trade</Label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"0.5rem", marginBottom:"0.5rem" }}>
              {SYMBOLS.map(s => (
                <button key={s} onClick={()=>toggleSym(s)} style={{
                  padding:"0.25rem 0.75rem", borderRadius:"6px",
                  border:`1px solid ${cfg.symbols.includes(s)?"#38bdf8":"#1e3a5f"}`,
                  background:cfg.symbols.includes(s)?"#1e3a5f":"#0a1628",
                  color:cfg.symbols.includes(s)?"#38bdf8":"#475569",
                  cursor:"pointer", fontFamily:"inherit", fontSize:"12px",
                  fontWeight:cfg.symbols.includes(s)?700:400,
                }}>{s}</button>
              ))}
            </div>
            <Hint>Selected: {cfg.symbols.join(", ")}</Hint>
          </Section>

          <Section title="Timing">
            <Label>Loop interval</Label>
            <div style={{ display:"flex", gap:"0.5rem" }}>
              {INTERVALS.map(i => (
                <button key={i.v} onClick={()=>update("loopIntervalSeconds",i.v)} style={{
                  padding:"0.25rem 0.75rem", borderRadius:"6px",
                  border:`1px solid ${cfg.loopIntervalSeconds===i.v?"#38bdf8":"#1e3a5f"}`,
                  background:cfg.loopIntervalSeconds===i.v?"#1e3a5f":"#0a1628",
                  color:cfg.loopIntervalSeconds===i.v?"#38bdf8":"#475569",
                  cursor:"pointer", fontFamily:"inherit", fontSize:"12px",
                }}>{i.l}</button>
              ))}
            </div>
          </Section>

          <Section title="Position sizing">
            <SliderRow label="Max position (USDC)" value={cfg.maxPositionUsdc} min={5} max={500} step={5}
              format={v=>`$${v}`} onChange={v=>update("maxPositionUsdc",v)} />
            <SliderRow label="Min confidence to trade" value={Math.round(cfg.minConfidence*100)} min={50} max={95} step={5}
              format={v=>`${v}%`} onChange={v=>update("minConfidence",v/100)} />
          </Section>

          <Section title="Risk management">
            <SliderRow label="Stop-loss" value={cfg.stopLossPct} min={0.5} max={10} step={0.5}
              format={v=>`${v}%`} onChange={v=>update("stopLossPct",v)} color="#ef4444" />
            <SliderRow label="Take-profit" value={cfg.takeProfitPct} min={1} max={20} step={0.5}
              format={v=>`${v}%`} onChange={v=>update("takeProfitPct",v)} color="#22c55e" />
            <Hint>Agent auto-closes positions when price moves −{cfg.stopLossPct}% / +{cfg.takeProfitPct}% from entry</Hint>
          </Section>

          <button onClick={save} disabled={saving} style={{
            width:"100%", padding:"0.75rem",
            background:saved?"#14532d":"#1d4ed8",
            border:"none", borderRadius:"8px", color:"#fff",
            fontSize:"13px", fontFamily:"inherit", fontWeight:700,
            cursor:saving?"not-allowed":"pointer", opacity:saving?0.7:1, letterSpacing:"0.04em",
          }}>
            {saving?"Saving...":saved?"✓ Saved — agent picks up on next cycle":"Save configuration"}
          </button>

          {/* .env preview */}
          <div style={{ marginTop:"1.5rem", background:"#0a1628", border:"1px solid #1e3a5f", borderRadius:"8px", padding:"1rem", fontSize:"11px", color:"#475569", lineHeight:1.8 }}>
            <div style={{ color:"#334155", marginBottom:"0.4rem", fontSize:"10px", letterSpacing:"0.08em", textTransform:"uppercase" }}>Equivalent .env</div>
            {[
              `TRADE_SYMBOLS=${cfg.symbols.join(",")}`,
              `LOOP_INTERVAL_SECONDS=${cfg.loopIntervalSeconds}`,
              `MAX_POSITION_USDC=${cfg.maxPositionUsdc}`,
              `MIN_CONFIDENCE=${cfg.minConfidence}`,
              `DRY_RUN=${cfg.dryRun}`,
              `STOP_LOSS_PCT=${cfg.stopLossPct}`,
              `TAKE_PROFIT_PCT=${cfg.takeProfitPct}`,
              `USE_BINANCE_KLINE_FALLBACK=${cfg.useBinanceFallback}`,
            ].map(l=><div key={l} style={{ color:"#64748b" }}>{l}</div>)}
          </div>
        </div>
      )}

      {/* ── DECISIONS TAB ────────────────────────────────────────────────── */}
      {tab === "decisions" && (
        <div style={{ maxWidth:"760px", margin:"0 auto", padding:"1.5rem 1rem" }}>

          {/* Stats row */}
          {stats && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"8px", marginBottom:"16px" }}>
              {[
                { label:"Total decisions", value: stats.totalDecisions ?? 0 },
                { label:"LONG",  value: stats.byAction?.LONG  ?? 0, color:"#4ade80" },
                { label:"SHORT", value: stats.byAction?.SHORT ?? 0, color:"#f87171" },
                { label:"Realised PnL", value: stats.totalPnlUsdc != null ? `$${Number(stats.totalPnlUsdc).toFixed(4)}` : "—", color: stats.totalPnlUsdc >= 0 ? "#4ade80" : "#f87171" },
              ].map(s=>(
                <div key={s.label} style={{ background:"#0d1a2d", border:"1px solid #1e3a5f", borderRadius:"8px", padding:"10px 14px" }}>
                  <div style={{ fontSize:"10px", color:"#334155", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"4px" }}>{s.label}</div>
                  <div style={{ fontSize:"18px", fontWeight:700, color: s.color||"#7dd3fc" }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Symbol filter */}
          <div style={{ display:"flex", gap:"6px", marginBottom:"14px", flexWrap:"wrap" }}>
            {["ALL", ...cfg.symbols].map(s=>(
              <button key={s} onClick={()=>setSymFilter(s)} style={{
                padding:"3px 12px", borderRadius:"5px", border:`1px solid ${symFilter===s?"#38bdf8":"#1e3a5f"}`,
                background:symFilter===s?"#1e3a5f":"transparent",
                color:symFilter===s?"#38bdf8":"#475569",
                cursor:"pointer", fontFamily:"inherit", fontSize:"11px",
              }}>{s}</button>
            ))}
          </div>

          {/* Cards */}
          {trades.length === 0
            ? <div style={{ color:"#1e3a5f", textAlign:"center", marginTop:"60px" }}>No decisions recorded yet — start the agent to see results here.</div>
            : trades.map(t => <DecisionCard key={t._id} t={t} />)
          }
        </div>
      )}

      {/* ── LOGS TAB ─────────────────────────────────────────────────────── */}
      {tab === "logs" && (
        <div style={{ padding:"0 1rem 1rem" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0.75rem 0" }}>
            <span style={{ color:"#475569", fontSize:"11px" }}>{logs.length} lines — streaming live via SSE</span>
            <div style={{ display:"flex", gap:"0.5rem" }}>
              <button onClick={()=>{ autoRef.current=true; if(logRef.current) logRef.current.scrollTop=logRef.current.scrollHeight; }}
                style={{ background:"#1e3a5f", border:"none", color:"#38bdf8", padding:"0.25rem 0.75rem", borderRadius:"6px", cursor:"pointer", fontFamily:"inherit", fontSize:"11px" }}>
                scroll to bottom
              </button>
              <button onClick={()=>setLogs([])}
                style={{ background:"#1a0a0a", border:"1px solid #7f1d1d", color:"#f87171", padding:"0.25rem 0.75rem", borderRadius:"6px", cursor:"pointer", fontFamily:"inherit", fontSize:"11px" }}>
                clear
              </button>
            </div>
          </div>
          <div ref={logRef}
            onScroll={()=>{
              if(!logRef.current) return;
              const {scrollTop,scrollHeight,clientHeight}=logRef.current;
              autoRef.current = scrollHeight-scrollTop-clientHeight < 40;
            }}
            style={{ background:"#050d18", border:"1px solid #1e293b", borderRadius:"8px", padding:"0.75rem 1rem", height:"calc(100vh - 130px)", overflowY:"auto", lineHeight:1.7, whiteSpace:"pre-wrap", wordBreak:"break-all" }}>
            {logs.length===0
              ? <span style={{ color:"#1e3a5f" }}>Waiting for agent output...</span>
              : logs.map((line,i)=>(
                <div key={i} style={{ color:lineColor(line), borderBottom:/={3,}/.test(line)?"1px solid #0d1a2d":"none", paddingBottom:/={3,}/.test(line)?"4px":"0", marginBottom:/={3,}/.test(line)?"4px":"0" }}>
                  {line}
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ background:"#0d1a2d", border:"1px solid #1e3a5f", borderRadius:"10px", padding:"1.25rem", marginBottom:"1rem" }}>
      <div style={{ fontSize:"11px", color:"#38bdf8", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"1rem", paddingBottom:"0.5rem", borderBottom:"1px solid #0a1628" }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, desc, children }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1rem" }}>
      <div>
        <div style={{ color:"#cbd5e1" }}>{label}</div>
        {desc && <div style={{ fontSize:"11px", color:"#475569", marginTop:"2px" }}>{desc}</div>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ value, onChange, color="#38bdf8" }) {
  return (
    <button onClick={()=>onChange(!value)} style={{
      width:"44px", height:"24px", borderRadius:"12px", border:"none",
      background:value?color:"#1e3a5f", cursor:"pointer", position:"relative", flexShrink:0, transition:"background 0.2s",
    }}>
      <span style={{ position:"absolute", top:"3px", left:value?"22px":"3px", width:"18px", height:"18px", borderRadius:"50%", background:"#fff", transition:"left 0.2s" }} />
    </button>
  );
}

function SliderRow({ label, value, min, max, step, format, onChange, color="#38bdf8" }) {
  return (
    <div style={{ marginBottom:"1.1rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"6px" }}>
        <span style={{ color:"#cbd5e1" }}>{label}</span>
        <span style={{ color, fontWeight:700 }}>{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e=>onChange(parseFloat(e.target.value))}
        style={{ width:"100%", accentColor:color }} />
    </div>
  );
}

function Label({ children }) {
  return <div style={{ fontSize:"11px", color:"#475569", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"8px" }}>{children}</div>;
}

function Hint({ children }) {
  return <div style={{ fontSize:"11px", color:"#334155", marginTop:"6px" }}>{children}</div>;
}