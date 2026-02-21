import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Cpu, MemoryStick, HardDrive, Play, Square, RotateCw, Skull, Network, Activity, Terminal } from "lucide-react";
import { useLocation } from "react-router";
import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';
import { BaseUrl } from "../../api/api";

// --- INTERFACES ---
interface LogEntry { text: string; stream: string; id: number; }
interface HistoryEntry { cpu: number; mem: number; }
interface ServerMetrics {
  cpu: { used: string };
  memory: { used: string; max: string };
  info: { status: string; ip: string };
}

// --- COMPONENTES ---
const MiniChart = ({ title, data, dataKey, color, currentLabel }: any) => (
  <div className="bg-[#0c0c0e] border border-[#1e1e26] rounded-md p-4 flex flex-col h-32 min-h-[120px] relative overflow-hidden">
    <div className="flex justify-between items-start mb-2 z-10">
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{title}</span>
      <span className="text-xs font-mono font-bold" style={{ color }}>{currentLabel}</span>
    </div>
    <div className="absolute inset-0 top-10 w-full h-full min-w-0"> 
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`color${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Tooltip 
            contentStyle={{ backgroundColor: '#09090b', border: '1px solid #1e1e26', borderRadius: '4px', fontSize: '10px' }}
            itemStyle={{ color }} labelStyle={{ display: 'none' }}
          />
          <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#color${dataKey})`} isAnimationActive={false} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const SidebarMetric = ({ label, value, unit, icon: Icon, color, percent }: any) => (
  <div className="bg-[#101014] border border-[#1e1e26] rounded-md overflow-hidden flex h-[68px] shrink-0">
    <div className="w-12 flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}10` }}>
      <Icon size={18} style={{ color }} />
    </div>
    <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
      <span className="text-[9px] font-bold uppercase text-gray-500 truncate">{label}</span>
      <div className="flex justify-between items-end">
        <span className="text-xs font-mono font-bold text-gray-200 truncate">{value} {unit}</span>
        {percent !== undefined && <span className="text-[9px] text-gray-500 font-mono">{Math.round(percent)}%</span>}
      </div>
    </div>
  </div>
);

export const AppConsoleFinal: React.FC = () => {
  const location = useLocation();
  const [command, setCommand] = useState("");
  const [metrics, setMetrics] = useState<ServerMetrics | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null); // Corrigido para browser
  const logIdCounter = useRef(0);

  const serverId = useMemo(() => {
    const parts = location.pathname.split("/");
    const idx = parts.indexOf("servers");
    return idx !== -1 ? parts[idx + 1] : "node-main";
  }, [location.pathname]);

  const connect = useCallback(() => {
    // Limpa timeouts pendentes
    if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
    }

    // Fecha conexão existente antes de abrir nova
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }

    const wsUrl = `wss://${BaseUrl}/ws/server/${serverId}`;
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;
    
    socket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "log-data" && data.line) {
          setLogs(prev => [...prev, { text: data.line, stream: data.stream || "stdout", id: logIdCounter.current++ }].slice(-1000));
        }
        if (data.type === "status-data") {
          const d = data.data;
          setMetrics(d);
          setHistory(prev => [...prev, { cpu: parseFloat(d.cpu.used), mem: parseFloat(d.memory.used) }].slice(-30));
        }
      } catch (err) {
          console.error("Erro ao processar dados WS:", err);
      }
    };

    socket.onclose = () => {
      console.log("Conexão fechada. Tentando reconectar...");
      reconnectTimeoutRef.current = window.setTimeout(connect, 3000);
    };

    socket.onerror = (err) => {
        console.error("Erro no WebSocket:", err);
        socket.close();
    };
  }, [serverId]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) window.clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
          wsRef.current.onclose = null; // Evita loop de reconexão ao desmontar
          wsRef.current.close();
      }
    };
  }, [connect]);

  // Auto-scroll otimizado
  useEffect(() => {
    if (scrollRef.current) {
      const { scrollHeight, clientHeight } = scrollRef.current;
      scrollRef.current.scrollTo({ top: scrollHeight - clientHeight, behavior: 'smooth' });
    }
  }, [logs]);

  const handleAction = (type: "server-action" | "command", action: string, cmd?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, action, command: cmd }));
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#c5c5d2] p-4 font-sans flex flex-col gap-4 h-screen overflow-hidden">
      {/* HEADER ACTIONS */}
      <div className="flex gap-2 shrink-0">
        <button onClick={() => handleAction('server-action', 'start')} className="flex items-center gap-2 bg-[#1a2e21] text-[#4ade80] px-4 py-1.5 rounded border border-[#22c55e30] text-[11px] font-bold hover:bg-[#22c55e20] transition-colors"><Play size={12} fill="currentColor"/> LIGAR</button>
        <button onClick={() => handleAction('server-action', 'stop')} className="flex items-center gap-2 bg-[#2d1a1a] text-[#f87171] px-4 py-1.5 rounded border border-[#ef444430] text-[11px] font-bold hover:bg-[#ef444420] transition-colors"><Square size={12} fill="currentColor"/> DESLIGAR</button>
        <button onClick={() => handleAction('server-action', 'restart')} className="flex items-center gap-2 bg-[#1c1c14] text-[#fbbf24] px-4 py-1.5 rounded border border-[#f59e0b30] text-[11px] font-bold hover:bg-[#f59e0b20] transition-colors"><RotateCw size={12} /> REINICIAR</button>
        <button onClick={() => handleAction('server-action', 'kill')} className="flex items-center gap-2 bg-[#2d1616] text-[#f43f5e] px-4 py-1.5 rounded border border-[#e11d4830] text-[11px] font-bold hover:bg-[#e11d4820] transition-colors"><Skull size={12} /> MATAR</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0 overflow-hidden">
        {/* CONSOLE AREA */}
        <div className="lg:col-span-3 flex flex-col bg-[#0c0c0e] border border-[#1e1e26] rounded-md overflow-hidden h-full">
          <div className="bg-[#16161a] px-4 py-2 border-b border-[#1e1e26] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-gray-500" />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Console</span>
            </div>
            <span className="text-[9px] font-bold uppercase flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${metrics?.info?.status === 'running' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              {metrics?.info?.status || 'DESCONECTADO'}
            </span>
          </div>
          
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed flex flex-col gap-0.5 custom-scrollbar">
            {logs.map((line) => (
              <div key={line.id} className={`break-all whitespace-pre-wrap ${line.stream === "stderr" ? "text-red-400" : "text-gray-300"}`}>
                {line.text}
              </div>
            ))}
          </div>

          <div className="p-3 bg-[#16161a] border-t border-[#1e1e26] flex items-center shrink-0">
              <span className="text-blue-500 font-bold mr-2 text-xs">❯</span>
              <input 
               value={command} 
               onChange={(e) => setCommand(e.target.value)} 
               onKeyDown={(e) => {
                   if(e.key === 'Enter' && command.trim()) {
                       handleAction("command", "exec", command);
                       setCommand("");
                   }
               }}
               placeholder="Digite nodehelp para rotas ou comandos linux..." 
               className="flex-1 bg-transparent outline-none text-xs font-mono text-white placeholder:text-gray-600"
            />
          </div>
        </div>

        {/* METRICS SIDEBAR */}
        <div className="lg:col-span-1 flex flex-col gap-2 h-full overflow-y-auto pr-1">
          <SidebarMetric label="IP" value={metrics?.info?.ip || "0.0.0.0"} unit="" icon={Network} color="#3b82f6" />
          <SidebarMetric label="Status" value={metrics?.info?.status === "running" ? "Online" : "Offline"} unit="" icon={Activity} color="#10b981" />
          <SidebarMetric label="CPU" value={metrics?.cpu?.used || "0"} unit="%" icon={Cpu} color="#8b5cf6" percent={Number(metrics?.cpu?.used)} />
          <SidebarMetric label="RAM" value={metrics?.memory?.used || "0"} unit="MB" icon={MemoryStick} color="#06b6d4" percent={metrics ? (Number(metrics.memory.used)/Number(metrics.memory.max))*100 : 0} />
          <SidebarMetric label="Disco" value="---" unit="GB" icon={HardDrive} color="#f59e0b" />
          <SidebarMetric label="Rede" value="---" unit="KB/s" icon={Network} color="#a855f7" />
        </div>
      </div>

      {/* FOOTER CHARTS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <MiniChart title="CPU" data={history} dataKey="cpu" color="#3b82f6" currentLabel={`${metrics?.cpu?.used || 0}%`} />
        <MiniChart title="RAM" data={history} dataKey="mem" color="#10b981" currentLabel={`${metrics?.memory?.used || 0} MB`} />
        <MiniChart title="Rede" data={history} dataKey="net" color="#a855f7" currentLabel="---" />
      </div>
    </div>
  );
};