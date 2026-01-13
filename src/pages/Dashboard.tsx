import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/layout/MainLayout';
import StatCard from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingDown, DollarSign, Loader2, Scale, Package, Calendar, ChevronDown, ChevronUp, Sparkles, RefreshCw } from 'lucide-react';
import { AiInsightsList } from '@/components/ai/AiInsightCard';
import { AiReportGenerator } from '@/components/ai/AiReportGenerator';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
interface LossData {
  produto_id: string;
  peso_perdido: number;
  quantidade_perdida: number;
  motivo_perda: string;
  data_perda: string;
  produtos?: {
    nome_produto: string;
    preco_unitario: number;
    unidade_medida: string;
  };
}

type FilterPeriod = 'today' | 'week' | 'month' | 'all';

interface AiInsight {
  id: string;
  insight_type: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  data?: any;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
}

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [losses, setLosses] = useState<LossData[]>([]);
  const [allLosses, setAllLosses] = useState<LossData[]>([]);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('all');
  const [showUnidadesSection, setShowUnidadesSection] = useState(false);
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [stats, setStats] = useState({
    totalKgToday: 0,
    totalUnidadesToday: 0,
    totalKg7Days: 0,
    totalUnidades7Days: 0,
    totalKg30Days: 0,
    totalUnidades30Days: 0,
    totalValueToday: 0,
    totalValue7Days: 0,
    totalValue30Days: 0,
  });

  useEffect(() => {
    fetchData();
    fetchInsights();
  }, []);

  useEffect(() => {
    if (allLosses.length > 0) {
      applyFilter(filterPeriod);
    }
  }, [filterPeriod, allLosses]);

  const fetchData = async () => {
    try {
      const today = new Date();
      const sixMonthsAgo = subMonths(today, 6);

      // Fetch losses with product info - filter out cancelled launches
      const { data: lossesData } = await supabase
        .from('perdas')
        .select(`
          produto_id,
          peso_perdido,
          quantidade_perdida,
          motivo_perda,
          data_perda,
          lancamento_id,
          produtos (
            nome_produto,
            preco_unitario,
            unidade_medida
          ),
          lancamentos (
            status
          )
        `)
        .gte('data_perda', format(sixMonthsAgo, 'yyyy-MM-dd'));

      // Filter to only include losses from normal launches (or legacy without lancamento_id)
      const filteredLosses = lossesData?.filter((loss: any) => {
        if (!loss.lancamento_id) return true; // Legacy losses without launch
        return loss.lancamentos?.status === 'normal';
      }) || [];

      if (filteredLosses.length > 0) {
        setAllLosses(filteredLosses as unknown as LossData[]);
        setLosses(filteredLosses as unknown as LossData[]);
        
        // Calculate stats based on last 30 days
        const thirtyDaysAgo = subDays(today, 30);
        const recentLosses = filteredLosses.filter((loss: any) => 
          new Date(loss.data_perda) >= thirtyDaysAgo
        );
        
        calculateStats(recentLosses as unknown as LossData[], today);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInsights = async () => {
    try {
      const { data } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('is_dismissed', false)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5);
      
      setInsights((data as AiInsight[]) || []);
    } catch (error) {
      console.error('Error fetching insights:', error);
    }
  };

  const generateInsights = async () => {
    setLoadingInsights(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para gerar insights');
        return;
      }

      const { error } = await supabase.functions.invoke('generate-insights', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Error generating insights:', error);
        toast.error('Erro ao gerar insights');
        return;
      }

      toast.success('Insights gerados com sucesso!');
      await fetchInsights();
    } catch (error) {
      console.error('Error generating insights:', error);
      toast.error('Erro ao gerar insights');
    } finally {
      setLoadingInsights(false);
    }
  };

  const calculateStats = (lossesData: LossData[], today: Date) => {
    const todayStr = format(today, 'yyyy-MM-dd');
    const sevenDaysAgoStr = format(subDays(today, 7), 'yyyy-MM-dd');

    let totalKgToday = 0;
    let totalUnidadesToday = 0;
    let totalKg7Days = 0;
    let totalUnidades7Days = 0;
    let totalKg30Days = 0;
    let totalUnidades30Days = 0;
    let totalValueToday = 0;
    let totalValue7Days = 0;
    let totalValue30Days = 0;

    lossesData.forEach((loss: any) => {
      const isKg = loss.produtos?.unidade_medida === 'kg';
      const lossAmount = isKg ? (loss.peso_perdido || 0) : (loss.quantidade_perdida || 0);
      const lossValue = lossAmount * (loss.produtos?.preco_unitario || 0);
      
      if (isKg) {
        totalKg30Days += lossAmount;
      } else {
        totalUnidades30Days += lossAmount;
      }
      totalValue30Days += lossValue;

      if (loss.data_perda === todayStr) {
        if (isKg) {
          totalKgToday += lossAmount;
        } else {
          totalUnidadesToday += lossAmount;
        }
        totalValueToday += lossValue;
      }
      if (loss.data_perda >= sevenDaysAgoStr) {
        if (isKg) {
          totalKg7Days += lossAmount;
        } else {
          totalUnidades7Days += lossAmount;
        }
        totalValue7Days += lossValue;
      }
    });

    setStats({
      totalKgToday,
      totalUnidadesToday,
      totalKg7Days,
      totalUnidades7Days,
      totalKg30Days,
      totalUnidades30Days,
      totalValueToday,
      totalValue7Days,
      totalValue30Days,
    });
  };

  const applyFilter = (period: FilterPeriod) => {
    const today = new Date();
    let filtered = allLosses;

    switch (period) {
      case 'today':
        const todayStr = format(today, 'yyyy-MM-dd');
        filtered = allLosses.filter(l => l.data_perda === todayStr);
        break;
      case 'week':
        const weekAgo = format(subDays(today, 7), 'yyyy-MM-dd');
        filtered = allLosses.filter(l => l.data_perda >= weekAgo);
        break;
      case 'month':
        const monthAgo = format(subDays(today, 30), 'yyyy-MM-dd');
        filtered = allLosses.filter(l => l.data_perda >= monthAgo);
        break;
      case 'all':
      default:
        filtered = allLosses;
    }

    setLosses(filtered);
  };

  // Prepare chart data - separate by kg and unidade
  const lossesByProductKg = losses
    .filter(l => l.produtos?.unidade_medida === 'kg')
    .reduce((acc, loss) => {
      const name = loss.produtos?.nome_produto || 'Desconhecido';
      acc[name] = (acc[name] || 0) + (loss.peso_perdido || 0);
      return acc;
    }, {} as Record<string, number>);

  const lossesByProductUnidade = losses
    .filter(l => l.produtos?.unidade_medida === 'unidade')
    .reduce((acc, loss) => {
      const name = loss.produtos?.nome_produto || 'Desconhecido';
      acc[name] = (acc[name] || 0) + (loss.quantidade_perdida || 0);
      return acc;
    }, {} as Record<string, number>);

  // Ranking colors - from red (worst) to yellow to green (best)
  const rankingColors = [
    '#ef4444', // 1st - red (worst)
    '#f97316', // 2nd - orange
    '#eab308', // 3rd - yellow
    '#84cc16', // 4th - lime
    '#22c55e', // 5th - green (best relative)
  ];

  const productChartDataKg = Object.entries(lossesByProductKg)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map((item, index) => ({ ...item, fill: rankingColors[index] }));

  const productChartDataUnidade = Object.entries(lossesByProductUnidade)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map((item, index) => ({ ...item, fill: rankingColors[index] }));

  // Line chart - losses over time (kg only)
  const lossesByDateKg = losses
    .filter(l => l.produtos?.unidade_medida === 'kg')
    .reduce((acc, loss) => {
      const date = loss.data_perda;
      acc[date] = (acc[date] || 0) + (loss.peso_perdido || 0);
      return acc;
    }, {} as Record<string, number>);

  const timeChartDataKg = Object.entries(lossesByDateKg)
    .map(([date, value]) => ({
      dateOriginal: date,
      date: format(new Date(date + 'T12:00:00'), 'dd/MM', { locale: ptBR }),
      value,
    }))
    .sort((a, b) => a.dateOriginal.localeCompare(b.dateOriginal));

  // Month-to-month comparison chart
  const today = new Date();
  const monthlyData = [];
  
  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(today, i);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const monthStartStr = format(monthStart, 'yyyy-MM-dd');
    const monthEndStr = format(monthEnd, 'yyyy-MM-dd');
    
    const monthLosses = allLosses.filter(l => 
      l.data_perda >= monthStartStr && l.data_perda <= monthEndStr
    );
    
    let totalKg = 0;
    let totalValue = 0;
    
    monthLosses.forEach(loss => {
      const isKg = loss.produtos?.unidade_medida === 'kg';
      const amount = isKg ? (loss.peso_perdido || 0) : (loss.quantidade_perdida || 0);
      totalKg += isKg ? amount : 0;
      totalValue += amount * (loss.produtos?.preco_unitario || 0);
    });
    
    monthlyData.push({
      month: format(monthDate, 'MMM', { locale: ptBR }),
      perdas: totalKg,
      valor: totalValue,
    });
  }

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Visão geral das perdas do seu hortifruti</p>
          </div>
          
          {/* Quick filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Button
              variant={filterPeriod === 'today' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterPeriod('today')}
            >
              Hoje
            </Button>
            <Button
              variant={filterPeriod === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterPeriod('week')}
            >
              7 dias
            </Button>
            <Button
              variant={filterPeriod === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterPeriod('month')}
            >
              30 dias
            </Button>
            <Button
              variant={filterPeriod === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterPeriod('all')}
            >
              Tudo
            </Button>
          </div>
        </div>

        {/* AI Insights Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Insights da IA
                </CardTitle>
                <Button 
                  onClick={generateInsights} 
                  disabled={loadingInsights}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  {loadingInsights ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {loadingInsights ? 'Analisando...' : 'Gerar Insights'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <AiInsightsList 
                insights={insights} 
                onRefresh={fetchInsights}
              />
            </CardContent>
          </Card>
          
          {/* AI Report Generator */}
          <AiReportGenerator className="lg:col-span-1" />
        </div>

        {/* Stats Grid - Perdas em KG */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Scale className="w-5 h-5" />
            Perdas em Quilos (kg)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
            <StatCard
              title="Hoje"
              value={`${stats.totalKgToday.toFixed(2)} kg`}
              icon={<TrendingDown className="w-6 h-6" />}
              variant="destructive"
            />
            <StatCard
              title="Últimos 7 dias"
              value={`${stats.totalKg7Days.toFixed(2)} kg`}
              icon={<TrendingDown className="w-6 h-6" />}
            />
            <StatCard
              title="Últimos 30 dias"
              value={`${stats.totalKg30Days.toFixed(2)} kg`}
              icon={<TrendingDown className="w-6 h-6" />}
              variant="secondary"
            />
          </div>
        </div>

        {/* Stats Grid - Perdas em Unidades (Collapsible) */}
        <div>
          <button 
            onClick={() => setShowUnidadesSection(!showUnidadesSection)}
            className="flex items-center gap-2 text-lg font-semibold text-foreground mb-3 hover:text-primary transition-colors"
          >
            <Package className="w-5 h-5" />
            Perdas em Unidades
            {showUnidadesSection ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
          <div className={cn(
            "grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 overflow-hidden transition-all duration-300",
            showUnidadesSection ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          )}>
            <StatCard
              title="Hoje"
              value={`${stats.totalUnidadesToday} un`}
              icon={<TrendingDown className="w-6 h-6" />}
              variant="destructive"
            />
            <StatCard
              title="Últimos 7 dias"
              value={`${stats.totalUnidades7Days} un`}
              icon={<TrendingDown className="w-6 h-6" />}
            />
            <StatCard
              title="Últimos 30 dias"
              value={`${stats.totalUnidades30Days} un`}
              icon={<TrendingDown className="w-6 h-6" />}
              variant="secondary"
            />
          </div>
        </div>

        {/* Valor Total */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Valores Perdidos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
            <StatCard
              title="Hoje"
              value={`R$ ${stats.totalValueToday.toFixed(2)}`}
              icon={<DollarSign className="w-6 h-6" />}
              variant="destructive"
            />
            <StatCard
              title="Últimos 7 dias"
              value={`R$ ${stats.totalValue7Days.toFixed(2)}`}
              icon={<DollarSign className="w-6 h-6" />}
            />
            <StatCard
              title="Últimos 30 dias"
              value={`R$ ${stats.totalValue30Days.toFixed(2)}`}
              icon={<DollarSign className="w-6 h-6" />}
              variant="secondary"
            />
          </div>
        </div>

        {/* Month-to-month comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Comparativo Mês a Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {monthlyData.length > 0 ? (
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
                      formatter={(value: number, name: string) => [
                        name === 'perdas' ? `${value.toFixed(2)} kg` : `R$ ${value.toFixed(2)}`,
                        name === 'perdas' ? 'Perdas (kg)' : 'Valor'
                      ]}
                    />
                    <Bar dataKey="perdas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="perdas" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Losses over time (kg) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Perdas em KG ao Longo do Tempo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {timeChartDataKg.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeChartDataKg}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [`${value.toFixed(2)} kg`, 'Perdas']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top products with losses (kg) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Top 5 Produtos com Perdas (KG)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {productChartDataKg.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productChartDataKg} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis dataKey="name" type="category" width={80} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [`${value.toFixed(2)} kg`, 'Perdas']}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {productChartDataKg.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top products with losses (unidades) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Top 5 Produtos com Perdas (Unidades)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {productChartDataUnidade.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productChartDataUnidade} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis dataKey="name" type="category" width={80} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [`${value} un`, 'Perdas']}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {productChartDataUnidade.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
