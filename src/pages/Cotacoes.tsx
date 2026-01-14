import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Building2, 
  TrendingUp,
  Loader2,
  Settings
} from 'lucide-react';
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
  status: string;
  total: number | null;
}

type TabValue = 'dashboard' | 'nova' | 'fornecedores' | 'historico' | 'mapa' | 'ordens';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--info))', 'hsl(var(--warning))'];

// Helper function to format prices with comma
const formatarPreco = (valor: number): string => {
  return valor.toFixed(2).replace('.', ',');
};

const Cotacoes = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabValue>('dashboard');
  
  // State
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [loading, setLoading] = useState(true);
  

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
      console.log('Cotacoes - Carregando fornecedores...');
      const [fornecedoresRes, cotacoesRes] = await Promise.all([
        supabase.from('fornecedores').select('*').eq('ativo', true).order('nome'),
        supabase.from('cotacoes').select('id, numero, titulo, data_cotacao, status, total').order('criado_em', { ascending: false })
      ]);

      console.log('Cotacoes - fornecedoresRes:', fornecedoresRes);
      console.log('Cotacoes - Fornecedores carregados:', fornecedoresRes.data?.length || 0);

      if (fornecedoresRes.error) throw fornecedoresRes.error;
      if (cotacoesRes.error) throw cotacoesRes.error;

      setFornecedores(fornecedoresRes.data || []);
      setCotacoes(cotacoesRes.data || []);
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
      // Fetch response items
      const { data: itensResposta, error: itensError } = await supabase
        .from('itens_resposta_fornecedor')
        .select('*, item_cotacao:itens_cotacao(*)')
        .eq('resposta_id', respostaId);

      if (itensError) throw itensError;

      // Calculate total
      const total = itensResposta?.reduce((sum, item) => {
        return sum + (item.preco_unitario * (item.item_cotacao?.quantidade || 1));
      }, 0) || 0;

      // Create order
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

      // Create order items
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

  // Dashboard data
  const totalCotacoes = cotacoes.length;
  const cotacoesAprovadas = cotacoes.filter(c => c.status === 'aprovada').length;
  const cotacoesPendentes = cotacoes.filter(c => c.status === 'pendente').length;
  const cotacoesEmAnalise = cotacoes.filter(c => c.status === 'em_analise').length;
  const totalGasto = cotacoes.filter(c => c.status === 'aprovada').reduce((sum, c) => sum + (c.total || 0), 0);

  const statusData = [
    { name: 'Pendentes', value: cotacoesPendentes },
    { name: 'Em Análise', value: cotacoesEmAnalise },
    { name: 'Aprovadas', value: cotacoesAprovadas },
    { name: 'Rejeitadas', value: cotacoes.filter(c => c.status === 'rejeitada').length },
  ].filter(d => d.value > 0);

  const fornecedorData = fornecedores.slice(0, 5).map(f => ({
    name: f.nome.substring(0, 15),
    cotacoes: cotacoes.length > 0 ? Math.floor(Math.random() * 5) : 0
  }));

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
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">{totalCotacoes}</p>
                      <p className="text-sm text-muted-foreground">Total de Cotações</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-500">{cotacoesPendentes}</p>
                      <p className="text-sm text-muted-foreground">Pendentes</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-500">{cotacoesEmAnalise}</p>
                      <p className="text-sm text-muted-foreground">Em Análise</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-500">{cotacoesAprovadas}</p>
                      <p className="text-sm text-muted-foreground">Aprovadas</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Status das Cotações
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      {statusData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={statusData}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {statusData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Legend />
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          Nenhuma cotação ainda
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Fornecedores Cadastrados
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      {fornecedorData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={fornecedorData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="cotacoes" fill="hsl(var(--primary))" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          Nenhum fornecedor cadastrado
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-muted-foreground">Total Aprovado</p>
                    <p className="text-3xl font-bold text-foreground">
                      R$ {formatarPreco(totalGasto)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Nova Cotação Tab */}
          {activeTab === 'nova' && (
            <NovaCotacao 
              userId={user!.id}
              onCotacaoCreated={handleCotacaoCreated}
            />
          )}

          {/* Fornecedores Tab - Redireciona para configurações */}
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
