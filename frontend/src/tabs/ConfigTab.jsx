import { useState, useEffect, useMemo } from "react";
import { useApi } from "../useApi";
import { motion, AnimatePresence } from "framer-motion";

const PACIFICA_API = "https://test-api.pacifica.fi/api/v1";
const getIcon = (sym) => `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/white/${sym.toLowerCase()}.png`;

const INTERVALS = [
  { v: 60, l: "1 MIN" },
  { v: 300, l: "5 MIN" },
  { v: 900, l: "15 MIN" },
  { v: 3600, l: "1 HOUR" },
];

export default function ConfigTab() {
  const api = useApi();
  const [cfg, setCfg] = useState(null);
  const [allSymbols, setAllSymbols] = useState([]);
  const [visibleCount, setVisibleCount] = useState(60); 
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get("/api/config").then(setCfg).catch(() => {});

    fetch(`${PACIFICA_API}/info/prices`)
      .then(r => r.json())
      .then(raw => {
        const syms = (raw?.data || []).map(i => i.symbol).filter(Boolean).sort();
        setAllSymbols(syms);
      })
      .catch(() => {
        setAllSymbols(["BTC", "ETH", "SOL", "WIF", "JUP", "PYTH", "NEAR", "AVAX", "TIA", "AR"]);
      });
  }, []);

  const update = (k, v) => setCfg(c => ({ ...c, [k]: v }));
  
  const toggleSym = (sym) => {
    const cur = cfg.symbols;
    if (cur.includes(sym)) {
      if (cur.length === 1) return;
      update("symbols", cur.filter(s => s !== sym));
    } else {
      if (cur.length >= 10) return;
      update("symbols", [...cur, sym]);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.post("/api/config", cfg);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { 
      console.error("Config Sync Error:", e); 
    } finally { 
      setSaving(false); 
    }
  };

  const visibleSymbols = useMemo(() => allSymbols.slice(0, visibleCount), [allSymbols, visibleCount]);

  if (!cfg) return (
    <div className="p-20 font-mono text-zinc-500 uppercase tracking-[0.5em] animate-pulse text-center">
      Synchronizing_Protocol_Invariants...
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl space-y-20 pb-32">
      
      {/* 1. Technical Disclaimer */}
      <div className="border border-yellow-900/50 bg-yellow-900/5 p-6 font-mono relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-yellow-600" />
        <div className="flex items-center gap-4 text-yellow-500 mb-2 uppercase text-[10px] font-black tracking-widest">
           <span className="animate-pulse">⚠</span> Safety_Protocol_Notice
        </div>
        <p className="text-zinc-300 text-[11px] leading-relaxed uppercase">
          ATTENTION: Add only those crypto assets which you currently own or have collateralized on Pacifica. 
          Adding random assets may trigger unintended liquidations or margin calls during high volatility.
        </p>
      </div>

      {/* 2. System Status Array */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MasterToggle label="Autonomous_Core" active={cfg.enabled} onToggle={() => update("enabled", !cfg.enabled)} />
        <MasterToggle label="Simulation_Mode" active={cfg.dryRun} onToggle={() => update("dryRun", !cfg.dryRun)} />
        <MasterToggle label="Hot_Swap_Binance" active={cfg.useBinanceFallback} onToggle={() => update("useBinanceFallback", !cfg.useBinanceFallback)} />
      </div>

      {/* 3. Market Matrix */}
      <section>
        <div className="flex justify-between items-end mb-10 border-b border-zinc-800 pb-6">
          <h3 className="text-zinc-400 text-[11px] font-mono uppercase tracking-[0.5em] italic">// Available_DEX_Markets</h3>
          <span className="text-[10px] text-white font-bold font-mono uppercase tracking-[0.2em]">Active_Selection: {cfg.symbols.length}/10</span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {visibleSymbols.map(s => {
            const isActive = cfg.symbols.includes(s);
            return (
              <motion.button
                key={s}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleSym(s)}
                className={`flex items-center gap-3 px-5 py-3 text-[11px] font-black border transition-all ${
                  isActive 
                  ? "bg-[#00d1ff] text-black border-[#00d1ff] shadow-[0_0_25px_rgba(0,209,255,0.3)]" 
                  : "border-zinc-800 text-zinc-400 hover:border-[#00d1ff] hover:text-[#00d1ff] bg-zinc-900/10"
                }`}
              >
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center p-0.5 ${isActive ? 'border-black' : 'border-zinc-800'}`}>
                  <img src={getIcon(s)} alt="" onError={(e) => e.target.style.display = 'none'} className={`w-full h-full object-contain ${isActive ? 'invert' : ''}`} />
                </div>
                <span className="tracking-widest uppercase">{s}</span>
              </motion.button>
            );
          })}
        </div>

        {allSymbols.length > visibleCount && (
          <div className="mt-12 text-center">
            <button 
              onClick={() => setVisibleCount(prev => prev + 60)}
              className="text-[10px] font-mono text-zinc-400 hover:text-[#00d1ff] border border-zinc-800 px-8 py-3 uppercase tracking-[0.3em] transition-all"
            >
              Load_Additional_Assets_({allSymbols.length - visibleCount}_Remaining)
            </button>
          </div>
        )}
      </section>

      {/* 4. Interval & Risk Strategy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-6">
          <h4 className="text-[10px] text-zinc-500 uppercase tracking-[0.5em] font-mono italic mb-4">// Loop_Interval_Protocol</h4>
          <div className="flex gap-2">
            {INTERVALS.map(opt => (
              <button
                key={opt.v}
                onClick={() => update("loopIntervalSeconds", opt.v)}
                className={`flex-1 py-3 text-[10px] font-black border transition-all ${
                  cfg.loopIntervalSeconds === opt.v ? "bg-white text-black border-white" : "border-zinc-800 text-zinc-500 hover:border-zinc-600"
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="text-[10px] text-zinc-500 uppercase tracking-[0.5em] font-mono italic mb-4">// Logic_Risk_Profile</h4>
          <select 
            value={cfg.riskLevel} 
            onChange={e => update("riskLevel", e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 p-3 text-white text-[10px] font-black uppercase tracking-widest focus:border-[#00d1ff] outline-none appearance-none"
          >
            <option value="conservative">Conservative</option>
            <option value="balanced">Balanced</option>
            <option value="aggressive">Aggressive</option>
          </select>
        </div>
      </div>

      {/* 5. Execution & Exit Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 border-y border-zinc-800 py-20 bg-zinc-900/5">
        <div className="space-y-16 p-8">
          <h4 className="text-[10px] text-zinc-400 uppercase tracking-[0.5em] font-mono italic mb-10 decoration-[#00d1ff] underline underline-offset-8">Exposure_Thresholds</h4>
          <ArchitectSlider label="Max Unit Exposure" value={`$${cfg.maxPositionUsdc}`} min={5} max={500} step={5} v={cfg.maxPositionUsdc} onChange={val => update("maxPositionUsdc", val)} />
          <ArchitectSlider label="Intelligence Confidence" value={`${Math.round(cfg.minConfidence * 100)}%`} min={50} max={95} step={5} v={cfg.minConfidence * 100} onChange={val => update("minConfidence", val / 100)} />
        </div>

        <div className="space-y-16 p-8 border-l border-zinc-800">
          <h4 className="text-[10px] text-zinc-400 uppercase tracking-[0.5em] font-mono italic mb-10 decoration-[#00d1ff] underline underline-offset-8">Risk_Mitigation</h4>
          <ArchitectSlider label="Stop Loss (Peak-to-Low)" value={`${cfg.stopLossPct}%`} min={0.5} max={10} step={0.5} v={cfg.stopLossPct} onChange={val => update("stopLossPct", val)} />
          <ArchitectSlider label="Take Profit (Peak-to-High)" value={`${cfg.takeProfitPct}%`} min={1} max={20} step={1} v={cfg.takeProfitPct} onChange={val => update("takeProfitPct", val)} />
        </div>
      </div>

      {/* 6. Deployment Button */}
      <button 
        onClick={save}
        disabled={saving}
        className={`w-full py-8 font-black uppercase tracking-[1em] text-sm transition-all border active:scale-[0.98] ${
          saved 
          ? "bg-green-500 text-black border-green-500 shadow-[0_0_40px_rgba(34,197,94,0.3)]" 
          : "bg-white text-black border-white hover:bg-[#00d1ff] hover:border-[#00d1ff] hover:text-black"
        }`}
      >
        {saving ? "PROPAGATING_PROTOCOL_SYNC..." : saved ? "✓ CONFIG_DEPLOYED" : "COMMIT_SYSTEM_CHANGES"}
      </button>
    </motion.div>
  );
}

function MasterToggle({ label, active, onToggle }) {
  return (
    <button onClick={onToggle} className={`p-10 border flex flex-col gap-8 transition-all group ${active ? 'bg-zinc-900 border-[#00d1ff]' : 'bg-black border-zinc-900 hover:border-[#00d1ff]'}`}>
      <span className={`text-[10px] font-black uppercase tracking-[0.4em] font-mono text-center w-full ${active ? 'text-[#00d1ff]' : 'text-zinc-500 group-hover:text-[#00d1ff]'}`}>{label}</span>
      <div className={`w-full h-10 border flex items-center px-1 transition-colors ${active ? 'border-[#00d1ff] bg-[#00d1ff11]' : 'border-zinc-800'}`}>
        <motion.div animate={{ x: active ? '340%' : '0%' }} className={`w-1/5 h-6 shadow-md ${active ? 'bg-[#00d1ff]' : 'bg-zinc-800'}`} />
      </div>
    </button>
  );
}

function ArchitectSlider({ label, value, min, max, step, v, onChange }) {
  return (
    <div className="space-y-10">
      <div className="flex justify-between font-mono text-[11px] uppercase tracking-[0.3em]">
        <span className="text-zinc-400">{label}</span>
        <span className="text-white font-black italic underline underline-offset-4 decoration-[#00d1ff]">{value}</span>
      </div>
      <input 
        type="range" min={min} max={max} step={step} value={v} 
        onChange={e => onChange(+e.target.value)}
        className="w-full accent-[#00d1ff] bg-zinc-900 h-1 appearance-none cursor-crosshair border border-zinc-800 hover:bg-zinc-800 transition-colors" 
      />
    </div>
  );
}