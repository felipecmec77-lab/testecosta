import { useState, useEffect } from 'react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  Trash2,
  FileText,
  Tag,
  Star,
  Copy,
  Download,
  Calendar,
  Package,
  TrendingUp,
  Percent,
  Eye,
  Edit,
  Save,
  Users,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import OfertasPDF from '@/components/ofertas/OfertasPDF';
import { Leaf, Scale } from 'lucide-react';
import OfertasHortifrutiPDF from '@/components/ofertas/OfertasHortifrutiPDF';
import { HortifrutiTab } from '@/components/ofertas/HortifrutiTab';
import { OfertaAiAssistant } from '@/components/ofertas/OfertaAiAssistant';

interface ItemEstoque {
  id: string;
  codigo_barras: string | null;
  nome_item: string;
  marca: string | null;
  categoria: string | null;
  preco_custo: number;
  preco_venda: number;
  fonte: 'estoque' | 'hortifruti';
}

interface ItemOferta {
  id?: string;
  item_id: string;
  nome_item: string;
  preco_custo: number;
  preco_venda_normal: number;
  preco_oferta: number;
  margem_lucro?: number;
  lucro_real?: number;
  economia_percentual?: number;
  destaque: boolean;
  quantidade_limite?: number;
  observacao?: string;
}

interface Oferta {
  id: string;
  nome_campanha: string;
  data_inicio: string;
  data_fim: string;
  tipo: string;
  setor: string;
  status: string;
  usuario_id: string;
  observacao: string | null;
  criado_em: string;
  itens?: ItemOferta[];
}

const TIPOS_OFERTA = [
  { value: 'fim_de_semana', label: 'Fim de Semana' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'quinzenal', label: 'Quinzenal' },
  { value: 'mensal', label: 'Mensal' },
];

const SETORES = [
  { value: 'geral', label: 'Geral' },
  { value: 'varejo', label: 'Varejo' },
  { value: 'hortifruti', label: 'Hortifrúti' },
];

const STATUS_OFERTA = [
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'finalizado', label: 'Finalizado' },
];

const Ofertas = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState('varejo');
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [loading, setLoading] = useState(true);

  // Estoque items
  const [itensEstoque, setItensEstoque] = useState<ItemEstoque[]>([]);
  const [searchEstoque, setSearchEstoque] = useState('');

  // Ofertas salvas
  const [ofertas, setOfertas] = useState<Oferta[]>([]);

  // Nova oferta
  const [novaOferta, setNovaOferta] = useState({
    nome_campanha: '',
    data_inicio: format(new Date(), 'yyyy-MM-dd'),
    data_fim: format(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    tipo: 'fim_de_semana',
    setor: 'geral',
    observacao: ''
  });
  const [itensOferta, setItensOferta] = useState<ItemOferta[]>([]);
  const [editingOfertaId, setEditingOfertaId] = useState<string | null>(null);

  // Dialog para adicionar múltiplos itens
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [selectedMultipleItems, setSelectedMultipleItems] = useState<string[]>([]);
  const [multipleItemsPreco, setMultipleItemsPreco] = useState<Record<string, string>>({});
  const [multipleItemsCusto, setMultipleItemsCusto] = useState<Record<string, string>>({});
  const [fonteFilter, setFonteFilter] = useState<'estoque' | 'hortifruti'>('estoque');

  // Dialog para visualizar oferta
  const [showOfertaDetail, setShowOfertaDetail] = useState(false);
  const [selectedOferta, setSelectedOferta] = useState<Oferta | null>(null);
  const [ofertaItens, setOfertaItens] = useState<ItemOferta[]>([]);

  // PDF
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [pdfOferta, setPdfOferta] = useState<Oferta | null>(null);
  const [pdfItens, setPdfItens] = useState<ItemOferta[]>([]);
  const [pdfForMarketing, setPdfForMarketing] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch estoque items (tabela estoque - produtos gerais do supermercado)
      const { data: estoqueData, error: estoqueError } = await supabase
        .from('estoque')
        .select('*')
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (estoqueError) throw estoqueError;
      
      // Separar itens por subgrupo
      const itensGeralFormatados: ItemEstoque[] = (estoqueData || [])
        .filter(item => item.subgrupo?.toUpperCase() !== 'HORTIFRUTI')
        .map(item => ({
          id: item.id,
          codigo_barras: item.codigo_barras,
          nome_item: item.nome,
          marca: item.marca,
          categoria: item.grupo,
          preco_custo: item.preco_custo,
          preco_venda: item.preco_venda,
          fonte: 'estoque' as const
        }));

      const itensHortifrutiFormatados: ItemEstoque[] = (estoqueData || [])
        .filter(item => item.subgrupo?.toUpperCase() === 'HORTIFRUTI')
        .map(item => ({
          id: item.id,
          codigo_barras: item.codigo_barras,
          nome_item: item.nome,
          marca: item.marca,
          categoria: item.grupo,
          preco_custo: item.preco_custo,
          preco_venda: item.preco_venda,
          fonte: 'hortifruti' as const
        }));

      setItensEstoque([...itensGeralFormatados, ...itensHortifrutiFormatados]);

      // Fetch ofertas
      const { data: ofertasData, error: ofertasError } = await supabase
        .from('ofertas')
        .select('*')
        .order('criado_em', { ascending: false });

      if (ofertasError) throw ofertasError;
      setOfertas(ofertasData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

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

  const calcularMargem = (precoCusto: number, precoVenda: number) => {
    if (precoCusto <= 0) return 0;
    return ((precoVenda - precoCusto) / precoCusto) * 100;
  };

  const calcularEconomia = (precoNormal: number, precoOferta: number) => {
    if (precoNormal <= 0) return 0;
    return ((precoNormal - precoOferta) / precoNormal) * 100;
  };

  const getMargemStyle = (margem: number) => {
    if (margem < 5) return 'bg-red-600 text-white border-red-700 font-bold';
    if (margem < 15) return 'bg-amber-500 text-white border-amber-600 font-bold';
    if (margem < 30) return 'bg-emerald-500 text-white border-emerald-600 font-bold';
    return 'bg-blue-600 text-white border-blue-700 font-bold';
  };

  // Toggle seleção de item múltiplo
  const toggleItemSelection = (itemId: string) => {
    setSelectedMultipleItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Adicionar múltiplos itens à oferta
  const addMultipleItemsToOferta = () => {
    const novosItens: ItemOferta[] = [];
    const itensMargemNegativa: string[] = [];

    selectedMultipleItems.forEach(itemId => {
      const item = itensEstoque.find(i => i.id === itemId);
      if (!item) return;

      // Para hortifruti, usar custo manual se preenchido
      const precoCusto = item.fonte === 'hortifruti' && multipleItemsCusto[itemId]
        ? parseFloat(multipleItemsCusto[itemId].replace(',', '.')) || item.preco_custo
        : item.preco_custo;

      const precoOferta = parseFloat((multipleItemsPreco[itemId] || item.preco_venda.toString()).replace(',', '.')) || item.preco_venda;
      const margem = ((precoOferta - precoCusto) / precoOferta) * 100;
      
      // Verificar margem negativa
      if (margem < 0) {
        itensMargemNegativa.push(item.nome_item);
      }
      
      // Verificar se já existe na oferta
      if (itensOferta.some(i => i.item_id === itemId)) {
        return;
      }

      novosItens.push({
        item_id: item.id,
        nome_item: item.nome_item,
        preco_custo: precoCusto,
        preco_venda_normal: item.preco_venda,
        preco_oferta: precoOferta,
        margem_lucro: calcularMargem(precoCusto, precoOferta),
        lucro_real: precoOferta - precoCusto,
        economia_percentual: calcularEconomia(item.preco_venda, precoOferta),
        destaque: false,
      });
    });

    if (novosItens.length === 0) {
      toast.error('Nenhum item novo para adicionar');
      return;
    }

    // Alertar sobre itens com margem negativa
    if (itensMargemNegativa.length > 0) {
      toast.warning(`Atenção! ${itensMargemNegativa.length} item(ns) com margem negativa: ${itensMargemNegativa.slice(0, 3).join(', ')}${itensMargemNegativa.length > 3 ? '...' : ''}`);
    }

    setItensOferta(prev => [...prev, ...novosItens]);
    setShowAddItemDialog(false);
    setSelectedMultipleItems([]);
    setMultipleItemsPreco({});
    setMultipleItemsCusto({});
    toast.success(`${novosItens.length} item(ns) adicionado(s) à oferta!`);
  };

  const removeItemFromOferta = (index: number) => {
    setItensOferta(prev => prev.filter((_, i) => i !== index));
  };

  // Toggle destaque clicando na estrela
  const toggleDestaque = (index: number) => {
    setItensOferta(prev => prev.map((item, i) => 
      i === index ? { ...item, destaque: !item.destaque } : item
    ));
  };

  // Atualizar preço do item na oferta
  const updateItemPreco = (index: number, novoPreco: string) => {
    const preco = parseFloat(novoPreco.replace(',', '.')) || 0;
    setItensOferta(prev => prev.map((item, i) => {
      if (i !== index) return item;
      return {
        ...item,
        preco_oferta: preco,
        margem_lucro: calcularMargem(item.preco_custo, preco),
        lucro_real: preco - item.preco_custo,
        economia_percentual: calcularEconomia(item.preco_venda_normal, preco),
      };
    }));
  };

  const salvarOferta = async () => {
    if (!novaOferta.nome_campanha.trim()) {
      toast.error('Nome da campanha é obrigatório');
      return;
    }

    if (itensOferta.length === 0) {
      toast.error('Adicione pelo menos um item à oferta');
      return;
    }

    try {
      if (editingOfertaId) {
        // Atualizar oferta existente
        const { error: ofertaError } = await supabase
          .from('ofertas')
          .update({
            nome_campanha: novaOferta.nome_campanha,
            data_inicio: novaOferta.data_inicio,
            data_fim: novaOferta.data_fim,
            tipo: novaOferta.tipo,
            setor: novaOferta.setor,
            observacao: novaOferta.observacao || null,
          })
          .eq('id', editingOfertaId);

        if (ofertaError) throw ofertaError;

        // Deletar itens antigos
        await supabase
          .from('itens_oferta')
          .delete()
          .eq('oferta_id', editingOfertaId);

        // Inserir novos itens
        const itensParaInserir = itensOferta.map(item => ({
          oferta_id: editingOfertaId,
          item_id: item.item_id,
          nome_item: item.nome_item,
          preco_custo: item.preco_custo,
          preco_venda_normal: item.preco_venda_normal,
          preco_oferta: item.preco_oferta,
          destaque: item.destaque,
          quantidade_limite: item.quantidade_limite || null,
          observacao: item.observacao || null
        }));

        const { error: itensError } = await supabase
          .from('itens_oferta')
          .insert(itensParaInserir);

        if (itensError) throw itensError;

        toast.success('Oferta atualizada com sucesso!');
        setEditingOfertaId(null);
      } else {
        // Criar nova oferta
        const { data: ofertaData, error: ofertaError } = await supabase
          .from('ofertas')
          .insert({
            nome_campanha: novaOferta.nome_campanha,
            data_inicio: novaOferta.data_inicio,
            data_fim: novaOferta.data_fim,
            tipo: novaOferta.tipo,
            setor: novaOferta.setor,
            observacao: novaOferta.observacao || null,
            usuario_id: user!.id,
            status: 'rascunho'
          })
          .select()
          .single();

        if (ofertaError) throw ofertaError;

        // Criar itens da oferta
        const itensParaInserir = itensOferta.map(item => ({
          oferta_id: ofertaData.id,
          item_id: item.item_id,
          nome_item: item.nome_item,
          preco_custo: item.preco_custo,
          preco_venda_normal: item.preco_venda_normal,
          preco_oferta: item.preco_oferta,
          destaque: item.destaque,
          quantidade_limite: item.quantidade_limite || null,
          observacao: item.observacao || null
        }));

        const { error: itensError } = await supabase
          .from('itens_oferta')
          .insert(itensParaInserir);

        if (itensError) throw itensError;

        toast.success('Oferta salva com sucesso!');
      }
      
      // Reset form
      setNovaOferta({
        nome_campanha: '',
        data_inicio: format(new Date(), 'yyyy-MM-dd'),
        data_fim: format(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        tipo: 'fim_de_semana',
        setor: 'geral',
        observacao: ''
      });
      setItensOferta([]);
      fetchData();
      setActiveTab('salvas');
    } catch (error) {
      console.error('Erro ao salvar oferta:', error);
      toast.error('Erro ao salvar oferta');
    }
  };

  const viewOfertaDetail = async (oferta: Oferta) => {
    try {
      const { data: itens, error } = await supabase
        .from('itens_oferta')
        .select('*')
        .eq('oferta_id', oferta.id);

      if (error) throw error;

      setSelectedOferta(oferta);
      setOfertaItens(itens || []);
      setShowOfertaDetail(true);
    } catch (error) {
      console.error('Erro ao carregar itens da oferta:', error);
      toast.error('Erro ao carregar itens');
    }
  };

  // Editar oferta existente
  const editarOferta = async (oferta: Oferta) => {
    try {
      const { data: itens, error } = await supabase
        .from('itens_oferta')
        .select('*')
        .eq('oferta_id', oferta.id);

      if (error) throw error;

      setEditingOfertaId(oferta.id);
      setNovaOferta({
        nome_campanha: oferta.nome_campanha,
        data_inicio: oferta.data_inicio,
        data_fim: oferta.data_fim,
        tipo: oferta.tipo,
        setor: oferta.setor,
        observacao: oferta.observacao || ''
      });

      setItensOferta((itens || []).map(item => ({
        id: item.id,
        item_id: item.item_id,
        nome_item: item.nome_item,
        preco_custo: item.preco_custo,
        preco_venda_normal: item.preco_venda_normal,
        preco_oferta: item.preco_oferta,
        margem_lucro: calcularMargem(item.preco_custo, item.preco_oferta),
        lucro_real: item.preco_oferta - item.preco_custo,
        economia_percentual: calcularEconomia(item.preco_venda_normal, item.preco_oferta),
        destaque: item.destaque,
        quantidade_limite: item.quantidade_limite,
        observacao: item.observacao
      })));

      setActiveTab('nova');
      toast.info('Editando oferta - faça as alterações e salve');
    } catch (error) {
      console.error('Erro ao editar oferta:', error);
      toast.error('Erro ao carregar oferta para edição');
    }
  };

  const duplicarOferta = async (oferta: Oferta) => {
    try {
      const { data: itens, error } = await supabase
        .from('itens_oferta')
        .select('*')
        .eq('oferta_id', oferta.id);

      if (error) throw error;

      // Copiar dados para nova oferta
      setNovaOferta({
        nome_campanha: `${oferta.nome_campanha} (Cópia)`,
        data_inicio: format(new Date(), 'yyyy-MM-dd'),
        data_fim: format(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        tipo: oferta.tipo,
        setor: oferta.setor,
        observacao: oferta.observacao || ''
      });

      setItensOferta((itens || []).map(item => ({
        item_id: item.item_id,
        nome_item: item.nome_item,
        preco_custo: item.preco_custo,
        preco_venda_normal: item.preco_venda_normal,
        preco_oferta: item.preco_oferta,
        margem_lucro: item.margem_lucro,
        lucro_real: item.lucro_real,
        economia_percentual: item.economia_percentual,
        destaque: item.destaque,
        quantidade_limite: item.quantidade_limite,
        observacao: item.observacao
      })));

      setEditingOfertaId(null);
      setActiveTab('nova');
      toast.success('Oferta duplicada! Edite e salve como nova.');
    } catch (error) {
      console.error('Erro ao duplicar oferta:', error);
      toast.error('Erro ao duplicar oferta');
    }
  };

  const gerarPDF = async (oferta: Oferta, forMarketing: boolean = false) => {
    try {
      const { data: itens, error } = await supabase
        .from('itens_oferta')
        .select('*')
        .eq('oferta_id', oferta.id);

      if (error) throw error;

      setPdfOferta(oferta);
      setPdfItens(itens || []);
      setPdfForMarketing(forMarketing);
      setShowPDFPreview(true);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  const excluirOferta = async (ofertaId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta oferta?')) return;

    try {
      const { error } = await supabase
        .from('ofertas')
        .delete()
        .eq('id', ofertaId);

      if (error) throw error;

      toast.success('Oferta excluída!');
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir oferta:', error);
      toast.error('Erro ao excluir oferta');
    }
  };

  // Normalizar texto para busca (remove espaços extras, acentos, etc.)
  const normalizeText = (text: string) => {
    return text.toLowerCase().replace(/\s+/g, ' ').trim();
  };

  const filteredEstoque = itensEstoque.filter(item => {
    const searchNormalized = normalizeText(searchEstoque);
    const nomeNormalized = normalizeText(item.nome_item);
    const marcaNormalized = item.marca ? normalizeText(item.marca) : '';
    
    const matchesSearch = nomeNormalized.includes(searchNormalized) ||
      item.codigo_barras?.includes(searchEstoque) ||
      marcaNormalized.includes(searchNormalized);
    const matchesFonte = item.fonte === fonteFilter;
    return matchesSearch && matchesFonte;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'rascunho': return 'secondary';
      case 'ativo': return 'default';
      case 'finalizado': return 'outline';
      default: return 'secondary';
    }
  };

  const cancelarEdicao = () => {
    setEditingOfertaId(null);
    setNovaOferta({
      nome_campanha: '',
      data_inicio: format(new Date(), 'yyyy-MM-dd'),
      data_fim: format(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      tipo: 'fim_de_semana',
      setor: 'geral',
      observacao: ''
    });
    setItensOferta([]);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6 p-2 md:p-0">
        {/* Header clicável - estilo moderno */}
        <button 
          className="w-full text-center p-4 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center justify-center gap-3">
            <Tag className="w-8 h-8" />
            OFERTAS
          </h1>
          <p className="text-white/80 text-sm mt-1">COMERCIAL COSTA</p>
        </button>

        {/* Botões de navegação em grid - estilo moderno */}
        <div className="grid grid-cols-4 gap-2 md:gap-3">
          <button
            onClick={() => setActiveTab('varejo')}
            className={`flex flex-col items-center justify-center p-3 md:p-4 rounded-xl transition-all duration-300 ${
              activeTab === 'varejo'
                ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg scale-[1.02]'
                : 'bg-card border border-border hover:bg-muted/50 text-foreground hover:scale-[1.01]'
            }`}
          >
            <Sparkles className="w-6 h-6 mb-1" />
            <span className="text-xs md:text-sm font-medium">VAREJO</span>
          </button>
          <button
            onClick={() => setActiveTab('hortifruti')}
            className={`flex flex-col items-center justify-center p-3 md:p-4 rounded-xl transition-all duration-300 ${
              activeTab === 'hortifruti'
                ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg scale-[1.02]'
                : 'bg-card border border-border hover:bg-muted/50 text-foreground hover:scale-[1.01]'
            }`}
          >
            <Leaf className="w-6 h-6 mb-1" />
            <span className="text-xs md:text-sm font-medium">HORTI</span>
          </button>
          <button
            onClick={() => setActiveTab('salvas')}
            className={`flex flex-col items-center justify-center p-3 md:p-4 rounded-xl transition-all duration-300 ${
              activeTab === 'salvas'
                ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg scale-[1.02]'
                : 'bg-card border border-border hover:bg-muted/50 text-foreground hover:scale-[1.01]'
            }`}
          >
            <FileText className="w-6 h-6 mb-1" />
            <span className="text-xs md:text-sm font-medium">SALVAS</span>
          </button>
          <button
            onClick={() => setActiveTab('historico')}
            className={`flex flex-col items-center justify-center p-3 md:p-4 rounded-xl transition-all duration-300 ${
              activeTab === 'historico'
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg scale-[1.02]'
                : 'bg-card border border-border hover:bg-muted/50 text-foreground hover:scale-[1.01]'
            }`}
          >
            <TrendingUp className="w-6 h-6 mb-1" />
            <span className="text-xs md:text-sm font-medium">HISTÓRICO</span>
          </button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="hidden"></TabsList>

          {/* Aba Varejo - Nova oferta com assistente IA */}
          <TabsContent value="varejo" className="space-y-4 mt-4">
            {editingOfertaId && (
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 flex items-center justify-between">
                <span className="text-warning font-medium">Editando oferta existente</span>
                <Button variant="outline" size="sm" onClick={cancelarEdicao}>
                  Cancelar Edição
                </Button>
              </div>
            )}

            {/* Ações Rápidas com IA */}
            <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span className="font-bold">Ações Rápidas</span>
                  </div>
                  <Button 
                    onClick={() => setShowAiAssistant(true)}
                    className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Sugerir com IA
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Use a IA para sugerir itens automaticamente baseado em estoque, margens e sazonalidade.
                  Produtos do hortifruti e com margem acima de 100% são excluídos automaticamente.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dados da Campanha</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome da Campanha *</Label>
                    <Input
                      placeholder="Ex: OFERTAS FIM DE SEMANA 28/12"
                      value={novaOferta.nome_campanha}
                      onChange={(e) => setNovaOferta({ ...novaOferta, nome_campanha: e.target.value.toUpperCase() })}
                      className="uppercase"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={novaOferta.tipo}
                      onValueChange={(value) => setNovaOferta({ ...novaOferta, tipo: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_OFERTA.map(tipo => (
                          <SelectItem key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Data Início</Label>
                    <Input
                      type="date"
                      value={novaOferta.data_inicio}
                      onChange={(e) => setNovaOferta({ ...novaOferta, data_inicio: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Fim</Label>
                    <Input
                      type="date"
                      value={novaOferta.data_fim}
                      onChange={(e) => setNovaOferta({ ...novaOferta, data_fim: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Setor</Label>
                    <Select
                      value={novaOferta.setor}
                      onValueChange={(value) => setNovaOferta({ ...novaOferta, setor: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SETORES.map(setor => (
                          <SelectItem key={setor.value} value={setor.value}>
                            {setor.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Observação</Label>
                  <Textarea
                    placeholder="OBSERVAÇÕES SOBRE A CAMPANHA..."
                    value={novaOferta.observacao}
                    onChange={(e) => setNovaOferta({ ...novaOferta, observacao: e.target.value.toUpperCase() })}
                    className="uppercase"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Itens da Oferta */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Itens da Oferta</CardTitle>
                <Button onClick={() => {
                  // Auto-selecionar filtro baseado no setor
                  if (novaOferta.setor === 'hortifruti') {
                    setFonteFilter('hortifruti');
                  } else {
                    setFonteFilter('estoque');
                  }
                  setShowAddItemDialog(true);
                }} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Selecionar Itens
                </Button>
              </CardHeader>
              <CardContent>
                {itensOferta.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>Nenhum item adicionado</p>
                    <p className="text-sm">Clique em "Selecionar Itens" para começar</p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-4 p-3 mb-3 bg-muted/50 rounded-lg text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500"></div>
                        <span className="text-muted-foreground">Custo</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-blue-500/20 border border-blue-500"></div>
                        <span className="text-muted-foreground">Preço Normal</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500"></div>
                        <span className="text-muted-foreground">Preço Oferta</span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="w-10">★</TableHead>
                            <TableHead>Produto</TableHead>
                            <TableHead className="text-center">
                              <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-700 dark:text-red-400 text-xs font-bold">CUSTO</span>
                            </TableHead>
                            <TableHead className="text-center">
                              <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-bold">NORMAL</span>
                            </TableHead>
                            <TableHead className="text-center w-36">
                              <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-700 dark:text-green-400 text-xs font-bold">OFERTA</span>
                            </TableHead>
                            <TableHead className="text-center">Margem</TableHead>
                            <TableHead className="text-center">Economia</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {itensOferta.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <button
                                  onClick={() => toggleDestaque(index)}
                                  className="p-1 hover:bg-muted rounded transition-colors"
                                >
                                  <Star 
                                    className={`h-5 w-5 ${item.destaque ? 'text-warning fill-warning' : 'text-muted-foreground'}`}
                                  />
                                </button>
                              </TableCell>
                              <TableCell className="font-medium uppercase">
                                {item.nome_item}
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="inline-block px-2 py-1 rounded bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 font-mono font-semibold text-sm">
                                  R$ {formatarPreco(item.preco_custo)}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="inline-block px-2 py-1 rounded bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-400 font-mono font-semibold text-sm">
                                  R$ {formatarPreco(item.preco_venda_normal)}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <Input
                                  type="text"
                                  value={formatarPreco(item.preco_oferta)}
                                  onChange={(e) => updateItemPreco(index, formatarInputPreco(e.target.value))}
                                  className="w-28 text-center font-mono font-bold border-green-500 bg-green-500/10 focus:ring-green-500"
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-full text-sm shadow-md ${getMargemStyle(item.margem_lucro || 0)}`}>
                                  {(item.margem_lucro || 0).toFixed(1)}%
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">
                                  {(item.economia_percentual || 0).toFixed(1)}%
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeItemFromOferta(index)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}

                {itensOferta.length > 0 && (
                  <div className="mt-4 flex justify-end">
                    <Button onClick={salvarOferta} size="lg">
                      <Save className="h-4 w-4 mr-2" />
                      {editingOfertaId ? 'Atualizar Oferta' : 'Salvar Oferta'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ofertas Salvas */}
          <TabsContent value="salvas" className="space-y-4 mt-4">
            {ofertas.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>Nenhuma oferta salva</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {ofertas.map(oferta => (
                  <Card key={oferta.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{oferta.nome_campanha}</h3>
                            <Badge variant={getStatusBadge(oferta.status)}>
                              {STATUS_OFERTA.find(s => s.value === oferta.status)?.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(oferta.data_inicio), 'dd/MM', { locale: ptBR })} - {format(new Date(oferta.data_fim), 'dd/MM/yyyy', { locale: ptBR })}
                            </span>
                            <span>
                              {TIPOS_OFERTA.find(t => t.value === oferta.tipo)?.label}
                            </span>
                            <span>
                              {SETORES.find(s => s.value === oferta.setor)?.label}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => viewOfertaDetail(oferta)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => editarOferta(oferta)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => duplicarOferta(oferta)}>
                            <Copy className="h-4 w-4 mr-1" />
                            Duplicar
                          </Button>
                          <Button variant="default" size="sm" onClick={() => gerarPDF(oferta, false)}>
                            <Download className="h-4 w-4 mr-1" />
                            PDF
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => gerarPDF(oferta, true)}>
                            <Users className="h-4 w-4 mr-1" />
                            Marketing
                          </Button>
                          {userRole === 'administrador' && (
                            <Button variant="ghost" size="sm" onClick={() => excluirOferta(oferta.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Hortifruti - Componente dedicado */}
          <TabsContent value="hortifruti" className="space-y-4 mt-4">
            <HortifrutiTab 
              onImportarItens={(itens) => {
                setNovaOferta(prev => ({ ...prev, setor: 'hortifruti' }));
                setItensOferta(prev => [...prev, ...itens]);
                setActiveTab('varejo');
              }}
            />
          </TabsContent>

          {/* Histórico de Ofertas */}
          <TabsContent value="historico" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Histórico de Ofertas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">Histórico de ofertas anteriores</p>
                  <p className="text-sm">Visualize ofertas passadas e analise o desempenho</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Assistente de IA para Ofertas */}
      <OfertaAiAssistant 
        open={showAiAssistant}
        onOpenChange={setShowAiAssistant}
        onAddItems={(itens) => {
          setItensOferta(prev => [...prev, ...itens]);
        }}
      />

      {/* Dialog Adicionar Múltiplos Itens */}
      <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Selecionar Itens para Oferta</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Buscar Produto</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Digite para buscar..."
                    value={searchEstoque}
                    onChange={(e) => setSearchEstoque(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              {novaOferta.setor !== 'hortifruti' && (
                <div className="space-y-2">
                  <Label>Filtrar por Origem</Label>
                  <Select
                    value={fonteFilter}
                    onValueChange={(value: 'estoque' | 'hortifruti') => setFonteFilter(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="estoque">Estoque (Perdas Geral)</SelectItem>
                      <SelectItem value="hortifruti">Hortifruti (Verduras/Legumes/Frutas)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {novaOferta.setor === 'hortifruti' && (
                <div className="space-y-2">
                  <Label>Origem</Label>
                  <div className="h-10 px-3 py-2 border rounded-md bg-muted/50 flex items-center text-sm text-muted-foreground">
                    Hortifruti (Verduras/Legumes/Frutas)
                  </div>
                </div>
              )}
            </div>

            {selectedMultipleItems.length > 0 && (
              <div className="bg-primary/10 p-3 rounded-lg">
                <p className="font-medium text-primary">
                  {selectedMultipleItems.length} item(ns) selecionado(s)
                </p>
              </div>
            )}

            {/* Legenda de cores */}
            <div className="flex flex-wrap gap-4 p-3 bg-muted/50 rounded-lg text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500"></div>
                <span className="text-muted-foreground">Custo</span>
              </div>
              {fonteFilter === 'estoque' && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-500/20 border border-blue-500"></div>
                  <span className="text-muted-foreground">Venda Normal</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500"></div>
                <span className="text-muted-foreground">Preço Oferta</span>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-10">Sel.</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-700 dark:text-red-400 text-xs font-bold">CUSTO</span>
                      </div>
                    </TableHead>
                    {fonteFilter === 'estoque' && (
                      <TableHead className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-bold">VENDA</span>
                        </div>
                      </TableHead>
                    )}
                    <TableHead className="text-center w-32">
                      <div className="flex flex-col items-center gap-1">
                        <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-700 dark:text-green-400 text-xs font-bold">OFERTA</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-center w-20">
                      <span className="text-xs font-bold">MARGEM</span>
                    </TableHead>
                    <TableHead className="text-center w-20">
                      <span className="text-xs font-bold">LUCRO</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEstoque.slice(0, 50).map(item => {
                    const isSelected = selectedMultipleItems.includes(item.id);
                    const jaAdicionado = itensOferta.some(i => i.item_id === item.id);
                    return (
                      <TableRow 
                        key={item.id}
                        className={`${isSelected ? 'bg-primary/5' : ''} ${jaAdicionado ? 'opacity-50' : ''}`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleItemSelection(item.id)}
                            disabled={jaAdicionado}
                          />
                        </TableCell>
                        <TableCell className="font-medium uppercase">
                          <div className="flex items-center gap-2">
                            <span>{item.nome_item}</span>
                            <Badge variant={item.fonte === 'hortifruti' ? 'secondary' : 'outline'} className="text-xs">
                              {item.fonte === 'hortifruti' ? 'HORTI' : 'ESTOQUE'}
                            </Badge>
                            {jaAdicionado && <Badge variant="outline" className="text-xs">JÁ ADICIONADO</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {fonteFilter === 'hortifruti' && isSelected ? (
                            <Input
                              type="text"
                              placeholder={formatarPreco(item.preco_custo)}
                              value={multipleItemsCusto[item.id] || formatarPreco(item.preco_custo)}
                              onChange={(e) => setMultipleItemsCusto(prev => ({
                                ...prev,
                                [item.id]: formatarInputPreco(e.target.value)
                              }))}
                              className="w-24 text-center font-mono font-bold border-red-500 bg-red-500/10 focus:ring-red-500"
                            />
                          ) : (
                            <span className="inline-block px-2 py-1 rounded bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 font-mono font-semibold">
                              R$ {formatarPreco(item.preco_custo)}
                            </span>
                          )}
                        </TableCell>
                        {fonteFilter === 'estoque' && (
                          <TableCell className="text-center">
                            <span className="inline-block px-2 py-1 rounded bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-400 font-mono font-semibold">
                              R$ {formatarPreco(item.preco_venda)}
                            </span>
                          </TableCell>
                        )}
                        <TableCell className="text-center">
                          {isSelected ? (
                            <Input
                              type="text"
                              placeholder={formatarPreco(item.preco_venda)}
                              value={multipleItemsPreco[item.id] || ''}
                              onChange={(e) => setMultipleItemsPreco(prev => ({
                                ...prev,
                                [item.id]: formatarInputPreco(e.target.value)
                              }))}
                              className="w-24 text-center font-mono font-bold border-green-500 bg-green-500/10 focus:ring-green-500"
                            />
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isSelected && multipleItemsPreco[item.id] ? (
                            (() => {
                              const precoOferta = parseFloat(multipleItemsPreco[item.id]?.replace(',', '.') || '0');
                              const precoCusto = fonteFilter === 'hortifruti' && multipleItemsCusto[item.id]
                                ? parseFloat(multipleItemsCusto[item.id].replace(',', '.'))
                                : item.preco_custo;
                              const margem = precoOferta > 0 ? ((precoOferta - precoCusto) / precoOferta) * 100 : 0;
                              return (
                                <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-bold shadow ${getMargemStyle(margem)}`}>
                                  {margem.toFixed(1)}%
                                </span>
                              );
                            })()
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isSelected && multipleItemsPreco[item.id] ? (
                            (() => {
                              const precoOferta = parseFloat(multipleItemsPreco[item.id]?.replace(',', '.') || '0');
                              const precoCusto = fonteFilter === 'hortifruti' && multipleItemsCusto[item.id]
                                ? parseFloat(multipleItemsCusto[item.id].replace(',', '.'))
                                : item.preco_custo;
                              const lucro = precoOferta - precoCusto;
                              return (
                                <span className={`font-mono font-bold text-sm ${lucro >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  R$ {formatarPreco(lucro)}
                                </span>
                              );
                            })()
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddItemDialog(false);
              setSelectedMultipleItems([]);
              setMultipleItemsPreco({});
              setMultipleItemsCusto({});
            }}>
              Cancelar
            </Button>
            <Button onClick={addMultipleItemsToOferta} disabled={selectedMultipleItems.length === 0}>
              Adicionar {selectedMultipleItems.length} Item(ns)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Detalhe da Oferta */}
      <Dialog open={showOfertaDetail} onOpenChange={setShowOfertaDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedOferta?.nome_campanha}</DialogTitle>
          </DialogHeader>
          
          {selectedOferta && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="outline">
                  {format(new Date(selectedOferta.data_inicio), 'dd/MM', { locale: ptBR })} - {format(new Date(selectedOferta.data_fim), 'dd/MM/yyyy', { locale: ptBR })}
                </Badge>
                <Badge variant="secondary">
                  {TIPOS_OFERTA.find(t => t.value === selectedOferta.tipo)?.label}
                </Badge>
                <Badge variant="secondary">
                  {SETORES.find(s => s.value === selectedOferta.setor)?.label}
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">De</TableHead>
                      <TableHead className="text-right">Por</TableHead>
                      <TableHead className="text-right">Economia</TableHead>
                      <TableHead className="text-center">Destaque</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ofertaItens.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.nome_item}
                          {item.destaque && <Star className="h-4 w-4 text-warning fill-warning inline ml-1" />}
                        </TableCell>
                        <TableCell className="text-right line-through text-muted-foreground">
                          R$ {item.preco_venda_normal.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          R$ {item.preco_oferta.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-success">
                          {calcularEconomia(item.preco_venda_normal, item.preco_oferta).toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-center">
                          {item.destaque ? (
                            <Badge variant="default">SIM</Badge>
                          ) : (
                            <Badge variant="outline">NÃO</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => setShowOfertaDetail(false)}>
              Fechar
            </Button>
            {selectedOferta && (
              <>
                <Button variant="outline" onClick={() => {
                  setShowOfertaDetail(false);
                  editarOferta(selectedOferta);
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button onClick={() => {
                  setShowOfertaDetail(false);
                  gerarPDF(selectedOferta, false);
                }}>
                  <Download className="h-4 w-4 mr-2" />
                  PDF Completo
                </Button>
                <Button variant="secondary" onClick={() => {
                  setShowOfertaDetail(false);
                  gerarPDF(selectedOferta, true);
                }}>
                  <Users className="h-4 w-4 mr-2" />
                  PDF Marketing
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Preview */}
      {showPDFPreview && pdfOferta && (
        pdfOferta.setor === 'hortifruti' ? (
          <OfertasHortifrutiPDF
            oferta={pdfOferta}
            itens={pdfItens}
            onClose={() => setShowPDFPreview(false)}
          />
        ) : (
          <OfertasPDF
            oferta={pdfOferta}
            itens={pdfItens}
            onClose={() => setShowPDFPreview(false)}
            forMarketing={pdfForMarketing}
          />
        )
      )}
    </MainLayout>
  );
};

export default Ofertas;
