import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { 
  Terminal, Play, Square, RefreshCw, Folder, Plus, 
  Database, Shield, Globe, HardDrive, Cpu, Zap, LifeBuoy, 
  TerminalSquare, RotateCcw, Trash2, MemoryStick, FileCode,
  FileJson, SettingsIcon, FileText, ChevronLeft, Save, X,
  Download, UploadCloud, Server, History, Lock, ShieldCheck,
  MoreVertical, Search, Loader2, Gamepad2, Code2,
  Container,
} from "lucide-react";
import { useLocation } from "react-router";

// --- 1. CONSOLE COMPONENT ---

type Metric = {
  label: string;
  value: number;
  max: number;
  icon: React.ElementType;
  unit: string;
  color: string;
};

type ServerMessage =
  | { type: "log"; line: string }
  | { type: "stats"; resources: Array<{ name: "CPU" | "Memory"; used: number; max: number }> }
  | { type: "info"; message: string }
  | { type: "error"; message: string };

export const ServerConsole: React.FC = () => {
  const [metrics, setMetrics] = useState<Metric[]>([
    { label: "CPU", value: 0, max: 100, icon: Cpu, unit: "%", color: "bg-emerald-500" },
    { label: "RAM", value: 0, max: 8192, icon: MemoryStick, unit: "MB", color: "bg-blue-500" },
    { label: "Disco", value: 0, max: 256, icon: HardDrive, unit: "GB", color: "bg-amber-500" },
  ]);

  const [status, setStatus] = useState("Desconectado");
  const location = useLocation();
  const serverIdFromPath = location.pathname.split("/")[2];

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bufferRef = useRef<string[]>(["[SISTEMA] Aguardando conexão..."]);
  const wsRef = useRef<WebSocket | null>(null);
  const drawScheduledRef = useRef<number | null>(null);

  const scheduleDraw = () => {
    if (drawScheduledRef.current) return;
    drawScheduledRef.current = window.requestAnimationFrame(() => {
      drawScheduledRef.current = null;
      drawConsole();
    });
  };

  const drawConsole = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const lines = bufferRef.current;
    const lineHeight = 16;
    const paddingLeft = 10;
    const visibleLines = Math.floor(canvas.height / lineHeight) - 1;
    const startLine = Math.max(0, lines.length - visibleLines);

    ctx.font = "13px 'JetBrains Mono', 'Fira Code', monospace";

    for (let i = 0; i < visibleLines; i++) {
      const lineIndex = startLine + i;
      if (!lines[lineIndex]) break;

      const line = lines[lineIndex];
      const y = (i + 1) * lineHeight;

      if (/ERROR|FALHA|ERR/i.test(line)) ctx.fillStyle = "#ef4444";
      else if (/WARN|AVISO/i.test(line)) ctx.fillStyle = "#f59e0b";
      else if (/SUCCESS|SUCESSO|CONECTADO/i.test(line)) ctx.fillStyle = "#10b981";
      else if (/^>/.test(line)) ctx.fillStyle = "#60a5fa";
      else ctx.fillStyle = "#d1d5db";

      ctx.fillText(line, paddingLeft, y);
    }
  };

  useEffect(() => {
    if (!serverIdFromPath) return;

    const ws = new WebSocket(`ws://localhost:3000/ws/server/${serverIdFromPath}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("Online");
      bufferRef.current.push("[SUCESSO] Conectado ao stream de logs.");
      scheduleDraw();
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as ServerMessage;
        
        if (msg.type === "log") {
          bufferRef.current.push(msg.line);
          if (bufferRef.current.length > 2000) bufferRef.current.shift();
          scheduleDraw();
        } else if (msg.type === "stats") {
          updateMetrics(msg.resources);
        }
      } catch (e) {
        bufferRef.current.push(ev.data);
        scheduleDraw();
      }
    };

    ws.onclose = () => setStatus("Desconectado");
    
    return () => ws.close();
  }, [serverIdFromPath]);

  const updateMetrics = (resources: Array<{ name: "CPU" | "Memory"; used: number; max?: number }>) => {
    setMetrics(prev => prev.map(m => {
      const r = resources.find(res => res.name === (m.label === "RAM" ? "Memory" : m.label));
      return r ? { ...m, value: r.used, max: r.max || m.max } : m;
    }));
  };

  const sendCommand = (cmd: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "command", command: cmd }));
    bufferRef.current.push(`> ${cmd}`);
    scheduleDraw();
  };

  const sendAction = (action: string) => {
    if (!wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: "action", action }));
    bufferRef.current.push(`[SISTEMA] Enviando sinal: ${action.toUpperCase()}`);
    scheduleDraw();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          const percent = Math.min(100, Math.round((m.value / m.max) * 100));
          return (
            <div key={m.label} className="bg-[#0f111a] border border-white/5 p-4 rounded-2xl">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2 text-slate-400">
                  <Icon size={18} /> <span className="text-xs font-bold uppercase">{m.label}</span>
                </div>
                <span className="text-[10px] text-slate-500">{m.value} / {m.max} {m.unit}</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className={`${m.color} h-full transition-all duration-500`} style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/2">
          <div className="flex items-center gap-3">
            <TerminalSquare size={18} className="text-blue-500" />
            <span className="text-sm font-bold text-slate-200">Console Terminal</span>
            <span className={`flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${status === 'Online' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status === 'Online' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              {status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => sendAction('start')} className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all" title="Iniciar"><Play size={18}/></button>
            <button onClick={() => sendAction('restart')} className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all" title="Reiniciar"><RotateCcw size={18}/></button>
            <button onClick={() => sendAction('stop')} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all" title="Parar"><Square size={18}/></button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button onClick={() => { bufferRef.current = ["[INFO] Console limpo."]; scheduleDraw(); }} className="p-2 text-slate-500 hover:bg-white/5 rounded-lg transition-all"><Trash2 size={18}/></button>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={1200}
          height={500}
          className="w-full h-[450px] cursor-text"
        />

        <div className="p-4 bg-black/40 border-t border-white/5 flex gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-3 text-blue-500 font-mono text-sm">➜</span>
            <textarea
              rows={1}
              placeholder="Digite um comando e pressione Enter..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-8 pr-4 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  const target = e.target as HTMLTextAreaElement;
                  if (target.value.trim()) {
                    sendCommand(target.value.trim());
                    target.value = "";
                  }
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 2. FILE MANAGER COMPONENT ---

type FileNode = {
  id: string; 
  name: string; 
  type: "file" | "folder";
  size?: number; 
  content?: string; 
  children?: FileNode[];
};

const sampleTree: FileNode[] = [
  {
    id: "web-1", name: "public_html", type: "folder",
    children: [
      { id: "h-1", name: "index.html", type: "file", size: 4, content: "<html>\n  <body>\n    <h1>Site Online</h1>\n  </body>\n</html>" },
    ],
  },
  {
    id: "bot-1", name: "discord-bot", type: "folder",
    children: [
      { id: "b-1", name: "index.js", type: "file", size: 2, content: "const Discord = require('discord.js');\nconst client = new Discord.Client();" },
      { id: "b-3", name: ".env", type: "file", size: 1, content: "TOKEN=MTI0NTY..." },
    ],
  },
  { id: "root-1", name: "docker-compose.yml", type: "file", size: 1, content: "version: '3.8'\nservices:\n  app:\n    image: node:18" },
];

const getSmartIcon = (n: FileNode) => {
  if (n.type === "folder") return <Folder className="w-4 h-4 text-amber-400 fill-amber-400/10" />;
  const ext = n.name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js': case 'ts': return <FileCode className="w-4 h-4 text-yellow-500" />;
    case 'json': return <FileJson className="w-4 h-4 text-blue-400" />;
    case 'html': return <Globe className="w-4 h-4 text-orange-500" />;
    case 'env': case 'yml': return <SettingsIcon className="w-4 h-4 text-emerald-400" />;
    default: return <FileText className="w-4 h-4 text-slate-400" />;
  }
};

export const ServerFiles: React.FC = () => {
  const [path, setPath] = useState<string[]>([]);
  const [editingFile, setEditingFile] = useState<FileNode | null>(null);
  const [tempContent, setTempContent] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const currentNodes = useMemo(() => {
    let nodes = sampleTree;
    for (const segment of path) {
      const folder = nodes.find((n) => n.type === "folder" && n.name === segment);
      nodes = folder?.children ?? [];
    }
    return nodes.filter(n => n.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [path, searchTerm]);

  const handleOpen = useCallback((n: FileNode) => {
    if (n.type === "folder") {
      setPath((prev) => [...prev, n.name]);
    } else {
      if (n.size && n.size > 2000) return alert("Arquivo muito grande.");
      setEditingFile(n);
      setTempContent(n.content || "");
    }
  }, []);

  const handleSave = async () => {
    setEditingFile(null);
  };

  return (
    <div className="flex flex-col h-[85vh] min-h-[500px] w-full gap-4 animate-in fade-in duration-500 text-slate-200 p-1">
      
      <header className="flex-none flex items-center justify-between bg-white/2 rounded-2xl border border-white/5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <UploadCloud className="text-blue-400" size={20}/>
          </div>
          <h2 className="text-lg font-bold tracking-tight">Cloud Explorer</h2>
        </div>
        
        {!editingFile && (
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14}/>
              <input 
                type="text" 
                placeholder="Buscar arquivos..."
                className="bg-black/40 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500/50 transition-all w-60"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all">
              <Plus size={16}/> Novo
            </button>
          </div>
        )}
      </header>

      <nav className="flex-none bg-white/1 border border-white/5 px-4 py-2 rounded-xl flex items-center gap-2 text-[11px] font-mono">
        <button onClick={() => {setPath([]); setEditingFile(null)}} className="hover:text-blue-400 transition-colors uppercase font-bold text-blue-500/80">root</button>
        {path.map((seg, i) => (
          <React.Fragment key={i}>
            <span className="text-slate-600">/</span>
            <button onClick={() => {setPath(path.slice(0, i+1)); setEditingFile(null)}} className="hover:text-white transition-colors">{seg}</button>
          </React.Fragment>
        ))}
        {editingFile && (
          <>
            <span className="text-slate-600">/</span>
            <span className="text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded ring-1 ring-emerald-400/20">{editingFile.name}</span>
          </>
        )}
      </nav>

      <main className="flex-1 flex flex-col min-h-0 bg-[#0b0f1a] border border-white/5 rounded-4xl overflow-hidden shadow-2xl relative">
        {editingFile ? (
          <div className="flex flex-col h-full w-full bg-[#030712]">
            <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/2">
              <div className="flex items-center gap-3">
                <button onClick={() => setEditingFile(null)} className="p-2 hover:bg-white/5 rounded-xl text-slate-400">
                  <ChevronLeft size={20} />
                </button>
                <div>
                  <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Editando</p>
                  <p className="text-sm font-semibold">{editingFile.name}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setEditingFile(null)} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">Cancelar</button>
                <button onClick={handleSave} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-black transition-all shadow-lg shadow-emerald-900/20">
                  <Save size={14}/> SALVAR
                </button>
              </div>
            </div>
            
            <div className="flex-1 relative">
              <textarea
                value={tempContent}
                onChange={(e) => setTempContent(e.target.value)}
                spellCheck={false}
                className="absolute inset-0 w-full h-full p-0.5 font-mono text-sm text-slate-300 bg-transparent outline-none resize-none leading-relaxed"
                autoFocus
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex-none grid grid-cols-12 px-8 py-4 border-b border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/1">
              <div className="col-span-8">Nome</div>
              <div className="col-span-2 text-right">Tamanho</div>
              <div className="col-span-2 text-right">Ações</div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ul className="divide-y divide-white/2">
                {currentNodes.map((n) => (
                  <li key={n.id} className="grid grid-cols-12 items-center px-8 py-4 hover:bg-blue-600/4 transition-all group">
                    <button onClick={() => handleOpen(n)} className="col-span-8 flex items-center gap-4 text-left">
                      <div className="text-slate-500 group-hover:text-blue-400 transition-colors">
                        {getSmartIcon(n)}
                      </div>
                      <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{n.name}</span>
                    </button>
                    <div className="col-span-2 text-right text-[11px] font-mono text-slate-500">{n.type === 'file' ? `${n.size} KB` : '--'}</div>
                    <div className="col-span-2 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button className="p-2 hover:bg-white/5 text-slate-400 rounded-lg"><Download size={15}/></button>
                      <button className="p-2 hover:bg-red-500/10 text-red-400/60 hover:text-red-400 rounded-lg"><Trash2 size={15}/></button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// --- 3. DATABASE COMPONENT ---
import { 
  Eye, EyeOff, Copy, Check, ShieldAlert, 
   Layers, ArrowUpRight
} from "lucide-react";

interface DatabaseInfo {
  id: string;
  name: string;
  host: string;
  user: string;
  pass: string;
  port: number;
}

export const ServerDatabases: React.FC = () => {
  const [showPass, setShowPass] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [databases] = useState<DatabaseInfo[]>([
    { id: "1", name: "prod_main_cluster", host: "sql.meuhost.com", user: "admin_u1", pass: "secret_123", port: 3306 },
    { id: "2", name: "stage_test_db", host: "127.0.0.1", user: "tester_v2", pass: "test_pass", port: 3306 },
  ]);

  const dbLimit = 4;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 mt-2.5 animate-in fade-in duration-500">
      
      {/* 1. Header & Quota - Estilo Glassmorphism Suave */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600/10 to-indigo-600/5 border border-white/10 p-6 md:p-8 rounded-[2rem]">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-blue-400 font-black text-[10px] uppercase tracking-[0.2em]">
              <Layers size={14} /> Cloud Infrastructure
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Bancos de Dados</h2>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
            <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl px-5 py-3 flex items-center gap-4">
              <div className="text-left">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Slots de Uso</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-white">{databases.length}</span>
                  <span className="text-slate-600">/</span>
                  <span className="text-xl font-black text-slate-500">{dbLimit}</span>
                </div>
              </div>
              <div className="w-12 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-1000" 
                  style={{ width: `${(databases.length / dbLimit) * 100}%` }} 
                />
              </div>
            </div>
            
            <button 
              disabled={databases.length >= dbLimit}
              className="bg-white text-black hover:bg-blue-400 hover:text-white disabled:bg-slate-800 disabled:text-slate-500 px-6 py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Plus size={18} strokeWidth={3} /> Criar Novo
            </button>
          </div>
        </div>
      </div>

      {/* 2. Grid de Bancos - Responsivo */}
      <div className="grid grid-cols-1 gap-4">
        {databases.map((db) => (
          <div key={db.id} className="bg-[#0d0e12] border border-white/5 rounded-[1.5rem] p-4 md:p-6 hover:bg-[#111218] transition-colors group">
            <div className="flex flex-col lg:flex-row gap-6">
              
              {/* Info Cabeçalho do Card */}
              <div className="flex items-start justify-between lg:justify-start gap-4">
                <div className="p-4 bg-blue-500/10 text-blue-500 rounded-2xl group-hover:scale-110 transition-transform">
                  <Database size={28} />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">{db.name}</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 font-mono">
                    <Globe size={12} /> {db.host}:{db.port}
                  </p>
                </div>
                <div className="lg:hidden">
                    <button className="p-2 text-rose-500/50 hover:text-rose-500 transition-colors">
                        <Trash2 size={20} />
                    </button>
                </div>
              </div>

              {/* Grid de Credenciais (3 colunas no PC, 1 no Mobile) */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 flex-1">
                {/* User */}
                <div className="bg-black/40 border border-white/5 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-0.5">Usuário</p>
                    <p className="text-sm font-mono text-slate-300 truncate">{db.user}</p>
                  </div>
                  <button onClick={() => handleCopy(db.user, `${db.id}-u`)} className="text-slate-600 hover:text-white transition-colors">
                    {copiedId === `${db.id}-u` ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  </button>
                </div>

                {/* Password */}
                <div className="bg-black/40 border border-white/5 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-0.5">Password</p>
                    <p className="text-sm font-mono text-slate-300">
                      {showPass === db.id ? db.pass : "••••••••"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowPass(showPass === db.id ? null : db.id)} className="text-slate-600 hover:text-white transition-colors">
                      {showPass === db.id ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button onClick={() => handleCopy(db.pass, `${db.id}-p`)} className="text-slate-600 hover:text-white transition-colors">
                      {copiedId === `${db.id}-p` ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                {/* Quick Link / PHPMYADMIN */}
                <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl px-4 py-3 flex items-center justify-between group/link cursor-pointer hover:bg-blue-500/10 transition-colors">
                  <div>
                    <p className="text-[9px] font-black text-blue-500/70 uppercase tracking-widest mb-0.5">Painel Externo</p>
                    <p className="text-sm font-bold text-blue-400">phpMyAdmin</p>
                  </div>
                  <ArrowUpRight size={18} className="text-blue-500 group-hover/link:translate-x-1 group-hover/link:-translate-y-1 transition-transform" />
                </div>
              </div>

              {/* Botão Deletar Desktop */}
              <div className="hidden lg:flex items-center">
                 <button className="p-3 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all" title="Eliminar Banco">
                    <Trash2 size={20} />
                 </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Slot de Criação Vazio (Apenas se houver espaço) */}
      {databases.length < dbLimit ? (
        <button className="w-full border-2 border-dashed border-white/5 rounded-[2rem] p-10 flex flex-col items-center justify-center gap-4 hover:border-blue-500/20 hover:bg-white/[0.01] transition-all group">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-slate-600 group-hover:text-white group-hover:bg-blue-600 transition-all shadow-xl">
            <Plus size={32} />
          </div>
          <div className="text-center">
            <h5 className="text-white font-bold">Adicionar Nova Instância</h5>
            <p className="text-xs text-slate-500 mt-1">Você ainda possui {dbLimit - databases.length} bancos disponíveis.</p>
          </div>
        </button>
      ) : (
        <div className="flex items-center gap-3 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl text-amber-500/80">
          <ShieldAlert size={18} />
          <p className="text-xs font-medium uppercase tracking-wider">Limite de cota atingido. Entre em contato com o suporte para expandir.</p>
        </div>
      )}
    </div>
  );
};
// --- 4. NETWORK / FIREWALL COMPONENT ---

interface FirewallRuleProps {
  port: string;
  label: string;
  isOpen: boolean;
}

const FirewallRule: React.FC<FirewallRuleProps> = ({ port, label, isOpen }) => (
  <li className="flex justify-between items-center text-sm p-3 bg-white/5 rounded-lg border border-white/5 transition-hover hover:bg-white/10">
    <span className="text-slate-300 font-medium">{port} <span className="text-slate-500 font-normal ml-1">({label})</span></span>
    {isOpen ? (
      <span className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
        <ShieldCheck size={14} /> Aberto
      </span>
    ) : (
      <span className="flex items-center gap-1.5 text-rose-400 font-semibold text-xs uppercase tracking-wider">
        <Lock size={14} /> Bloqueado
      </span>
    )}
  </li>
);

export const ServerNetwork: React.FC = () => {
  const networkData = {
    publicIp: "191.168.1.42",
    ports: ["80", "443", "3000", "25565"]
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-blue-600/10 border border-blue-500/20 p-5 rounded-2xl flex items-start gap-4 backdrop-blur-sm">
        <div className="p-3 bg-blue-500/20 rounded-lg">
          <Globe className="text-blue-400" size={24} />
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase text-blue-400/70 tracking-widest mb-1">Rede Pública</h3>
          <p className="text-lg font-mono font-bold text-white mb-2">{networkData.publicIp}</p>
          <div className="flex flex-wrap gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
              PORTAS: {networkData.ports.join(', ')}
            </span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-[#0f111a] border border-white/10 p-5 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest">Regras de Firewall</h4>
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          
          <ul className="space-y-3">
            <FirewallRule port="Porta 80" label="HTTP" isOpen={true} />
            <FirewallRule port="Porta 443" label="HTTPS" isOpen={true} />
            <FirewallRule port="Porta 22" label="SSH" isOpen={false} />
            <FirewallRule port="Porta 3306" label="MySQL" isOpen={false} />
          </ul>
        </div>

        <div className="bg-[#0f111a]/50 border border-dashed border-white/10 p-5 rounded-2xl flex flex-col items-center justify-center text-center">
            <p className="text-slate-500 text-xs italic">Estatísticas de tráfego <br/> em tempo real em breve...</p>
        </div>
      </div>
    </div>
  );
};

// --- 5. ADMIN NODES COMPONENT ---

import { 
   Edit3,
} from "lucide-react";

// --- Interfaces ---
interface Node {
  id: string;
  name: string;
  ip: string;
  status: "online" | "offline";
  ramUsage: number;
  ramTotal: number;
  cpuUsage: number;
  token?: string; // Adicionado para autenticação com a Wings
}

const MOCK_NODES: Node[] = [
  { id: "1", name: "BR-SAO-01", ip: "127.0.0.1", status: "online", ramUsage: 0, ramTotal: 64, cpuUsage: 0, token: "seu_token_aqui" },
];

// --- Componente de Card Individual ---
const NodeCard: React.FC<{ 
  node: Node; 
  onDelete: (id: string) => void;
  onEdit: (node: Node) => void;
}> = ({ node, onDelete, onEdit }) => {
  const isOffline = node.status === "offline";
  const ramPercent = node.ramTotal > 0 ? (node.ramUsage / node.ramTotal) * 100 : 0;
  
  return (
    <div className={`
      bg-[#0b0e14] border border-white/5 rounded-[2.5rem] p-6 relative group transition-all duration-500 shadow-2xl overflow-hidden
      ${isOffline ? 'opacity-60 grayscale-[0.5]' : 'hover:border-blue-500/40'}
    `}>
      <div className={`absolute -right-8 -top-8 transition-colors pointer-events-none rotate-12 ${isOffline ? 'text-white/[0.01]' : 'text-white/[0.02] group-hover:text-blue-500/10'}`}>
        <Server size={140} />
      </div>

      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className={`flex items-center gap-3 px-3 py-1.5 rounded-full border border-white/5 bg-black/40`}>
          <div className={`w-2 h-2 rounded-full transition-all duration-500 ${isOffline ? 'bg-rose-500 shadow-none' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse'}`} />
          <span className={`text-[9px] font-black uppercase tracking-widest ${isOffline ? 'text-rose-500' : 'text-emerald-500'}`}>{node.status}</span>
        </div>
        <button 
          onClick={() => onEdit(node)}
          className="text-slate-600 hover:text-blue-400 p-2 bg-white/5 rounded-xl transition-all relative z-20"
        >
          <Edit3 size={16} />
        </button>
      </div>

      <div className="mb-8 relative z-10">
        <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors truncate">{node.name}</h3>
        <div className="flex items-center gap-2 text-slate-500 text-xs font-mono mt-1">
          <Globe size={12} className="text-blue-500/30" />
          {node.ip}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
        <div className="p-4 bg-black/40 rounded-3xl border border-white/5 flex flex-col items-center text-center">
          <Cpu size={16} className={`${isOffline ? 'text-slate-700' : 'text-blue-400'} mb-1 transition-colors`} />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">CPU</span>
          <span className="text-lg font-black text-white">{node.cpuUsage}%</span>
        </div>
        <div className="p-4 bg-black/40 rounded-3xl border border-white/5 flex flex-col items-center text-center">
          <HardDrive size={16} className={`${isOffline ? 'text-slate-700' : 'text-amber-400'} mb-1 transition-colors`} />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">RAM</span>
          <span className="text-lg font-black text-white">{Math.round(ramPercent)}%</span>
        </div>
      </div>

      <div className="space-y-3 relative z-10">
        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 rounded-full ${isOffline ? 'bg-slate-800' : ramPercent > 85 ? 'bg-rose-500' : 'bg-blue-600'}`} 
            style={{ width: `${ramPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
          <span>{node.ramUsage.toFixed(1)} GB</span>
          <span>{node.ramTotal} GB</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-8 pt-4 border-t border-white/5">
        <button 
          disabled={isOffline}
          className="flex-1 bg-white/5 hover:bg-blue-600 hover:text-white text-slate-400 py-3 rounded-2xl text-xs font-bold transition-all border border-white/5 active:scale-95 disabled:opacity-20"
        >
          Console
        </button>
        <button 
          onClick={() => onDelete(node.id)}
          className="p-3 bg-rose-500/10 hover:bg-rose-600 text-rose-500 hover:text-white rounded-2xl transition-all active:scale-90"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};

// --- Componente Principal ---
export const AdminNodes: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>(MOCK_NODES);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [lastSync, setLastSync] = useState(new Date());

  // --- INTEGRAÇÃO REAL COM WINGS ---
  const fetchWingsData = async () => {
    const updatedNodes = await Promise.all(nodes.map(async (node) => {
      try {
        // A Wings geralmente roda na porta 8080. 
        // Nota: O navegador pode bloquear se o SSL for auto-assinado.
        const response = await fetch(`https://${node.ip}:8080/api/system`, {
          headers: {
            'Authorization': `Bearer ${node.token}`,
            'Accept': 'application/json'
          }
        });

        if (!response.ok) throw new Error();

        const data = await response.json();
        
        return {
          ...node,
          status: "online" as const,
          // Wings retorna memória em bytes. Convertendo para GB:
          ramUsage: data.memory_bytes / (1024 ** 3),
          cpuUsage: Math.round(data.cpu_absolute)
        };
      } catch (err) {
        return { ...node, status: "offline" as const, cpuUsage: 0, ramUsage: 0 };
      }
    }));

    setNodes(updatedNodes);
    setLastSync(new Date());
  };

  useEffect(() => {
    fetchWingsData();
    const interval = setInterval(fetchWingsData, 5000); // Check a cada 5 segundos
    return () => clearInterval(interval);
  }, [nodes.length]); // Reinicia se a lista mudar

  // --- HANDLERS CRUD ---
  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const nodeData = {
      name: formData.get("name") as string,
      ip: formData.get("ip") as string,
      ramTotal: Number(formData.get("ramTotal")),
      token: formData.get("token") as string,
    };

    if (editingNode) {
      setNodes(nodes.map(n => n.id === editingNode.id ? { ...n, ...nodeData } : n));
    } else {
      const newNode: Node = {
        id: Date.now().toString(),
        ...nodeData,
        status: "offline",
        ramUsage: 0,
        cpuUsage: 0,
      };
      setNodes([...nodes, newNode]);
    }
    closeModal();
  };

  const openModal = (node?: Node) => {
    setEditingNode(node || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingNode(null);
  };

  const filteredNodes = useMemo(() => 
    nodes.filter(n => n.name.toLowerCase().includes(search.toLowerCase()) || n.ip.includes(search)),
    [nodes, search]
  );

  return (
    <div className="p-4 md:p-8 space-y-8 min-h-screen bg-[#05070a] text-slate-300">
      
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-8 border-b border-white/5">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-blue-600 rounded-[1.25rem] shadow-[0_0_20px_rgba(37,99,235,0.3)]">
              <Server className="text-white" size={24} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Wings Infrastructure</h1>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-slate-500 text-sm">Monitoramento direto dos daemons.</p>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase">
              <RefreshCw size={10} className="animate-spin" /> Live Sync
            </span>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="hidden sm:block text-right mr-4">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Último Ping</p>
            <p className="text-xs font-mono text-slate-400">{lastSync.toLocaleTimeString()}</p>
          </div>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="IP ou Nome..." 
              className="bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm focus:border-blue-500 outline-none w-full sm:w-64" 
            />
          </div>
          <button 
            onClick={() => openModal()}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-xl active:scale-95"
          >
            <Plus size={20} /> Novo Node
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredNodes.map((node) => (
          <NodeCard key={node.id} node={node} onDelete={(id) => setNodes(nodes.filter(n => n.id !== id))} onEdit={openModal} />
        ))}
      </div>

      {/* Modal Unificado */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={closeModal} />
          <form 
            onSubmit={handleSave}
            className="relative w-full max-w-lg bg-[#0b0e14] border border-white/10 rounded-[3rem] shadow-3xl overflow-hidden animate-in zoom-in-95 duration-200"
          >
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-white">{editingNode ? 'Editar Node' : 'Configurar Wings'}</h2>
                <button type="button" onClick={closeModal} className="p-2 bg-white/5 rounded-full text-slate-400 hover:text-white"><X size={20} /></button>
              </div>

              <div className="space-y-5">
                <input required name="name" defaultValue={editingNode?.name} placeholder="Nome do Cluster" className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-blue-500 outline-none" />
                <input required name="ip" defaultValue={editingNode?.ip} placeholder="IP do Node (sem http)" className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-blue-500 outline-none font-mono" />
                <input required name="ramTotal" type="number" defaultValue={editingNode?.ramTotal} placeholder="RAM Total (GB)" className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-blue-500 outline-none" />
                <input required name="token" type="password" defaultValue={editingNode?.token} placeholder="Wings Bearer Token" className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-blue-500 outline-none font-mono" />
              </div>

              <div className="flex gap-3 mt-10">
                <button type="button" onClick={closeModal} className="flex-1 px-6 py-4 rounded-2xl bg-white/5 font-bold">Voltar</button>
                <button type="submit" className="flex-2 px-10 py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-xl transition-all">
                  <Save size={18} className="inline mr-2" /> {editingNode ? 'Salvar' : 'Conectar'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
// --- 6. STORE / BILLING COMPONENT ---
export const Store: React.FC = () => (
  <div className="grid md:grid-cols-3 gap-6">
    {[
      { name: 'Iniciante', price: 'R$ 15,00', features: ['2GB RAM', '1 vCore', '10GB SSD'] },
      { name: 'Profissional', price: 'R$ 45,00', features: ['8GB RAM', '2 vCore', '40GB SSD'] },
      { name: 'Enterprise', price: 'R$ 90,00', features: ['16GB RAM', '4 vCore', 'Unlimited SSD'] },
    ].map(plan => (
      <div key={plan.name} className="bg-linear-to-b from-[#161925] to-[#0f111a] border border-white/5 p-8 rounded-4xl text-center hover:border-blue-500/50 transition-all">
        <h3 className="text-slate-400 text-sm font-bold uppercase tracking-widest">{plan.name}</h3>
        <div className="text-3xl font-black text-white my-4">{plan.price}</div>
        <ul className="text-sm text-slate-500 space-y-3 mb-8">
          {plan.features.map(f => <li key={f} className="flex justify-center items-center gap-2"><Zap size={14} className="text-amber-500"/> {f}</li>)}
        </ul>
        <button className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all">Comprar Agora</button>
      </div>
    ))}
  </div>
);

// --- 7. METRICS COMPONENT ---
interface MetricCardProps {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  color: string; // Ex: "text-emerald-500" ou "text-blue-500"
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, sub, icon, color }) => (
  <div className="group relative bg-[#0d0e12] border border-white/[0.03] p-6 rounded-2xl hover:border-white/10 transition-all duration-300 overflow-hidden shadow-2xl">
    
    {/* Efeito de Brilho sutil no fundo ao passar o mouse */}
    <div className={`absolute -right-4 -top-4 w-20 h-20 blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-full bg-current ${color}`} />

    <div className="relative z-10">
      <div className="flex items-center justify-between mb-5">
        <div className={`p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] group-hover:scale-110 transition-transform duration-500 ${color}`}>
          {/* O cloneElement garante que o ícone herde o tamanho correto se for Lucide */}
          {React.isValidElement(icon) ? React.cloneElement(icon as any, { size: 18 }) : icon}
        </div>
        <div className="h-1 w-8 bg-white/[0.02] rounded-full overflow-hidden">
             <div className={`h-full w-2/3 rounded-full opacity-40 group-hover:w-full transition-all duration-700 bg-current ${color}`} />
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] leading-none">
          {label}
        </h3>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-white tracking-tight tabular-nums">
            {value}
          </span>
          {/* Adicionei uma pequena seta de tendência simulada ou unidade */}
          <span className="text-[10px] font-bold text-slate-700">/ max</span>
        </div>
        
        <div className="flex items-center gap-2 mt-2">
           <div className="flex-1 h-[2px] bg-white/[0.03] rounded-full overflow-hidden">
              <div className={`h-full bg-current opacity-20 group-hover:opacity-50 transition-all ${color}`} style={{ width: '45%' }} />
           </div>
           <span className="text-[9px] text-slate-600 font-mono font-medium whitespace-nowrap uppercase tracking-tighter">
             {sub}
           </span>
        </div>
      </div>
    </div>
  </div>
);

export const ServerMetrics: React.FC = () => (
  <div className="space-y-8">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard label="Uso de CPU" value="12.5%" sub="0.25 vCore" icon={<Cpu size={20}/>} color="text-blue-500" />
      <MetricCard label="Memória RAM" value="842 MB" sub="de 2048 MB" icon={<HardDrive size={20}/>} color="text-purple-500" />
      <MetricCard label="Disco" value="1.2 GB" sub="de 10 GB" icon={<HardDrive size={20}/>} color="text-amber-500" />
      <MetricCard label="Uptime" value="12d 4h" sub="Sem interrupções" icon={<RefreshCw size={20}/>} color="text-emerald-500" />
    </div>
    <div className="h-64 bg-[#0f111a] border border-white/5 rounded-2xl flex items-center justify-center text-slate-600 font-medium">
      [ Gráfico de Uso em Tempo Real ]
    </div>
  </div>
);

export const ServerBackups: React.FC = () => {
  const backups = [
    { id: 'bk-1', date: '2023-10-25 14:00', size: '1.2 GB', status: 'Completo' },
    { id: 'bk-2', date: '2023-10-24 14:00', size: '1.1 GB', status: 'Completo' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Backups & Snapshots</h2>
          <p className="text-xs text-slate-500">Proteja seus dados com cópias de segurança automáticas.</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-900/20">
          <Shield size={16}/> Criar Backup Agora
        </button>
      </div>

      <div className="grid gap-3">
        {backups.length > 0 ? backups.map(bk => (
          <div key={bk.id} className="bg-[#0f111a] border border-white/5 p-4 rounded-2xl flex items-center justify-between group hover:border-white/20 transition-all">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-white/5 rounded-xl text-slate-400 group-hover:text-blue-400">
                <History size={20}/>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200">{bk.date}</p>
                <p className="text-[10px] text-slate-500 uppercase font-mono">{bk.size} • ID: {bk.id}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="p-2 hover:bg-white/5 text-slate-400 rounded-lg transition-all" title="Restaurar"><RotateCcw size={16}/></button>
              <button className="p-2 hover:bg-white/5 text-slate-400 rounded-lg transition-all" title="Download"><Download size={16}/></button>
              <button className="p-2 hover:bg-red-500/10 text-red-500/50 hover:text-red-500 rounded-lg transition-all"><Trash2 size={16}/></button>
            </div>
          </div>
        )) : (
          <div className="p-16 text-center border-2 border-dashed border-white/5 rounded-[2.5rem] text-slate-500">
            <Shield size={48} className="mx-auto mb-4 opacity-20"/>
            <p>Nenhum backup encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
};

import { 
  Clock,  Calendar, 
   Power, Command, AlertCircle, CheckCircle2 
} from "lucide-react";

interface Schedule {
  id: string;
  name: string;
  cron: string;
  command: string;
  lastRun: string;
  nextRun: string;
  isActive: boolean;
  status: "idle" | "running" | "failed";
}

export const ServerSchedules: React.FC = () => {
  const [schedules] = useState<Schedule[]>([
    {
      id: "1",
      name: "Backup Diário",
      cron: "0 0 * * *",
      command: "tar -czf backup.tar.gz /data",
      lastRun: "Hoje às 00:00",
      nextRun: "Amanhã às 00:00",
      isActive: true,
      status: "idle"
    },
    {
      id: "2",
      name: "Limpeza de Logs",
      cron: "*/30 * * * *",
      command: "rm -rf ./logs/*.log",
      lastRun: "Há 12 min",
      nextRun: "Em 18 min",
      isActive: false,
      status: "failed"
    }
  ]);

  return (
    <div className="w-full space-y-6 mt-2.5 animate-in fade-in duration-500">
      {/* Header Responsivo */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="text-blue-500" size={20} />
            Agendador de Tarefas
          </h2>
          <p className="text-xs text-slate-500 mt-1">Automatize comandos e rotinas do seu servidor.</p>
        </div>
        
        <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-blue-500/10">
          <Plus size={18} /> Criar Agendamento
        </button>
      </div>

      {/* Lista de Tarefas */}
      <div className="grid gap-4">
        {schedules.map((task) => (
          <div 
            key={task.id} 
            className={`group relative bg-[#0d0e12] border border-white/5 rounded-2xl overflow-hidden transition-all hover:border-white/10 ${!task.isActive && 'opacity-60'}`}
          >
            {/* Indicador de Status Lateral */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${task.status === 'failed' ? 'bg-rose-500' : 'bg-emerald-500'}`} />

            <div className="p-5 md:p-6 flex flex-col lg:flex-row lg:items-center gap-6">
              
              {/* Nome e Cron */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-white">{task.name}</h3>
                  {task.status === 'failed' && (
                    <span className="flex items-center gap-1 text-[10px] bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full font-bold uppercase">
                      <AlertCircle size={10} /> Falha
                    </span>
                  )}
                  {task.isActive && task.status === 'idle' && (
                    <span className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-bold uppercase">
                      <CheckCircle2 size={10} /> Ativo
                    </span>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-500">
                  <span className="flex items-center gap-1.5 bg-black/30 px-2 py-1 rounded-md border border-white/5">
                    <Calendar size={12} className="text-blue-500" /> {task.cron}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Command size={12} /> {task.command}
                  </span>
                </div>
              </div>

              {/* Horários (Oculto em telas muito pequenas ou adaptado) */}
              <div className="grid grid-cols-2 lg:flex lg:items-center gap-8 border-t border-b border-white/5 lg:border-none py-4 lg:py-0">
                <div>
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Última Execução</p>
                  <p className="text-xs text-slate-400 mt-0.5">{task.lastRun}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest text-right lg:text-left">Próxima</p>
                  <p className="text-xs text-blue-400 mt-0.5 text-right lg:text-left font-bold">{task.nextRun}</p>
                </div>
              </div>

              {/* Ações Rápidas */}
              <div className="flex items-center justify-between lg:justify-end gap-2">
                <div className="flex items-center gap-1">
                  <button title="Executar Agora" className="p-2.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all">
                    <Play size={18} fill="currentColor" />
                  </button>
                  <button title="Desativar/Ativar" className={`p-2.5 transition-all rounded-xl ${task.isActive ? 'text-blue-500 hover:bg-blue-500/10' : 'text-slate-600 hover:bg-white/5'}`}>
                    <Power size={18} />
                  </button>
                  <button title="Excluir" className="p-2.5 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all">
                    <Trash2 size={18} />
                  </button>
                </div>
                <button className="lg:hidden p-2 text-slate-500">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Empty State / Botão de Adicionar (Estilo Tracejado) */}
        <button className="w-full border-2 border-dashed border-white/5 py-8 rounded-2xl flex flex-col items-center gap-2 text-slate-500 hover:border-blue-500/20 hover:text-white transition-all group">
          <div className="p-2 bg-white/5 rounded-full group-hover:bg-blue-500/10 group-hover:text-blue-500 transition-all">
            <Plus size={20} />
          </div>
          <span className="text-sm font-medium">Configurar nova automação</span>
        </button>
      </div>

      {/* Dica de Utilização (Rodapé) */}
      <div className="flex items-start gap-3 bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl">
        <AlertCircle className="text-blue-500 shrink-0" size={18} />
        <p className="text-[11px] text-slate-400 leading-relaxed">
          As tarefas agendadas utilizam o fuso horário padrão do servidor (UTC). 
          Certifique-se de que os comandos possuam as permissões necessárias para execução em background.
        </p>
      </div>
    </div>
  );
};
export const ServerUsers: React.FC = () => {
  const users = [
    { email: 'admin@suahost.com', role: 'Proprietário', color: 'bg-emerald-500/10 text-emerald-500' },
    { email: 'dev@equipe.com', role: 'Desenvolvedor', color: 'bg-blue-500/10 text-blue-500' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-bold text-white">Equipe & Permissões</h2>
        <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all border border-white/10">
          <Plus size={16}/> Convidar Usuário
        </button>
      </div>

      <div className="bg-[#0f111a] border border-white/5 rounded-4xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <th className="px-6 py-4">Usuário</th>
              <th className="px-6 py-4">Permissão</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((u, i) => (
              <tr key={i} className="hover:bg-white/1 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-black">{u.email[0].toUpperCase()}</div>
                    <span className="text-sm font-medium text-slate-300">{u.email}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-tighter ${u.color}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 text-slate-600 hover:text-white transition-colors"><SettingsIcon size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const ServerStartup: React.FC = () => (
  <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
    <div className="bg-[#0f111a] border border-white/5 rounded-4xl overflow-hidden shadow-2xl">
      <div className="p-6 border-b border-white/5 bg-white/2 flex items-center gap-4">
        <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
          <Terminal size={24}/>
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Comando de Inicialização</h3>
          <p className="text-xs text-slate-500">Variáveis dinâmicas são injetadas automaticamente no ambiente.</p>
        </div>
      </div>
      
      <div className="p-8 space-y-6">
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Linha de Comando</label>
          <div className="relative group">
            <textarea 
              className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 font-mono text-sm text-blue-400 outline-none focus:border-blue-500/50 transition-all resize-none"
              rows={3}
              defaultValue="node index.js --port {{SERVER_PORT}} --max-memory {{SERVER_MEMORY}}"
            />
            <div className="absolute right-4 bottom-4 text-[10px] font-mono text-slate-600 uppercase">Read Only</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white/2 border border-white/5 p-5 rounded-2xl">
            <p className="text-xs font-bold text-slate-400 mb-1">Versão do Docker</p>
            <p className="text-sm font-mono text-white">node:18-alpine</p>
          </div>
          <div className="bg-white/2 border border-white/5 p-5 rounded-2xl">
            <p className="text-xs font-bold text-slate-400 mb-1">Build Configuration</p>
            <p className="text-sm font-mono text-white">Production</p>
          </div>
        </div>
      </div>
    </div>
    
    <div className="bg-blue-600/5 border border-blue-500/20 p-6 rounded-2xl flex gap-4">
      <Zap className="text-blue-500 shrink-0" size={20}/>
      <p className="text-xs text-blue-200/70 leading-relaxed">
        <strong>Dica:</strong> Para alterar a versão do Node ou do Java, acesse a aba "Variáveis" ou entre em contato com o suporte para alteração da imagem base do container.
      </p>
    </div>
  </div>
);

export const ServerVariables: React.FC = () => <div className="p-6 bg-[#0f111a] rounded-xl font-mono text-xs">PORT=3000<br/>DB_URL=mysql://admin:***@localhost</div>;
export const ServerSSL: React.FC = () => <div className="p-10 text-center bg-white/5 rounded-2xl"><Globe size={48} className="mx-auto mb-4 text-emerald-500"/> Certificado SSL Ativo (Let's Encrypt)</div>;
export const Invoices: React.FC = () => <div className="p-6 bg-[#0f111a] rounded-xl"><div className="flex justify-between border-b border-white/5 py-4"><span>#84920 - Upgrade RAM</span> <span className="text-emerald-500 font-bold">PAGO</span></div></div>;

export const Tickets: React.FC = () => (
  <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
    <div className="text-center space-y-3 py-8">
      <div className="inline-block p-4 bg-blue-600/10 rounded-4xl text-blue-500 mb-2">
        <LifeBuoy size={40} className="animate-bounce" />
      </div>
      <h1 className="text-3xl font-black text-white tracking-tight">Como podemos ajudar?</h1>
      <p className="text-slate-500 max-w-md mx-auto">Nossa equipe de especialistas está disponível 24/7 para garantir que sua infraestrutura nunca pare.</p>
    </div>

    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-[#0f111a] border border-white/5 p-8 rounded-4xl group hover:border-blue-500/30 transition-all cursor-pointer shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500">
            <Plus size={24}/>
          </div>
          <span className="text-[10px] font-black text-slate-600 uppercase">Tempo médio: 15min</span>
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Novo Ticket</h3>
        <p className="text-sm text-slate-500 leading-relaxed">Abra um novo chamado para problemas técnicos, dúvidas financeiras ou upgrades.</p>
      </div>

      <div className="bg-[#0f111a] border border-white/5 p-8 rounded-4xl group hover:border-blue-500/30 transition-all cursor-pointer shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
            <FileText size={24}/>
          </div>
          <span className="text-[10px] font-black text-slate-600 uppercase">3 Chamados ativos</span>
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Meus Chamados</h3>
        <p className="text-sm text-slate-500 leading-relaxed">Acompanhe o status das suas solicitações em aberto e histórico de suporte.</p>
      </div>
    </div>

    <div className="bg-white/2 border border-white/5 rounded-4xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-blue-500/20 p-1">
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" className="rounded-full bg-slate-800" alt="Support" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Atendimento em Tempo Real</p>
          <p className="text-xs text-emerald-500 flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"/> Agentes Online Agora</p>
        </div>
      </div>
      <button className="w-full md:w-auto px-8 py-3 bg-white text-black text-xs font-black rounded-xl hover:bg-blue-500 hover:text-white transition-all uppercase tracking-widest">Acessar Live Chat</button>
    </div>
  </div>
);

// --- CREATE SERVER DIALOG ---
interface AdminCreateServerProps {
  onClose: () => void;
}

export const AdminCreateServer: React.FC<AdminCreateServerProps> = ({ onClose }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    image: "itzg/minecraft-bedrock-server", 
    volumePath: "",
    timezone: "America/Sao_Paulo",
    serverName: "",
  });

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch("https://5xrdq2c6-3000.usw3.devtunnels.ms/containers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          name: formData.name.replace(/\s+/g, '-').toLowerCase()
        }),
      });

      const data = await response.json() as { error?: string };

      if (!response.ok) throw new Error(data.error || "Erro ao criar");

      alert("🚀 Container criado e iniciado com sucesso!");
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      alert(`Erro: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const SERVER_IMAGES = [
    { id: "itzg/minecraft-server", name: "Minecraft Java", category: "Games", icon: <Gamepad2 className="text-emerald-500"/> },
    { id: "itzg/minecraft-bedrock-server", name: "Minecraft Bedrock", category: "Games", icon: <Gamepad2 className="text-emerald-400"/> },
    { id: "node:18-alpine", name: "Node.js 18", category: "Apps", icon: <Code2 className="text-green-500"/> },
    { id: "python:3.11-slim", name: "Python 3.11", category: "Apps", icon: <Code2 className="text-yellow-500"/> },
    { id: "nginx:alpine", name: "Nginx Web", category: "Web", icon: <Globe className="text-cyan-500"/> },
  ];

  return (
    <div 
      className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div 
        className="bg-[#0b0e14] border border-white/10 w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 relative"
        onClick={(e) => e.stopPropagation()}
      >
        
        {loading && (
          <div className="absolute inset-0 bg-black/70 z-50 flex flex-col items-center justify-center backdrop-blur-sm">
            <Loader2 className="text-blue-500 animate-spin mb-4" size={40} />
            <p className="text-white font-black animate-pulse tracking-widest">DOCKER: CRIANDO INSTÂNCIA...</p>
          </div>
        )}

        <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl">
              <Container size={22} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Novo Container</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-500 transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="p-8">
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">ID do Container</label>
                    <input 
                      type="text" 
                      placeholder="ex: server-survival" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-all"
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome de Exibição</label>
                    <input 
                      type="text" 
                      placeholder="Meu Servidor" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-all"
                      onChange={(e) => setFormData({...formData, serverName: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Imagem Docker</label>
                  <div className="grid grid-cols-2 gap-3">
                    {SERVER_IMAGES.map((img) => (
                      <button 
                        key={img.id}
                        onClick={() => setFormData({...formData, image: img.id})}
                        className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                          formData.image === img.id ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="p-2 bg-black/40 rounded-lg">{img.icon}</div>
                        <div>
                          <p className="text-sm font-bold text-white leading-tight">{img.name}</p>
                          <p className="text-[9px] text-slate-500 uppercase font-bold">{img.category}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
               <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-4xl text-center">
                  <Shield size={40} className="text-blue-500 mx-auto mb-4" />
                  <h3 className="text-white font-bold text-lg">Confirmar Provisionamento</h3>
                  <p className="text-slate-400 text-sm mt-1">O volume será montado em D:/Servidores Docker/</p>
                  
                  <div className="mt-6 space-y-2 text-left bg-black/20 p-4 rounded-2xl border border-white/5">
                    <div className="flex justify-between text-xs"><span className="text-slate-500 font-bold uppercase">Container:</span> <span className="text-white">{formData.name}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-slate-500 font-bold uppercase">Imagem:</span> <span className="text-blue-400">{formData.image}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-slate-500 font-bold uppercase">Timezone:</span> <span className="text-white">{formData.timezone}</span></div>
                  </div>
               </div>
            </div>
          )}
        </div>

        <div className="px-8 py-6 border-t border-white/5 bg-white/1 flex justify-between items-center">
          <button 
            disabled={step === 1 || loading} 
            onClick={() => setStep(1)} 
            className="text-xs font-bold text-slate-500 hover:text-white transition-all disabled:opacity-0"
          >
            Voltar
          </button>
          
          <div className="flex gap-3">
            <button 
              onClick={onClose} 
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-white/5 transition-all"
            >
              Cancelar
            </button>
            {step === 1 ? (
              <button 
                onClick={() => setStep(2)} 
                className="bg-white text-black px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all"
              >
                Revisar
              </button>
            ) : (
              <button 
                onClick={handleSubmit} 
                disabled={loading} 
                className="bg-blue-600 text-white px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
              >
                {loading ? <Loader2 className="animate-spin" size={14}/> : <Save size={14}/>} Iniciar Docker
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
