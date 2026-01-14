import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/layout/MainLayout';
import StatCard from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Leaf, 
  Cherry, 
  Wine, 
  AlertTriangle, 
  Tag, 
  Receipt,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Package,
  ShoppingCart,
  BarChart3,
  ExternalLink
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type SectorType = 'geral' | 'hortifruti' | 'supermercado' | 'polpas' | 'coca' | 'cotacoes' | 'ofertas';

interface SectorStats {
  hortifruti: {
    perdasHoje: number;
    perdasMes: number;
    valorPerdasMes: number;
    tendencia: number[];
  };
  supermercado: {
    perdasHoje: number;
    perdasMes: number;
    valorPerdasMes: number;
    tendencia: number[];
  };
  polpas: {
    estoqueTotal: number;
    estoqueBaixo: number;
  };
  coca: {
    estoqueTotal: number;
    estoqueBaixo: number;
  };
  cotacoes: {
    pendentes: number;
    emAnalise: number;
    finalizadas: number;
    tendencia: number[];
  };
  ofertas: {
    ativas: number;
    expiradas: number;
  };
}

interface SectorButton {
  id: SectorType;
  label: string;
  icon: typeof BarChart3;
  color: string;
  href: string;
}

const sectorButtons: SectorButton[] = [
  { id: 'geral', label: 'Visão Geral', icon: BarChart3, color: 'bg-primary', href: '' },
  { id: 'hortifruti', label: 'Hortifrúti', icon: Leaf, color: 'bg-green-500', href: '/hortifruti' },
  { id: 'supermercado', label: 'Supermercado', icon: AlertTriangle, color: 'bg-red-500', href: '/perdas-geral' },
  { id: 'polpas', label: 'Polpas', icon: Cherry, color: 'bg-pink-500', href: '/polpas' },
  { id: 'coca', label: 'Coca-Cola', icon: Wine, color: 'bg-rose-600', href: '/coca' },
  { id: 'cotacoes', label: 'Cotações', icon: Receipt, color: 'bg-blue-500', href: '/cotacoes' },
  { id: 'ofertas', label: 'Ofertas', icon: Tag, color: 'bg-orange-500', href: '/ofertas' },
];

const DashboardGeral = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedSector, setSelectedSector] = useState<SectorType>('geral');
  const [stats, setStats] = useState<SectorStats>({
    hortifruti: { perdasHoje: 0, perdasMes: 0, valorPerdasMes: 0, tendencia: [] },
    supermercado: { perdasHoje: 0, perdasMes: 0, valorPerdasMes: 0, tendencia: [] },
    polpas: { estoqueTotal: 0, estoqueBaixo: 0 },
    coca: { estoqueTotal: 0, estoqueBaixo: 0 },
    cotacoes: { pendentes: 0, emAnalise: 0, finalizadas: 0, tendencia: [] },
    ofertas: { ativas: 0, expiradas: 0 },
  });
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      const monthAgo = format(subDays(today, 30), 'yyyy-MM-dd');
      const sixMonthsAgo = format(subMonths(today, 6), 'yyyy-MM-dd');

      // Fetch hortifruti losses - from estoque table
      const { data: hortifrutiLosses } = await supabase
        .from('perdas')
        .select(`
          peso_perdido,
          quantidade_perdida,
          data_perda,
          lancamento_id,
          estoque (preco_custo, unidade),
          lancamentos (status)
        `)
        .gte('data_perda', sixMonthsAgo);

      const filteredHortiLosses = hortifrutiLosses?.filter((loss: any) => {
        if (!loss.lancamento_id) return true;
        return loss.lancamentos?.status === 'normal';
      }) || [];

      // Fetch supermercado losses
      const { data: superLosses } = await supabase
        .from('perdas_geral')
        .select(`
          quantidade_perdida,
          preco_unitario,
          data_perda,
          lancamento_id,
          lancamentos_perdas_geral (status)
        `)
        .gte('data_perda', sixMonthsAgo);

      const filteredSuperLosses = superLosses?.filter((loss: any) => {
        if (!loss.lancamento_id) return true;
        return loss.lancamentos_perdas_geral?.status === 'normal';
      }) || [];

      // Fetch polpas stock
      const { data: polpasData } = await supabase
        .from('polpas')
        .select('quantidade_estoque, estoque_minimo');

      // Fetch coca stock
      const { data: cocaData } = await supabase
        .from('produtos_coca')
        .select('quantidade_estoque, estoque_minimo');

      // Fetch cotações
      const { data: cotacoesData } = await supabase
        .from('cotacoes')
        .select('status, criado_em');

      // Fetch ofertas
      const { data: ofertasData } = await supabase
        .from('ofertas')
        .select('status, data_fim');

      // Calculate stats
      let hortiHoje = 0, hortiMes = 0, hortiValorMes = 0;
      filteredHortiLosses.forEach((loss: any) => {
        const isKg = loss.estoque?.unidade === 'kg' || loss.estoque?.unidade === 'KG';
        const amount = isKg ? (loss.peso_perdido || 0) : (loss.quantidade_perdida || 0);
        const value = amount * (loss.estoque?.preco_custo || 0);
        
        if (loss.data_perda === todayStr) hortiHoje += amount;
        if (loss.data_perda >= monthAgo) {
          hortiMes += amount;
          hortiValorMes += value;
        }
      });

      let superHoje = 0, superMes = 0, superValorMes = 0;
      filteredSuperLosses.forEach((loss: any) => {
        const amount = loss.quantidade_perdida || 0;
        const value = amount * (loss.preco_unitario || 0);
        
        if (loss.data_perda === todayStr) superHoje += amount;
        if (loss.data_perda >= monthAgo) {
          superMes += amount;
          superValorMes += value;
        }
      });

      const polpasTotal = polpasData?.reduce((sum, p) => sum + (p.quantidade_estoque || 0), 0) || 0;
      const polpasBaixo = polpasData?.filter(p => (p.quantidade_estoque || 0) <= (p.estoque_minimo || 0)).length || 0;

      const cocaTotal = cocaData?.reduce((sum, p) => sum + (p.quantidade_estoque || 0), 0) || 0;
      const cocaBaixo = cocaData?.filter(p => (p.quantidade_estoque || 0) <= (p.estoque_minimo || 0)).length || 0;

      const cotPendentes = cotacoesData?.filter(c => c.status === 'pendente').length || 0;
      const cotEmAnalise = cotacoesData?.filter(c => c.status === 'em_analise').length || 0;
      const cotFinalizadas = cotacoesData?.filter(c => c.status === 'finalizada').length || 0;

      const ofertasAtivas = ofertasData?.filter(o => o.status === 'ativa' || new Date(o.data_fim) >= today).length || 0;
      const ofertasExpiradas = ofertasData?.filter(o => o.status === 'expirada' || new Date(o.data_fim) < today).length || 0;

      // Calculate monthly comparison data and trends (last 3 months)
      const monthly = [];
      const hortiTendencia: number[] = [];
      const superTendencia: number[] = [];
      const cotTendencia: number[] = [];
      
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(today, i);
        const monthStart = format(startOfMonth(monthDate), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd');
        
        let hortiLoss = 0, superLoss = 0;
        
        filteredHortiLosses.filter((l: any) => l.data_perda >= monthStart && l.data_perda <= monthEnd)
          .forEach((loss: any) => {
            const isKg = loss.estoque?.unidade === 'kg' || loss.estoque?.unidade === 'KG';
            const amount = isKg ? (loss.peso_perdido || 0) : (loss.quantidade_perdida || 0);
            hortiLoss += amount * (loss.estoque?.preco_custo || 0);
          });
        
        filteredSuperLosses.filter((l: any) => l.data_perda >= monthStart && l.data_perda <= monthEnd)
          .forEach((loss: any) => {
            superLoss += (loss.quantidade_perdida || 0) * (loss.preco_unitario || 0);
          });

        const cotCount = cotacoesData?.filter(c => {
          const createdAt = c.criado_em?.substring(0, 10);
          return createdAt && createdAt >= monthStart && createdAt <= monthEnd;
        }).length || 0;
        
        monthly.push({
          month: format(monthDate, 'MMM', { locale: ptBR }),
          hortifruti: hortiLoss,
          supermercado: superLoss,
          total: hortiLoss + superLoss,
        });

        // Last 3 months for trend
        if (i <= 2) {
          hortiTendencia.push(hortiLoss);
          superTendencia.push(superLoss);
          cotTendencia.push(cotCount);
        }
      }
      setMonthlyData(monthly);

      // Trend data for line chart (last 3 months)
      const trendMonths = [];
      for (let i = 2; i >= 0; i--) {
        const monthDate = subMonths(today, i);
        const monthStart = format(startOfMonth(monthDate), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd');
        
        let hortiLoss = 0, superLoss = 0;
        
        filteredHortiLosses.filter((l: any) => l.data_perda >= monthStart && l.data_perda <= monthEnd)
          .forEach((loss: any) => {
            const isKg = loss.estoque?.unidade === 'kg' || loss.estoque?.unidade === 'KG';
            const amount = isKg ? (loss.peso_perdido || 0) : (loss.quantidade_perdida || 0);
            hortiLoss += amount * (loss.estoque?.preco_custo || 0);
          });
        
        filteredSuperLosses.filter((l: any) => l.data_perda >= monthStart && l.data_perda <= monthEnd)
          .forEach((loss: any) => {
            superLoss += (loss.quantidade_perdida || 0) * (loss.preco_unitario || 0);
          });

        const cotCount = cotacoesData?.filter(c => {
          const createdAt = c.criado_em?.substring(0, 10);
          return createdAt && createdAt >= monthStart && createdAt <= monthEnd;
        }).length || 0;
        
        trendMonths.push({
          month: format(monthDate, 'MMM/yy', { locale: ptBR }),
          hortifruti: hortiLoss,
          supermercado: superLoss,
          cotacoes: cotCount,
        });
      }
      setTrendData(trendMonths);

      setStats({
        hortifruti: { perdasHoje: hortiHoje, perdasMes: hortiMes, valorPerdasMes: hortiValorMes, tendencia: hortiTendencia },
        supermercado: { perdasHoje: superHoje, perdasMes: superMes, valorPerdasMes: superValorMes, tendencia: superTendencia },
        polpas: { estoqueTotal: polpasTotal, estoqueBaixo: polpasBaixo },
        coca: { estoqueTotal: cocaTotal, estoqueBaixo: cocaBaixo },
        cotacoes: { pendentes: cotPendentes, emAnalise: cotEmAnalise, finalizadas: cotFinalizadas, tendencia: cotTendencia },
        ofertas: { ativas: ofertasAtivas, expiradas: ofertasExpiradas },
      });

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPerdasMes = stats.hortifruti.valorPerdasMes + stats.supermercado.valorPerdasMes;
  
  const pieData = [
    { name: 'Hortifrúti', value: stats.hortifruti.valorPerdasMes, color: 'hsl(142, 76%, 36%)' },
    { name: 'Supermercado', value: stats.supermercado.valorPerdasMes, color: 'hsl(0, 84%, 60%)' },
  ].filter(d => d.value > 0);

  const calculateTrend = (values: number[]) => {
    if (values.length < 2) return 0;
    const last = values[values.length - 1];
    const prev = values[values.length - 2];
    if (prev === 0) return last > 0 ? 100 : 0;
    return ((last - prev) / prev) * 100;
  };

  const SectorCard = ({ 
    title, 
    icon: Icon, 
    color, 
    href, 
    children 
  }: { 
    title: string; 
    icon: typeof Leaf; 
    color: string; 
    href: string; 
    children: React.ReactNode 
  }) => (
    <Card className={cn("border-l-4", color.replace('bg-', 'border-l-'))}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Icon className={cn("w-5 h-5", color.replace('bg-', 'text-'))} />
            {title}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(href)}
            className="gap-1 text-xs"
          >
            Ver detalhes
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {children}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  const renderGeralView = () => (
    <div className="space-y-6">
      {/* Resumo Geral */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Perdas Totais (Mês)"
          value={`R$ ${totalPerdasMes.toFixed(2)}`}
          icon={<DollarSign className="w-6 h-6" />}
          variant="destructive"
        />
        <StatCard
          title="Cotações Pendentes"
          value={stats.cotacoes.pendentes}
          icon={<Receipt className="w-6 h-6" />}
          variant="primary"
        />
        <StatCard
          title="Ofertas Ativas"
          value={stats.ofertas.ativas}
          icon={<Tag className="w-6 h-6" />}
          variant="secondary"
        />
        <StatCard
          title="Itens Estoque Baixo"
          value={stats.polpas.estoqueBaixo + stats.coca.estoqueBaixo}
          icon={<Package className="w-6 h-6" />}
        />
      </div>

      {/* Trend Chart - Last 3 Months */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Tendência dos Últimos 3 Meses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'cotacoes') return [value, 'Cotações'];
                    return [`R$ ${value.toFixed(2)}`, name];
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="hortifruti" 
                  name="Hortifrúti" 
                  stroke="hsl(142, 76%, 36%)" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(142, 76%, 36%)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="supermercado" 
                  name="Supermercado" 
                  stroke="hsl(0, 84%, 60%)" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(0, 84%, 60%)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Comparativo de Perdas por Setor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Perdas por Setor (Mês)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Nenhuma perda registrada
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Evolução Mensal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Evolução Mensal de Perdas (R$)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string) => [`R$ ${value.toFixed(2)}`, name]}
                  />
                  <Bar dataKey="hortifruti" name="Hortifrúti" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="supermercado" name="Supermercado" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards por Setor */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Hortifrúti */}
        <SectorCard title="Hortifrúti" icon={Leaf} color="bg-green-500" href="/hortifruti">
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">Perdas hoje</span>
            <span className="font-medium">{stats.hortifruti.perdasHoje.toFixed(2)} kg</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">Perdas mês</span>
            <span className="font-medium">{stats.hortifruti.perdasMes.toFixed(2)} kg</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">Valor perdido</span>
            <span className="font-medium text-destructive">R$ {stats.hortifruti.valorPerdasMes.toFixed(2)}</span>
          </div>
          {stats.hortifruti.tendencia.length >= 2 && (
            <div className="pt-2 border-t mt-2">
              <div className="flex items-center gap-1 text-xs">
                {calculateTrend(stats.hortifruti.tendencia) > 0 ? (
                  <TrendingUp className="w-3 h-3 text-destructive" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-green-500" />
                )}
                <span className={calculateTrend(stats.hortifruti.tendencia) > 0 ? 'text-destructive' : 'text-green-500'}>
                  {Math.abs(calculateTrend(stats.hortifruti.tendencia)).toFixed(1)}% vs mês anterior
                </span>
              </div>
            </div>
          )}
        </SectorCard>

        {/* Supermercado */}
        <SectorCard title="Supermercado" icon={AlertTriangle} color="bg-red-500" href="/perdas-geral">
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">Perdas hoje</span>
            <span className="font-medium">{stats.supermercado.perdasHoje} un</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">Perdas mês</span>
            <span className="font-medium">{stats.supermercado.perdasMes} un</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">Valor perdido</span>
            <span className="font-medium text-destructive">R$ {stats.supermercado.valorPerdasMes.toFixed(2)}</span>
          </div>
          {stats.supermercado.tendencia.length >= 2 && (
            <div className="pt-2 border-t mt-2">
              <div className="flex items-center gap-1 text-xs">
                {calculateTrend(stats.supermercado.tendencia) > 0 ? (
                  <TrendingUp className="w-3 h-3 text-destructive" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-green-500" />
                )}
                <span className={calculateTrend(stats.supermercado.tendencia) > 0 ? 'text-destructive' : 'text-green-500'}>
                  {Math.abs(calculateTrend(stats.supermercado.tendencia)).toFixed(1)}% vs mês anterior
                </span>
              </div>
            </div>
          )}
        </SectorCard>

        {/* Polpas */}
        <SectorCard title="Polpas" icon={Cherry} color="bg-pink-500" href="/polpas">
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">Estoque total</span>
            <span className="font-medium">{stats.polpas.estoqueTotal} un</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">Estoque baixo</span>
            <span className={cn("font-medium", stats.polpas.estoqueBaixo > 0 && "text-destructive")}>
              {stats.polpas.estoqueBaixo} itens
            </span>
          </div>
        </SectorCard>

        {/* Coca-Cola */}
        <SectorCard title="Coca-Cola" icon={Wine} color="bg-rose-600" href="/coca">
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">Estoque total</span>
            <span className="font-medium">{stats.coca.estoqueTotal} un</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">Estoque baixo</span>
            <span className={cn("font-medium", stats.coca.estoqueBaixo > 0 && "text-destructive")}>
              {stats.coca.estoqueBaixo} itens
            </span>
          </div>
        </SectorCard>

        {/* Cotações */}
        <SectorCard title="Cotações" icon={Receipt} color="bg-blue-500" href="/cotacoes">
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">Pendentes</span>
            <span className={cn("font-medium", stats.cotacoes.pendentes > 0 && "text-amber-500")}>
              {stats.cotacoes.pendentes}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">Em análise</span>
            <span className="font-medium text-blue-500">{stats.cotacoes.emAnalise}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">Finalizadas</span>
            <span className="font-medium text-green-500">{stats.cotacoes.finalizadas}</span>
          </div>
        </SectorCard>

        {/* Ofertas */}
        <SectorCard title="Ofertas" icon={Tag} color="bg-orange-500" href="/ofertas">
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">Ativas</span>
            <span className="font-medium text-green-500">{stats.ofertas.ativas}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">Expiradas</span>
            <span className="font-medium text-muted-foreground">{stats.ofertas.expiradas}</span>
          </div>
        </SectorCard>
      </div>
    </div>
  );

  const renderSectorView = () => {
    const sector = sectorButtons.find(s => s.id === selectedSector);
    
    const SectorHeader = () => (
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">{sector?.label}</h2>
        {sector?.href && (
          <Button onClick={() => navigate(sector.href)} className="gap-2">
            <ExternalLink className="w-4 h-4" />
            Ir para {sector.label}
          </Button>
        )}
      </div>
    );

    switch (selectedSector) {
      case 'hortifruti':
        return (
          <div className="space-y-6">
            <SectorHeader />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                title="Perdas Hoje"
                value={`${stats.hortifruti.perdasHoje.toFixed(2)} kg`}
                icon={<TrendingDown className="w-6 h-6" />}
                variant="destructive"
              />
              <StatCard
                title="Perdas no Mês"
                value={`${stats.hortifruti.perdasMes.toFixed(2)} kg`}
                icon={<TrendingDown className="w-6 h-6" />}
              />
              <StatCard
                title="Valor Perdido (Mês)"
                value={`R$ ${stats.hortifruti.valorPerdasMes.toFixed(2)}`}
                icon={<DollarSign className="w-6 h-6" />}
                variant="secondary"
              />
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tendência - Últimos 3 Meses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Perdas']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="hortifruti" 
                        name="Hortifrúti" 
                        stroke="hsl(142, 76%, 36%)" 
                        strokeWidth={3}
                        dot={{ fill: 'hsl(142, 76%, 36%)', r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'supermercado':
        return (
          <div className="space-y-6">
            <SectorHeader />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                title="Perdas Hoje"
                value={`${stats.supermercado.perdasHoje} un`}
                icon={<TrendingDown className="w-6 h-6" />}
                variant="destructive"
              />
              <StatCard
                title="Perdas no Mês"
                value={`${stats.supermercado.perdasMes} un`}
                icon={<TrendingDown className="w-6 h-6" />}
              />
              <StatCard
                title="Valor Perdido (Mês)"
                value={`R$ ${stats.supermercado.valorPerdasMes.toFixed(2)}`}
                icon={<DollarSign className="w-6 h-6" />}
                variant="secondary"
              />
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tendência - Últimos 3 Meses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Perdas']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="supermercado" 
                        name="Supermercado" 
                        stroke="hsl(0, 84%, 60%)" 
                        strokeWidth={3}
                        dot={{ fill: 'hsl(0, 84%, 60%)', r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'polpas':
        return (
          <div className="space-y-6">
            <SectorHeader />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatCard
                title="Estoque Total"
                value={`${stats.polpas.estoqueTotal} un`}
                icon={<Package className="w-6 h-6" />}
                variant="primary"
              />
              <StatCard
                title="Itens com Estoque Baixo"
                value={stats.polpas.estoqueBaixo}
                icon={<AlertTriangle className="w-6 h-6" />}
                variant={stats.polpas.estoqueBaixo > 0 ? 'destructive' : 'default'}
              />
            </div>
          </div>
        );
      case 'coca':
        return (
          <div className="space-y-6">
            <SectorHeader />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatCard
                title="Estoque Total"
                value={`${stats.coca.estoqueTotal} un`}
                icon={<Package className="w-6 h-6" />}
                variant="primary"
              />
              <StatCard
                title="Itens com Estoque Baixo"
                value={stats.coca.estoqueBaixo}
                icon={<AlertTriangle className="w-6 h-6" />}
                variant={stats.coca.estoqueBaixo > 0 ? 'destructive' : 'default'}
              />
            </div>
          </div>
        );
      case 'cotacoes':
        return (
          <div className="space-y-6">
            <SectorHeader />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                title="Pendentes"
                value={stats.cotacoes.pendentes}
                icon={<Receipt className="w-6 h-6" />}
                variant={stats.cotacoes.pendentes > 0 ? 'destructive' : 'default'}
              />
              <StatCard
                title="Em Análise"
                value={stats.cotacoes.emAnalise}
                icon={<ShoppingCart className="w-6 h-6" />}
                variant="primary"
              />
              <StatCard
                title="Finalizadas"
                value={stats.cotacoes.finalizadas}
                icon={<Receipt className="w-6 h-6" />}
                variant="secondary"
              />
            </div>
          </div>
        );
      case 'ofertas':
        return (
          <div className="space-y-6">
            <SectorHeader />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatCard
                title="Ofertas Ativas"
                value={stats.ofertas.ativas}
                icon={<Tag className="w-6 h-6" />}
                variant="primary"
              />
              <StatCard
                title="Ofertas Expiradas"
                value={stats.ofertas.expiradas}
                icon={<Tag className="w-6 h-6" />}
              />
            </div>
          </div>
        );
      default:
        return renderGeralView();
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Dashboard Geral</h1>
          <p className="text-muted-foreground mt-1">Visão consolidada de todos os setores</p>
        </div>

        {/* Sector Buttons */}
        <div className="flex flex-wrap gap-2">
          {sectorButtons.map((sector) => (
            <Button
              key={sector.id}
              variant={selectedSector === sector.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedSector(sector.id)}
              className={cn(
                "gap-2",
                selectedSector === sector.id && sector.id !== 'geral' && sector.color
              )}
            >
              <sector.icon className="w-4 h-4" />
              {sector.label}
            </Button>
          ))}
        </div>

        {/* Content */}
        {selectedSector === 'geral' ? renderGeralView() : renderSectorView()}
      </div>
    </MainLayout>
  );
};

export default DashboardGeral;
