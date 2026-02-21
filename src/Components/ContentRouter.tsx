import { Store, Tickets } from "lucide-react";
import { AdminNodes, Invoices, ServerBackups, ServerDatabases, ServerMetrics, ServerNetwork, ServerSchedules, ServerSSL, ServerStartup, ServerUsers, ServerVariables } from "./All";
import { AppConsoleFinal } from "./Server/ServerConsole";
import { ServerDashboard } from "./Server/ServerDashboard";
import { ServerFiles } from "./Server/ServerFiles";
import { Suspense } from "react";
import { useLocation } from "react-router";

export const ContentRouter: React.FC = () => {
  const { pathname } = useLocation();
  
  // 1. Normaliza os segmentos removendo o que não é funcionalidade (como o nome do repo no GitHub Pages)
  // Se a URL for proteus.github.io/repo/servers/id, os segments serão ["repo", "servers", "id"]
  const allSegments = pathname.split("/").filter(Boolean);
  
  // 2. Localiza onde começa a rota real de "servers" ou "admin"
  // Isso torna o painel imune ao nome do domínio ou subdiretório
  const serverIdx = allSegments.indexOf("servers");
  const adminIdx = allSegments.indexOf("admin");

  const getActivePage = () => {
    // --- LÓGICA PARA SERVIDORES ---
    if (serverIdx !== -1) {
      const serverId = allSegments[serverIdx + 1];
      const page = allSegments[serverIdx + 2];

      if (page) return page;       // Ex: /servers/id/console -> retorna "console"
      if (serverId) return "console"; // Ex: /servers/id -> retorna "console" por padrão
      return "servers";            // Ex: /servers -> retorna a lista de servidores
    }

    // --- LÓGICA PARA ADMIN ---
    if (adminIdx !== -1) {
      return allSegments[adminIdx + 1] || "admin-home";
    }

    // --- LÓGICA PARA DASHBOARD OU OUTROS ---
    // Pega o último segmento se não for nenhum dos acima, ou retorna dashboard se vazio
    const lastSegment = allSegments[allSegments.length - 1];
    if (!lastSegment || lastSegment === "repo-name-aqui") return "dashboard";
    
    return lastSegment;
  };

  const activePage = getActivePage();

  // O restante do switch renderComponent() permanece o mesmo...
  const renderComponent = () => {
    switch (activePage) {
      case "dashboard":
      case "servers":   return <ServerDashboard />;
      case "console":   return <AppConsoleFinal />;
      case "files":     return <ServerFiles />;
      case "databases": return <ServerDatabases />;
      case "backups":   return <ServerBackups />;
      case "schedules": return <ServerSchedules />;
      case "network":   return <ServerNetwork />;
      case "users":     return <ServerUsers />;
      case "startup":   return <ServerStartup />;
      case "variables": return <ServerVariables />;
      case "web":       return <ServerSSL />;
      case "metrics":   return <ServerMetrics />;
      case "store":     return <Store />;
      case "billing":   return <Invoices />;
      case "support":   return <Tickets />;
      case "nodes":     return <AdminNodes />;
      default:          return null;
    }
  };

  return (
    <Suspense fallback={null}>
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 h-full">
        {renderComponent()}
      </div>
    </Suspense>
  );
};

