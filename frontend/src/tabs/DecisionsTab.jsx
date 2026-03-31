import { useState, useEffect } from "react";
import { useApi } from "../useApi";
import { motion } from "framer-motion";

export default function DecisionsTab() {
  const api = useApi();
  const [trades, setTrades] = useState([]);
  const [stats, setStats] = useState(null);
  const PACIFICA_BLUE = "#00d1ff";

  useEffect(() => {
    const load = () => {
      api.get("/api/trades?limit=100").then(d => setTrades(d.trades || [])).catch(() => {});
      api.get("/api/trades/stats").then(setStats).catch(() => {});
    };
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [api]);

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end border-b border-[#1a2b3b] pb-8">
        <h2 className="text-white text-3xl font-black uppercase tracking-tighter italic">Decision_Ledger</h2>
        {stats && (
          <div className="font-mono text-[11px] text-zinc-500 flex gap-8 uppercase tracking-[0.2em]">
            <span>PnL: <b style={{ color: PACIFICA_BLUE }}>${stats.totalPnlUsdc ?? 0}</b></span>
            <span>Total: <b className="text-white">{stats.totalDecisions}</b></span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {trades.length === 0 ? (
          <div className="p-20 text-center text-zinc-800 font-mono uppercase tracking-[0.5em]">Waiting_For_Inference_Cycle...</div>
        ) : (
          trades.map((t, i) => (
            <motion.div 
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              key={t._id} className="p-8 border border-[#1a2b3b] bg-zinc-950/20 hover:border-[#00d1ff] transition-all group cursor-default"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 text-[10px] font-black tracking-[0.2em] ${t.action === 'LONG' ? 'bg-green-500 text-black' : 'bg-red-500 text-black'}`}>{t.action}</span>
                  <span className="text-white font-black text-lg tracking-widest">{t.symbol}</span>
                  <span className="text-zinc-600 font-mono text-xs">@ ${t.mark_price?.toLocaleString()}</span>
                </div>
                <div className="text-right">
                  <span className="text-zinc-500 text-[10px] block font-mono">CONFIDENCE_ALPHA</span>
                  <span className="text-[#00d1ff] font-black italic text-lg">{Math.round((t.confidence || 0) * 100)}%</span>
                </div>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed border-l-2 border-zinc-900 pl-6 group-hover:border-[#00d1ff] transition-colors">{t.reasoning}</p>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}