import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import OfflineIndicator from "@/components/ui/OfflineIndicator";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Products from "./pages/Products";
import Losses from "./pages/Losses";
import Users from "./pages/Users";
import Reports from "./pages/Reports";
import LaunchHistory from "./pages/LaunchHistory";
import PolpasAdmin from "./pages/PolpasAdmin";
import ConferenciaPolpas from "./pages/ConferenciaPolpas";
import LegumesAdmin from "./pages/LegumesAdmin";
import ConferenciaLegumes from "./pages/ConferenciaLegumes";
import CocaAdmin from "./pages/CocaAdmin";
import ConferenciaCoca from "./pages/ConferenciaCoca";
import Hortifruti from "./pages/Hortifruti";
import Cotacoes from "./pages/Cotacoes";
import Estoque from "./pages/Estoque";
import PerdasGeral from "./pages/PerdasGeral";
import Ofertas from "./pages/Ofertas";
import ConfiguracoesEmail from "./pages/ConfiguracoesEmail";
import DashboardGeral from "./pages/DashboardGeral";
import Encartes from "./pages/Encartes";
import Sistema from "./pages/Sistema";
import RelatorioConsolidado from "./pages/RelatorioConsolidado";
import ProdutoInfo from "./pages/ProdutoInfo";
import AiAssistant from "./pages/AiAssistant";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos (antes chamado cacheTime)
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <OfflineIndicator />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard-geral" element={<DashboardGeral />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/hortifruti" element={<Hortifruti />} />
              <Route path="/produtos" element={<Products />} />
              <Route path="/perdas" element={<Losses />} />
              <Route path="/usuarios" element={<Users />} />
              <Route path="/relatorios" element={<Reports />} />
              <Route path="/lancamentos" element={<LaunchHistory />} />
              <Route path="/polpas" element={<PolpasAdmin />} />
              <Route path="/conferencia-polpas" element={<ConferenciaPolpas />} />
              <Route path="/legumes" element={<LegumesAdmin />} />
              <Route path="/conferencia-legumes" element={<ConferenciaLegumes />} />
              <Route path="/coca" element={<CocaAdmin />} />
              <Route path="/conferencia-coca" element={<ConferenciaCoca />} />
              <Route path="/cotacoes" element={<Cotacoes />} />
              <Route path="/estoque" element={<Estoque />} />
              <Route path="/perdas-geral" element={<PerdasGeral />} />
              <Route path="/ofertas" element={<Ofertas />} />
              <Route path="/configuracoes-email" element={<ConfiguracoesEmail />} />
              <Route path="/encartes" element={<Encartes />} />
              <Route path="/sistema" element={<Sistema />} />
              <Route path="/relatorio-consolidado" element={<RelatorioConsolidado />} />
              <Route path="/produto-info" element={<ProdutoInfo />} />
              <Route path="/assistente-ia" element={<AiAssistant />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
