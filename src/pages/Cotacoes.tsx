import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, differenceInDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Building2, 
  TrendingUp,
  Loader2,
  Settings,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Users,
  ArrowRight,
  DollarSign,
  TrendingDown,
  Timer,
  Percent,
  Plus,
  BarChart3,
  MapPin,
  FileDown
} from 'lucide-react';

// Components
import CotacaoHeader from '@/components/cotacoes/CotacaoHeader';
import CotacaoNavigation from '@/components/cotacoes/CotacaoNavigation';
import NovaCotacao from '@/components/cotacoes/NovaCotacao';
import HistoricoCotacoes from '@/components/cotacoes/HistoricoCotacoes';
import MapaPrecos from '@/components/cotacoes/MapaPrecos';
import OrdensCompra from '@/components/cotacoes/OrdensCompra';

interface Fornecedor {
  id: string;
  nome: string;
  cnpj: string | null;
  contato: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  observacao: string | null;
  ativo: boolean | null;
  criado_em: string | null;
}

interface Cotacao {
  id: string;
  numero: number;
  titulo: string | null;
  data_cotacao: string;
  data_limite_resposta: string | null;
  status: string;
  total: number | null;
}

interface ItemCotacao {
  id: string;
  cotacao_id: string;
  nome_produto: string;
  quantidade: number;
  codigo_barras: string | null;
}

interface RespostaFornecedor {
  id: string;
  cotacao_id: string;
  fornecedor_id: string;
  total_proposta: number | null;
  fornecedor?: Fornecedor;
}

interface ItemRespostaFornecedor {
  id: string;
  resposta_id: string;
  item_cotacao_id: string;
  preco_unitario: number;
}

interface DashboardStats {
  totalCotacoes: number;
  emAberto: number;
  aguardandoRespostas: number;
  finalizadas: number;
  economiaTotal: number;
  totalCompras: number;
}

interface CotacaoEmAndamento {
  id: string;
  numero: number;
  titulo: string;
  totalItens: number;
  fornecedoresConvidados: number;
  fornecedoresResponderam: number;
  diasRestantes: number;
  status: string;
}

interface ComparativoPreco {
  produto: string;
  cotacaoTitulo: string;
  menorPreco: number;
  maiorPreco: number;
  economia: number;
  economiaPercent: number;
  fornecedorVencedor: string;
}

interface ItemMaisCotado {
  nome: string;
  vezesCotado: number;
  precoMedio: number;
  precoMin: number;
  precoMax: number;
}

type TabValue = 'dashboard' | 'nova' | 'fornecedores' | 'historico' | 'mapa' | 'ordens';

// Helper function to format prices with comma
const formatarPreco = (valor: number): string => {
  return valor.toFixed(2).replace('.', ',');
};

const Cotacoes = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabValue>('dashboard');
  const [periodoFiltro, setPeriodoFiltro] = useState<'7d' | '30d' | '90d'>('30d');
  
  // State
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [itensCotacao, setItensCotacao] = useState<ItemCotacao[]>([]);
  const [respostas, setRespostas] = useState<RespostaFornecedor[]>([]);
  const [itensResposta, setItensResposta] = useState<ItemRespostaFornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dashboard computed data
  const [stats, setStats] = useState<DashboardStats>({
    totalCotacoes: 0,
    emAberto: 0,
    aguardandoRespostas: 0,
    finalizadas: 0,
    economiaTotal: 0,
    totalCompras: 0
  });
  const [cotacoesEmAndamento, setCotacoesEmAndamento] = useState<CotacaoEmAndamento[]>([]);
  const [comparativos, setComparativos] = useState<ComparativoPreco[]>([]);
  const [itensMaisCotados, setItensMaisCotados] = useState<ItemMaisCotado[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [user, periodoFiltro]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const dataLimite = subDays(new Date(), periodoFiltro === '7d' ? 7 : periodoFiltro === '30d' ? 30 : 90);
      
      const [
        fornecedoresRes, 
        cotacoesRes,
        itensRes,
        respostasRes,
        itensRespostaRes,
        ordensRes
      ] = await Promise.all([
        supabase.from('fornecedores').select('*').eq('ativo', true).order('nome'),
        supabase.from('cotacoes').select('id, numero, titulo, data_cotacao, data_limite_resposta, status, total')
          .gte('criado_em', dataLimite.toISOString())
          .order('criado_em', { ascending: false }),
        supabase.from('itens_cotacao').select('*'),
        supabase.from('respostas_fornecedor').select('*, fornecedor:fornecedores(*)'),
        supabase.from('itens_resposta_fornecedor').select('*'),
        supabase.from('ordens_compra').select('total, status')
          .gte('criado_em', dataLimite.toISOString())
      ]);

      if (fornecedoresRes.error) throw fornecedoresRes.error;
      if (cotacoesRes.error) throw cotacoesRes.error;
      if (itensRes.error) throw itensRes.error;
      if (respostasRes.error) throw respostasRes.error;
      if (itensRespostaRes.error) throw itensRespostaRes.error;

      const cotacoesData = cotacoesRes.data || [];
      const itensData = itensRes.data || [];
      const respostasData = respostasRes.data || [];
      const itensRespostaData = itensRespostaRes.data || [];
      const ordensData = ordensRes.data || [];

      setFornecedores(fornecedoresRes.data || []);
      setCotacoes(cotacoesData);
      setItensCotacao(itensData);
      setRespostas(respostasData);
      setItensResposta(itensRespostaData);

      // Calculate stats
      const emAberto = cotacoesData.filter(c => c.status === 'pendente').length;
      const aguardando = cotacoesData.filter(c => c.status === 'em_analise').length;
      const finalizadas = cotacoesData.filter(c => c.status === 'aprovada' || c.status === 'finalizada').length;
      const totalCompras = ordensData.reduce((sum, o) => sum + (o.total || 0), 0);

      // Calculate economia (difference between highest and lowest accepted proposals)
      let economiaTotal = 0;
      cotacoesData.filter(c => c.status === 'aprovada' || c.status === 'finalizada').forEach(cotacao => {
        const respostasCotacao = respostasData.filter(r => r.cotacao_id === cotacao.id);
        if (respostasCotacao.length > 1) {
          const totais = respostasCotacao.map(r => r.total_proposta || 0).filter(t => t > 0);
          if (totais.length > 1) {
            const max = Math.max(...totais);
            const min = Math.min(...totais);
            economiaTotal += (max - min);
          }
        }
      });

      setStats({
        totalCotacoes: cotacoesData.length,
        emAberto,
        aguardandoRespostas: aguardando,
        finalizadas,
        economiaTotal,
        totalCompras
      });

      // Calculate cotações em andamento
      const emAndamento: CotacaoEmAndamento[] = cotacoesData
        .filter(c => c.status === 'pendente' || c.status === 'em_analise')
        .slice(0, 5)
        .map(c => {
          const itens = itensData.filter(i => i.cotacao_id === c.id);
          const respostasCotacao = respostasData.filter(r => r.cotacao_id === c.id);
          const diasRestantes = c.data_limite_resposta 
            ? differenceInDays(new Date(c.data_limite_resposta), new Date())
            : 0;

          return {
            id: c.id,
            numero: c.numero,
            titulo: c.titulo || `Cotação #${c.numero}`,
            totalItens: itens.length,
            fornecedoresConvidados: respostasCotacao.length,
            fornecedoresResponderam: respostasCotacao.filter(r => r.total_proposta && r.total_proposta > 0).length,
            diasRestantes,
            status: c.status
          };
        });
      setCotacoesEmAndamento(emAndamento);

      // Calculate comparativo de preços (últimas cotações finalizadas)
      const comparativosData: ComparativoPreco[] = [];
      const finalizadasRecentes = cotacoesData
        .filter(c => c.status === 'aprovada' || c.status === 'finalizada')
        .slice(0, 5);

      for (const cotacao of finalizadasRecentes) {
        const itensCot = itensData.filter(i => i.cotacao_id === cotacao.id);
        const respostasCot = respostasData.filter(r => r.cotacao_id === cotacao.id && r.total_proposta);

        if (itensCot.length > 0 && respostasCot.length > 1) {
          const totais = respostasCot.map(r => ({ 
            total: r.total_proposta || 0, 
            fornecedor: (r.fornecedor as unknown as Fornecedor)?.nome || 'Fornecedor'
          })).filter(t => t.total > 0);

          if (totais.length > 1) {
            const sorted = totais.sort((a, b) => a.total - b.total);
            const menor = sorted[0];
            const maior = sorted[sorted.length - 1];
            const economia = maior.total - menor.total;
            const economiaPercent = (economia / maior.total) * 100;

            comparativosData.push({
              produto: itensCot[0].nome_produto + (itensCot.length > 1 ? ` +${itensCot.length - 1}` : ''),
              cotacaoTitulo: cotacao.titulo || `Cotação #${cotacao.numero}`,
              menorPreco: menor.total,
              maiorPreco: maior.total,
              economia,
              economiaPercent,
              fornecedorVencedor: menor.fornecedor
            });
          }
        }
      }
      setComparativos(comparativosData);

      // Calculate itens mais cotados
      const itemCount: Record<string, { count: number; precos: number[] }> = {};
      itensData.forEach(item => {
        const key = item.nome_produto;
        if (!itemCount[key]) {
          itemCount[key] = { count: 0, precos: [] };
        }
        itemCount[key].count++;
        
        // Get prices for this item
        const respostasIds = respostasData
          .filter(r => r.cotacao_id === item.cotacao_id)
          .map(r => r.id);
        
        itensRespostaData
          .filter(ir => ir.item_cotacao_id === item.id && respostasIds.includes(ir.resposta_id))
          .forEach(ir => {
            if (ir.preco_unitario > 0) {
              itemCount[key].precos.push(ir.preco_unitario);
            }
          });
      });

      const maisCotados: ItemMaisCotado[] = Object.entries(itemCount)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 8)
        .map(([nome, data]) => ({
          nome,
          vezesCotado: data.count,
          precoMedio: data.precos.length > 0 
            ? data.precos.reduce((a, b) => a + b, 0) / data.precos.length 
            : 0,
          precoMin: data.precos.length > 0 ? Math.min(...data.precos) : 0,
          precoMax: data.precos.length > 0 ? Math.max(...data.precos) : 0
        }));
      setItensMaisCotados(maisCotados);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleCotacaoCreated = () => {
    fetchData();
    setActiveTab('historico');
  };

  const handleGerarOrdem = async (cotacaoId: string, fornecedorId: string, respostaId: string) => {
    try {
      const { data: itensResposta, error: itensError } = await supabase
        .from('itens_resposta_fornecedor')
        .select('*, item_cotacao:itens_cotacao(*)')
        .eq('resposta_id', respostaId);

      if (itensError) throw itensError;

      const total = itensResposta?.reduce((sum, item) => {
        return sum + (item.preco_unitario * (item.item_cotacao?.quantidade || 1));
      }, 0) || 0;

      const { data: ordem, error: ordemError } = await supabase
        .from('ordens_compra')
        .insert({
          cotacao_id: cotacaoId,
          fornecedor_id: fornecedorId,
          resposta_id: respostaId,
          total,
          usuario_id: user!.id,
          status: 'rascunho'
        })
        .select()
        .single();

      if (ordemError) throw ordemError;

      const itensOrdem = itensResposta?.map(item => ({
        ordem_compra_id: ordem.id,
        item_cotacao_id: item.item_cotacao_id,
        codigo_barras: item.item_cotacao?.codigo_barras,
        nome_produto: item.item_cotacao?.nome_produto || '',
        quantidade: item.item_cotacao?.quantidade || 1,
        preco_unitario: item.preco_unitario
      }));

      if (itensOrdem && itensOrdem.length > 0) {
        const { error: itensOrdemError } = await supabase
          .from('itens_ordem_compra')
          .insert(itensOrdem);

        if (itensOrdemError) throw itensOrdemError;
      }

      toast.success('Ordem de compra gerada!');
      setActiveTab('ordens');
    } catch (error) {
      console.error('Erro ao gerar ordem:', error);
      toast.error('Erro ao gerar ordem de compra');
    }
  };

  const getStatusBadge = (status: string, diasRestantes?: number) => {
    if (status === 'pendente') {
      if (diasRestantes !== undefined && diasRestantes < 0) {
        return <Badge variant="destructive" className="text-xs">Vencida</Badge>;
      }
      if (diasRestantes !== undefined && diasRestantes <= 2) {
        return <Badge className="bg-amber-500 text-white text-xs">Urgente</Badge>;
      }
      return <Badge className="bg-blue-500 text-white text-xs">Pendente</Badge>;
    }
    if (status === 'em_analise') {
      return <Badge className="bg-purple-500 text-white text-xs">Análise</Badge>;
    }
    if (status === 'aprovada' || status === 'finalizada') {
      return <Badge className="bg-green-500 text-white text-xs">Finalizada</Badge>;
    }
    if (status === 'rejeitada') {
      return <Badge variant="destructive" className="text-xs">Rejeitada</Badge>;
    }
    if (status === 'cancelada') {
      return <Badge variant="secondary" className="text-xs">Cancelada</Badge>;
    }
    return <Badge variant="secondary" className="text-xs">{status}</Badge>;
  };

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
      <div className="space-y-4 md:space-y-6 p-2 md:p-0">
        {/* Header */}
        <CotacaoHeader />

        {/* Navigation */}
        <CotacaoNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Content */}
        <div className="min-h-[400px]">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-4 md:space-y-6">
              {/* Period Filter and Actions */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex gap-2">
                  {(['7d', '30d', '90d'] as const).map(periodo => (
                    <Button
                      key={periodo}
                      variant={periodoFiltro === periodo ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPeriodoFiltro(periodo)}
                    >
                      {periodo === '7d' ? '7 dias' : periodo === '30d' ? '30 dias' : '90 dias'}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setActiveTab('nova')} className="gap-2">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Nova Cotação</span>
                  </Button>
                  <Button variant="outline" onClick={() => setActiveTab('mapa')} className="gap-2">
                    <MapPin className="w-4 h-4" />
                    <span className="hidden sm:inline">Mapa de Preços</span>
                  </Button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
                <Card className="col-span-1">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.totalCotacoes}</p>
                        <p className="text-xs text-muted-foreground">Cotações</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="col-span-1">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <Clock className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-500">{stats.emAberto}</p>
                        <p className="text-xs text-muted-foreground">Em Aberto</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="col-span-1">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/10">
                        <Timer className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-amber-500">{stats.aguardandoRespostas}</p>
                        <p className="text-xs text-muted-foreground">Em Análise</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="col-span-1">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-500">{stats.finalizadas}</p>
                        <p className="text-xs text-muted-foreground">Finalizadas</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="col-span-1">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10">
                        <TrendingDown className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-emerald-500">R$ {formatarPreco(stats.economiaTotal)}</p>
                        <p className="text-xs text-muted-foreground">Economia</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="col-span-1">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/10">
                        <DollarSign className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-purple-500">R$ {formatarPreco(stats.totalCompras)}</p>
                        <p className="text-xs text-muted-foreground">Compras</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                {/* Cotações em Andamento */}
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" />
                        Cotações em Andamento
                      </CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => setActiveTab('historico')}>
                        Ver todas <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {cotacoesEmAndamento.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <FileText className="w-10 h-10 mb-2 opacity-50" />
                        <p className="text-sm">Nenhuma cotação em andamento</p>
                        <Button variant="link" size="sm" onClick={() => setActiveTab('nova')}>
                          Criar nova cotação
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {cotacoesEmAndamento.map(cotacao => (
                          <div 
                            key={cotacao.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm truncate">{cotacao.titulo}</span>
                                {getStatusBadge(cotacao.status, cotacao.diasRestantes)}
                              </div>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Package className="w-3 h-3" />
                                  {cotacao.totalItens} itens
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {cotacao.fornecedoresResponderam}/{cotacao.fornecedoresConvidados} respostas
                                </span>
                                {cotacao.diasRestantes !== undefined && cotacao.diasRestantes >= 0 && (
                                  <span className="flex items-center gap-1">
                                    <Timer className="w-3 h-3" />
                                    {cotacao.diasRestantes === 0 ? 'Hoje' : `${cotacao.diasRestantes}d restantes`}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="shrink-0">
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Itens Mais Cotados */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      Itens Mais Cotados
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {itensMaisCotados.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Package className="w-10 h-10 mb-2 opacity-50" />
                        <p className="text-sm">Nenhum item cotado ainda</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[280px]">
                        <div className="space-y-2">
                          {itensMaisCotados.map((item, idx) => (
                            <div 
                              key={item.nome}
                              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="text-xs font-medium text-muted-foreground w-5">
                                  {idx + 1}º
                                </span>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{item.nome}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.vezesCotado}x cotado
                                  </p>
                                </div>
                              </div>
                              {item.precoMedio > 0 && (
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-medium">R$ {formatarPreco(item.precoMedio)}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatarPreco(item.precoMin)} - {formatarPreco(item.precoMax)}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Comparativo de Preços */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      Comparativo de Preços - Últimas Cotações
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {comparativos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <TrendingUp className="w-10 h-10 mb-2 opacity-50" />
                      <p className="text-sm">Nenhum comparativo disponível</p>
                      <p className="text-xs">Finalize cotações com múltiplas propostas</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Cotação</TableHead>
                            <TableHead className="text-right">Menor Preço</TableHead>
                            <TableHead className="text-right">Maior Preço</TableHead>
                            <TableHead className="text-right">Economia</TableHead>
                            <TableHead>Fornecedor Vencedor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {comparativos.map((comp, idx) => (
                            <TableRow key={idx}>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-sm">{comp.cotacaoTitulo}</p>
                                  <p className="text-xs text-muted-foreground">{comp.produto}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="text-green-600 font-medium">
                                  R$ {formatarPreco(comp.menorPreco)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                R$ {formatarPreco(comp.maiorPreco)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <span className="text-emerald-600 font-medium">
                                    R$ {formatarPreco(comp.economia)}
                                  </span>
                                  <Badge variant="outline" className="text-emerald-600 border-emerald-600">
                                    -{comp.economiaPercent.toFixed(0)}%
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                  <span className="text-sm">{comp.fornecedorVencedor}</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <Building2 className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{fornecedores.length}</p>
                          <p className="text-sm text-muted-foreground">Fornecedores Ativos</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setActiveTab('fornecedores')}>
                        Gerenciar
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-500/10">
                          <Percent className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-green-500">
                            {stats.totalCompras > 0 
                              ? ((stats.economiaTotal / stats.totalCompras) * 100).toFixed(1) 
                              : '0'}%
                          </p>
                          <p className="text-sm text-muted-foreground">Economia Média</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setActiveTab('mapa')}>
                        Ver Mapa
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Nova Cotação Tab */}
          {activeTab === 'nova' && (
            <NovaCotacao 
              userId={user!.id}
              onCotacaoCreated={handleCotacaoCreated}
            />
          )}

          {/* Fornecedores Tab */}
          {activeTab === 'fornecedores' && (
            <div className="space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/configuracoes-email')}
                  className="flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Configurar Emails
                </Button>
                <Button 
                  onClick={() => navigate('/sistema')}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Gerenciar Fornecedores
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Fornecedores Ativos ({fornecedores.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>CNPJ</TableHead>
                          <TableHead>Contato</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>Email</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fornecedores.map((f) => (
                          <TableRow key={f.id}>
                            <TableCell className="font-medium">{f.nome}</TableCell>
                            <TableCell>{f.cnpj || '-'}</TableCell>
                            <TableCell>{f.contato || '-'}</TableCell>
                            <TableCell>{f.telefone || '-'}</TableCell>
                            <TableCell>{f.email || '-'}</TableCell>
                          </TableRow>
                        ))}
                        {fornecedores.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              Nenhum fornecedor cadastrado. 
                              <Button variant="link" onClick={() => navigate('/sistema')} className="px-1">
                                Clique aqui para cadastrar
                              </Button>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Histórico/Cotações Tab */}
          {activeTab === 'historico' && (
            <HistoricoCotacoes onRefresh={fetchData} />
          )}

          {/* Mapa de Preços Tab */}
          {activeTab === 'mapa' && (
            <MapaPrecos onGerarOrdem={handleGerarOrdem} />
          )}

          {/* Ordens de Compra Tab */}
          {activeTab === 'ordens' && (
            <OrdensCompra />
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Cotacoes;
