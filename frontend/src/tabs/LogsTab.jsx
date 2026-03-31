import { useState, useEffect, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
const PACIFICA_BLUE = "#00d1ff";

export default function LogsTab() {
  const [logs, setLogs] = useState([]);
  const logRef = useRef(null);
  const autoRef = useRef(true);

  useEffect(() => {
    fetch(`${API}/api/logs?limit=200`).then(r => r.json()).then(entries => setLogs(entries.map(e => e.line))).catch(() => {});
    const es = new EventSource(`${API}/api/logs/stream`);
    es.onmessage = (e) => {
      try {
        const { line } = JSON.parse(e.data);
        setLogs(prev => { const next = [...prev, line]; return next.length > 500 ? next.slice(-500) : next; });
      } catch {}
    };
    return () => es.close();
  }, []);

  useEffect(() => { if (autoRef.current && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [logs]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
        <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest italic">{logs.length} LINES_BUFFERED // LIVE_SSE</span>
        <div className="flex gap-4">
          <button onClick={() => { autoRef.current = true; if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }}
            className="text-[10px] font-black uppercase text-zinc-500 hover:text-[#00d1ff] transition-colors">Snap_To_Bottom</button>
          <button onClick={() => setLogs([])} className="text-[10px] font-black uppercase text-red-900 hover:text-red-500 transition-colors">Clear_Buffer</button>
        </div>
      </div>

      <div
        ref={logRef} onScroll={() => { if (!logRef.current) return; const { scrollTop, scrollHeight, clientHeight } = logRef.current; autoRef.current = scrollHeight - scrollTop - clientHeight < 40; }}
        className="h-[65vh] overflow-y-auto font-mono text-[11px] p-6 bg-zinc-950/50 border border-zinc-900 custom-scrollbar selection:bg-[#00d1ff] selection:text-black"
        style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}
      >
        {logs.length === 0 ? <span className="text-zinc-700 animate-pulse uppercase tracking-widest">Waiting_For_Inference_Cycle...</span>
          : logs.map((line, i) => (
            <div key={i} className="mb-1 text-zinc-400 hover:text-white transition-colors border-l border-zinc-900 pl-4 hover:border-[#00d1ff]">
              <span className="text-zinc-800 mr-4">[{new Date().toLocaleTimeString()}]</span>
              {line}
            </div>
          ))
        }
      </div>
    </div>
  );
}