import React, { useState, useMemo, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router"; // Corrigido para react-router-dom
import { useQuery } from "@tanstack/react-query";
import { ContentRouter } from "./ContentRouter";

import {
  Server, Terminal, FolderTree, Database, Globe, LogOut, Menu, 
  HardDrive, Users, Layers, Cloud, Settings, BarChart3, Wrench, X,
  CloudLightning, Cpu, Binary, ShieldCheck, Waypoints, FileText
} from "lucide-react";

// --- MAPEAMENTO DE NAVEGAÇÃO ---
export const NavigationMap = [
  {
    group: "Gerenciamento de Instância",
    isContextual: true, 
    items: [
      { id: "console", name: "Terminal Console", href: "/servers/:id/console", icon: Terminal },
      { id: "analytics", name: "Métricas em Tempo Real", href: "/servers/:id/metrics", icon: BarChart3 },
      { id: "files", name: "Gerenciador de Arquivos", href: "/servers/:id/files", icon: FolderTree },
      { id: "databases", name: "Bancos de Dados", href: "/servers/:id/databases", icon: Database },
      { id: "audit-local", name: "Logs de Auditoria", href: "/servers/:id/audit", icon: FileText },
      { id: "settings", name: "Configurações", href: "/servers/:id/settings", icon: Settings },
    ]
  },
  {
    group: "Infraestrutura Cloud",
    items: [
      { id: "my-servers", name: "Meus Servidores", href: "/servers", icon: Server },
      { id: "edge-functions", name: "Edge Workers", href: "/edge/functions", icon: CloudLightning, badge: "Beta" },
      { id: "k8s-clusters", name: "Kubernetes Clusters", href: "/k8s", icon: Layers },
      { id: "object-storage", name: "S3 Object Storage", href: "/storage", icon: HardDrive },
    ]
  },
  {
    group: "Rede & Segurança",
    items: [
      { id: "domains", name: "DNS & Domínios", href: "/domains", icon: Globe },
      { id: "load-balancers", name: "Load Balancers", href: "/network/load-balancers", icon: Waypoints },
      { id: "vpn-tunnels", name: "Rede Privada", href: "/network/vpn", icon: ShieldCheck },
    ]
  },
  {
    group: "Root Administration",
    adminOnly: true, 
    items: [
      { id: "admin-nodes", name: "Nós do Sistema", href: "/admin/nodes", icon: Cpu },
      { id: "admin-eggs", name: "Nests & Docker Eggs", href: "/admin/eggs", icon: Binary },
      { id: "admin-users", name: "Diretório de Usuários", href: "/admin/users", icon: Users },
      { id: "admin-settings", name: "Configuração Global", href: "/admin/settings", icon: Wrench },
    ]
  }
];

const Sidebar: React.FC<{ user: any; isMobileOpen: boolean; closeMobile: () => void }> = ({ user, isMobileOpen, closeMobile }) => {
  const location = useLocation();
  
  // Extração do ID do servidor da URL para navegação contextual
  const currentId = useMemo(() => {
    const match = location.pathname.match(/\/servers\/([^/]+)/);
    return match ? match[1] : null;
  }, [location.pathname]);

  const filteredNav = NavigationMap.filter(section => {
    if (section.adminOnly && !user?.admin) return false;
    return true;
  });

  return (
    <>
      {/* Overlay Mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] md:hidden transition-opacity" 
          onClick={closeMobile} 
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed inset-y-0 left-0 z-[70] w-72 bg-[#050608] border-r border-white/[0.04] 
        flex flex-col transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:w-64
        ${isMobileOpen ? "translate-x-0 shadow-[20px_0_50px_rgba(0,0,0,0.8)]" : "-translate-x-full"}
      `}>
        
        {/* Logo Section */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.25)]">
              <Cloud className="text-white" size={20} fill="currentColor" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white text-lg leading-none">Proteus</span>
              <span className="text-[9px] text-blue-500 font-bold uppercase tracking-widest mt-1">Console</span>
            </div>
          </div>
          <button onClick={closeMobile} className="md:hidden p-2 text-slate-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-7 overflow-y-auto custom-scrollbar pb-6 mt-2">
          {filteredNav.map((section) => {
            if (section.isContextual && !currentId) return null;

            return (
              <div key={section.group} className="space-y-1.5">
                <h3 className="px-4 text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] mb-2">
                  {section.group}
                </h3>
                <div className="space-y-0.5">
                  {section.items.map((item: any) => {
                    const finalHref = item.href.replace(":id", currentId || "");
                    const isActive = location.pathname === finalHref;

                    return (
                      <Link
                        key={item.id}
                        to={finalHref}
                        onClick={() => window.innerWidth < 768 && closeMobile()}
                        className={`group flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all
                          ${isActive 
                            ? "bg-blue-600/10 text-blue-400 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.1)]" 
                            : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.03]"}`}
                      >
                        <item.icon size={18} className={isActive ? "text-blue-400" : "group-hover:text-slate-200"} />
                        <span className="flex-1 tracking-tight">{item.name}</span>
                        {item.badge && (
                          <span className="text-[8px] px-1.5 py-0.5 bg-blue-600/20 text-blue-400 rounded-md font-bold uppercase">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="mx-3 mb-4 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-xs">
            {user?.name?.substring(0, 2).toUpperCase() || "US"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-slate-200 truncate leading-tight">{user?.name || "Usuário"}</p>
            <p className="text-[9px] text-slate-500 font-black uppercase mt-0.5">
              {user?.admin ? "Master Admin" : (user?.plan || "Standard")}
            </p>
          </div>
          <button className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all">
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  );
};

export const Layout: React.FC = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
    const location = useLocation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
    setIsMobileOpen(false);
  }, [location.pathname]);
  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      try {
        const res = await fetch(`https://5xrdq2c6-5173.usw3.devtunnels.ms/users/`);
        if (!res.ok) throw new Error();
        return await res.json();
      } catch {
        const cached = localStorage.getItem("proteus_user_cache");
        return cached ? JSON.parse(cached) : { name: "Usuário", plan: "Cloud", admin: false };
      }
    },
    staleTime: 1000 * 60 * 10,
  });

  return (
    <div className="flex h-screen bg-[#050608] text-slate-300 overflow-hidden font-sans">
      <Sidebar user={user} isMobileOpen={isMobileOpen} closeMobile={() => setIsMobileOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar Mobile */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04] md:hidden bg-[#050608]/80 backdrop-blur-md z-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Cloud className="text-white" size={16} fill="currentColor" />
            </div>
            <span className="font-bold text-white tracking-tight">Proteus</span>
          </div>
          <button 
            onClick={() => setIsMobileOpen(true)}
            className="p-2 bg-white/5 rounded-xl text-slate-400 hover:text-white"
          >
            <Menu size={22} />
          </button>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#090b10]">
          <ContentRouter />
        </main>
      </div>
    </div>
  );
};

export default Layout;