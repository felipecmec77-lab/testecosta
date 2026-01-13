import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GripVertical, Settings, Save, RotateCcw, Building2, Palette, ImageIcon, Loader2, Upload, Trash2, Package, Eye, EyeOff, Truck, Scale } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { FornecedoresManager } from '@/components/sistema/FornecedoresManager';
import { FracionamentoManager } from '@/components/sistema/FracionamentoManager';

interface SidebarItem {
  id: string;
  name: string;
  href: string;
  visible: boolean;
  order: number;
}

interface EmpresaConfig {
  nome: string;
  slogan: string;
  telefone: string;
  endereco: string;
  logoUrl: string;
}

interface TemaConfig {
  corPrimaria: string;
  corSecundaria: string;
  corAcento: string;
  corSidebar: string;
  tamanhoFonte: 'pequeno' | 'medio' | 'grande';
  bordaArredondada: 'nenhuma' | 'pequena' | 'media' | 'grande';
}

interface EstoqueButtonConfig {
  id: string;
  name: string;
  visible: boolean;
  order: number;
}

const DEFAULT_ESTOQUE_BUTTONS: EstoqueButtonConfig[] = [
  { id: 'relatorios', name: 'RELATÓRIOS', visible: true, order: 0 },
  { id: 'adicionar', name: 'ADICIONAR', visible: true, order: 1 },
  { id: 'exportar', name: 'EXPORTAR (Menu)', visible: true, order: 2 },
];

// Presets de cores para o sidebar
const SIDEBAR_PRESETS = [
  { name: 'Azul Escuro', color: '#1e293b', accent: '#3b82f6' },
  { name: 'Verde Floresta', color: '#14532d', accent: '#22c55e' },
  { name: 'Vermelho Vinho', color: '#7f1d1d', accent: '#ef4444' },
  { name: 'Roxo Elegante', color: '#4c1d95', accent: '#8b5cf6' },
  { name: 'Cinza Moderno', color: '#374151', accent: '#6b7280' },
  { name: 'Azul Marinho', color: '#1e3a5f', accent: '#0ea5e9' },
  { name: 'Marrom Café', color: '#422006', accent: '#f59e0b' },
  { name: 'Rosa Escuro', color: '#831843', accent: '#ec4899' },
  { name: 'Ciano Oceano', color: '#164e63', accent: '#06b6d4' },
  { name: 'Laranja Terra', color: '#7c2d12', accent: '#f97316' },
];

const DEFAULT_SIDEBAR_ORDER: SidebarItem[] = [
  { id: 'inicio', name: 'Início', href: '/', visible: true, order: 0 },
  { id: 'estoque', name: 'Estoque', href: '/estoque', visible: true, order: 1 },
  { id: 'dashboard-geral', name: 'Dashboard Geral', href: '/dashboard-geral', visible: true, order: 2 },
  { id: 'encartes', name: 'Encartes', href: '/encartes', visible: true, order: 3 },
  { id: 'hortifruti', name: 'Hortifrúti', href: '/hortifruti', visible: true, order: 4 },
  { id: 'usuarios', name: 'Usuários', href: '/usuarios', visible: true, order: 5 },
  { id: 'polpas', name: 'Polpas', href: '/polpas', visible: true, order: 6 },
  { id: 'conf-polpas', name: 'Conf. Polpas', href: '/conferencia-polpas', visible: true, order: 7 },
  { id: 'legumes', name: 'Legumes', href: '/legumes', visible: true, order: 8 },
  { id: 'conf-legumes', name: 'Conf. Legumes', href: '/conferencia-legumes', visible: true, order: 9 },
  { id: 'coca', name: 'Coca-Cola', href: '/coca', visible: true, order: 10 },
  { id: 'conf-coca', name: 'Conf. Coca', href: '/conferencia-coca', visible: true, order: 11 },
  { id: 'cotacoes', name: 'Cotações', href: '/cotacoes', visible: true, order: 12 },
  { id: 'perdas', name: 'Perdas', href: '/perdas-geral', visible: true, order: 13 },
  { id: 'ofertas', name: 'Ofertas', href: '/ofertas', visible: true, order: 14 },
];

const DEFAULT_EMPRESA: EmpresaConfig = {
  nome: 'COMERCIAL COSTA',
  slogan: 'PREÇO BAIXO DO JEITO QUE VOCÊ GOSTA!',
  telefone: '',
  endereco: '',
  logoUrl: '',
};

const DEFAULT_TEMA: TemaConfig = {
  corPrimaria: '#16a34a',
  corSecundaria: '#0ea5e9',
  corAcento: '#f97316',
  corSidebar: '#1e293b',
  tamanhoFonte: 'medio',
  bordaArredondada: 'media',
};

interface SortableItemProps {
  item: SidebarItem;
  index: number;
}

function SortableItem({ item, index }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between p-3 bg-muted/50 rounded-lg border",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary"
      )}
    >
      <div className="flex items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-muted rounded"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>
        <span className="text-sm font-medium text-muted-foreground w-6">
          {index + 1}
        </span>
        <span className="font-medium">{item.name}</span>
        <span className="text-xs text-muted-foreground hidden sm:inline">{item.href}</span>
      </div>
    </div>
  );
}

const Sistema = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('sidebar');
  
  // Sidebar config
  const [sidebarItems, setSidebarItems] = useState<SidebarItem[]>(DEFAULT_SIDEBAR_ORDER);
  const [savingSidebar, setSavingSidebar] = useState(false);
  const [hasChangesSidebar, setHasChangesSidebar] = useState(false);

  // Estoque buttons config
  const [estoqueButtons, setEstoqueButtons] = useState<EstoqueButtonConfig[]>(DEFAULT_ESTOQUE_BUTTONS);
  const [savingEstoque, setSavingEstoque] = useState(false);
  const [hasChangesEstoque, setHasChangesEstoque] = useState(false);

  // Empresa config
  const [empresa, setEmpresa] = useState<EmpresaConfig>(DEFAULT_EMPRESA);
  const [savingEmpresa, setSavingEmpresa] = useState(false);
  const [hasChangesEmpresa, setHasChangesEmpresa] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Tema config
  const [tema, setTema] = useState<TemaConfig>(DEFAULT_TEMA);
  const [savingTema, setSavingTema] = useState(false);
  const [hasChangesTema, setHasChangesTema] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    if (!loading && userRole !== 'administrador') {
      navigate('/');
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes_sistema')
        .select('chave, valor');

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar configuração:', error);
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
          if (config.chave === 'empresa' && config.valor) {
            setEmpresa({ ...DEFAULT_EMPRESA, ...(config.valor as unknown as EmpresaConfig) });
          }
          if (config.chave === 'tema' && config.valor) {
            setTema({ ...DEFAULT_TEMA, ...(config.valor as unknown as TemaConfig) });
          }
          if (config.chave === 'estoque_buttons' && config.valor) {
            const savedButtons = config.valor as unknown as EstoqueButtonConfig[];
            const mergedButtons = DEFAULT_ESTOQUE_BUTTONS.map(defaultBtn => {
              const savedBtn = savedButtons.find(s => s.id === defaultBtn.id);
              return savedBtn || defaultBtn;
            }).sort((a, b) => a.order - b.order);
            setEstoqueButtons(mergedButtons);
          }
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSidebarItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        newItems.forEach((item, idx) => {
          item.order = idx;
        });
        
        return newItems;
      });
      setHasChangesSidebar(true);
    }
  };

  const saveConfig = async (chave: string, valor: unknown, setSaving: (v: boolean) => void, setHasChanges: (v: boolean) => void) => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('configuracoes_sistema')
        .select('id')
        .eq('chave', chave)
        .single();

      const valorJson = JSON.parse(JSON.stringify(valor));

      if (existing) {
        const { error } = await supabase
          .from('configuracoes_sistema')
          .update({ valor: valorJson })
          .eq('chave', chave);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('configuracoes_sistema')
          .insert({ chave, valor: valorJson });
        
        if (error) throw error;
      }

      toast.success('Configuração salva com sucesso!');
      setHasChanges(false);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const resetSidebar = () => {
    setSidebarItems(DEFAULT_SIDEBAR_ORDER);
    setHasChangesSidebar(true);
  };

  const resetEmpresa = () => {
    setEmpresa(DEFAULT_EMPRESA);
    setHasChangesEmpresa(true);
  };

  const resetTema = () => {
    setTema(DEFAULT_TEMA);
    setHasChangesTema(true);
  };

  const resetEstoqueButtons = () => {
    setEstoqueButtons(DEFAULT_ESTOQUE_BUTTONS);
    setHasChangesEstoque(true);
  };

  const toggleEstoqueButtonVisibility = (id: string) => {
    setEstoqueButtons(prev => prev.map(btn => 
      btn.id === id ? { ...btn, visible: !btn.visible } : btn
    ));
    setHasChangesEstoque(true);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }

    setUploadingLogo(true);
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('logos')
        .getPublicUrl(data.path);

      setEmpresa({ ...empresa, logoUrl: urlData.publicUrl });
      setHasChangesEmpresa(true);
      toast.success('Logo enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar logo:', error);
      toast.error('Erro ao enviar logo');
    } finally {
      setUploadingLogo(false);
      // Reset input
      event.target.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    // Extract filename from URL if it's from our storage
    const logoUrl = empresa.logoUrl;
    if (logoUrl.includes('logos/')) {
      try {
        const fileName = logoUrl.split('logos/').pop();
        if (fileName) {
          await supabase.storage.from('logos').remove([fileName]);
        }
      } catch (error) {
        console.error('Erro ao remover logo do storage:', error);
      }
    }
    
    setEmpresa({ ...empresa, logoUrl: '' });
    setHasChangesEmpresa(true);
    toast.success('Logo removido');
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Sistema</h1>
            <p className="text-muted-foreground">Configurações gerais do sistema</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="sidebar" className="flex items-center gap-2">
              <GripVertical className="w-4 h-4" />
              <span className="hidden sm:inline">Sidebar</span>
            </TabsTrigger>
            <TabsTrigger value="fornecedores" className="flex items-center gap-2">
              <Truck className="w-4 h-4" />
              <span className="hidden sm:inline">Fornecedores</span>
            </TabsTrigger>
            <TabsTrigger value="fracionamento" className="flex items-center gap-2">
              <Scale className="w-4 h-4" />
              <span className="hidden sm:inline">Fracionamento</span>
            </TabsTrigger>
            <TabsTrigger value="estoque" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Estoque</span>
            </TabsTrigger>
            <TabsTrigger value="empresa" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Empresa</span>
            </TabsTrigger>
            <TabsTrigger value="tema" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Tema</span>
            </TabsTrigger>
          </TabsList>

          {/* SIDEBAR TAB */}
          <TabsContent value="sidebar">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <GripVertical className="w-5 h-5" />
                      Ordem do Sidebar
                    </CardTitle>
                    <CardDescription>
                      Arraste os itens para reordenar o menu lateral
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetSidebar}
                      disabled={savingSidebar}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Resetar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveConfig('sidebar_order', sidebarItems, setSavingSidebar, setHasChangesSidebar)}
                      disabled={savingSidebar || !hasChangesSidebar}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {savingSidebar ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={sidebarItems.map(item => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {sidebarItems.map((item, index) => (
                        <SortableItem key={item.id} item={item} index={index} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FORNECEDORES TAB */}
          <TabsContent value="fornecedores">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Gestão de Fornecedores
                </CardTitle>
                <CardDescription>
                  Cadastre e gerencie os fornecedores para cotações e pedidos de compra
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FornecedoresManager />
              </CardContent>
            </Card>
          </TabsContent>

          {/* FRACIONAMENTO TAB */}
          <TabsContent value="fracionamento">
            <FracionamentoManager />
          </TabsContent>

          {/* ESTOQUE TAB */}
          <TabsContent value="estoque">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Botões do Estoque
                    </CardTitle>
                    <CardDescription>
                      Configure quais botões aparecem na página de Estoque
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetEstoqueButtons}
                      disabled={savingEstoque}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Resetar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveConfig('estoque_buttons', estoqueButtons, setSavingEstoque, setHasChangesEstoque)}
                      disabled={savingEstoque || !hasChangesEstoque}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {savingEstoque ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Ative ou desative os botões que aparecem no cabeçalho da página de Estoque.
                  </p>
                  <div className="space-y-3">
                    {estoqueButtons.map((button) => (
                      <div
                        key={button.id}
                        className={cn(
                          "flex items-center justify-between p-4 bg-muted/50 rounded-lg border transition-all",
                          button.visible ? "border-primary/30" : "border-muted opacity-60"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {button.visible ? (
                            <Eye className="w-5 h-5 text-primary" />
                          ) : (
                            <EyeOff className="w-5 h-5 text-muted-foreground" />
                          )}
                          <div>
                            <span className="font-medium">{button.name}</span>
                            <p className="text-xs text-muted-foreground">
                              {button.id === 'relatorios' && 'Abre o dashboard com relatórios e análises'}
                              {button.id === 'adicionar' && 'Botão para adicionar novos produtos'}
                              {button.id === 'exportar' && 'Menu com opções de exportar e importar'}
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={button.visible}
                          onCheckedChange={() => toggleEstoqueButtonVisibility(button.id)}
                        />
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      💡 <strong>Dica:</strong> O menu de exportar/importar aparece como um ícone de engrenagem discreto ao lado dos outros botões.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* EMPRESA TAB */}
          <TabsContent value="empresa">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Dados da Empresa
                    </CardTitle>
                    <CardDescription>
                      Informações exibidas nos recibos e documentos
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetEmpresa}
                      disabled={savingEmpresa}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Resetar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveConfig('empresa', empresa, setSavingEmpresa, setHasChangesEmpresa)}
                      disabled={savingEmpresa || !hasChangesEmpresa}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {savingEmpresa ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="empresa-nome">Nome da Empresa</Label>
                    <Input
                      id="empresa-nome"
                      value={empresa.nome}
                      onChange={(e) => {
                        setEmpresa({ ...empresa, nome: e.target.value });
                        setHasChangesEmpresa(true);
                      }}
                      placeholder="Nome da empresa"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="empresa-slogan">Slogan</Label>
                    <Input
                      id="empresa-slogan"
                      value={empresa.slogan}
                      onChange={(e) => {
                        setEmpresa({ ...empresa, slogan: e.target.value });
                        setHasChangesEmpresa(true);
                      }}
                      placeholder="Slogan da empresa"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="empresa-telefone">Telefone</Label>
                    <Input
                      id="empresa-telefone"
                      value={empresa.telefone}
                      onChange={(e) => {
                        setEmpresa({ ...empresa, telefone: e.target.value });
                        setHasChangesEmpresa(true);
                      }}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="empresa-endereco">Endereço</Label>
                    <Input
                      id="empresa-endereco"
                      value={empresa.endereco}
                      onChange={(e) => {
                        setEmpresa({ ...empresa, endereco: e.target.value });
                        setHasChangesEmpresa(true);
                      }}
                      placeholder="Endereço completo"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label>Logo da Empresa</Label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Preview do logo */}
                    <div className="w-24 h-24 rounded-lg border-2 border-dashed bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {empresa.logoUrl ? (
                        <img 
                          src={empresa.logoUrl} 
                          alt="Logo" 
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>

                    {/* Upload e ações */}
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploadingLogo}
                          onClick={() => document.getElementById('logo-upload')?.click()}
                        >
                          {uploadingLogo ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4 mr-2" />
                          )}
                          {uploadingLogo ? 'Enviando...' : 'Upload'}
                        </Button>
                        {empresa.logoUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={handleRemoveLogo}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remover
                          </Button>
                        )}
                      </div>
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                      <p className="text-xs text-muted-foreground">
                        Formatos aceitos: PNG, JPG, WEBP. Tamanho máximo: 2MB
                      </p>
                      
                      {/* Fallback: URL manual */}
                      <div className="pt-2 border-t">
                        <Label htmlFor="empresa-logo" className="text-xs text-muted-foreground">
                          Ou insira a URL manualmente:
                        </Label>
                        <Input
                          id="empresa-logo"
                          value={empresa.logoUrl}
                          onChange={(e) => {
                            setEmpresa({ ...empresa, logoUrl: e.target.value });
                            setHasChangesEmpresa(true);
                          }}
                          placeholder="https://exemplo.com/logo.png"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TEMA TAB */}
          <TabsContent value="tema">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="w-5 h-5" />
                      Cores do Tema
                    </CardTitle>
                    <CardDescription>
                      Personalize as cores principais do sistema
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetTema}
                      disabled={savingTema}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Resetar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveConfig('tema', tema, setSavingTema, setHasChangesTema)}
                      disabled={savingTema || !hasChangesTema}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {savingTema ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Presets de Cores para Sidebar */}
                <div className="space-y-3">
                  <Label>Presets de Cores - Sidebar</Label>
                  <p className="text-xs text-muted-foreground">Selecione um preset ou personalize a cor manualmente</p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {SIDEBAR_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => {
                          setTema({ ...tema, corSidebar: preset.color });
                          setHasChangesTema(true);
                        }}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all hover:scale-105",
                          tema.corSidebar === preset.color 
                            ? "border-primary ring-2 ring-primary/20" 
                            : "border-transparent hover:border-muted-foreground/30"
                        )}
                        style={{ backgroundColor: preset.color }}
                      >
                        <div 
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: preset.accent }}
                        />
                        <span className="text-[10px] text-white font-medium text-center leading-tight">
                          {preset.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cores Personalizadas */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-3">
                    <Label htmlFor="cor-primaria">Cor Primária</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        id="cor-primaria"
                        value={tema.corPrimaria}
                        onChange={(e) => {
                          setTema({ ...tema, corPrimaria: e.target.value });
                          setHasChangesTema(true);
                        }}
                        className="w-12 h-12 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={tema.corPrimaria}
                        onChange={(e) => {
                          setTema({ ...tema, corPrimaria: e.target.value });
                          setHasChangesTema(true);
                        }}
                        className="flex-1 uppercase"
                        maxLength={7}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="cor-secundaria">Cor Secundária</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        id="cor-secundaria"
                        value={tema.corSecundaria}
                        onChange={(e) => {
                          setTema({ ...tema, corSecundaria: e.target.value });
                          setHasChangesTema(true);
                        }}
                        className="w-12 h-12 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={tema.corSecundaria}
                        onChange={(e) => {
                          setTema({ ...tema, corSecundaria: e.target.value });
                          setHasChangesTema(true);
                        }}
                        className="flex-1 uppercase"
                        maxLength={7}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="cor-acento">Cor de Destaque</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        id="cor-acento"
                        value={tema.corAcento}
                        onChange={(e) => {
                          setTema({ ...tema, corAcento: e.target.value });
                          setHasChangesTema(true);
                        }}
                        className="w-12 h-12 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={tema.corAcento}
                        onChange={(e) => {
                          setTema({ ...tema, corAcento: e.target.value });
                          setHasChangesTema(true);
                        }}
                        className="flex-1 uppercase"
                        maxLength={7}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="cor-sidebar">Cor do Sidebar</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        id="cor-sidebar"
                        value={tema.corSidebar}
                        onChange={(e) => {
                          setTema({ ...tema, corSidebar: e.target.value });
                          setHasChangesTema(true);
                        }}
                        className="w-12 h-12 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={tema.corSidebar}
                        onChange={(e) => {
                          setTema({ ...tema, corSidebar: e.target.value });
                          setHasChangesTema(true);
                        }}
                        className="flex-1 uppercase"
                        maxLength={7}
                      />
                    </div>
                  </div>
                </div>

                {/* Tamanho da Fonte e Bordas */}
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <Label>Tamanho da Fonte</Label>
                    <div className="flex gap-2">
                      {[
                        { value: 'pequeno', label: 'Pequeno', size: 'text-xs' },
                        { value: 'medio', label: 'Médio', size: 'text-sm' },
                        { value: 'grande', label: 'Grande', size: 'text-base' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setTema({ ...tema, tamanhoFonte: option.value as TemaConfig['tamanhoFonte'] });
                            setHasChangesTema(true);
                          }}
                          className={cn(
                            "flex-1 px-4 py-3 rounded-lg border-2 transition-all",
                            tema.tamanhoFonte === option.value
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-muted hover:border-muted-foreground/30"
                          )}
                        >
                          <span className={option.size}>{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label>Bordas Arredondadas</Label>
                    <div className="flex gap-2">
                      {[
                        { value: 'nenhuma', label: 'Nenhuma', radius: 'rounded-none' },
                        { value: 'pequena', label: 'Pequena', radius: 'rounded' },
                        { value: 'media', label: 'Média', radius: 'rounded-lg' },
                        { value: 'grande', label: 'Grande', radius: 'rounded-2xl' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setTema({ ...tema, bordaArredondada: option.value as TemaConfig['bordaArredondada'] });
                            setHasChangesTema(true);
                          }}
                          className={cn(
                            "flex-1 px-3 py-3 border-2 transition-all",
                            option.radius,
                            tema.bordaArredondada === option.value
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-muted hover:border-muted-foreground/30"
                          )}
                        >
                          <span className="text-xs">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="border rounded-lg p-4 space-y-4">
                  <p className="text-sm font-medium text-muted-foreground">Pré-visualização</p>
                  <div className="flex flex-wrap gap-3">
                    <div 
                      className="px-4 py-2 rounded-lg text-white font-medium"
                      style={{ backgroundColor: tema.corPrimaria }}
                    >
                      Primária
                    </div>
                    <div 
                      className="px-4 py-2 rounded-lg text-white font-medium"
                      style={{ backgroundColor: tema.corSecundaria }}
                    >
                      Secundária
                    </div>
                    <div 
                      className="px-4 py-2 rounded-lg text-white font-medium"
                      style={{ backgroundColor: tema.corAcento }}
                    >
                      Destaque
                    </div>
                    <div 
                      className="px-4 py-2 rounded-lg text-white font-medium"
                      style={{ backgroundColor: tema.corSidebar }}
                    >
                      Sidebar
                    </div>
                  </div>
                  
                  {/* Preview do Sidebar */}
                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground mb-2">Preview do Sidebar:</p>
                    <div 
                      className="w-full max-w-[200px] h-40 rounded-lg p-3 flex flex-col gap-2"
                      style={{ backgroundColor: tema.corSidebar }}
                    >
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">U</span>
                      </div>
                      <div className="space-y-1">
                        <div className="w-full h-6 rounded bg-white/10" />
                        <div className="w-3/4 h-6 rounded bg-white/20" />
                        <div className="w-full h-6 rounded bg-white/10" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Sistema;
