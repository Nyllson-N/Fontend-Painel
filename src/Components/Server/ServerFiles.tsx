import React, { useMemo, useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router"; // Adicionado useNavigate
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { 
  Folder, FileText, Search, MoreVertical, Loader2, Trash2, 
  FilePlus, FolderPlus, Upload, Package, CheckSquare, Square, 
  X, Save, ArrowLeft, Type, Move, ArchiveRestore,
  HardDrive, UploadCloud, MinusSquare
} from "lucide-react";

import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css"; 
import "prismjs/components/prism-javascript";
import { BaseUrl } from "../../api/api";

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  updated_at: string;
  size: number;
  content?: string;
  children?: FileItem[];
}

interface ModalState {
  type: 'rename' | 'move' | 'delete' | 'upload' | 'newFolder' | 'newFile' | 'compress' | 'unarchive' | null;
  data: any;
}

const baseURL = "http://" + BaseUrl;

export const ServerFiles: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate(); // Hook para navegação limpa
  const { pathname } = useLocation();
  
  // Extração inteligente do ContainerID e do Caminho da pasta através da URL
  const pathParts = pathname.split("/files/");
  const containerId = pathParts[0].split("/")[2];
  const currentPathFromUrl = pathParts[1] || ""; // Pega tudo que vem após /files/
  
  const [search, setSearch] = useState("");
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [newName, setNewName] = useState("");
  const [code, setCode] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [modal, setModal] = useState<ModalState>({ type: null, data: null });
  const [menuPos, setMenuPos] = useState<{ x: number, y: number, file: FileItem, side: 'up' | 'down' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- QUERIES ---
  const { data: fullData, isLoading } = useQuery({
    queryKey: ["container-structure", containerId],
    queryFn: async () => {
      const res = await fetch(`${baseURL}/docker/container/${containerId}/full-data`);
      if (!res.ok) throw new Error("Falha ao carregar dados");
      return res.json() as Promise<{ files: any[]; root_path: string }>;
    },
  });

  // --- MUTATIONS ---
  const saveFileMutation = useMutation({
    mutationFn: async ({ path, content }: { path: string; content: string }) => {
      const res = await fetch(`${baseURL}/docker/container/${containerId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content })
      });
      if (!res.ok) throw new Error("Erro ao salvar arquivo");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["container-structure", containerId] });
    }
  });

  // --- LÓGICA DE NAVEGAÇÃO (URL Dinâmica) ---
  const { currentFolder, pathHistory, editingFile, currentPathString } = useMemo(() => {
    const rootFiles = fullData?.files || [];
    // Dividimos o caminho da URL em partes para navegar no objeto de arquivos
    const parts = currentPathFromUrl.split("/").filter(Boolean);
    
    let tempHistory: any[] = [];
    let currentLevel = rootFiles;
    let targetFile: FileItem | null = null;
    let lastFolder = null;

    for (const part of parts) {
      const found: any = currentLevel.find((f: any) => f.name === part);
      if (found) {
        if (found.type === "dir") {
          tempHistory.push(found);
          lastFolder = found;
          currentLevel = found.children || [];
        } else { 
          targetFile = found; 
        }
      }
    }
    return { 
      currentFolder: lastFolder, 
      pathHistory: tempHistory, 
      editingFile: targetFile, 
      currentPathString: tempHistory.map(f => f.name).join("/") 
    };
  }, [fullData, currentPathFromUrl]);

  useEffect(() => { if (editingFile) setCode(editingFile.content || ""); }, [editingFile]);

  const currentFiles = currentFolder?.children || fullData?.files || [];
  const filteredFiles = currentFiles.filter((f: any) => f.name.toLowerCase().includes(search.toLowerCase()));

  // --- ACTIONS ---
  const handleAction = async (endpoint: string, method: string, body: any) => {
    setIsPending(true);
    try {
      const res = await fetch(`${baseURL}/docker/container/${containerId}${endpoint}`, {
        method, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(body)
      });
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ["container-structure", containerId] });
        setModal({ type: null, data: null });
        setSelectedPaths([]);
        setNewName("");
      }
    } catch (err) {
      console.error("Erro na requisição:", err);
    } finally { setIsPending(false); }
  };

  const handleUpload = async () => {
    setIsPending(true);
    const formData = new FormData();
    selectedFiles.forEach(file => formData.append("files", file));
    formData.append("path", currentPathString);
    try {
      const res = await fetch(`${baseURL}/docker/container/${containerId}/upload`, { method: 'POST', body: formData });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["container-structure", containerId] });
        setModal({ type: null, data: null });
        setSelectedFiles([]);
      }
    } finally { setIsPending(false); }
  };

  const openMenu = (e: React.MouseEvent, file: FileItem) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const side = (rect.bottom + 220 > window.innerHeight) ? 'up' : 'down';
    setMenuPos({ x: rect.left - 160, y: side === 'up' ? rect.top - 220 : rect.bottom + 10, file, side });
  };

  if (isLoading) return <div className="flex-1 bg-[#050608] flex items-center justify-center h-screen"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="flex-1 p-4 md:p-8 min-h-screen bg-[#050608] text-slate-300 flex flex-col font-sans">
      <div className="h-full bg-[#0a0b10] border border-white/5 rounded-[2rem] flex flex-col shadow-2xl relative z-10 overflow-hidden">
        
        {!editingFile ? (
          <>
            <div className="p-6 border-b border-white/5 bg-[#0a0b10]/80 backdrop-blur-xl sticky top-0 z-[50]">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input className="w-full bg-black/40 border border-white/5 rounded-xl pl-10 pr-4 h-11 text-xs outline-none focus:border-blue-500/50" placeholder="Pesquisar..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                
                <div className="flex items-center gap-2">
                  {selectedPaths.length > 0 ? (
                    <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
                      <div className="px-3 py-2 bg-blue-500/10 rounded-xl border border-blue-500/20 mr-2 text-[10px] font-black text-blue-400 uppercase tracking-tighter">{selectedPaths.length} selecionados</div>
                      <button onClick={() => { setNewName(""); setModal({ type: 'move', data: selectedPaths }); }} className="h-10 px-4 bg-white/[0.03] text-white text-[10px] font-black rounded-xl border border-white/10 hover:bg-white/[0.08] uppercase flex items-center gap-2 transition-all"><Move size={14} className="text-blue-400"/> Mover</button>
                      <button onClick={() => { setNewName("archive.zip"); setModal({ type: 'compress', data: selectedPaths }); }} className="h-10 px-4 bg-white/[0.03] text-white text-[10px] font-black rounded-xl border border-white/10 hover:bg-white/[0.08] uppercase flex items-center gap-2 transition-all"><Package size={14} className="text-amber-400"/> Compactar</button>
                      <button onClick={() => setModal({ type: 'delete', data: currentFiles.filter((f:any) => selectedPaths.includes(f.path)) })} className="h-10 px-4 bg-rose-500/10 text-rose-500 text-[10px] font-black rounded-xl border border-rose-500/20 hover:bg-rose-500/20 uppercase flex items-center gap-2 transition-all"><Trash2 size={14}/> Excluir</button>
                      <button onClick={() => setSelectedPaths([])} className="p-2 text-slate-500 hover:text-white transition-colors"><X size={18}/></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 animate-in fade-in">
                      <button onClick={() => setModal({ type: 'upload', data: null })} className="h-10 px-4 bg-blue-600 text-white text-[10px] font-black rounded-xl hover:bg-blue-500 uppercase flex items-center gap-2 shadow-lg shadow-blue-600/20"><Upload size={14}/> Upload</button>
                      <button onClick={() => { setNewName(""); setModal({ type: 'newFile', data: null }); }} className="h-10 px-4 bg-white/[0.03] text-slate-300 text-[10px] font-black rounded-xl border border-white/5 hover:bg-white/[0.06] uppercase flex items-center gap-2"><FilePlus size={14} className="text-blue-500"/> Arquivo</button>
                      <button onClick={() => { setNewName(""); setModal({ type: 'newFolder', data: null }); }} className="h-10 px-4 bg-white/[0.03] text-slate-300 text-[10px] font-black rounded-xl border border-white/5 hover:bg-white/[0.06] uppercase flex items-center gap-2"><FolderPlus size={14} className="text-amber-500"/> Pasta</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 bg-black/20 rounded-xl w-fit border border-white/5">
                <HardDrive size={12} className="text-blue-500" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">/HOME</span>
                <span className="text-slate-800">/</span>
                <button onClick={() => navigate(`/servers/${containerId}/files`)} className="text-[10px] font-black text-slate-400 hover:text-blue-400 uppercase tracking-widest">CONTAINER</button>
                {pathHistory.map(f => (
                  <React.Fragment key={f.path}>
                    <span className="text-slate-800">/</span>
                    <button onClick={() => navigate(`/servers/${containerId}/files/${f.path}`)} className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{f.name}</button>
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-[#0a0b10] z-[40]">
                  <tr className="text-[10px] font-black uppercase tracking-widest text-slate-600 border-b border-white/5 h-14">
                    <th className="w-14 px-8 text-center">
                      <button onClick={() => selectedPaths.length === filteredFiles.length && filteredFiles.length > 0 ? setSelectedPaths([]) : setSelectedPaths(filteredFiles.map((f:any)=>f.path))}>
                        {selectedPaths.length === filteredFiles.length && filteredFiles.length > 0 ? (
                          <CheckSquare size={16} className="text-blue-500 mx-auto"/>
                        ) : selectedPaths.length > 0 ? (
                          <MinusSquare size={16} className="text-blue-500/60 mx-auto"/>
                        ) : (
                          <Square size={16} className="text-slate-800 mx-auto hover:text-slate-600"/>
                        )}
                      </button>
                    </th>
                    <th>Nome</th>
                    <th className="w-48 text-center px-6">Modificado</th>
                    <th className="w-24 text-right px-8">Tamanho</th>
                    <th className="w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.map((file: any) => (
                    <tr key={file.path} className={`group h-14 border-b border-white/[0.02] transition-colors ${selectedPaths.includes(file.path) ? 'bg-blue-600/5' : 'hover:bg-white/[0.01]'}`}>
                      <td className="px-8 text-center">
                        <button onClick={() => setSelectedPaths(prev => prev.includes(file.path) ? prev.filter(p => p !== file.path) : [...prev, file.path])}>
                          {selectedPaths.includes(file.path) ? <CheckSquare size={16} className="text-blue-500"/> : <Square size={16} className="text-slate-900 group-hover:text-slate-700"/>}
                        </button>
                      </td>
                      <td className="cursor-pointer" onClick={() => navigate(`/servers/${containerId}/files/${file.path}`)}>
                        <div className="flex items-center gap-3">
                          {file.type === "dir" ? <Folder size={18} className="text-amber-500/70" /> : <FileText size={18} className="text-blue-500/70" />}
                          <span className={`text-[12px] font-bold ${selectedPaths.includes(file.path) ? 'text-blue-400' : 'text-slate-300 group-hover:text-white'}`}>{file.name}</span>
                        </div>
                      </td>
                      <td className="text-center px-6 text-[10px] font-black text-slate-600 uppercase italic">{new Date(file.updated_at).toLocaleString()}</td>
                      <td className="text-right px-8 text-[10px] font-mono text-slate-600">{file.type === 'file' ? `${(file.size/1024).toFixed(1)}kb` : 'pasta'}</td>
                      <td className="text-right px-6">
                        <button onClick={(e) => openMenu(e, file)} className="p-2 text-slate-600 hover:text-white transition-all"><MoreVertical size={18}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex flex-col h-full bg-[#050505]">
            <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <button onClick={() => navigate(`/server/${containerId}/files/${currentPathString}`)} className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-widest"><ArrowLeft size={16}/> Voltar</button>
                <div className="h-4 w-px bg-white/10" />
                <span className="text-xs font-bold text-blue-400 font-mono">{editingFile.name}</span>
              </div>
              <button 
                disabled={saveFileMutation.isPending}
                onClick={() => saveFileMutation.mutate({ path: editingFile.path, content: code })} 
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white text-[10px] font-black rounded-xl transition-all hover:bg-blue-500"
              >
                {saveFileMutation.isPending ? <Loader2 size={14} className="animate-spin"/> : <Save size={16}/>} 
                {saveFileMutation.isPending ? 'SALVANDO...' : 'SALVAR'}
              </button>
            </div>
<div className="flex-1 overflow-auto p-0 bg-transparent">
  <Editor
    value={code}
    onValueChange={setCode}
    highlight={(c) => Prism.highlight(c, Prism.languages.javascript, "javascript")}
    padding={10} // Reduzido para economizar espaço nas laterais
    style={{
      fontFamily: '"Fira Code", "Fira Mono", monospace',
      fontSize: 12, // Fonte levemente menor para densidade
      minHeight: '100%',
      background: 'transparent',
      backgroundColor: 'transparent',
      border: 'none',
      outline: 'none',
      lineHeight: '1.2', // Compacta o espaço vertical entre as linhas
    }}
    textareaClassName="focus:outline-none"
  />
</div>
          </div>
        )}
      </div>

      {menuPos && (
        <>
          <div className="fixed inset-0 z-[9999]" onClick={() => setMenuPos(null)} />
          <div className={`fixed w-48 bg-[#0d0e14] border border-white/10 rounded-2xl shadow-2xl py-2 z-[10000] animate-in zoom-in-95 ${menuPos.side === 'up' ? 'origin-bottom' : 'origin-top'}`} style={{ top: menuPos.y, left: menuPos.x }}>
            <button onClick={() => { setNewName(menuPos.file.name); setModal({ type: 'rename', data: menuPos.file }); setMenuPos(null); }} className="w-full px-4 py-3 text-[10px] font-black text-slate-400 hover:bg-blue-600 hover:text-white text-left flex items-center gap-3 uppercase transition-colors"><Type size={14}/> Renomear</button>
            <button onClick={() => { setNewName(""); setModal({ type: 'move', data: [menuPos.file.path] }); setMenuPos(null); }} className="w-full px-4 py-3 text-[10px] font-black text-slate-400 hover:bg-blue-600 hover:text-white text-left flex items-center gap-3 uppercase transition-colors"><Move size={14}/> Mover</button>
            <div className="h-px bg-white/5 my-1" />
            {menuPos.file.name.endsWith('.zip') ? (
               <button onClick={() => { handleAction('/unarchive', 'POST', { path: menuPos.file.path }); setMenuPos(null); }} className="w-full px-4 py-3 text-[10px] font-black text-emerald-500 hover:bg-emerald-600 hover:text-white text-left flex items-center gap-3 uppercase transition-colors"><ArchiveRestore size={14}/> Extrair</button>
            ) : (
               <button onClick={() => { setNewName(`${menuPos.file.name}.zip`); setModal({ type: 'compress', data: [menuPos.file.path] }); setMenuPos(null); }} className="w-full px-4 py-3 text-[10px] font-black text-blue-400 hover:bg-blue-600 hover:text-white text-left flex items-center gap-3 uppercase transition-colors"><Package size={14}/> Compactar</button>
            )}
            <button onClick={() => { setModal({ type: 'delete', data: [menuPos.file] }); setMenuPos(null); }} className="w-full px-4 py-3 text-[10px] font-black text-rose-500 hover:bg-rose-600 hover:text-white text-left flex items-center gap-3 uppercase transition-colors"><Trash2 size={14}/> Excluir</button>
          </div>
        </>
      )}

      {modal.type && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100000] flex items-center justify-center p-6" onClick={() => { setModal({ type: null, data: null }); setSelectedFiles([]); }}>
          <div className="bg-[#0f111a] border border-white/10 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-10">
              <h3 className="text-[11px] font-black text-white mb-8 uppercase tracking-[0.3em] text-center">{modal.type}</h3>

              {modal.type === 'delete' ? (
                <div className="space-y-6">
                  <p className="text-xs text-slate-400 text-center uppercase font-black tracking-widest">Confirmar Exclusão?</p>
                  <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-4 max-h-40 overflow-y-auto space-y-2 custom-scrollbar">
                    {Array.isArray(modal.data) && modal.data.map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 text-[10px] font-bold text-rose-400/80 mb-2 last:mb-0">
                        <Trash2 size={12}/> <span className="truncate">{item.name || item.path}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setModal({ type: null, data: null })} className="flex-1 h-12 bg-white/5 text-slate-500 font-black rounded-xl uppercase text-[10px]">Cancelar</button>
                    <button 
                      disabled={isPending}
                      onClick={() => {
                        const pathsToDelete = Array.isArray(modal.data) 
                          ? modal.data.map((i: any) => i.path || i) 
                          : [modal.data.path || modal.data];
                        handleAction('/delete', 'POST', { paths: pathsToDelete });
                      }} 
                      className="flex-[2] h-12 bg-rose-600 text-white font-black rounded-xl uppercase text-[10px] hover:bg-rose-500 transition-colors flex items-center justify-center gap-2"
                    >
                      {isPending && <Loader2 size={14} className="animate-spin" />}
                      Excluir {Array.isArray(modal.data) && modal.data.length > 1 ? 'Tudo' : ''}
                    </button>
                  </div>
                </div>
              ) : modal.type === 'upload' ? (
                <div className="space-y-6">
                  <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-white/10 rounded-3xl p-12 flex flex-col items-center gap-4 hover:border-blue-500/50 cursor-pointer transition-all">
                    <UploadCloud size={48} className="text-slate-700" />
                    <input type="file" multiple ref={fileInputRef} className="hidden" onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))} />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Clique para selecionar</p>
                  </div>
                  {selectedFiles.length > 0 && (
                    <div className="bg-black/40 rounded-2xl p-4 max-h-40 overflow-y-auto space-y-2">
                      {selectedFiles.map((f, i) => (
                        <div key={i} className="flex justify-between text-[10px] font-bold text-slate-400 bg-white/5 p-2 rounded-lg">
                          <span className="truncate">{f.name}</span>
                          <button onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-rose-500"><X size={14}/></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-4">
                    <button onClick={() => { setModal({ type: null, data: null }); setSelectedFiles([]); }} className="flex-1 h-12 bg-white/5 text-slate-500 font-black rounded-xl uppercase text-[10px]">Cancelar</button>
                    <button onClick={handleUpload} disabled={selectedFiles.length === 0 || isPending} className="flex-[2] h-12 bg-blue-600 text-white font-black rounded-xl uppercase text-[10px] flex items-center justify-center gap-2">
                      {isPending && <Loader2 size={14} className="animate-spin" />}
                      Enviar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{modal.type === 'move' ? 'Destino' : 'Nome'}</label>
                    <div className="relative flex items-center">
                      {modal.type === 'move' && <div className="absolute left-5 text-[10px] font-black text-blue-500/40 font-mono uppercase">home/container/</div>}
                      <input autoFocus className={`w-full bg-black/60 border border-white/10 rounded-2xl h-14 text-sm text-white outline-none focus:border-blue-500/50 font-mono ${modal.type === 'move' ? 'pl-[115px]' : 'pl-6'}`} value={newName} onChange={e => setNewName(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setModal({ type: null, data: null })} className="flex-1 h-12 bg-white/5 text-slate-500 font-black rounded-xl uppercase text-[10px]">Cancelar</button>
                    <button 
                      disabled={isPending}
                      onClick={() => {
                        const cleanPath = newName.replace(/^\/+/, '');
                        if(modal.type === 'move') handleAction('/move', 'POST', { paths: modal.data, destination: cleanPath });
                        if(modal.type === 'rename') handleAction('/rename', 'POST', { oldPath: modal.data.path, newName: cleanPath });
                        if(modal.type === 'newFolder') handleAction('/create', 'POST', { path: currentPathString ? `${currentPathString}/${cleanPath}` : cleanPath, type: 'dir' });
                        if(modal.type === 'newFile') handleAction('/create', 'POST', { path: currentPathString ? `${currentPathString}/${cleanPath}` : cleanPath, type: 'file' });
                        if(modal.type === 'compress') handleAction('/compress', 'POST', { paths: modal.data, outputName: cleanPath });
                      }} className="flex-[2] h-12 bg-blue-600 text-white font-black rounded-xl uppercase text-[10px] flex items-center justify-center gap-2"
                    >
                      {isPending && <Loader2 size={14} className="animate-spin" />}
                      Confirmar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};