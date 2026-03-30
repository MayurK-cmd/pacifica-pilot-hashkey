import { useState, useEffect, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function LogsTab() {
  const [logs,  setLogs]  = useState([]);
  const logRef  = useRef(null);
  const autoRef = useRef(true);

  useEffect(() => {
    fetch(`${API}/api/logs?limit=200`)
      .then(r => r.json())
      .then(entries => setLogs(entries.map(e => e.line)))
      .catch(() => {});

    const es = new EventSource(`${API}/api/logs/stream`);
    es.onmessage = (e) => {
      try {
        const { line } = JSON.parse(e.data);
        setLogs(prev => {
          const next = [...prev, line];
          return next.length > 500 ? next.slice(-500) : next;
        });
      } catch {}
    };
    return () => es.close();
  }, []);

  useEffect(() => {
    if (autoRef.current && logRef.current)
      logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>{logs.length} lines — live via SSE</span>
        <div>
          <button onClick={() => {
            autoRef.current = true;
            if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
          }}>Scroll to bottom</button>
          <button onClick={() => setLogs([])}>Clear</button>
        </div>
      </div>

      <div
        ref={logRef}
        onScroll={() => {
          if (!logRef.current) return;
          const { scrollTop, scrollHeight, clientHeight } = logRef.current;
          autoRef.current = scrollHeight - scrollTop - clientHeight < 40;
        }}
        style={{ height: "60vh", overflowY: "auto", fontFamily: "monospace", fontSize: "12px", whiteSpace: "pre-wrap", wordBreak: "break-all" }}
      >
        {logs.length === 0
          ? <span>Waiting for agent output...</span>
          : logs.map((line, i) => <div key={i}>{line}</div>)
        }
      </div>
    </div>
  );
}