import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, RefreshCw, Terminal, Globe, Activity } from "lucide-react";
import { BaseUrl } from "../../api/api";

const STATUS_THEME = {
  running: { label: "Live", color: "text-emerald-500", glow: "bg-emerald-500/20" },
  exited:  { label: "Down", color: "text-rose-500", glow: "bg-rose-500/20" },
};

export const ServerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: servers = [], isFetching, refetch } = useQuery({
    queryKey: ["docker-raw"],
    queryFn: async () => {
      // const host = window.location.hostname === 'localhost' ? '192.168.1.5' : window.location.hostname;
      const res = await fetch(`http://${BaseUrl}/docker/containers`);
      const json = await res.json();
      return Array.isArray(json) ? json : (json.data || []);
    },
    refetchInterval: 5000,
  });

  const filtered = useMemo(() => 
    servers.filter((s: any) => s.Names?.[0]?.toLowerCase().includes(search.toLowerCase())),
    [servers, search]
  );

  // Função para capturar IP mesmo desligado
  const getPersistentIP = (s: any) => {
    // 1. Tenta pegar de uma porta ativa
    const activePort = s.Ports?.find((p: any) => p.IP);
    if (activePort) return `${activePort.IP}:${activePort.PublicPort}`;
    
    // 2. Tenta extrair do Label do Docker Desktop (comum no seu JSON)
    const labelPort = s.Labels?.["desktop.docker.io/ports/80/tcp"] || s.Labels?.["desktop.docker.io/ports/443/tcp"];
    if (labelPort) return `127.0.0.1${labelPort}`;

    // 3. Fallback para o nome da rede
    return s.HostConfig?.NetworkMode || "internal-link";
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-400 p-4 lg:p-8 font-mono">
      {/* Search & Actions Bar - Ultra Slim */}
      <div className="max-w-7xl mx-auto flex items-center gap-4 mb-8">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700" size={12} />
          <input 
            onChange={(e) => setSearch(e.target.value)}
            placeholder="FILTER_NODES..."
            className="w-full bg-transparent border-b border-white/10 py-2 pl-8 pr-4 text-[10px] focus:outline-none focus:border-blue-500/50 transition-all uppercase tracking-widest"
          />
        </div>
        <button onClick={() => refetch()} className="hover:text-blue-500 transition-colors">
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Industrial Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s: any) => {
          const state = (s.State || "exited") as keyof typeof STATUS_THEME;
          const theme = STATUS_THEME[state] || STATUS_THEME.exited;
          const name = s.Names?.[0]?.replace("/", "");
          const ip = getPersistentIP(s);

          return (
            <div 
              key={s.Id}
              onClick={() => navigate(`/servers/${s.Id}/console`)}
              className="group border border-white/5 bg-[#0A0A0A] p-4 rounded-lg hover:border-white/20 transition-all cursor-pointer relative"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-1 h-8 ${state === 'running' ? 'bg-blue-500' : 'bg-slate-800'}`} />
                  <div>
                    <h3 className="text-xs font-bold text-white tracking-tight">{name}</h3>
                    <p className="text-[9px] text-slate-600 uppercase">{s.Id.slice(0, 12)}</p>
                  </div>
                </div>
                <span className={`text-[8px] font-black px-2 py-0.5 rounded border border-white/5 ${theme.glow} ${theme.color}`}>
                  {theme.label}
                </span>
              </div>

              <div className="space-y-2 mt-4">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-700 flex items-center gap-1.5"><Globe size={10} /> ENDPOINT</span>
                  <span className="text-slate-400">{ip}</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-700 flex items-center gap-1.5"><Activity size={10} /> UPTIME</span>
                  <span className="text-slate-500 lowercase truncate max-w-[150px]">{s.Status}</span>
                </div>
              </div>

              {/* Botão Console Discreto */}
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Terminal size={12} className="text-blue-500" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && !isFetching && (
        <div className="text-center py-20 border border-dashed border-white/5 rounded-lg">
          <p className="text-[10px] uppercase tracking-[0.5em] text-slate-800 font-black">Null_Data</p>
        </div>
      )}
    </div>
  );
};