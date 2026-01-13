import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  Trash2,
  Barcode,
  Loader2,
  FileText,
  TrendingUp,
  Package,
  AlertTriangle,
  Image,
  History,
  Edit,
  Printer,
  Camera,
  Database,
  Save,
  ShoppingCart,
  Coffee,
  Upload,
  Download,
  Keyboard
} from 'lucide-react';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import ThermalLossReceipt from '@/components/losses/ThermalLossReceipt';
import BarcodeScanner from '@/components/BarcodeScanner';
import ManualBarcodeInput from '@/components/ManualBarcodeInput';
import OfflineIndicator from '@/components/ui/OfflineIndicator';
import { useOfflineData } from '@/hooks/useOfflineData';
import * as XLSX from 'xlsx';

const TIMEZONE = 'America/Sao_Paulo';

// Formatar preço para exibição com vírgula (formato brasileiro)
const formatarPreco = (valor: number) => {
  return valor.toFixed(2).replace('.', ',');
};

// Formatar input de preço com vírgula automática
const formatarInputPreco = (valor: string) => {
  // Remove tudo que não é número
  let numeros = valor.replace(/\D/g, '');
  
  // Se tiver 3+ dígitos, insere a vírgula automaticamente
  if (numeros.length >= 3) {
    const inteiros = numeros.slice(0, -2);
    const decimais = numeros.slice(-2);
    return `${inteiros},${decimais}`;
  }
  
  return numeros;
};

interface ItemPerda {
  id: string;
  codigo_barras: string | null;
  nome_item: string;
  marca: string | null;
  categoria: string | null;
  imagem_url: string | null;
  preco_custo: number;
  preco_venda: number;
}

interface CartItem {
  item_id: string;
  codigo_barras: string;
  nome_item: string;
  marca: string;
  quantidade: number;
  preco_unitario: number;
  motivo_perda: string;
  tipo_resolucao: string;
  imagem_url?: string;
  data_vencimento?: string;
  unidade_medida: 'kg' | 'unidade';
  tipo_lancamento: 'perda' | 'consumo';
}

interface Lancamento {
  id: string;
  numero: number;
  data_lancamento: string;
  usuario_id: string;
  status: string;
  observacao: string | null;
  criado_em: string | null;
  total_valor?: number;
  total_itens?: number;
  usuario?: { nome: string };
  resolucoes?: string[];
}

interface PerdaGeral {
  id: string;
  lancamento_id: string | null;
  item_id: string;
  quantidade_perdida: number;
  preco_unitario: number;
  valor_perda: number;
  motivo_perda: string;
  tipo_resolucao: string;
  data_perda: string;
  data_vencimento: string | null;
  observacao: string | null;
  item?: ItemPerda;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--warning))', 'hsl(var(--secondary))', 'hsl(var(--accent))'];

const MOTIVOS_PERDA = [
  { value: 'vencido', label: 'Vencido' },
  { value: 'danificado', label: 'Danificado' },
  { value: 'quebrado', label: 'Quebrado' },
  { value: 'avaria', label: 'Avaria' },
  { value: 'outros', label: 'Outros' }
];

const MOTIVOS_CONSUMO = [
  { value: 'limpeza', label: 'Limpeza' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'escritorio', label: 'Escritório' },
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'outros', label: 'Outros' }
];

const TIPOS_RESOLUCAO = [
  { value: 'sem_resolucao', label: 'Sem Resolução' },
  { value: 'troca', label: 'Troca' },
  { value: 'bonificacao', label: 'Bonificação' },
  { value: 'desconto', label: 'Desconto' }
];

// Categorias predefinidas em ordem alfabética
const CATEGORIAS_PREDEFINIDAS = [
  'AÇOUGUE',
  'ALIMENTOS',
  'BALANÇA',
  'BEBIDAS',
  'BEBIDAS ALCOÓLICAS',
  'BEBIDAS LÁCTEAS',
  'BISCOITOS',
  'BOMBONIERE',
  'CAFÉ E CHÁ',
  'CEREAIS',
  'CERVEJA',
  'CHOCOLATES',
  'CONDIMENTOS',
  'CONGELADOS',
  'CONSERVAS',
  'DESCARTÁVEIS',
  'DIET E LIGHT',
  'DOCES',
  'EMBUTIDOS',
  'ENLATADOS',
  'FARINHAS',
  'FRIOS',
  'GRÃOS',
  'HIGIENE',
  'HIGIENE BUCAL',
  'HIGIENE PESSOAL',
  'HORTIFRUTI',
  'IMPORTADOS',
  'INFANTIL',
  'IOGURTES',
  'LANCHONETE',
  'LATICÍNIOS',
  'LIMPEZA',
  'MASSAS',
  'MATINAIS',
  'MOLHOS',
  'ÓLEOS',
  'PADARIA',
  'PAPELARIA',
  'PERFUMARIA',
  'PET SHOP',
  'QUEIJOS',
  'REFRIGERANTES',
  'ROTISSERIE',
  'SALGADINHOS',
  'SNACKS',
  'SOBREMESAS',
  'SORVETES',
  'SUCOS',
  'SUPLEMENTOS',
  'TEMPEROS',
  'UTILIDADES',
  'VINHOS'
].sort();

const PerdasGeral = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState('nova');
  const [tipoLancamento, setTipoLancamento] = useState<'perda' | 'consumo'>('perda');
  const receiptRef = useRef<HTMLDivElement>(null);
  
  // Offline data hook - cache-first strategy
  const { 
    isOnline, 
    catalogItems: offlineCatalog, 
    searchCatalog, 
    addPendingOperation, 
    pendingCount,
    isSyncing,
    refreshCatalog 
  } = useOfflineData();
  
  // State
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New loss state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchingBarcode, setSearchingBarcode] = useState(false);
  const [lancamentoObservacao, setLancamentoObservacao] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [showManualBarcodeInput, setShowManualBarcodeInput] = useState(false);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isFromScanner, setIsFromScanner] = useState(false);
  
  // Manual product dialog
  const [showManualProductDialog, setShowManualProductDialog] = useState(false);
  const [manualProduct, setManualProduct] = useState({
    codigo_barras: '',
    nome: '',
    marca: '',
    preco_custo: '' as string | number,
    quantidade: '' as string | number,
    motivo_perda: 'danificado',
    tipo_resolucao: 'sem_resolucao',
    data_vencimento: '',
    unidade_medida: 'unidade' as 'kg' | 'unidade'
  });
  
  // Edit item dialog
  const [showEditItemDialog, setShowEditItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<PerdaGeral | null>(null);
  const [editItemData, setEditItemData] = useState({
    quantidade_perdida: '' as string | number,
    preco_unitario: '' as string | number,
    motivo_perda: '',
    tipo_resolucao: '',
    data_vencimento: '',
    unidade_medida: 'unidade' as 'kg' | 'unidade'
  });
  
  // Selected lancamento for viewing
  const [selectedLancamento, setSelectedLancamento] = useState<Lancamento | null>(null);
  const [lancamentoItems, setLancamentoItems] = useState<PerdaGeral[]>([]);
  const [showLancamentoDetail, setShowLancamentoDetail] = useState(false);
  const [showThermalReceipt, setShowThermalReceipt] = useState(false);

  // Catalog state
  const [catalogItems, setCatalogItems] = useState<ItemPerda[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [showEditCatalogDialog, setShowEditCatalogDialog] = useState(false);
  const [editingCatalogItem, setEditingCatalogItem] = useState<ItemPerda | null>(null);
  const [editCatalogData, setEditCatalogData] = useState({
    nome_item: '',
    codigo_barras: '',
    marca: '',
    categoria: '',
    preco_custo: 0,
    preco_venda: 0
  });

  // Multi-edit state
  const [selectedCatalogItems, setSelectedCatalogItems] = useState<Set<string>>(new Set());
  const [showMultiEditDialog, setShowMultiEditDialog] = useState(false);
  const [multiEditData, setMultiEditData] = useState({
    preco_custo: '',
    preco_venda: '',
    categoria: ''
  });

  // New catalog item state
  const [showNewCatalogItemDialog, setShowNewCatalogItemDialog] = useState(false);
  const [newCatalogItem, setNewCatalogItem] = useState({
    nome_item: '',
    codigo_barras: '',
    marca: '',
    categoria: '',
    preco_custo: '' as string | number,
    preco_venda: '' as string | number
  });
  const [showNewItemScanner, setShowNewItemScanner] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [multiEditCategorySearch, setMultiEditCategorySearch] = useState('');
  const [editCategoryCategorySearch, setEditCategoryCategorySearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const balanceFileInputRef = useRef<HTMLInputElement>(null);
  const [importingItems, setImportingItems] = useState(false);
  const [searchingNewItemBarcode, setSearchingNewItemBarcode] = useState(false);

  // Dashboard data
  const [dashboardData, setDashboardData] = useState({
    totalPerdas: 0,
    totalValor: 0,
    totalConsumo: 0,
    valorConsumo: 0,
    perdasPorMotivo: [] as { name: string; value: number }[],
    perdasPorResolucao: [] as { name: string; value: number }[],
    itensMaisPerdidos: [] as { name: string; quantidade: number }[]
  });

  // Filtro de resolução no histórico
  const [filtroResolucao, setFiltroResolucao] = useState<string>('todos');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
    fetchCatalogItems();
  }, [user]);

  const fetchCatalogItems = async () => {
    // Use offline catalog from hook (already cached)
    // Only fetch from server if online and want fresh data
    if (isOnline) {
      try {
        const { data, error } = await supabase
          .from('itens_perdas_geral')
          .select('*')
          .eq('ativo', true)
          .order('nome_item', { ascending: true });

        if (error) throw error;
        setCatalogItems(data || []);
      } catch (error) {
        console.error('Erro ao carregar catálogo:', error);
        // Fall back to offline cache
        setCatalogItems(offlineCatalog);
      }
    } else {
      // Use offline cache
      setCatalogItems(offlineCatalog);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch launches with user profiles
      const { data: lancamentosData, error: lancamentosError } = await supabase
        .from('lancamentos_perdas_geral')
        .select('*')
        .order('criado_em', { ascending: false });

      if (lancamentosError) throw lancamentosError;

      // Fetch losses for each launch
      const lancamentosWithDetails = await Promise.all(
        (lancamentosData || []).map(async (lancamento) => {
          const { data: perdas } = await supabase
            .from('perdas_geral')
            .select('*, item:itens_perdas_geral(*)')
            .eq('lancamento_id', lancamento.id);

          const { data: profile } = await supabase
            .from('profiles')
            .select('nome')
            .eq('id', lancamento.usuario_id)
            .single();

          const totalValor = (perdas || []).reduce((sum, p) => sum + (p.valor_perda || 0), 0);
          const totalItens = (perdas || []).reduce((sum, p) => sum + p.quantidade_perdida, 0);
          const resolucoes = [...new Set((perdas || []).map(p => p.tipo_resolucao))];

          return {
            ...lancamento,
            total_valor: totalValor,
            total_itens: totalItens,
            usuario: profile,
            resolucoes
          };
        })
      );

      setLancamentos(lancamentosWithDetails);

      // Calculate dashboard data
      const { data: allPerdas } = await supabase
        .from('perdas_geral')
        .select('*, item:itens_perdas_geral(*)');

      if (allPerdas) {
        // Separar perdas de consumo (motivo contém marcadores de consumo)
        const consumoMotivos = ['limpeza', 'manutencao', 'escritorio', 'alimentacao'];
        const perdasReais = allPerdas.filter(p => !consumoMotivos.includes(p.motivo_perda));
        const consumoItens = allPerdas.filter(p => consumoMotivos.includes(p.motivo_perda));

        const totalPerdas = perdasReais.length;
        const totalValor = perdasReais.reduce((sum, p) => sum + (p.valor_perda || 0), 0);
        const totalConsumo = consumoItens.length;
        const valorConsumo = consumoItens.reduce((sum, p) => sum + (p.valor_perda || 0), 0);

        const perdasPorMotivo = MOTIVOS_PERDA.map(m => ({
          name: m.label,
          value: perdasReais.filter(p => p.motivo_perda === m.value).length
        })).filter(d => d.value > 0);

        const perdasPorResolucao = TIPOS_RESOLUCAO.map(t => ({
          name: t.label,
          value: allPerdas.filter(p => p.tipo_resolucao === t.value).length
        })).filter(d => d.value > 0);

        // Group by item and count
        const itemCounts: Record<string, { name: string; quantidade: number }> = {};
        allPerdas.forEach(p => {
          const itemName = (p.item?.nome_item || 'DESCONHECIDO').toUpperCase();
          if (!itemCounts[itemName]) {
            itemCounts[itemName] = { name: itemName, quantidade: 0 };
          }
          itemCounts[itemName].quantidade += p.quantidade_perdida;
        });
        const itensMaisPerdidos = Object.values(itemCounts)
          .sort((a, b) => b.quantidade - a.quantidade)
          .slice(0, 5);

        setDashboardData({
          totalPerdas,
          totalValor,
          totalConsumo,
          valorConsumo,
          perdasPorMotivo,
          perdasPorResolucao,
          itensMaisPerdidos
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Função universal de normalização de código de barras
  const normalizeBarcode = (code: string): string => {
    if (!code) return '';
    // Remove TUDO que não é dígito
    return String(code).replace(/\D/g, '').trim();
  };

  // Função de comparação ESTRITA de códigos - apenas match EXATO
  const matchBarcode = (scannedCode: string, dbCode: string): boolean => {
    const scan = normalizeBarcode(scannedCode);
    const db = normalizeBarcode(dbCode);
    
    if (!scan || !db) return false;
    
    // APENAS match exato - sem comparações parciais que causam produtos errados
    if (scan === db) return true;
    
    // Também aceita match sem zeros à esquerda (apenas se ambos forem o mesmo número)
    const scanNoZeros = scan.replace(/^0+/, '') || scan;
    const dbNoZeros = db.replace(/^0+/, '') || db;
    if (scanNoZeros === dbNoZeros) return true;
    
    return false;
  };

  const searchBarcode = async (barcodeValue?: string, fromScanner: boolean = false) => {
    const rawBarcode = barcodeValue || barcodeInput;
    const barcode = normalizeBarcode(rawBarcode);
    
    if (!barcode || barcode.length < 3) {
      toast.error('Código de barras inválido');
      return;
    }

    console.log('🔍 BUSCA:', { raw: rawBarcode, clean: barcode, len: barcode.length, fromScanner, isOnline });
    
    setSearchingBarcode(true);
    setIsFromScanner(fromScanner);
    
    try {
      // OFFLINE-FIRST: Search in cached catalog first
      const cachedItem = searchCatalog(barcode);
      
      if (cachedItem) {
        console.log('✅ MATCH (cache):', cachedItem.nome_item);
        setManualProduct({
          codigo_barras: cachedItem.codigo_barras || '',
          nome: cachedItem.nome_item,
          marca: cachedItem.marca || '',
          preco_custo: cachedItem.preco_custo || 0,
          quantidade: '',
          motivo_perda: tipoLancamento === 'consumo' ? 'limpeza' : 'danificado',
          tipo_resolucao: 'sem_resolucao',
          data_vencimento: '',
          unidade_medida: 'unidade'
        });
        setShowManualProductDialog(true);
        toast.success(`Produto: ${cachedItem.nome_item}`);
        setBarcodeInput('');
        setSearchingBarcode(false);
        return;
      }

      // If online, try server as fallback (in case cache is stale)
      if (isOnline) {
        const { data: allItems, error: fetchError } = await supabase
          .from('itens_perdas_geral')
          .select('*')
          .eq('ativo', true);
        
        if (!fetchError && allItems) {
          const foundItem = allItems.find(item => 
            item.codigo_barras && matchBarcode(barcode, item.codigo_barras)
          );
          
          if (foundItem) {
            console.log('✅ MATCH (servidor):', foundItem.nome_item);
            setManualProduct({
              codigo_barras: foundItem.codigo_barras || '',
              nome: foundItem.nome_item,
              marca: foundItem.marca || '',
              preco_custo: foundItem.preco_custo || 0,
              quantidade: '',
              motivo_perda: tipoLancamento === 'consumo' ? 'limpeza' : 'danificado',
              tipo_resolucao: 'sem_resolucao',
              data_vencimento: '',
              unidade_medida: 'unidade'
            });
            setShowManualProductDialog(true);
            toast.success(`Produto: ${foundItem.nome_item}`);
            setBarcodeInput('');
            setSearchingBarcode(false);
            return;
          }
        }
      }

      // Not found
      console.log('❌ NÃO ENCONTRADO no cache nem servidor');
      toast.error(`Item com código ${barcode} não está no estoque. Cadastre primeiro na aba "Estoque".`, { duration: 5000 });
      setBarcodeInput('');
      setShowSearchSuggestions(true);
    } catch (error) {
      console.error('Erro ao buscar código de barras:', error);
      toast.error('Erro ao buscar produto');
    } finally {
      setSearchingBarcode(false);
    }
  };

  const addToCart = async () => {
    if (!manualProduct.nome.trim()) {
      toast.error('Nome do produto é obrigatório');
      return;
    }

    // Validate data_vencimento if motivo is "vencido"
    if (manualProduct.motivo_perda === 'vencido' && !manualProduct.data_vencimento) {
      toast.error('Data de vencimento é obrigatória para itens vencidos');
      return;
    }

    try {
      // Item DEVE existir no estoque - não criar novos itens aqui
      const { data: existingItem } = await supabase
        .from('itens_perdas_geral')
        .select('id')
        .eq('codigo_barras', manualProduct.codigo_barras)
        .single();

      if (!existingItem) {
        toast.error('Item não está no estoque. Cadastre primeiro na aba "Estoque".');
        return;
      }

      const itemId = existingItem.id;

      const quantidadeNum = typeof manualProduct.quantidade === 'string' 
        ? parseFloat(manualProduct.quantidade.replace(',', '.')) || 0 
        : manualProduct.quantidade || 0;
      const precoNum = typeof manualProduct.preco_custo === 'string' 
        ? parseFloat(manualProduct.preco_custo.replace(',', '.')) || 0 
        : manualProduct.preco_custo || 0;

      setCart(prev => {
        const existing = prev.find(p => p.codigo_barras === manualProduct.codigo_barras);
        if (existing) {
          return prev.map(p => 
            p.codigo_barras === manualProduct.codigo_barras 
              ? { ...p, quantidade: p.quantidade + quantidadeNum }
              : p
          );
        }
        return [...prev, {
          item_id: itemId,
          codigo_barras: manualProduct.codigo_barras || `manual-${Date.now()}`,
          nome_item: manualProduct.nome,
          marca: manualProduct.marca,
          quantidade: quantidadeNum,
          preco_unitario: precoNum,
          motivo_perda: manualProduct.motivo_perda,
          tipo_resolucao: manualProduct.tipo_resolucao,
          data_vencimento: manualProduct.data_vencimento || undefined,
          unidade_medida: manualProduct.unidade_medida,
          tipo_lancamento: tipoLancamento
        }];
      });

      toast.success('Item adicionado ao lançamento!');
      setShowManualProductDialog(false);
      setManualProduct({
        codigo_barras: '',
        nome: '',
        marca: '',
        preco_custo: '',
        quantidade: '',
        motivo_perda: tipoLancamento === 'consumo' ? 'limpeza' : 'danificado',
        tipo_resolucao: 'sem_resolucao',
        data_vencimento: '',
        unidade_medida: 'unidade'
      });
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      toast.error('Erro ao adicionar item');
    }
  };

  const removeFromCart = (codigo_barras: string) => {
    setCart(prev => prev.filter(p => p.codigo_barras !== codigo_barras));
  };

  const updateCartItem = (codigo_barras: string, field: string, value: number | string) => {
    setCart(prev => prev.map(p => 
      p.codigo_barras === codigo_barras ? { ...p, [field]: value } : p
    ));
  };

  const saveLancamento = async () => {
    if (cart.length === 0) {
      toast.error('Adicione pelo menos um item ao lançamento');
      return;
    }

    // Validate all vencido items have data_vencimento
    const invalidItems = cart.filter(item => item.motivo_perda === 'vencido' && !item.data_vencimento);
    if (invalidItems.length > 0) {
      toast.error(`${invalidItems.length} item(s) vencido(s) sem data de vencimento`);
      return;
    }

    // Prepare data for launch
    const lancamentoData = {
      observacao: lancamentoObservacao || null,
      usuario_id: user!.id
    };

    const perdasData = cart.map(item => ({
      item_id: item.item_id,
      usuario_id: user!.id,
      quantidade_perdida: item.quantidade,
      preco_unitario: item.preco_unitario,
      motivo_perda: item.motivo_perda as 'vencido' | 'danificado' | 'quebrado' | 'avaria' | 'outros',
      tipo_resolucao: item.tipo_resolucao as 'sem_resolucao' | 'troca' | 'bonificacao' | 'desconto',
      data_vencimento: item.data_vencimento || null
    }));

    // OFFLINE MODE: Queue operation for later sync
    if (!isOnline) {
      addPendingOperation('lancamento', {
        lancamento: lancamentoData,
        perdas: perdasData
      });
      
      toast.success('Lançamento salvo localmente! Será sincronizado quando online.', {
        duration: 4000,
        icon: '📱'
      });
      setCart([]);
      setLancamentoObservacao('');
      return;
    }

    // ONLINE MODE: Save directly to server
    try {
      const { data: lancamento, error: lancamentoError } = await supabase
        .from('lancamentos_perdas_geral')
        .insert(lancamentoData)
        .select()
        .single();

      if (lancamentoError) throw lancamentoError;

      const perdasWithId = perdasData.map(p => ({
        ...p,
        lancamento_id: lancamento.id
      }));

      const { error: perdasError } = await supabase.from('perdas_geral').insert(perdasWithId);

      if (perdasError) throw perdasError;

      toast.success('Lançamento salvo com sucesso!');
      setCart([]);
      setLancamentoObservacao('');
      fetchData();
      setActiveTab('historico');
    } catch (error) {
      console.error('Erro ao salvar lançamento:', error);
      
      // Fallback to offline mode if server fails
      addPendingOperation('lancamento', {
        lancamento: lancamentoData,
        perdas: perdasData
      });
      
      toast.warning('Erro no servidor. Lançamento salvo localmente.');
      setCart([]);
      setLancamentoObservacao('');
    }
  };

  const viewLancamentoDetail = async (lancamento: Lancamento) => {
    setSelectedLancamento(lancamento);
    try {
      const { data, error } = await supabase
        .from('perdas_geral')
        .select('*, item:itens_perdas_geral(*)')
        .eq('lancamento_id', lancamento.id);

      if (error) throw error;
      setLancamentoItems(data || []);
      setShowLancamentoDetail(true);
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
      toast.error('Erro ao carregar itens do lançamento');
    }
  };

  const editItem = (item: PerdaGeral) => {
    setEditingItem(item);
    setEditItemData({
      quantidade_perdida: item.quantidade_perdida,
      preco_unitario: item.preco_unitario,
      motivo_perda: item.motivo_perda,
      tipo_resolucao: item.tipo_resolucao,
      data_vencimento: item.data_vencimento || '',
      unidade_medida: 'unidade'
    });
    setShowEditItemDialog(true);
  };

  const saveEditedItem = async () => {
    if (!editingItem) return;

    // Validate data_vencimento if motivo is "vencido"
    if (editItemData.motivo_perda === 'vencido' && !editItemData.data_vencimento) {
      toast.error('Data de vencimento é obrigatória para itens vencidos');
      return;
    }

    try {
      const quantidadeNum = typeof editItemData.quantidade_perdida === 'string' 
        ? parseFloat(editItemData.quantidade_perdida.replace(',', '.')) || 0 
        : editItemData.quantidade_perdida || 0;
      const precoNum = typeof editItemData.preco_unitario === 'string' 
        ? parseFloat(editItemData.preco_unitario.replace(',', '.')) || 0 
        : editItemData.preco_unitario || 0;

      const { error } = await supabase
        .from('perdas_geral')
        .update({
          quantidade_perdida: quantidadeNum,
          preco_unitario: precoNum,
          motivo_perda: editItemData.motivo_perda as 'vencido' | 'danificado' | 'quebrado' | 'avaria' | 'outros',
          tipo_resolucao: editItemData.tipo_resolucao as 'sem_resolucao' | 'troca' | 'bonificacao' | 'desconto',
          data_vencimento: editItemData.data_vencimento || null
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      toast.success('Item atualizado!');
      setShowEditItemDialog(false);
      
      // Refresh the lancamento items
      if (selectedLancamento) {
        viewLancamentoDetail(selectedLancamento);
      }
      fetchData();
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      toast.error('Erro ao atualizar item');
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;

    try {
      const { error } = await supabase
        .from('perdas_geral')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast.success('Item excluído!');
      
      // Check if lancamento still has items
      const { data: remainingItems } = await supabase
        .from('perdas_geral')
        .select('id')
        .eq('lancamento_id', selectedLancamento?.id);

      if (!remainingItems || remainingItems.length === 0) {
        // Delete the lancamento if empty
        await supabase
          .from('lancamentos_perdas_geral')
          .delete()
          .eq('id', selectedLancamento?.id);
        
        setShowLancamentoDetail(false);
        toast.info('Lançamento removido pois não possui mais itens');
      } else {
        // Refresh the lancamento items
        if (selectedLancamento) {
          viewLancamentoDetail(selectedLancamento);
        }
      }
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      toast.error('Erro ao excluir item');
    }
  };

  const addItemToExistingLancamento = () => {
    // Reset manual product form and open dialog
    setManualProduct({
      codigo_barras: '',
      nome: '',
      marca: '',
      preco_custo: '',
      quantidade: '',
      motivo_perda: 'danificado',
      tipo_resolucao: 'sem_resolucao',
      data_vencimento: '',
      unidade_medida: 'unidade'
    });
    setShowManualProductDialog(true);
  };

  const addNewItemToLancamento = async () => {
    if (!selectedLancamento || !manualProduct.nome.trim()) {
      toast.error('Nome do produto é obrigatório');
      return;
    }

    // Validate data_vencimento if motivo is "vencido"
    if (manualProduct.motivo_perda === 'vencido' && !manualProduct.data_vencimento) {
      toast.error('Data de vencimento é obrigatória para itens vencidos');
      return;
    }

    try {
      // Item DEVE existir no estoque - não criar novos itens aqui
      const { data: existingItem } = await supabase
        .from('itens_perdas_geral')
        .select('id')
        .eq('codigo_barras', manualProduct.codigo_barras)
        .single();

      if (!existingItem) {
        toast.error('Item não está no estoque. Cadastre primeiro na aba "Estoque".');
        return;
      }

      const itemId = existingItem.id;

      const quantidadeNum = typeof manualProduct.quantidade === 'string' 
        ? parseFloat(manualProduct.quantidade.replace(',', '.')) || 0 
        : manualProduct.quantidade || 0;
      const precoNum = typeof manualProduct.preco_custo === 'string' 
        ? parseFloat(manualProduct.preco_custo.replace(',', '.')) || 0 
        : manualProduct.preco_custo || 0;

      // Add to existing lancamento
      const { error: perdaError } = await supabase
        .from('perdas_geral')
        .insert([{
          lancamento_id: selectedLancamento.id,
          item_id: itemId,
          usuario_id: user!.id,
          quantidade_perdida: quantidadeNum,
          preco_unitario: precoNum,
          motivo_perda: manualProduct.motivo_perda as 'vencido' | 'danificado' | 'quebrado' | 'avaria' | 'outros',
          tipo_resolucao: manualProduct.tipo_resolucao as 'sem_resolucao' | 'troca' | 'bonificacao' | 'desconto',
          data_vencimento: manualProduct.data_vencimento || null
        }]);

      if (perdaError) throw perdaError;

      toast.success('Item adicionado ao lançamento!');
      setShowManualProductDialog(false);
      setManualProduct({
        codigo_barras: '',
        nome: '',
        marca: '',
        preco_custo: '',
        quantidade: '',
        motivo_perda: 'danificado',
        tipo_resolucao: 'sem_resolucao',
        data_vencimento: '',
        unidade_medida: 'unidade'
      });
      
      // Refresh the lancamento items
      viewLancamentoDetail(selectedLancamento);
      fetchData();
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      toast.error('Erro ao adicionar item');
    }
  };

  const generateThermalReceipt = async () => {
    setShowThermalReceipt(true);
    
    // Wait for render
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const element = receiptRef.current;
    if (element) {
      const canvas = await html2canvas(element, { 
        backgroundColor: '#ffffff',
        scale: 3, // Aumentado para melhor qualidade
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `cupom-perdas-${selectedLancamento?.numero}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.98);
      link.click();
      toast.success('Cupom gerado com sucesso!');
    }
    
    setShowThermalReceipt(false);
  };

  const generateReport = async (lancamento: Lancamento, items: PerdaGeral[], reportFormat: 'pdf' | 'jpeg') => {
    if (reportFormat === 'pdf') {
      const doc = new jsPDF();
      
      // Cabeçalho
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('RELATÓRIO DE PERDAS', 105, 18, { align: 'center' });
      doc.setFontSize(14);
      doc.text('COMERCIAL COSTA', 105, 28, { align: 'center' });
      
      // Linha separadora
      doc.setLineWidth(0.5);
      doc.line(14, 33, 196, 33);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`LANÇAMENTO Nº: ${lancamento.numero}`, 14, 42);
      doc.text(`DATA: ${format(new Date(lancamento.data_lancamento), 'DD/MM/YYYY', { locale: ptBR }).toUpperCase()}`, 14, 49);
      doc.text(`RESPONSÁVEL: ${(lancamento.usuario?.nome || 'N/A').toUpperCase()}`, 14, 56);
      
      const tableData = items.map(item => [
        (item.item?.codigo_barras || '-').toUpperCase(),
        (item.item?.nome_item || 'N/A').toUpperCase(),
        item.quantidade_perdida.toString(),
        `R$ ${formatarPreco(item.preco_unitario)}`,
        (MOTIVOS_PERDA.find(m => m.value === item.motivo_perda)?.label || item.motivo_perda).toUpperCase(),
        (TIPOS_RESOLUCAO.find(t => t.value === item.tipo_resolucao)?.label || item.tipo_resolucao).toUpperCase(),
        item.data_vencimento ? format(new Date(item.data_vencimento), 'dd/MM/yyyy') : '-',
        `R$ ${formatarPreco(item.valor_perda || 0)}`
      ]);

      autoTable(doc, {
        head: [['CÓDIGO', 'PRODUTO', 'QTD', 'PREÇO UNIT.', 'MOTIVO', 'RESOLUÇÃO', 'VENCIMENTO', 'VALOR TOTAL']],
        body: tableData,
        startY: 63,
        theme: 'grid',
        headStyles: { fillColor: [220, 38, 38], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 40 },
          2: { cellWidth: 15 },
          3: { cellWidth: 22 },
          4: { cellWidth: 22 },
          5: { cellWidth: 25 },
          6: { cellWidth: 22 },
          7: { cellWidth: 22 }
        }
      });

      const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`TOTAL: R$ ${formatarPreco(lancamento.total_valor || 0)}`, 14, finalY + 12);
      
      doc.save(`PERDAS-${lancamento.numero}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } else {
      // Generate thermal receipt style JPEG
      await generateThermalReceipt();
    }
  };

  const getMotivoLabel = (value: string) => {
    const perdaMotivo = MOTIVOS_PERDA.find(m => m.value === value);
    if (perdaMotivo) return perdaMotivo.label;
    const consumoMotivo = MOTIVOS_CONSUMO.find(m => m.value === value);
    return consumoMotivo?.label || value;
  };
  const getResolucaoLabel = (value: string) => TIPOS_RESOLUCAO.find(t => t.value === value)?.label || value;

  const editCatalogItem = (item: ItemPerda) => {
    setEditingCatalogItem(item);
    setEditCatalogData({
      nome_item: item.nome_item,
      codigo_barras: item.codigo_barras || '',
      marca: item.marca || '',
      categoria: item.categoria || '',
      preco_custo: item.preco_custo,
      preco_venda: item.preco_venda
    });
    setShowEditCatalogDialog(true);
  };

  const saveCatalogItem = async () => {
    if (!editingCatalogItem) return;

    try {
      const { error } = await supabase
        .from('itens_perdas_geral')
        .update({
          nome_item: editCatalogData.nome_item.toUpperCase(),
          codigo_barras: editCatalogData.codigo_barras || null,
          marca: editCatalogData.marca ? editCatalogData.marca.toUpperCase() : null,
          categoria: editCatalogData.categoria ? editCatalogData.categoria.toUpperCase() : null,
          preco_custo: editCatalogData.preco_custo,
          preco_venda: editCatalogData.preco_venda
        })
        .eq('id', editingCatalogItem.id);

      if (error) throw error;

      toast.success('Item atualizado!');
      setShowEditCatalogDialog(false);
      fetchCatalogItems();
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      toast.error('Erro ao atualizar item');
    }
  };

  const deleteCatalogItem = async (itemId: string) => {
    if (!confirm('Tem certeza que deseja excluir este item do estoque?')) return;

    try {
      const { error } = await supabase
        .from('itens_perdas_geral')
        .update({ ativo: false })
        .eq('id', itemId);

      if (error) throw error;

      toast.success('Item removido do estoque!');
      fetchCatalogItems();
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      toast.error('Erro ao excluir item');
    }
  };

  const toggleCatalogItemSelection = (itemId: string) => {
    setSelectedCatalogItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const toggleAllCatalogItems = () => {
    if (selectedCatalogItems.size === filteredCatalogItems.length) {
      setSelectedCatalogItems(new Set());
    } else {
      setSelectedCatalogItems(new Set(filteredCatalogItems.map(item => item.id)));
    }
  };

  const saveMultiEdit = async () => {
    if (selectedCatalogItems.size === 0) {
      toast.error('Selecione pelo menos um item');
      return;
    }

    try {
      const updateData: Record<string, unknown> = {};
      
      if (multiEditData.preco_custo !== '') {
        updateData.preco_custo = parseFloat(multiEditData.preco_custo);
      }
      if (multiEditData.preco_venda !== '') {
        updateData.preco_venda = parseFloat(multiEditData.preco_venda);
      }
      if (multiEditData.categoria !== '') {
        updateData.categoria = multiEditData.categoria.toUpperCase();
      }

      if (Object.keys(updateData).length === 0) {
        toast.error('Preencha pelo menos um campo para atualizar');
        return;
      }

      const { error } = await supabase
        .from('itens_perdas_geral')
        .update(updateData)
        .in('id', Array.from(selectedCatalogItems));

      if (error) throw error;

      toast.success(`${selectedCatalogItems.size} itens atualizados!`);
      setShowMultiEditDialog(false);
      setSelectedCatalogItems(new Set());
      setMultiEditData({ preco_custo: '', preco_venda: '', categoria: '' });
      fetchCatalogItems();
    } catch (error) {
      console.error('Erro ao atualizar itens:', error);
      toast.error('Erro ao atualizar itens');
    }
  };

  const saveNewCatalogItem = async () => {
    if (!newCatalogItem.nome_item.trim()) {
      toast.error('Nome do produto é obrigatório');
      return;
    }

    try {
      const precoNumCusto = typeof newCatalogItem.preco_custo === 'string' 
        ? parseFloat(newCatalogItem.preco_custo.replace(',', '.')) || 0 
        : newCatalogItem.preco_custo || 0;

      const precoNumVenda = typeof newCatalogItem.preco_venda === 'string' 
        ? parseFloat(newCatalogItem.preco_venda.replace(',', '.')) || 0 
        : newCatalogItem.preco_venda || 0;

      // Check if barcode already exists
      if (newCatalogItem.codigo_barras) {
        const { data: existing } = await supabase
          .from('itens_perdas_geral')
          .select('id')
          .eq('codigo_barras', newCatalogItem.codigo_barras)
          .maybeSingle();

        if (existing) {
          toast.error('Já existe um item com este código de barras');
          return;
        }
      }

      const { error } = await supabase
        .from('itens_perdas_geral')
        .insert({
          nome_item: newCatalogItem.nome_item.toUpperCase(),
          codigo_barras: newCatalogItem.codigo_barras || null,
          marca: newCatalogItem.marca ? newCatalogItem.marca.toUpperCase() : null,
          categoria: newCatalogItem.categoria ? newCatalogItem.categoria.toUpperCase() : null,
          preco_custo: precoNumCusto,
          preco_venda: precoNumVenda
        });

      if (error) throw error;

      toast.success('Item cadastrado no estoque!');
      setShowNewCatalogItemDialog(false);
      setNewCatalogItem({
        nome_item: '',
        codigo_barras: '',
        marca: '',
        categoria: '',
        preco_custo: '',
        preco_venda: ''
      });
      fetchCatalogItems();
    } catch (error) {
      console.error('Erro ao cadastrar item:', error);
      toast.error('Erro ao cadastrar item');
    }
  };

  const handleNewItemBarcodeScan = async (barcode: string) => {
    setNewCatalogItem(prev => ({ ...prev, codigo_barras: barcode }));
    setShowNewItemScanner(false);
    toast.success(`Código ${barcode} capturado!`);
    
    // Auto-search via API
    await searchNewItemBarcode(barcode);
  };

  const searchNewItemBarcode = async (barcode?: string) => {
    const code = barcode || newCatalogItem.codigo_barras.trim();
    if (!code) {
      toast.error('Digite um código de barras');
      return;
    }

    setSearchingNewItemBarcode(true);
    try {
      // First check local database
      const { data: localProduct } = await supabase
        .from('itens_perdas_geral')
        .select('*')
        .eq('codigo_barras', code)
        .maybeSingle();

      if (localProduct) {
        toast.info('Este item já está cadastrado no estoque!');
        setNewCatalogItem({
          nome_item: localProduct.nome_item,
          codigo_barras: localProduct.codigo_barras || '',
          marca: localProduct.marca || '',
          categoria: localProduct.categoria || '',
          preco_custo: localProduct.preco_custo || 0,
          preco_venda: localProduct.preco_venda || 0
        });
        setSearchingNewItemBarcode(false);
        return;
      }

      // Search via API
      const response = await supabase.functions.invoke('barcode-lookup', {
        body: { barcode: code }
      });

      if (response.error) throw response.error;

      const data = response.data;

      if (data.found) {
        setNewCatalogItem(prev => ({
          ...prev,
          codigo_barras: data.product.codigo_barras || code,
          nome_item: data.product.nome?.toUpperCase() || '',
          marca: data.product.marca || ''
        }));
        toast.success(`Produto encontrado: ${data.product.nome}`);
      } else {
        toast.info('Produto não encontrado na base. Preencha manualmente.');
      }
    } catch (error) {
      console.error('Erro ao buscar código:', error);
      toast.error('Erro ao buscar produto');
    } finally {
      setSearchingNewItemBarcode(false);
    }
  };

  const handleBalanceFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportingItems(true);
    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const lines = content.split('\n').filter(line => line.trim().length > 0);

          if (lines.length === 0) {
            toast.error('Arquivo vazio');
            setImportingItems(false);
            return;
          }

          const itemsToInsert: { nome_item: string; codigo_barras: string | null; marca: string | null; categoria: string | null; preco_custo: number }[] = [];
          let skipped = 0;

          for (const line of lines) {
            // Format: 01 + codigo(9) + preco(6, 3 decimals) + 000 + nome
            // Example: 01000000099000649000LIMAO NACIONAL KG
            if (line.length < 21) {
              skipped++;
              continue;
            }

            const tipo = line.substring(0, 2);
            if (tipo !== '01') {
              skipped++;
              continue;
            }

            const codigoRaw = line.substring(2, 11);
            const codigo = codigoRaw.replace(/^0+/, '') || '0'; // Remove leading zeros
            const precoRaw = line.substring(11, 17);
            const preco = parseInt(precoRaw, 10) / 1000; // 000649 = 0.649 -> 6.49 (actually divide by 100 for 2 decimals)
            const nome = line.substring(20).trim();

            if (!nome) {
              skipped++;
              continue;
            }

            // Parse price correctly - format is XXXYY where XXX is integer and YY is cents
            // Actually looking at data: 000649 should be 6.49, so divide by 100
            const precoCorreto = parseInt(precoRaw, 10) / 100;

            itemsToInsert.push({
              nome_item: nome.toUpperCase(),
              codigo_barras: codigo,
              marca: null,
              categoria: 'Balança',
              preco_custo: precoCorreto
            });
          }

          if (itemsToInsert.length === 0) {
            toast.error('Nenhum item válido encontrado no arquivo');
            setImportingItems(false);
            return;
          }

          // Insert/update items
          let inserted = 0;
          let updated = 0;
          let errors = 0;

          for (const item of itemsToInsert) {
            // Check if exists by codigo_barras
            const { data: existing } = await supabase
              .from('itens_perdas_geral')
              .select('id')
              .eq('codigo_barras', item.codigo_barras)
              .maybeSingle();

            if (existing) {
              // Update price
              const { error } = await supabase
                .from('itens_perdas_geral')
                .update({ preco_custo: item.preco_custo, nome_item: item.nome_item })
                .eq('id', existing.id);

              if (error) errors++;
              else updated++;
            } else {
              // Insert new
              const { error } = await supabase
                .from('itens_perdas_geral')
                .insert(item);

              if (error) errors++;
              else inserted++;
            }
          }

          toast.success(`Importação concluída! ${inserted} novos, ${updated} atualizados${skipped > 0 ? `, ${skipped} ignorados` : ''}${errors > 0 ? `, ${errors} erros` : ''}`);
          fetchCatalogItems();
        } catch (parseError) {
          console.error('Erro ao processar arquivo:', parseError);
          toast.error('Erro ao processar arquivo. Verifique o formato.');
        } finally {
          setImportingItems(false);
          if (balanceFileInputRef.current) balanceFileInputRef.current.value = '';
        }
      };

      reader.onerror = () => {
        toast.error('Erro ao ler arquivo');
        setImportingItems(false);
      };

      reader.readAsText(file, 'ISO-8859-1'); // Use ISO encoding for special chars
    } catch (error) {
      console.error('Erro na importação:', error);
      toast.error('Erro ao importar arquivo');
      setImportingItems(false);
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportingItems(true);
    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

          if (jsonData.length < 2) {
            toast.error('Arquivo vazio ou sem dados');
            setImportingItems(false);
            return;
          }

          // Get headers from first row
          const headers = (jsonData[0] as string[]).map(h => String(h).toLowerCase().trim());
          const rows = jsonData.slice(1);

          // Map column indices
          const nomeIdx = headers.findIndex(h => h.includes('nome') || h.includes('produto') || h.includes('item'));
          const codigoIdx = headers.findIndex(h => h.includes('codigo') || h.includes('barras') || h.includes('ean'));
          const marcaIdx = headers.findIndex(h => h.includes('marca'));
          const categoriaIdx = headers.findIndex(h => h.includes('categoria') || h.includes('setor'));
          const precoIdx = headers.findIndex(h => h.includes('preco') || h.includes('custo') || h.includes('valor'));

          if (nomeIdx === -1) {
            toast.error('Coluna "Nome" não encontrada. Verifique o arquivo.');
            setImportingItems(false);
            return;
          }

          const itemsToInsert: { nome_item: string; codigo_barras: string | null; marca: string | null; categoria: string | null; preco_custo: number }[] = [];
          let skipped = 0;

          for (const row of rows) {
            const rowData = row as (string | number | undefined)[];
            const nome = rowData[nomeIdx];
            if (!nome || String(nome).trim() === '') {
              skipped++;
              continue;
            }

            const codigo = codigoIdx >= 0 ? String(rowData[codigoIdx] || '').trim() : '';
            const marca = marcaIdx >= 0 ? String(rowData[marcaIdx] || '').trim() : '';
            const categoria = categoriaIdx >= 0 ? String(rowData[categoriaIdx] || '').trim() : '';
            let preco = 0;
            if (precoIdx >= 0 && rowData[precoIdx]) {
              const precoStr = String(rowData[precoIdx]).replace(',', '.');
              preco = parseFloat(precoStr) || 0;
            }

            itemsToInsert.push({
              nome_item: String(nome).toUpperCase().trim(),
              codigo_barras: codigo || null,
              marca: marca || null,
              categoria: categoria || null,
              preco_custo: preco
            });
          }

          if (itemsToInsert.length === 0) {
            toast.error('Nenhum item válido encontrado no arquivo');
            setImportingItems(false);
            return;
          }

          // Insert in batches
          const batchSize = 100;
          let inserted = 0;
          let errors = 0;

          for (let i = 0; i < itemsToInsert.length; i += batchSize) {
            const batch = itemsToInsert.slice(i, i + batchSize);
            const { error } = await supabase
              .from('itens_perdas_geral')
              .upsert(batch, { onConflict: 'codigo_barras', ignoreDuplicates: true });

            if (error) {
              console.error('Erro ao inserir lote:', error);
              errors += batch.length;
            } else {
              inserted += batch.length;
            }
          }

          toast.success(`Importação concluída! ${inserted} itens importados${skipped > 0 ? `, ${skipped} linhas ignoradas` : ''}${errors > 0 ? `, ${errors} erros` : ''}`);
          fetchCatalogItems();
        } catch (parseError) {
          console.error('Erro ao processar arquivo:', parseError);
          toast.error('Erro ao processar arquivo. Verifique o formato.');
        } finally {
          setImportingItems(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };

      reader.onerror = () => {
        toast.error('Erro ao ler arquivo');
        setImportingItems(false);
      };

      reader.readAsBinaryString(file);
    } catch (error) {
      console.error('Erro na importação:', error);
      toast.error('Erro ao importar arquivo');
      setImportingItems(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      ['Nome', 'Codigo_Barras', 'Marca', 'Categoria', 'Preco_Custo'],
      ['DETERGENTE 500ML', '7891234567890', 'YPÊ', 'Limpeza', '2.50'],
      ['PAPEL TOALHA', '7890987654321', 'SNOB', 'Higiene', '5.99']
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Itens');
    XLSX.writeFile(wb, 'modelo_importacao_itens.xlsx');
    toast.success('Modelo baixado!');
  };

  const useItemFromCatalog = (item: ItemPerda) => {
    setManualProduct({
      codigo_barras: item.codigo_barras || '',
      nome: item.nome_item,
      marca: item.marca || '',
      preco_custo: item.preco_custo || 0,
      quantidade: '',
      motivo_perda: tipoLancamento === 'consumo' ? 'limpeza' : 'danificado',
      tipo_resolucao: 'sem_resolucao',
      data_vencimento: '',
      unidade_medida: 'unidade'
    });
    setShowManualProductDialog(true);
  };

  const filteredCatalogItems = catalogItems.filter(item =>
    item.nome_item.toLowerCase().includes(catalogSearch.toLowerCase()) ||
    (item.codigo_barras && item.codigo_barras.includes(catalogSearch)) ||
    (item.marca && item.marca.toLowerCase().includes(catalogSearch.toLowerCase()))
  );

  // Real-time search suggestions based on barcode input
  const searchSuggestions = barcodeInput.trim().length >= 2 
    ? catalogItems.filter(item =>
        item.nome_item.toLowerCase().includes(barcodeInput.toLowerCase()) ||
        (item.codigo_barras && item.codigo_barras.includes(barcodeInput)) ||
        (item.marca && item.marca.toLowerCase().includes(barcodeInput.toLowerCase()))
      ).slice(0, 8)
    : [];

  const receiptItems = lancamentoItems.map(item => ({
    codigo_barras: item.item?.codigo_barras || undefined,
    nome: item.item?.nome_item || 'N/A',
    quantidade: item.quantidade_perdida,
    preco_unitario: item.preco_unitario,
    valor_total: item.valor_perda || 0,
    motivo: getMotivoLabel(item.motivo_perda),
    data_vencimento: item.data_vencimento 
      ? formatInTimeZone(new Date(item.data_vencimento), TIMEZONE, 'dd/MM/yyyy', { locale: ptBR })
      : undefined
  }));

  const currentMotivos = tipoLancamento === 'consumo' ? MOTIVOS_CONSUMO : MOTIVOS_PERDA;

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-4 overflow-y-auto">
        {/* Header clicável - leva para aba de lançamento */}
        <button 
          onClick={() => setActiveTab('nova')}
          className="w-full text-center mb-2 p-4 rounded-xl bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
        >
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            CONTROLE DE PERDAS
          </h1>
          <p className="text-xs text-white/80 mt-1 font-medium">COMERCIAL COSTA</p>
        </button>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Botões de Navegação Coloridos */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {/* Botão Dashboard */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`
                flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-300 w-full
                bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                text-white shadow-lg hover:shadow-xl hover:scale-[1.02]
                ${activeTab === 'dashboard' ? 'ring-2 ring-white/30 scale-[1.02]' : ''}
              `}
            >
              <div className="p-2 bg-white/20 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="font-bold text-sm">DASHBOARD</p>
            </button>

            {/* Botão Estoque */}
            <button
              onClick={() => setActiveTab('estoque')}
              className={`
                flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-300 w-full
                bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 
                text-white shadow-lg hover:shadow-xl hover:scale-[1.02]
                ${activeTab === 'estoque' ? 'ring-2 ring-white/30 scale-[1.02]' : ''}
              `}
            >
              <div className="p-2 bg-white/20 rounded-lg">
                <Database className="w-5 h-5" />
              </div>
              <p className="font-bold text-sm">ESTOQUE</p>
            </button>

            {/* Botão Histórico */}
            <button
              onClick={() => setActiveTab('historico')}
              className={`
                flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-300 w-full
                bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 
                text-white shadow-lg hover:shadow-xl hover:scale-[1.02]
                ${activeTab === 'historico' ? 'ring-2 ring-white/30 scale-[1.02]' : ''}
              `}
            >
              <div className="p-2 bg-white/20 rounded-lg">
                <History className="w-5 h-5" />
              </div>
              <p className="font-bold text-sm">HISTÓRICO</p>
            </button>
          </div>

          {/* Hidden TabsList for Tabs component functionality */}
          <TabsList className="hidden">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="nova">Lançar</TabsTrigger>
            <TabsTrigger value="estoque">Estoque</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          {/* Área de Lançamento sempre visível no topo */}
          <TabsContent value="nova" className="space-y-6 animate-fade-in"
            style={{ animationDuration: '0.3s' }}
          >
            {/* Seletor de Tipo de Lançamento */}
            <div className="flex gap-2">
              <Button
                variant={tipoLancamento === 'perda' ? 'destructive' : 'outline'}
                onClick={() => setTipoLancamento('perda')}
                className="flex-1 gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                PERDA
              </Button>
              <Button
                variant={tipoLancamento === 'consumo' ? 'default' : 'outline'}
                onClick={() => setTipoLancamento('consumo')}
                className="flex-1 gap-2"
              >
                <Coffee className="w-4 h-4" />
                USO PARA CONSUMO
              </Button>
            </div>

            {/* Área de Busca Aprimorada */}
            <Card className={`border-2 border-dashed ${tipoLancamento === 'consumo' ? 'border-primary/30 bg-gradient-to-br from-primary/5 to-transparent' : 'border-destructive/30 bg-gradient-to-br from-destructive/5 to-transparent'}`}>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className={`p-2 ${tipoLancamento === 'consumo' ? 'bg-primary/10' : 'bg-destructive/10'} rounded-lg`}>
                    <Search className={`w-6 h-6 ${tipoLancamento === 'consumo' ? 'text-primary' : 'text-destructive'}`} />
                  </div>
                  {tipoLancamento === 'consumo' ? 'REGISTRAR CONSUMO INTERNO' : 'BUSCAR PRODUTO'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Campo de Busca Principal com Sugestões */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Barcode className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <Input
                    ref={searchInputRef}
                    placeholder="DIGITE O CÓDIGO DE BARRAS OU NOME DO PRODUTO..."
                    value={barcodeInput}
                    onChange={(e) => {
                      setBarcodeInput(e.target.value.toUpperCase());
                      setShowSearchSuggestions(true);
                    }}
                    onFocus={() => setShowSearchSuggestions(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setShowSearchSuggestions(false);
                        searchBarcode();
                      }
                      if (e.key === 'Escape') {
                        setShowSearchSuggestions(false);
                      }
                    }}
                    className="pl-12 h-14 text-lg font-medium uppercase bg-background border-2 focus:border-primary transition-colors"
                  />
                  {searchingBarcode && (
                    <div className="absolute inset-y-0 right-4 flex items-center">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  )}
                  
                  {/* Dropdown de Sugestões em Tempo Real */}
                  {showSearchSuggestions && searchSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border-2 border-primary/30 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      <div className="p-2 text-xs text-muted-foreground border-b bg-muted/50">
                        <Search className="w-3 h-3 inline mr-1" />
                        {searchSuggestions.length} RESULTADO(S) ENCONTRADO(S)
                      </div>
                      {searchSuggestions.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            useItemFromCatalog(item);
                            setBarcodeInput('');
                            setShowSearchSuggestions(false);
                          }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-primary/10 transition-colors text-left border-b last:border-b-0"
                        >
                          <div className="p-2 bg-primary/10 rounded">
                            <Package className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm uppercase truncate">{item.nome_item}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {item.codigo_barras && (
                                <span className="font-mono">{item.codigo_barras}</span>
                              )}
                              {item.marca && (
                                <span className="uppercase">• {item.marca}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-primary">
                              R$ {formatarPreco(item.preco_custo)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Botões de Ação */}
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    onClick={() => {
                      setShowSearchSuggestions(false);
                      searchBarcode();
                    }} 
                    disabled={searchingBarcode}
                    className="h-12 gap-2 font-semibold"
                    size="lg"
                  >
                    <Search className="w-5 h-5" />
                    <span className="hidden sm:inline">BUSCAR</span>
                  </Button>
                  <Button 
                    variant="secondary"
                    onClick={() => setShowManualBarcodeInput(true)}
                    className="h-12 gap-2 font-semibold"
                    size="lg"
                  >
                    <Keyboard className="w-5 h-5" />
                    <span className="hidden sm:inline">MANUAL</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowScanner(true)}
                    className="h-12 gap-2 font-semibold border-2 hover:bg-primary/10"
                    size="lg"
                  >
                    <Camera className="w-5 h-5" />
                    <span className="hidden sm:inline">SCAN</span>
                  </Button>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Busque ou escaneie itens do estoque. Cadastre novos itens na aba "Estoque".
                </p>
              </CardContent>
            </Card>

            <BarcodeScanner
              open={showScanner}
              onOpenChange={setShowScanner}
              onScan={(barcode) => {
                searchBarcode(barcode, true);
              }}
            />

            <ManualBarcodeInput
              open={showManualBarcodeInput}
              onOpenChange={setShowManualBarcodeInput}
              onSubmit={(barcode) => searchBarcode(barcode, false)}
              onScannerOpen={() => setShowScanner(true)}
              catalogItems={catalogItems.map(item => ({
                id: item.id,
                nome_item: item.nome_item,
                codigo_barras: item.codigo_barras,
                preco_custo: item.preco_custo
              }))}
            />

            {/* Resumo do Lançamento Atual */}
            {cart.length > 0 && (
              <Card className={`${tipoLancamento === 'consumo' ? 'border-primary bg-primary/5' : 'border-destructive bg-destructive/5'}`}>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-background rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">ITENS</p>
                      <p className="text-2xl font-bold">{cart.length}</p>
                    </div>
                    <div className="text-center p-3 bg-background rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">QUANTIDADE</p>
                      <p className="text-2xl font-bold">{cart.reduce((sum, item) => sum + item.quantidade, 0)}</p>
                    </div>
                    <div className="text-center p-3 bg-background rounded-lg col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">VALOR TOTAL</p>
                      <p className={`text-3xl font-bold ${tipoLancamento === 'consumo' ? 'text-primary' : 'text-destructive'}`}>
                        R$ {formatarPreco(cart.reduce((sum, item) => sum + (item.quantidade * item.preco_unitario), 0))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Carrinho de Itens */}
            {cart.length > 0 && (
              <Card className={tipoLancamento === 'consumo' ? 'border-primary/30' : 'border-destructive/30'}>
                <CardHeader className={tipoLancamento === 'consumo' ? 'bg-primary/5 border-b' : 'bg-destructive/5 border-b'}>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 ${tipoLancamento === 'consumo' ? 'bg-primary/10' : 'bg-destructive/10'} rounded-lg`}>
                        {tipoLancamento === 'consumo' ? <Coffee className="w-5 h-5 text-primary" /> : <Package className="w-5 h-5 text-destructive" />}
                      </div>
                      <span className="text-lg">{tipoLancamento === 'consumo' ? 'ITENS PARA CONSUMO' : 'ITENS DO LANÇAMENTO'}</span>
                      <Badge variant={tipoLancamento === 'consumo' ? 'default' : 'destructive'} className="text-base px-3 py-1">
                        {cart.length} {cart.length === 1 ? 'ITEM' : 'ITENS'}
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Mobile Layout */}
                  <div className="md:hidden divide-y">
                    {cart.map((item) => (
                      <div key={item.codigo_barras} className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold uppercase">{item.nome_item}</p>
                            <p className="text-xs text-muted-foreground font-mono">{item.codigo_barras}</p>
                            {item.marca && <p className="text-sm text-muted-foreground uppercase">{item.marca}</p>}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => removeFromCart(item.codigo_barras)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">QUANTIDADE ({item.unidade_medida.toUpperCase()})</Label>
                            <Input
                              type="text"
                              inputMode={item.unidade_medida === 'kg' ? 'decimal' : 'numeric'}
                              value={item.quantidade}
                              onChange={(e) => {
                                let val = e.target.value;
                                if (item.unidade_medida === 'unidade') {
                                  val = val.replace(/[^0-9]/g, '');
                                  updateCartItem(item.codigo_barras, 'quantidade', parseInt(val) || 0);
                                } else {
                                  val = val.replace(/[^0-9,]/g, '');
                                  updateCartItem(item.codigo_barras, 'quantidade', parseFloat(val.replace(',', '.')) || 0);
                                }
                              }}
                              className="mt-1 font-semibold"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">PREÇO UNITÁRIO</Label>
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={typeof item.preco_unitario === 'number' ? formatarPreco(item.preco_unitario) : item.preco_unitario}
                              onChange={(e) => {
                                const val = formatarInputPreco(e.target.value);
                                updateCartItem(item.codigo_barras, 'preco_unitario', parseFloat(val.replace(',', '.')) || 0);
                              }}
                              className="mt-1"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">{tipoLancamento === 'consumo' ? 'USO' : 'MOTIVO'}</Label>
                            <Select 
                              value={item.motivo_perda} 
                              onValueChange={(v) => updateCartItem(item.codigo_barras, 'motivo_perda', v)}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {currentMotivos.map(m => (
                                  <SelectItem key={m.value} value={m.value}>{m.label.toUpperCase()}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {item.motivo_perda === 'vencido' && (
                            <div>
                              <Label className="text-xs text-muted-foreground">VENCIMENTO</Label>
                              <Input
                                type="date"
                                value={item.data_vencimento || ''}
                                onChange={(e) => updateCartItem(item.codigo_barras, 'data_vencimento', e.target.value)}
                                className="mt-1"
                                required
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="text-sm text-muted-foreground">SUBTOTAL</span>
                          <span className={`text-lg font-bold ${tipoLancamento === 'consumo' ? 'text-primary' : 'text-destructive'}`}>
                            R$ {formatarPreco(item.quantidade * item.preco_unitario)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-bold">CÓDIGO</TableHead>
                          <TableHead className="font-bold">PRODUTO</TableHead>
                          <TableHead className="font-bold w-24">QTD</TableHead>
                          <TableHead className="font-bold w-28">PREÇO</TableHead>
                          <TableHead className="font-bold w-32">{tipoLancamento === 'consumo' ? 'USO' : 'MOTIVO'}</TableHead>
                          {tipoLancamento === 'perda' && <TableHead className="font-bold w-32">VENCIMENTO</TableHead>}
                          <TableHead className="font-bold w-28 text-right">SUBTOTAL</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cart.map((item) => (
                          <TableRow key={item.codigo_barras} className={tipoLancamento === 'consumo' ? 'hover:bg-primary/5' : 'hover:bg-destructive/5'}>
                            <TableCell className="font-mono text-xs">{item.codigo_barras}</TableCell>
                            <TableCell className="font-medium uppercase">{item.nome_item}</TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                inputMode={item.unidade_medida === 'kg' ? 'decimal' : 'numeric'}
                                value={item.quantidade}
                                onChange={(e) => {
                                  let val = e.target.value;
                                  if (item.unidade_medida === 'unidade') {
                                    val = val.replace(/[^0-9]/g, '');
                                    updateCartItem(item.codigo_barras, 'quantidade', parseInt(val) || 0);
                                  } else {
                                    val = val.replace(/[^0-9,]/g, '');
                                    updateCartItem(item.codigo_barras, 'quantidade', parseFloat(val.replace(',', '.')) || 0);
                                  }
                                }}
                                className="w-20 font-semibold"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                inputMode="decimal"
                                value={typeof item.preco_unitario === 'number' ? formatarPreco(item.preco_unitario) : item.preco_unitario}
                                onChange={(e) => {
                                  const val = formatarInputPreco(e.target.value);
                                  updateCartItem(item.codigo_barras, 'preco_unitario', parseFloat(val.replace(',', '.')) || 0);
                                }}
                                className="w-24"
                              />
                            </TableCell>
                            <TableCell>
                              <Select 
                                value={item.motivo_perda} 
                                onValueChange={(v) => updateCartItem(item.codigo_barras, 'motivo_perda', v)}
                              >
                                <SelectTrigger className="w-28">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {currentMotivos.map(m => (
                                    <SelectItem key={m.value} value={m.value}>{m.label.toUpperCase()}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            {tipoLancamento === 'perda' && (
                              <TableCell>
                                {item.motivo_perda === 'vencido' && (
                                  <Input
                                    type="date"
                                    value={item.data_vencimento || ''}
                                    onChange={(e) => updateCartItem(item.codigo_barras, 'data_vencimento', e.target.value)}
                                    className="w-28"
                                    required
                                  />
                                )}
                              </TableCell>
                            )}
                            <TableCell className={`text-right font-bold ${tipoLancamento === 'consumo' ? 'text-primary' : 'text-destructive'}`}>
                              R$ {formatarPreco(item.quantidade * item.preco_unitario)}
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => removeFromCart(item.codigo_barras)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Observação e Finalizar */}
            {cart.length > 0 && (
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <Label className="text-sm font-medium">OBSERVAÇÃO (OPCIONAL)</Label>
                    <Textarea
                      placeholder="ADICIONE UMA OBSERVAÇÃO SOBRE ESTE LANÇAMENTO..."
                      value={lancamentoObservacao}
                      onChange={(e) => setLancamentoObservacao(e.target.value.toUpperCase())}
                      className="mt-2 uppercase"
                    />
                  </div>
                  <Button 
                    onClick={saveLancamento} 
                    className="w-full h-14 text-lg font-bold gap-3"
                    size="lg"
                    variant={tipoLancamento === 'consumo' ? 'default' : 'destructive'}
                  >
                    <Save className="w-6 h-6" />
                    {tipoLancamento === 'consumo' ? 'REGISTRAR CONSUMO' : 'SALVAR LANÇAMENTO DE PERDA'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {cart.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  {tipoLancamento === 'consumo' ? (
                    <Coffee className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                  ) : (
                    <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                  )}
                  <p className="text-lg text-muted-foreground">
                    {tipoLancamento === 'consumo' 
                      ? 'BUSQUE OU ESCANEIE UM PRODUTO PARA REGISTRAR CONSUMO INTERNO'
                      : 'BUSQUE OU ESCANEIE UM PRODUTO PARA ADICIONAR AO LANÇAMENTO'
                    }
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

            <TabsContent value="dashboard" className="space-y-6 animate-fade-in"
              style={{ animationDuration: '0.3s' }}
            >
              {/* Cards de Estatísticas - Layout Melhorado */}
              <div className="grid grid-cols-2 gap-4">
                {/* Card Perdas */}
                <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-white/20 rounded-lg">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-white/90">TOTAL PERDAS</span>
                      </div>
                      <p className="text-3xl font-bold">{dashboardData.totalPerdas}</p>
                      <p className="text-sm text-white/80 mt-1">itens perdidos</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Card Valor Perdas */}
                <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-white/20 rounded-lg">
                          <TrendingUp className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-white/90">VALOR PERDAS</span>
                      </div>
                      <p className="text-2xl font-bold">
                        R$ {dashboardData.totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-white/80 mt-1">em perdas</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Card Consumo Itens */}
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-white/20 rounded-lg">
                          <Coffee className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-white/90">CONSUMO</span>
                      </div>
                      <p className="text-3xl font-bold">{dashboardData.totalConsumo}</p>
                      <p className="text-sm text-white/80 mt-1">itens consumidos</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Card Valor Consumo */}
                <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-white/20 rounded-lg">
                          <ShoppingCart className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-white/90">VALOR CONSUMO</span>
                      </div>
                      <p className="text-2xl font-bold">
                        R$ {dashboardData.valorConsumo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-white/80 mt-1">em consumo</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">PERDAS POR MOTIVO</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      {dashboardData.perdasPorMotivo.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={dashboardData.perdasPorMotivo}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              dataKey="value"
                              label={({ name, value }) => `${name}: ${value}`}
                            >
                              {dashboardData.perdasPorMotivo.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          Nenhum dado disponível
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">ITENS MAIS PERDIDOS</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      {dashboardData.itensMaisPerdidos.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={dashboardData.itensMaisPerdidos} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Bar dataKey="quantidade" fill="hsl(var(--destructive))" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          Nenhum dado disponível
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>


            {/* Estoque Tab */}
            <TabsContent value="estoque" className="space-y-4 animate-fade-in"
              style={{ animationDuration: '0.3s' }}
            >
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5" />
                      CATÁLOGO DE ITENS
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={downloadTemplate}
                        className="gap-2"
                      >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">MODELO</span>
                      </Button>
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importingItems}
                        className="gap-2"
                      >
                        {importingItems ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        <span className="hidden sm:inline">EXCEL</span>
                      </Button>
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => balanceFileInputRef.current?.click()}
                        disabled={importingItems}
                        className="gap-2"
                      >
                        {importingItems ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        <span className="hidden sm:inline">BALANÇA</span>
                      </Button>
                      <Button 
                        onClick={() => setShowNewCatalogItemDialog(true)}
                        size="sm"
                        className="gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        NOVO
                      </Button>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileImport}
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                    />
                    <input
                      type="file"
                      ref={balanceFileInputRef}
                      onChange={handleBalanceFileImport}
                      accept=".txt"
                      className="hidden"
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar no estoque..."
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value.toUpperCase())}
                      className="pl-9 uppercase"
                    />
                  </div>
                  
                  {selectedCatalogItems.size > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowMultiEditDialog(true)}
                      className="w-full"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      EDITAR {selectedCatalogItems.size} SELECIONADO(S)
                    </Button>
                  )}

                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredCatalogItems.slice(0, 50).map((item) => (
                      <div 
                        key={item.id} 
                        className="p-3 bg-muted/30 rounded-lg border hover:border-primary/50 transition-colors group"
                      >
                        <div className="flex items-start gap-2">
                          <Checkbox
                            checked={selectedCatalogItems.has(item.id)}
                            onCheckedChange={() => toggleCatalogItemSelection(item.id)}
                            className="mt-1"
                          />
                          <div 
                            className="flex-1 cursor-pointer min-w-0" 
                            onClick={() => editCatalogItem(item)}
                          >
                            <p className="font-medium text-sm uppercase truncate">{item.nome_item}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {item.codigo_barras && (
                                <span className="font-mono truncate">{item.codigo_barras}</span>
                              )}
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-xs text-muted-foreground">Custo: R$ {formatarPreco(item.preco_custo)}</span>
                              <span className="text-sm font-semibold text-primary">Venda: R$ {formatarPreco(item.preco_venda)}</span>
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                editCatalogItem(item);
                              }}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteCatalogItem(item.id);
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {filteredCatalogItems.length > 50 && (
                    <p className="text-sm text-center text-muted-foreground">
                      Exibindo 50 de {filteredCatalogItems.length} itens
                    </p>
                  )}
                  
                  {filteredCatalogItems.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">NENHUM ITEM NO CATÁLOGO</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Histórico Tab */}
            <TabsContent value="historico" className="space-y-4 animate-fade-in"
              style={{ animationDuration: '0.3s' }}
            >
              {/* Header com estatísticas resumidas */}
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
                <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/20 rounded-xl p-3 md:p-4">
                  <p className="text-[10px] md:text-xs text-muted-foreground font-medium uppercase">Total Lançamentos</p>
                  <p className="text-lg md:text-2xl font-bold text-red-600">{lancamentos.length}</p>
                </div>
                <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-500/20 rounded-xl p-3 md:p-4">
                  <p className="text-[10px] md:text-xs text-muted-foreground font-medium uppercase">Valor Total</p>
                  <p className="text-lg md:text-2xl font-bold text-orange-600">
                    R$ {lancamentos.reduce((sum, l) => sum + (l.total_valor || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-xl p-3 md:p-4">
                  <p className="text-[10px] md:text-xs text-muted-foreground font-medium uppercase">Itens Perdidos</p>
                  <p className="text-lg md:text-2xl font-bold text-blue-600">
                    {lancamentos.reduce((sum, l) => sum + (l.total_itens || 0), 0)}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border border-emerald-500/20 rounded-xl p-3 md:p-4">
                  <p className="text-[10px] md:text-xs text-muted-foreground font-medium uppercase">Média por Lanç.</p>
                  <p className="text-lg md:text-2xl font-bold text-emerald-600">
                    R$ {lancamentos.length > 0 
                      ? (lancamentos.reduce((sum, l) => sum + (l.total_valor || 0), 0) / lancamentos.length).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : '0,00'}
                  </p>
                </div>
              </div>

              {/* Filtro de Resolução */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">FILTRAR POR RESOLUÇÃO:</Label>
                    <Select value={filtroResolucao} onValueChange={setFiltroResolucao}>
                      <SelectTrigger className="w-40 h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">TODOS</SelectItem>
                        {TIPOS_RESOLUCAO.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label.toUpperCase()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {filtroResolucao !== 'todos' && (
                      <Badge variant="secondary" className="text-xs">
                        {TIPOS_RESOLUCAO.find(t => t.value === filtroResolucao)?.label.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Lista de Lançamentos */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2 md:pb-4 px-3 md:px-6">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 md:p-2 bg-amber-500/10 rounded-lg">
                        <History className="w-4 h-4 md:w-5 md:h-5 text-amber-600" />
                      </div>
                      <span className="text-sm md:text-base">LANÇAMENTOS</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {lancamentos.filter(l => filtroResolucao === 'todos' || (l.resolucoes && l.resolucoes.includes(filtroResolucao))).length} REGISTROS
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 md:px-6">
                  {lancamentos.filter(l => filtroResolucao === 'todos' || (l.resolucoes && l.resolucoes.includes(filtroResolucao))).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <div className="w-16 h-16 mx-auto mb-4 bg-muted/50 rounded-full flex items-center justify-center">
                        <History className="w-8 h-8 opacity-50" />
                      </div>
                      <p className="font-medium uppercase">
                        {filtroResolucao !== 'todos' 
                          ? `NENHUM LANÇAMENTO COM RESOLUÇÃO "${TIPOS_RESOLUCAO.find(t => t.value === filtroResolucao)?.label.toUpperCase()}"` 
                          : 'NENHUM LANÇAMENTO REGISTRADO'}
                      </p>
                      <p className="text-xs mt-1 uppercase">OS LANÇAMENTOS APARECERÃO AQUI</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {lancamentos
                        .filter(l => filtroResolucao === 'todos' || (l.resolucoes && l.resolucoes.includes(filtroResolucao)))
                        .map((lancamento) => (
                        <div
                          key={lancamento.id}
                          onClick={() => viewLancamentoDetail(lancamento)}
                          className="group relative overflow-hidden rounded-xl border bg-card hover:bg-muted/50 transition-all duration-200 cursor-pointer hover:shadow-md"
                        >
                          {/* Mobile Layout */}
                          <div className="md:hidden p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-xs">
                                  #{lancamento.numero}
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground">
                                    {format(new Date(lancamento.data_lancamento), 'dd/MM/yy')}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground/70 truncate max-w-[100px]">
                                    {lancamento.usuario?.nome || 'Usuário'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-base font-bold text-destructive">
                                  R$ {formatarPreco(lancamento.total_valor || 0)}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {lancamento.total_itens} {lancamento.total_itens === 1 ? 'item' : 'itens'}
                                </p>
                              </div>
                            </div>
                            {/* Barra de ação */}
                            <div className="flex items-center justify-between pt-2 border-t border-border/50">
                              <span className="text-[10px] text-muted-foreground">
                                Toque para ver detalhes
                              </span>
                              <FileText className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                          </div>

                          {/* Desktop Layout */}
                          <div className="hidden md:flex items-center justify-between p-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold shadow-lg shadow-red-500/20">
                                #{lancamento.numero}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold">Lançamento #{lancamento.numero}</p>
                                  <Badge variant={lancamento.status === 'cancelado' ? 'destructive' : 'secondary'} className="text-[10px]">
                                    {lancamento.status?.toUpperCase() || 'NORMAL'}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                  <span>{format(new Date(lancamento.data_lancamento), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                                  <span>•</span>
                                  <span>{lancamento.usuario?.nome || 'Usuário não identificado'}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Itens</p>
                                <p className="text-lg font-bold">{lancamento.total_itens}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Valor Total</p>
                                <p className="text-xl font-bold text-destructive">
                                  R$ {(lancamento.total_valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <FileText className="w-5 h-5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

      {/* Thermal Receipt Hidden Component */}
      {showThermalReceipt && selectedLancamento && (
        <div className="fixed left-[-9999px]">
          <div ref={receiptRef}>
            <ThermalLossReceipt
              numero={selectedLancamento.numero}
              data={new Date(selectedLancamento.data_lancamento)}
              operador={selectedLancamento.usuario?.nome || 'N/A'}
              items={receiptItems}
              observacao={selectedLancamento.observacao || undefined}
            />
          </div>
        </div>
      )}

      {/* Manual Product Dialog - Layout Ultra Compacto Mobile */}
      <Dialog open={showManualProductDialog} onOpenChange={(open) => {
        setShowManualProductDialog(open);
        if (!open) setIsFromScanner(false);
      }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-[320px] mx-auto p-3 rounded-xl">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-xs font-bold text-center">
              {tipoLancamento === 'consumo' ? '☕ CONSUMO' : '📦 LANÇAR PERDA'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-1.5">
            {/* Card do Produto - Super Compacto */}
            <div className="p-1.5 bg-muted/50 rounded-lg border overflow-hidden">
              <p className="font-bold text-xs uppercase break-words line-clamp-2">{manualProduct.nome || 'Produto'}</p>
              <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                <span className="font-mono truncate max-w-[45%]">{manualProduct.codigo_barras || '-'}</span>
                <span className="font-bold text-primary text-xs">
                  R$ {typeof manualProduct.preco_custo === 'number' 
                    ? formatarPreco(manualProduct.preco_custo)
                    : formatarPreco(parseFloat(String(manualProduct.preco_custo).replace(',', '.') || '0'))}
                </span>
              </div>
            </div>

            {/* Quantidade - Linha única compacta */}
            <div className="flex items-center gap-1.5">
              <Select 
                value={manualProduct.unidade_medida} 
                onValueChange={(v: 'kg' | 'unidade') => setManualProduct(prev => ({ ...prev, unidade_medida: v, quantidade: '' }))}
              >
                <SelectTrigger className="w-14 h-9 text-[10px] font-bold px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unidade">UN</SelectItem>
                  <SelectItem value="kg">KG</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="text"
                inputMode={manualProduct.unidade_medida === 'kg' ? 'decimal' : 'numeric'}
                placeholder="Qtd"
                value={manualProduct.quantidade}
                onChange={(e) => {
                  let val = e.target.value;
                  if (manualProduct.unidade_medida === 'unidade') {
                    val = val.replace(/[^0-9]/g, '');
                  } else {
                    val = val.replace(/[^0-9,]/g, '');
                  }
                  setManualProduct(prev => ({ ...prev, quantidade: val }));
                }}
                autoFocus
                className="flex-1 h-9 text-base font-bold text-center"
              />
            </div>

            {/* Motivo e Resolução - Compacto */}
            <div className="flex gap-1.5">
              <div className="flex-1">
                <Label className="text-[9px] font-bold uppercase text-muted-foreground">
                  {tipoLancamento === 'consumo' ? 'USO' : 'MOTIVO'}
                </Label>
                <Select 
                  value={manualProduct.motivo_perda} 
                  onValueChange={(v) => setManualProduct(prev => ({ ...prev, motivo_perda: v }))}
                >
                  <SelectTrigger className="h-8 text-[10px] px-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currentMotivos.map(m => (
                      <SelectItem key={m.value} value={m.value} className="text-xs py-1">{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {tipoLancamento === 'perda' && (
                <div className="flex-1">
                  <Label className="text-[9px] font-bold uppercase text-muted-foreground">RESOLUÇÃO</Label>
                  <Select 
                    value={manualProduct.tipo_resolucao} 
                    onValueChange={(v) => setManualProduct(prev => ({ ...prev, tipo_resolucao: v }))}
                  >
                    <SelectTrigger className="h-8 text-[10px] px-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_RESOLUCAO.map(t => (
                        <SelectItem key={t.value} value={t.value} className="text-xs py-1">{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Data Vencimento - Só aparece se motivo for vencido */}
            {manualProduct.motivo_perda === 'vencido' && (
              <div>
                <Label className="text-[9px] font-bold uppercase text-muted-foreground">VENCIMENTO</Label>
                <Input
                  type="date"
                  value={manualProduct.data_vencimento}
                  onChange={(e) => setManualProduct(prev => ({ ...prev, data_vencimento: e.target.value }))}
                  required
                  className="h-8 text-xs"
                />
              </div>
            )}

            {/* Botão Adicionar */}
            <Button 
              onClick={showLancamentoDetail ? addNewItemToLancamento : addToCart} 
              className="w-full h-10 text-xs font-bold"
              variant={tipoLancamento === 'consumo' ? 'default' : 'destructive'}
            >
              ✓ ADICIONAR
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={showEditItemDialog} onOpenChange={setShowEditItemDialog}>
        <DialogContent className="w-[95vw] max-w-[360px] sm:max-w-md mx-auto max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base sm:text-lg">Editar Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-sm">Unidade</Label>
                <Select 
                  value={editItemData.unidade_medida} 
                  onValueChange={(v: 'kg' | 'unidade') => setEditItemData(prev => ({ ...prev, unidade_medida: v }))}
                >
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unidade">UNIDADE</SelectItem>
                    <SelectItem value="kg">KG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Quantidade</Label>
                <Input
                  type="text"
                  inputMode={editItemData.unidade_medida === 'kg' ? 'decimal' : 'numeric'}
                  value={editItemData.quantidade_perdida}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (editItemData.unidade_medida === 'unidade') {
                      val = val.replace(/[^0-9]/g, '');
                    } else {
                      val = val.replace(/[^0-9,]/g, '');
                    }
                    setEditItemData(prev => ({ ...prev, quantidade_perdida: val }));
                  }}
                  className="h-10 text-sm"
                />
              </div>
              <div>
                <Label className="text-sm">Preço Unitário</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={typeof editItemData.preco_unitario === 'number' ? formatarPreco(editItemData.preco_unitario) : editItemData.preco_unitario}
                  onChange={(e) => {
                    const val = formatarInputPreco(e.target.value);
                    setEditItemData(prev => ({ ...prev, preco_unitario: val }));
                  }}
                  className="h-10 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Motivo da Perda</Label>
                <Select 
                  value={editItemData.motivo_perda} 
                  onValueChange={(v) => setEditItemData(prev => ({ ...prev, motivo_perda: v }))}
                >
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOTIVOS_PERDA.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Tipo de Resolução</Label>
                <Select 
                  value={editItemData.tipo_resolucao} 
                  onValueChange={(v) => setEditItemData(prev => ({ ...prev, tipo_resolucao: v }))}
                >
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_RESOLUCAO.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {editItemData.motivo_perda === 'vencido' && (
              <div>
                <Label className="text-sm">Data de Vencimento *</Label>
                <Input
                  type="date"
                  value={editItemData.data_vencimento}
                  onChange={(e) => setEditItemData(prev => ({ ...prev, data_vencimento: e.target.value }))}
                  required
                  className="h-10 text-sm"
                />
              </div>
            )}
            <Button onClick={saveEditedItem} className="w-full h-11 text-sm font-semibold">
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Catalog Item Dialog */}
      <Dialog open={showEditCatalogDialog} onOpenChange={setShowEditCatalogDialog}>
        <DialogContent className="w-[95vw] max-w-[360px] sm:max-w-md mx-auto max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base sm:text-lg">EDITAR ITEM DO ESTOQUE</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Código de Barras</Label>
              <Input
                value={editCatalogData.codigo_barras}
                onChange={(e) => setEditCatalogData(prev => ({ ...prev, codigo_barras: e.target.value }))}
                className="h-10 text-sm"
              />
            </div>
            <div>
              <Label className="text-sm">Nome do Produto *</Label>
              <Input
                value={editCatalogData.nome_item}
                onChange={(e) => setEditCatalogData(prev => ({ ...prev, nome_item: e.target.value.toUpperCase() }))}
                className="h-10 text-sm uppercase"
              />
            </div>
            <div>
              <Label className="text-sm">Marca</Label>
              <Input
                value={editCatalogData.marca}
                onChange={(e) => setEditCatalogData(prev => ({ ...prev, marca: e.target.value.toUpperCase() }))}
                className="h-10 text-sm uppercase"
              />
            </div>
            <div>
              <Label className="text-sm">Categoria</Label>
              <Select
                value={editCatalogData.categoria}
                onValueChange={(v) => {
                  setEditCatalogData(prev => ({ ...prev, categoria: v }));
                  setEditCategoryCategorySearch('');
                }}
              >
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <div className="p-2 sticky top-0 bg-background">
                    <Input
                      placeholder="Buscar categoria..."
                      value={editCategoryCategorySearch}
                      onChange={(e) => setEditCategoryCategorySearch(e.target.value.toUpperCase())}
                      className="h-8 text-xs"
                    />
                  </div>
                  {CATEGORIAS_PREDEFINIDAS
                    .filter(cat => cat.includes(editCategoryCategorySearch))
                    .map(cat => (
                      <SelectItem key={cat} value={cat} className="text-sm">{cat}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Preço de Custo</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={typeof editCatalogData.preco_custo === 'number' ? formatarPreco(editCatalogData.preco_custo) : editCatalogData.preco_custo}
                  onChange={(e) => {
                    const val = formatarInputPreco(e.target.value);
                    setEditCatalogData(prev => ({ ...prev, preco_custo: parseFloat(val.replace(',', '.')) || 0 }));
                  }}
                  className="h-10 text-sm"
                />
              </div>
              <div>
                <Label className="text-sm">Preço de Venda</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={typeof editCatalogData.preco_venda === 'number' ? formatarPreco(editCatalogData.preco_venda) : editCatalogData.preco_venda}
                  onChange={(e) => {
                    const val = formatarInputPreco(e.target.value);
                    setEditCatalogData(prev => ({ ...prev, preco_venda: parseFloat(val.replace(',', '.')) || 0 }));
                  }}
                  className="h-10 text-sm"
                />
              </div>
            </div>
            <Button onClick={saveCatalogItem} className="w-full h-11 text-sm font-semibold">
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Catalog Item Dialog */}
      <Dialog open={showNewCatalogItemDialog} onOpenChange={setShowNewCatalogItemDialog}>
        <DialogContent className="w-[95vw] max-w-[360px] sm:max-w-md mx-auto max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base sm:text-lg">CADASTRAR NOVO ITEM</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Código de Barras</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={newCatalogItem.codigo_barras}
                  onChange={(e) => setNewCatalogItem(prev => ({ ...prev, codigo_barras: e.target.value }))}
                  placeholder="Digite ou escaneie"
                  className="flex-1 h-10 text-sm"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => searchNewItemBarcode()}
                  disabled={searchingNewItemBarcode || !newCatalogItem.codigo_barras.trim()}
                  type="button"
                >
                  {searchingNewItemBarcode ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => setShowNewItemScanner(true)}
                  type="button"
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Digite o código e clique em buscar
              </p>
            </div>
            <div>
              <Label className="text-sm">Nome do Produto *</Label>
              <Input
                value={newCatalogItem.nome_item}
                onChange={(e) => setNewCatalogItem(prev => ({ ...prev, nome_item: e.target.value.toUpperCase() }))}
                className="uppercase h-10 text-sm"
                placeholder="Ex: DETERGENTE 500ML"
              />
            </div>
            <div>
              <Label className="text-sm">Marca</Label>
              <Input
                value={newCatalogItem.marca}
                onChange={(e) => setNewCatalogItem(prev => ({ ...prev, marca: e.target.value.toUpperCase() }))}
                placeholder="Opcional"
                className="h-10 text-sm uppercase"
              />
            </div>
            <div>
              <Label className="text-sm">Categoria</Label>
              <Select
                value={newCatalogItem.categoria}
                onValueChange={(v) => {
                  setNewCatalogItem(prev => ({ ...prev, categoria: v }));
                  setCategorySearch('');
                }}
              >
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-hidden">
                  <div className="p-2 border-b bg-popover z-10">
                    <Input
                      placeholder="Buscar categoria..."
                      value={categorySearch}
                      onChange={(e) => {
                        e.stopPropagation();
                        setCategorySearch(e.target.value.toUpperCase());
                      }}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto p-1">
                    {CATEGORIAS_PREDEFINIDAS
                      .filter(cat => cat.includes(categorySearch))
                      .map(cat => (
                        <SelectItem key={cat} value={cat} className="text-sm">{cat}</SelectItem>
                      ))}
                  </div>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Preço de Custo *</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={typeof newCatalogItem.preco_custo === 'number' ? formatarPreco(newCatalogItem.preco_custo) : newCatalogItem.preco_custo}
                  onChange={(e) => {
                    const val = formatarInputPreco(e.target.value);
                    setNewCatalogItem(prev => ({ ...prev, preco_custo: val }));
                  }}
                  className="h-10 text-sm"
                />
              </div>
              <div>
                <Label className="text-sm">Preço de Venda</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={typeof newCatalogItem.preco_venda === 'number' ? formatarPreco(newCatalogItem.preco_venda) : newCatalogItem.preco_venda}
                  onChange={(e) => {
                    const val = formatarInputPreco(e.target.value);
                    setNewCatalogItem(prev => ({ ...prev, preco_venda: val }));
                  }}
                  className="h-10 text-sm"
                />
              </div>
            </div>
            <Button onClick={saveNewCatalogItem} className="w-full h-11 text-sm font-bold">
              <Plus className="w-4 h-4 mr-2" />
              CADASTRAR ITEM
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner for New Item */}
      <BarcodeScanner
        open={showNewItemScanner}
        onOpenChange={setShowNewItemScanner}
        onScan={handleNewItemBarcodeScan}
      />

      {/* Lancamento Detail Dialog */}
      <Dialog open={showLancamentoDetail} onOpenChange={setShowLancamentoDetail}>
        <DialogContent className="w-[95vw] max-w-[360px] sm:max-w-2xl lg:max-w-4xl mx-auto max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base sm:text-lg">Lançamento #{selectedLancamento?.numero}</DialogTitle>
          </DialogHeader>
          
          {selectedLancamento && (
            <div className="space-y-4">
              {/* Mobile: Stack layout */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                <div>
                  <span className="text-muted-foreground">Data:</span>
                  <span className="ml-1 sm:ml-2">{format(new Date(selectedLancamento.data_lancamento), 'dd/MM/yyyy', { locale: ptBR })}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Responsável:</span>
                  <span className="ml-1 sm:ml-2 truncate">{selectedLancamento.usuario?.nome || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Itens:</span>
                  <span className="ml-1 sm:ml-2">{lancamentoItems.reduce((sum, i) => sum + i.quantidade_perdida, 0)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total:</span>
                  <span className="ml-1 sm:ml-2 font-bold text-destructive">
                    R$ {lancamentoItems.reduce((sum, i) => sum + (i.valor_perda || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={addItemToExistingLancamento} className="h-9 text-xs sm:text-sm">
                  <Plus className="w-4 h-4 mr-1 sm:mr-2" />
                  Adicionar
                </Button>
              </div>

              {/* Mobile: Card layout / Desktop: Table */}
              <div className="sm:hidden space-y-3">
                {lancamentoItems.map((item) => (
                  <div key={item.id} className="p-3 border rounded-lg space-y-2 bg-muted/30">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{item.item?.nome_item || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground font-mono">{item.item?.codigo_barras || '-'}</p>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editItem(item)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteItem(item.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Qtd:</span>
                        <span className="ml-1 font-medium">{item.quantidade_perdida}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Preço:</span>
                        <span className="ml-1">R$ {formatarPreco(item.preco_unitario)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Motivo:</span>
                        <Badge variant="outline" className="ml-1 text-xs py-0">{getMotivoLabel(item.motivo_perda)}</Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Valor:</span>
                        <span className="ml-1 font-bold text-destructive">R$ {formatarPreco(item.valor_perda || 0)}</span>
                      </div>
                    </div>
                    {/* Resolução */}
                    <div className="flex items-center gap-2 pt-1 border-t border-border/30 text-xs">
                      <span className="text-muted-foreground">Resolução:</span>
                      <Badge 
                        variant={item.tipo_resolucao === 'sem_resolucao' ? 'secondary' : 'default'}
                        className={`text-xs py-0 ${
                          item.tipo_resolucao === 'troca' ? 'bg-blue-500/20 text-blue-700 border-blue-500/30' :
                          item.tipo_resolucao === 'bonificacao' ? 'bg-green-500/20 text-green-700 border-green-500/30' :
                          item.tipo_resolucao === 'desconto' ? 'bg-amber-500/20 text-amber-700 border-amber-500/30' :
                          ''
                        }`}
                      >
                        {getResolucaoLabel(item.tipo_resolucao)}
                      </Badge>
                    </div>
                    {item.data_vencimento && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Venc:</span>
                        <span className="ml-1">{format(new Date(item.data_vencimento), 'dd/MM/yyyy')}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Código</TableHead>
                      <TableHead className="text-xs">Produto</TableHead>
                      <TableHead className="text-xs">Qtd</TableHead>
                      <TableHead className="text-xs">Preço</TableHead>
                      <TableHead className="text-xs">Motivo</TableHead>
                      <TableHead className="text-xs">Resolução</TableHead>
                      <TableHead className="text-xs">Venc.</TableHead>
                      <TableHead className="text-xs">Total</TableHead>
                      <TableHead className="w-20 text-xs">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lancamentoItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">{item.item?.codigo_barras || '-'}</TableCell>
                        <TableCell className="text-xs">{item.item?.nome_item || 'N/A'}</TableCell>
                        <TableCell className="text-xs">{item.quantidade_perdida}</TableCell>
                        <TableCell className="text-xs">R$ {formatarPreco(item.preco_unitario)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{getMotivoLabel(item.motivo_perda)}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={item.tipo_resolucao === 'sem_resolucao' ? 'secondary' : 'default'}
                            className={`text-xs ${
                              item.tipo_resolucao === 'troca' ? 'bg-blue-500/20 text-blue-700 border-blue-500/30' :
                              item.tipo_resolucao === 'bonificacao' ? 'bg-green-500/20 text-green-700 border-green-500/30' :
                              item.tipo_resolucao === 'desconto' ? 'bg-amber-500/20 text-amber-700 border-amber-500/30' :
                              ''
                            }`}
                          >
                            {getResolucaoLabel(item.tipo_resolucao)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {item.data_vencimento ? format(new Date(item.data_vencimento), 'dd/MM/yy') : '-'}
                        </TableCell>
                        <TableCell className="font-semibold text-destructive text-xs">
                          R$ {formatarPreco(item.valor_perda || 0)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editItem(item)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteItem(item.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" className="h-9 text-xs sm:text-sm" onClick={() => generateReport(selectedLancamento, lancamentoItems, 'pdf')}>
                  <FileText className="w-4 h-4 mr-1 sm:mr-2" />
                  PDF
                </Button>
                <Button variant="outline" size="sm" className="h-9 text-xs sm:text-sm" onClick={() => generateReport(selectedLancamento, lancamentoItems, 'jpeg')}>
                  <Printer className="w-4 h-4 mr-1 sm:mr-2" />
                  Cupom
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Multi Edit Catalog Dialog */}
      <Dialog open={showMultiEditDialog} onOpenChange={setShowMultiEditDialog}>
        <DialogContent className="w-[95vw] max-w-[360px] sm:max-w-md mx-auto max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base sm:text-lg">EDITAR {selectedCatalogItems.size} ITENS</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Preencha apenas os campos que deseja alterar.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">PREÇO DE CUSTO</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={multiEditData.preco_custo}
                  onChange={(e) => {
                    const val = formatarInputPreco(e.target.value);
                    setMultiEditData(prev => ({ ...prev, preco_custo: val }));
                  }}
                  className="h-10 text-sm"
                />
              </div>
              <div>
                <Label className="text-sm">PREÇO DE VENDA</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={multiEditData.preco_venda}
                  onChange={(e) => {
                    const val = formatarInputPreco(e.target.value);
                    setMultiEditData(prev => ({ ...prev, preco_venda: val }));
                  }}
                  className="h-10 text-sm"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm">CATEGORIA</Label>
              <Select
                value={multiEditData.categoria}
                onValueChange={(v) => {
                  setMultiEditData(prev => ({ ...prev, categoria: v }));
                  setMultiEditCategorySearch('');
                }}
              >
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Deixe vazio para não alterar" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <div className="p-2 sticky top-0 bg-background">
                    <Input
                      placeholder="Buscar categoria..."
                      value={multiEditCategorySearch}
                      onChange={(e) => setMultiEditCategorySearch(e.target.value.toUpperCase())}
                      className="h-8 text-xs"
                    />
                  </div>
                  {CATEGORIAS_PREDEFINIDAS
                    .filter(cat => cat.includes(multiEditCategorySearch))
                    .map(cat => (
                      <SelectItem key={cat} value={cat} className="text-sm">{cat}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={saveMultiEdit} className="w-full h-11 text-sm font-semibold">
              <Save className="w-4 h-4 mr-2" />
              SALVAR ALTERAÇÕES
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Offline Indicator */}
      <OfflineIndicator />
    </MainLayout>
  );
};

export default PerdasGeral;
