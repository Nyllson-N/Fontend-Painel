import { BrowserRouter, Route, Routes } from "react-router"; // Adicionado Navigate
import { Home } from "./Pages/Home";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./queryclient";

// Dica: Use o protocolo seguro se for usar em produção/github pages futuramente
export const baseURL = "http://192.168.1.3:3000";

export function Router() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* IMPORTANTE: O basename deve ser apenas o nome do repositório.
          Se o seu repo é "proteus.github.io", o basename é "/proteus.github.io".
          Se for apenas um sub-repositório, use o nome dele.
      */}
      <BrowserRouter>
        <Routes>
          {/* Rota principal */}
          <Route path="/" element={<Home />} />
          
          {/* O "catch-all" (/*). 
              Se você quer que qualquer erro ou rota inexistente 
              simplesmente mostre a Home, mantenha como abaixo.
          */}
          <Route path="*" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}