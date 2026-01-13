import { ReactNode, useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  LogOut, 
  Sun, 
  Moon, 
  LayoutDashboard,
  Leaf,
  Users,
  Cherry,
  Wine,
  Receipt,
  AlertTriangle,
  Tag,
  BarChart3,
  FileImage,
  Settings,
  TrendingDown,
  Menu,
  X,
  ChevronLeft,
  Package,
  Bot
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import StockAlerts from '@/components/StockAlerts';
import { AiAssistantButton } from '@/components/ai/AiAssistantButton';
import logoApp from '@/assets/logo-app.png';
import { supabase } from '@/integrations/supabase/client';

interface MainLayoutProps {
  children: ReactNode;
}

interface SidebarItem {
  id: string;
  name: string;
  href: string;
  visible: boolean;
  order: number;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'inicio': LayoutDashboard,
  'estoque': Package,
  'dashboard-geral': BarChart3,
  'encartes': FileImage,
  'hortifruti': Leaf,
  'usuarios': Users,
  'polpas': Cherry,
  'conf-polpas': Cherry,
  'legumes': Leaf,
  'conf-legumes': Leaf,
  'coca': Wine,
  'conf-coca': Wine,
  'cotacoes': Receipt,
  'perdas': AlertTriangle,
  'ofertas': Tag,
  'relatorio-consolidado': TrendingDown,
  'assistente-ia': Bot,
};

const roleMap: Record<string, string[]> = {
  'inicio': ['administrador', 'visualizador'],
  'estoque': ['administrador'],
  'dashboard-geral': ['administrador'],
  'encartes': ['administrador', 'operador'],
  'hortifruti': ['administrador', 'operador'],
  'usuarios': ['administrador'],
  'polpas': ['administrador'],
  'conf-polpas': ['operador'],
  'legumes': ['administrador'],
  'conf-legumes': ['operador'],
  'coca': ['administrador'],
  'conf-coca': ['operador'],
  'cotacoes': ['administrador', 'operador'],
  'perdas': ['administrador', 'operador'],
  'ofertas': ['administrador', 'operador'],
  'relatorio-consolidado': ['administrador'],
  'assistente-ia': ['administrador'],
};

const DEFAULT_SIDEBAR_ORDER: SidebarItem[] = [
  { id: 'inicio', name: 'Início', href: '/', visible: true, order: 0 },
  { id: 'assistente-ia', name: 'Assistente IA', href: '/assistente-ia', visible: true, order: 1 },
  { id: 'estoque', name: 'Estoque', href: '/estoque', visible: true, order: 2 },
  { id: 'dashboard-geral', name: 'Dashboard Geral', href: '/dashboard-geral', visible: true, order: 3 },
  { id: 'encartes', name: 'Encartes', href: '/encartes', visible: true, order: 4 },
  { id: 'hortifruti', name: 'Hortifrúti', href: '/hortifruti', visible: true, order: 5 },
  { id: 'usuarios', name: 'Usuários', href: '/usuarios', visible: true, order: 6 },
  { id: 'polpas', name: 'Polpas', href: '/polpas', visible: true, order: 7 },
  { id: 'conf-polpas', name: 'Conf. Polpas', href: '/conferencia-polpas', visible: true, order: 8 },
  { id: 'legumes', name: 'Legumes', href: '/legumes', visible: true, order: 9 },
  { id: 'conf-legumes', name: 'Conf. Legumes', href: '/conferencia-legumes', visible: true, order: 10 },
  { id: 'coca', name: 'Coca-Cola', href: '/coca', visible: true, order: 11 },
  { id: 'conf-coca', name: 'Conf. Coca', href: '/conferencia-coca', visible: true, order: 12 },
  { id: 'cotacoes', name: 'Cotações', href: '/cotacoes', visible: true, order: 13 },
  { id: 'perdas', name: 'Perdas', href: '/perdas-geral', visible: true, order: 14 },
  { id: 'ofertas', name: 'Ofertas', href: '/ofertas', visible: true, order: 15 },
  { id: 'relatorio-consolidado', name: 'Relatório Perdas', href: '/relatorio-consolidado', visible: true, order: 16 },
];

const MainLayout = ({ children }: MainLayoutProps) => {
  const { userRole, userName, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [sidebarItems, setSidebarItems] = useState<SidebarItem[]>(DEFAULT_SIDEBAR_ORDER);
  const [isOpen, setIsOpen] = useState(false);
  const [sidebarColor, setSidebarColor] = useState<string | null>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    }
  }, [location.pathname, isMobile]);

  const loadConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes_sistema')
        .select('chave, valor');

      if (error && error.code !== 'PGRST116') {
        return;
      }

      if (data) {
        data.forEach((config) => {
          if (config.chave === 'sidebar_order' && config.valor) {
            const savedOrder = config.valor as unknown as SidebarItem[];
            const mergedItems = DEFAULT_SIDEBAR_ORDER.map(defaultItem => {
              const savedItem = savedOrder.find(s => s.id === defaultItem.id);
              return savedItem || defaultItem;
            }).sort((a, b) => a.order - b.order);
            setSidebarItems(mergedItems);
          }
          if (config.chave === 'tema' && config.valor) {
            const temaConfig = config.valor as unknown as { corSidebar?: string };
            if (temaConfig.corSidebar) {
              setSidebarColor(temaConfig.corSidebar);
            }
          }
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const navigation = sidebarItems.map(item => ({
    name: item.name,
    href: item.href,
    icon: iconMap[item.id] || LayoutDashboard,
    roles: roleMap[item.id] || ['administrador'],
  }));

  const filteredNav = navigation.filter(item => {
    if (!userRole) return false;
    return item.roles.includes(userRole);
  });

  const NavItem = ({ item, showLabel }: { item: typeof navigation[0], showLabel: boolean }) => {
    const isActive = location.pathname === item.href;
    
    const content = (
      <Link
        to={item.href}
        onClick={() => setIsOpen(false)}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
          showLabel ? 'w-full' : 'w-10 h-10 justify-center mx-auto',
          isActive
            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/30'
            : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
        )}
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        {showLabel && <span className="font-medium">{item.name}</span>}
      </Link>
    );

    if (!showLabel) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium bg-foreground text-background">
            {item.name}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  const SidebarContent = ({ showLabels }: { showLabels: boolean }) => (
    <>
      {/* Logo */}
      <div className={cn(
        "flex items-center h-16 border-b border-sidebar-border",
        showLabels ? "px-4 gap-3" : "justify-center"
      )}>
        <Link to="/" onClick={() => setIsOpen(false)}>
          <img 
            src={logoApp} 
            alt="Logo" 
            className="w-9 h-9 object-contain"
          />
        </Link>
        {showLabels && (
          <span className="font-bold text-sidebar-foreground">Comercial Costa</span>
        )}
      </div>

      {/* User Avatar */}
      <div className={cn(
        "flex items-center py-4 border-b border-sidebar-border",
        showLabels ? "px-4 gap-3" : "justify-center"
      )}>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sidebar-primary to-sidebar-primary/60 flex items-center justify-center">
          <span className="text-sm font-bold text-sidebar-primary-foreground">
            {userName?.charAt(0).toUpperCase() || 'U'}
          </span>
        </div>
        {showLabels && (
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sidebar-foreground truncate">{userName || 'Usuário'}</p>
            <p className="text-xs text-sidebar-foreground/60 capitalize">{userRole}</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn(
        "flex-1 py-3 overflow-y-auto overflow-x-hidden",
        showLabels ? "px-3 space-y-1" : "space-y-2"
      )}>
        {filteredNav.map((item) => (
          <NavItem key={item.href} item={item} showLabel={showLabels} />
        ))}
      </nav>

      {/* Bottom Section */}
      <div className={cn(
        "py-3 border-t border-sidebar-border",
        showLabels ? "px-3 space-y-1" : "space-y-2"
      )}>
        {/* Sistema link for admins */}
        {userRole === 'administrador' && (
          showLabels ? (
            <Link
              to="/sistema"
              onClick={() => setIsOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                location.pathname === '/sistema'
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/30'
                  : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <Settings className="w-5 h-5" />
              <span className="font-medium">Sistema</span>
            </Link>
          ) : (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  to="/sistema"
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 group mx-auto',
                    location.pathname === '/sistema'
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/30'
                      : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <Settings className="w-5 h-5 flex-shrink-0" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium bg-foreground text-background">
                Sistema
              </TooltipContent>
            </Tooltip>
          )
        )}

        {/* Theme toggle */}
        {showLabels ? (
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span className="font-medium">{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
          </button>
        ) : (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center w-10 h-10 rounded-xl mx-auto text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium bg-foreground text-background">
              {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Stock Alerts */}
        {userRole === 'administrador' && (
          <div className={showLabels ? "px-3" : "flex justify-center"}>
            <StockAlerts />
          </div>
        )}

        {/* Logout */}
        {showLabels ? (
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-sidebar-foreground/60 hover:bg-destructive/20 hover:text-destructive transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sair</span>
          </button>
        ) : (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={handleSignOut}
                className="flex items-center justify-center w-10 h-10 rounded-xl mx-auto text-sidebar-foreground/60 hover:bg-destructive/20 hover:text-destructive transition-all"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium bg-foreground text-background">
              Sair
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </>
  );

  // Swipe gesture handling for mobile
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    // Only trigger on edge swipe (started from right 40px of screen)
    const screenWidth = window.innerWidth;
    const startedFromRightEdge = touchStartX.current > screenWidth - 40;
    
    if (isLeftSwipe && startedFromRightEdge && !isOpen) {
      setIsOpen(true);
    }
    
    touchStartX.current = null;
    touchEndX.current = null;
  }, [isOpen]);

  // Mobile layout with Sheet
  if (isMobile) {
    return (
      <TooltipProvider>
        <div 
          className="min-h-screen bg-background"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Swipe hint indicator */}
          <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 pointer-events-none">
            <div className="w-1 h-16 bg-primary/20 rounded-l-full animate-pulse" />
          </div>

          {/* Mobile Header */}
          <header className="fixed top-0 left-0 right-0 h-14 bg-background/95 backdrop-blur-sm border-b border-border flex items-center justify-between px-4 z-50">
            <Link to="/" className="flex items-center gap-2">
              <img src={logoApp} alt="Logo" className="w-8 h-8 object-contain" />
              <span className="font-bold text-foreground">Comercial Costa</span>
            </Link>
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <button className="p-2 rounded-lg hover:bg-accent active:scale-95 transition-all duration-200">
                  <Menu className="w-6 h-6" />
                </button>
              </SheetTrigger>
              <SheetContent 
                side="right" 
                className="w-[280px] p-0 border-l border-sidebar-border data-[state=open]:animate-slide-in-right data-[state=closed]:animate-slide-out-right"
                style={sidebarColor ? { backgroundColor: sidebarColor } : undefined}
              >
                {/* Close button inside sheet */}
                <button 
                  onClick={() => setIsOpen(false)}
                  className="absolute left-3 top-4 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors z-10"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <div className="h-full flex flex-col pt-2" style={sidebarColor ? { backgroundColor: sidebarColor } : undefined}>
                  <SidebarContent showLabels={true} />
                </div>
              </SheetContent>
            </Sheet>
          </header>

          {/* Main content with top padding for fixed header */}
          <main className="min-h-screen pt-14">
            <div className="p-4">
              {children}
            </div>
          </main>
          
          {/* AI Assistant Button - Mobile */}
          {userRole === 'administrador' && <AiAssistantButton variant="floating" />}
        </div>
      </TooltipProvider>
    );
  }

  // Desktop layout with fixed sidebar
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background flex">
        {/* Sidebar - Fixed compact width */}
        <aside 
          className="fixed left-0 top-0 h-screen w-[68px] bg-sidebar flex flex-col z-40 border-r border-sidebar-border"
          style={sidebarColor ? { backgroundColor: sidebarColor } : undefined}
        >
          <SidebarContent showLabels={false} />
        </aside>

        {/* Main content */}
        <main className="flex-1 min-h-screen ml-[68px]">
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
        
        {/* AI Assistant Button - Desktop */}
        {userRole === 'administrador' && <AiAssistantButton variant="floating" />}
      </div>
    </TooltipProvider>
  );
};

export default MainLayout;
