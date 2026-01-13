import { 
  TrendingUp, 
  ShoppingCart, 
  Building2, 
  FileText, 
  BarChart3, 
  FileCheck,
  Package,
  History
} from 'lucide-react';

type TabValue = 'dashboard' | 'nova' | 'fornecedores' | 'produtos' | 'historico' | 'mapa' | 'ordens';

interface CotacaoNavigationProps {
  activeTab: TabValue;
  onTabChange: (tab: TabValue) => void;
}

const navItems: { value: TabValue; label: string; icon: React.ElementType }[] = [
  { value: 'dashboard', label: 'DASHBOARD', icon: TrendingUp },
  { value: 'nova', label: 'NOVA COTAÇÃO', icon: ShoppingCart },
  { value: 'fornecedores', label: 'FORNECEDORES', icon: Building2 },
  { value: 'produtos', label: 'PRODUTOS', icon: Package },
  { value: 'historico', label: 'COTAÇÕES', icon: FileText },
  { value: 'mapa', label: 'MAPA DE PREÇOS', icon: BarChart3 },
  { value: 'ordens', label: 'ORDENS', icon: FileCheck },
];

const CotacaoNavigation = ({ activeTab, onTabChange }: CotacaoNavigationProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 md:gap-3">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.value}
            onClick={() => onTabChange(item.value)}
            className={`flex flex-col items-center justify-center p-3 md:p-4 rounded-xl transition-all duration-300 ${
              activeTab === item.value
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg scale-[1.02]'
                : 'bg-card border border-border hover:bg-muted/50 text-foreground hover:scale-[1.01]'
            }`}
          >
            <Icon className="w-5 h-5 md:w-6 md:h-6 mb-1" />
            <span className="text-[10px] md:text-xs font-medium text-center leading-tight">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default CotacaoNavigation;
