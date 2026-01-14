import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useModuleAccess, AppModule } from '@/hooks/useModuleAccess';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Leaf, 
  Cherry, 
  Wine, 
  Tag, 
  Receipt, 
  Users, 
  Calendar,
  Clock,
  FileImage,
  BarChart3,
  Package,
  Bot,
  GripVertical
} from 'lucide-react';
import logoApp from '@/assets/logo-app.png';
import hortifrutiLoading from '@/assets/hortifruti-loading.jpg';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface MenuOption {
  name: string;
  description: string;
  href: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  roles: string[];
  module: AppModule | null;
}

const defaultMenuOptions: MenuOption[] = [
  {
    name: 'Estoque',
    description: 'Gerenciar produtos e estoque',
    href: '/estoque',
    icon: Package,
    color: 'text-primary-foreground',
    bgColor: 'bg-gradient-to-br from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 shadow-lg hover:shadow-xl',
    roles: ['administrador'],
    module: null,
  },
  {
    name: 'Encartes',
    description: 'Criar e editar cartazes de preço',
    href: '/encartes',
    icon: FileImage,
    color: 'text-primary-foreground',
    bgColor: 'bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-lg hover:shadow-xl',
    roles: ['administrador', 'operador'],
    module: null,
  },
  {
    name: 'Hortifrúti',
    description: 'Perdas, produtos e relatórios',
    href: '/hortifruti',
    icon: Leaf,
    color: 'text-primary-foreground',
    bgColor: 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl',
    roles: ['administrador', 'operador'],
    module: 'perdas',
  },
  {
    name: 'Ofertas',
    description: 'Criar e gerenciar campanhas',
    href: '/ofertas',
    icon: Tag,
    color: 'text-primary-foreground',
    bgColor: 'bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg hover:shadow-xl',
    roles: ['administrador', 'operador'],
    module: null,
  },
  {
    name: 'Polpas',
    description: 'Estoque e conferências',
    href: '/polpas',
    icon: Cherry,
    color: 'text-primary-foreground',
    bgColor: 'bg-gradient-to-br from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 shadow-lg hover:shadow-xl',
    roles: ['administrador'],
    module: 'polpas',
  },
  {
    name: 'Legumes',
    description: 'Estoque e recebimentos',
    href: '/legumes',
    icon: Leaf,
    color: 'text-primary-foreground',
    bgColor: 'bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg hover:shadow-xl',
    roles: ['administrador'],
    module: 'legumes',
  },
  {
    name: 'Coca-Cola',
    description: 'Estoque e conferências',
    href: '/coca',
    icon: Wine,
    color: 'text-primary-foreground',
    bgColor: 'bg-gradient-to-br from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 shadow-lg hover:shadow-xl',
    roles: ['administrador'],
    module: 'coca',
  },
  {
    name: 'Cotações',
    description: 'Pedidos de compra',
    href: '/cotacoes',
    icon: Receipt,
    color: 'text-primary-foreground',
    bgColor: 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl',
    roles: ['administrador', 'operador'],
    module: null,
  },
  {
    name: 'Usuários',
    description: 'Gerenciar acessos',
    href: '/usuarios',
    icon: Users,
    color: 'text-primary-foreground',
    bgColor: 'bg-gradient-to-br from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 shadow-lg hover:shadow-xl',
    roles: ['administrador'],
    module: 'usuarios',
  },
  {
    name: 'Relatório Perdas',
    description: 'Análise consolidada de perdas',
    href: '/relatorio-consolidado',
    icon: BarChart3,
    color: 'text-primary-foreground',
    bgColor: 'bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 shadow-lg hover:shadow-xl',
    roles: ['administrador'],
    module: null,
  },
  {
    name: 'Assistente IA',
    description: 'Análises inteligentes',
    href: '/assistente-ia',
    icon: Bot,
    color: 'text-primary-foreground',
    bgColor: 'bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-lg hover:shadow-xl',
    roles: ['administrador'],
    module: null,
  },
];

// Sortable Card Component
const SortableCard = ({ option, id }: { option: MenuOption; id: string }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group"
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 z-10 p-1 rounded-md bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4 text-white" />
      </div>
      <Link
        to={option.href}
        className={`
          flex flex-col items-center justify-center p-6 rounded-2xl 
          transition-all duration-300 transform hover:scale-105
          ${option.bgColor}
        `}
      >
        <div className="p-4 rounded-full bg-white/20 mb-3">
          <option.icon className={`w-8 h-8 ${option.color}`} />
        </div>
        <span className={`font-semibold text-center text-sm ${option.color}`}>
          {option.name}
        </span>
        <span className={`text-xs text-center mt-1 line-clamp-2 ${option.color} opacity-80`}>
          {option.description}
        </span>
      </Link>
    </div>
  );
};

const Index = () => {
  const { user, loading, userRole, userName } = useAuth();
  const { hasAccess } = useModuleAccess();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [menuOptions, setMenuOptions] = useState<MenuOption[]>(defaultMenuOptions);
  const [menuOrder, setMenuOrder] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // Get first name only
  const getFirstName = () => {
    if (!userName) return 'Usuário';
    return userName.split(' ')[0];
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Operador redirect
  useEffect(() => {
    if (!loading && user && userRole === 'operador') {
      navigate('/perdas');
    }
  }, [user, loading, userRole, navigate]);

  // Load saved order
  useEffect(() => {
    const loadMenuOrder = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from('configuracoes_sistema')
          .select('valor')
          .eq('chave', `menu_order_${user.id}`)
          .single();
        
        if (data?.valor && Array.isArray(data.valor)) {
          setMenuOrder(data.valor as string[]);
        }
      } catch (error) {
        // No saved order
      }
    };
    loadMenuOrder();
  }, [user]);

  // Apply saved order to menu options
  useEffect(() => {
    if (menuOrder.length > 0) {
      const orderedOptions = [...defaultMenuOptions].sort((a, b) => {
        const indexA = menuOrder.indexOf(a.name);
        const indexB = menuOrder.indexOf(b.name);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
      setMenuOptions(orderedOptions);
    }
  }, [menuOrder]);

  const filteredOptions = menuOptions.filter(option => {
    if (!userRole) return false;
    return option.roles.includes(userRole);
  });

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = filteredOptions.findIndex((item) => item.name === active.id);
      const newIndex = filteredOptions.findIndex((item) => item.name === over.id);
      
      const newOrder = arrayMove(filteredOptions, oldIndex, newIndex);
      const newOrderNames = newOrder.map(o => o.name);
      
      // Update local state
      setMenuOptions(prev => {
        const reordered = [...prev];
        reordered.sort((a, b) => {
          const indexA = newOrderNames.indexOf(a.name);
          const indexB = newOrderNames.indexOf(b.name);
          if (indexA === -1 && indexB === -1) return 0;
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });
        return reordered;
      });
      
      // Save to database
      if (user) {
        try {
          await supabase
            .from('configuracoes_sistema')
            .upsert({
              chave: `menu_order_${user.id}`,
              valor: newOrderNames
            }, { onConflict: 'chave' });
        } catch (error) {
          console.error('Erro ao salvar ordem:', error);
        }
      }
    }
  }, [filteredOptions, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <img 
            src={hortifrutiLoading} 
            alt="Carregando" 
            className="w-80 h-auto rounded-lg shadow-lg animate-pulse"
          />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || userRole === 'operador') {
    return null;
  }

  const diaSemana = format(currentTime, "EEEE", { locale: ptBR });
  const dataFormatada = format(currentTime, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <MainLayout>
      <div className="space-y-6 p-4">
        {/* Header moderno com saudação e data */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 p-6 shadow-xl">
          {/* Elementos decorativos */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Logo */}
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl">
                <img 
                  src={logoApp} 
                  alt="Logo" 
                  className="w-14 h-14 object-contain"
                />
              </div>
              
              {/* Saudação e data */}
              <div className="flex-1">
                <p className="text-white/80 text-sm font-medium capitalize">{diaSemana}</p>
                <h1 className="text-2xl md:text-3xl font-bold text-white mt-1">
                  {getGreeting()}, <span className="text-white/90">{getFirstName()}</span>! 👋
                </h1>
                <p className="text-white/90 text-sm mt-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {dataFormatada}
                </p>
              </div>
              
              {/* Horário */}
              <div className="bg-white/20 backdrop-blur-sm px-4 py-3 rounded-xl text-center">
                <Clock className="w-5 h-5 text-white mx-auto mb-1" />
                <p className="text-white font-bold text-lg">{format(currentTime, 'HH:mm')}</p>
              </div>
            </div>
            
            {/* Subtítulo */}
            <p className="text-white/80 text-sm mt-4 text-center">
              Arraste os cards para reorganizar o menu
            </p>
          </div>
        </div>

        {/* Menu Grid with Drag and Drop */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredOptions.map(o => o.name)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredOptions.map((option) => (
                <SortableCard key={option.name} option={option} id={option.name} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </MainLayout>
  );
};

export default Index;
