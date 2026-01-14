import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  TrendingDown, 
  ClipboardList, 
  FileText,
  Loader2,
  Apple,
  BarChart3
} from 'lucide-react';
import LossCart from '@/components/losses/LossCart';
import LaunchList, { Launch } from '@/components/losses/LaunchList';
import HortifrutiDashboard from '@/components/hortifruti/HortifrutiDashboard';

interface Product {
  id: string;
  nome_produto: string;
  quantidade_estoque: number;
  unidade_medida: string;
  preco_unitario: number;
  preco_venda: number | null;
}

// Helper function to format prices with comma
const formatarPreco = (valor: number): string => {
  return valor.toFixed(2).replace('.', ',');
};

const Hortifruti = () => {
  const [activeTab, setActiveTab] = useState('perdas');
  const [products, setProducts] = useState<Product[]>([]);
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [loading, setLoading] = useState(true);
  const { userRole, loading: authLoading } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch products from ESTOQUE with subgrupo HORTIFRUTI
      const { data: estoqueData, error: estoqueError } = await supabase
        .from('estoque')
        .select('id, nome, estoque_atual, unidade, preco_custo, preco_venda')
        .or('subgrupo.ilike.%hortifruti%,subgrupo.ilike.%horti%')
        .eq('ativo', true)
        .order('nome');
      
      if (estoqueError) {
        console.error('Erro ao buscar produtos do estoque:', estoqueError);
      }
      
      console.log('Produtos hortifruti carregados:', estoqueData?.length);
      
      // Transform estoque data to Product format
      if (estoqueData) {
        const transformedProducts: Product[] = estoqueData.map(item => ({
          id: item.id,
          nome_produto: item.nome,
          quantidade_estoque: item.estoque_atual,
          unidade_medida: item.unidade || 'UN',
          preco_unitario: item.preco_custo,
          preco_venda: item.preco_venda
        }));
        setProducts(transformedProducts);
      }

      // Fetch launches with counts
      const { data: launchesData } = await supabase
        .from('lancamentos')
        .select('*')
        .order('numero', { ascending: false })
        .limit(50);

      if (launchesData) {
        const launchesWithCounts = await Promise.all(
          launchesData.map(async (launch) => {
            const { data: perdasData } = await supabase
              .from('perdas')
              .select('valor_perda')
              .eq('lancamento_id', launch.id);

            const { data: profileData } = await supabase
              .from('profiles')
              .select('nome')
              .eq('id', launch.usuario_id)
              .single();

            return {
              ...launch,
              profiles: profileData || undefined,
              items_count: perdasData?.length || 0,
              total_value: perdasData?.reduce((acc, p) => acc + (p.valor_perda || 0), 0) || 0,
            } as Launch;
          })
        );
        setLaunches(launchesWithCounts);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  const isAdmin = userRole === 'administrador';

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header clicável - estilo moderno */}
        <button 
          onClick={() => setActiveTab('perdas')}
          className="w-full text-center p-4 rounded-xl bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center justify-center gap-3">
            <Apple className="w-8 h-8" />
            HORTIFRÚTI
          </h1>
          <p className="text-white/80 text-sm mt-1">COMERCIAL COSTA</p>
        </button>

        {/* Navigation Tabs - estilo moderno com gradientes */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full h-auto gap-2 bg-transparent p-0 ${isAdmin ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1'}`}>
            <TabsTrigger 
              value="perdas"
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 bg-gradient-to-br from-red-500 to-red-600 data-[state=active]:ring-2 data-[state=active]:ring-white/40 data-[state=active]:shadow-lg data-[state=active]:scale-[1.02] data-[state=inactive]:opacity-80 hover:opacity-100"
            >
              <TrendingDown className="w-5 h-5" />
              <span className="text-sm">LANÇAR PERDA</span>
            </TabsTrigger>
            
            {isAdmin && (
              <>
                <TabsTrigger 
                  value="dashboard"
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 bg-gradient-to-br from-emerald-500 to-emerald-600 data-[state=active]:ring-2 data-[state=active]:ring-white/40 data-[state=active]:shadow-lg data-[state=active]:scale-[1.02] data-[state=inactive]:opacity-80 hover:opacity-100"
                >
                  <BarChart3 className="w-5 h-5" />
                  <span className="text-sm">DASHBOARD</span>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="lancamentos"
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 bg-gradient-to-br from-purple-500 to-purple-600 data-[state=active]:ring-2 data-[state=active]:ring-white/40 data-[state=active]:shadow-lg data-[state=active]:scale-[1.02] data-[state=inactive]:opacity-80 hover:opacity-100"
                >
                  <ClipboardList className="w-5 h-5" />
                  <span className="text-sm">LANÇAMENTOS</span>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="relatorios"
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 bg-gradient-to-br from-orange-500 to-orange-600 data-[state=active]:ring-2 data-[state=active]:ring-white/40 data-[state=active]:shadow-lg data-[state=active]:scale-[1.02] data-[state=inactive]:opacity-80 hover:opacity-100"
                >
                  <FileText className="w-5 h-5" />
                  <span className="text-sm">RELATÓRIOS</span>
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Content */}
          <div className="mt-6">
            <TabsContent value="perdas" className="mt-0 space-y-0">
              <LossCart products={products} onSuccess={fetchData} />
            </TabsContent>
            
            {isAdmin && (
              <>
                <TabsContent value="dashboard" className="mt-0 space-y-0">
                  <HortifrutiDashboard />
                </TabsContent>
                
                <TabsContent value="lancamentos" className="mt-0 space-y-0">
                  <LaunchList launches={launches} onRefresh={fetchData} />
                </TabsContent>
                
                <TabsContent value="relatorios" className="mt-0 space-y-0">
                  <ReportsSection />
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      </div>
    </MainLayout>
  );
};

// Reports Section Component
const ReportsSection = () => {
  const [perdas, setPerdas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerdas();
  }, []);

  const fetchPerdas = async () => {
    try {
      const { data, error } = await supabase
        .from('perdas')
        .select(`
          *,
          estoque(nome, unidade),
          lancamentos(numero)
        `)
        .order('data_perda', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      setPerdas(data || []);
    } catch (error) {
      console.error('Erro ao buscar perdas:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPerdas = perdas.reduce((acc, p) => acc + (p.valor_perda || 0), 0);
  const perdasPorMotivo = perdas.reduce((acc: any, p) => {
    acc[p.motivo_perda] = (acc[p.motivo_perda] || 0) + (p.valor_perda || 0);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total de Perdas</p>
              <p className="text-2xl font-bold text-destructive">R$ {formatarPreco(totalPerdas)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Registros</p>
              <p className="text-2xl font-bold">{perdas.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Principal Motivo</p>
              <p className="text-2xl font-bold capitalize">
                {Object.entries(perdasPorMotivo).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || '-'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Losses */}
      <Card>
        <CardHeader>
          <CardTitle>Últimas Perdas Registradas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead className="text-right">Qtd/Peso</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perdas.slice(0, 20).map(perda => (
                <TableRow key={perda.id}>
                  <TableCell>
                    {format(new Date(perda.data_perda + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="font-medium">{perda.estoque?.nome || 'Produto não encontrado'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{perda.motivo_perda}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {perda.quantidade_perdida || perda.peso_perdido || 0} {perda.estoque?.unidade || 'UN'}
                  </TableCell>
                  <TableCell className="text-right text-destructive font-medium">
                    R$ {formatarPreco(perda.valor_perda || 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Hortifruti;
