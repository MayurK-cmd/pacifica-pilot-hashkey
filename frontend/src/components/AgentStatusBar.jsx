import { useState, useEffect } from "react";
import { useApi } from "../useApi";
import { motion } from "framer-motion";

export default function AgentStatusBar() {
  const api = useApi();
  const PACIFICA_BLUE = "#00d1ff";

  const [status,   setStatus]   = useState(null);
  const [enabled,  setEnabled]  = useState(null);
  const [toggling, setToggling] = useState(false);
  const [error,    setError]    = useState("");

  useEffect(() => {
    api.get("/api/config").then(cfg => setEnabled(cfg.enabled)).catch(() => {});
  }, [api]);

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

  const isRunning = status?.running ?? false;
  const dotColor = !enabled ? "#3f3f46" : isRunning ? PACIFICA_BLUE : "#f59e0b";

  return (
    <div className="flex items-center justify-between px-8 py-3 border-b border-[#1a2b3b] bg-black/30 font-mono text-[11px] uppercase tracking-wider">
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-3">
          <motion.span 
            animate={isRunning ? { opacity: [1, 0.4, 1], scale: [1, 1.2, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: dotColor, boxShadow: isRunning ? `0 0 12px ${PACIFICA_BLUE}` : 'none' }}
          />
          <span className="text-white font-bold">
            Agent: {!enabled ? "Offline" : isRunning ? `Active — ${status?.lastSymbol}` : "Standby"}
          </span>
        </div>
        {isRunning && (
          <span className="text-zinc-600 border-l border-[#1a2b3b] pl-5">
            {status?.cyclesCompleted} cycles · last_{status?.lastCycleAt ? new Date(status.lastCycleAt).toLocaleTimeString() : "—"}
          </span>
        )}
      </div>

      <div className="flex items-center gap-6">
        {error && <span className="text-red-500 font-bold">⚠ {error}</span>}
        <div className="flex items-center gap-4">
          <span className="text-zinc-500 font-black">{enabled ? "Disable" : "Enable"}_Core</span>
          <button
            onClick={toggle}
            disabled={toggling || enabled === null}
            className={`w-12 h-6 border flex items-center px-1 transition-all ${enabled ? 'border-[#00d1ff] bg-[#00d1ff11]' : 'border-zinc-800 bg-transparent'}`}
          >
            <motion.div 
              animate={{ x: enabled ? 24 : 0 }}
              className={`w-4 h-4 shadow-lg ${enabled ? 'bg-[#00d1ff]' : 'bg-zinc-800'}`} 
            />
          </button>
        </div>
      </div>
    </div>
  );
}