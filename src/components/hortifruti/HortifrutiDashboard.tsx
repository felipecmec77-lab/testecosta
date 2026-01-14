import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import StatCard from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TrendingDown, DollarSign, Loader2, Scale, Package, Calendar, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts';
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, getDay } from 'date-fns';
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

type FilterPeriod = 'today' | 'week' | 'month' | 'custom' | 'all';

const HortifrutiDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [losses, setLosses] = useState<LossData[]>([]);
  const [allLosses, setAllLosses] = useState<LossData[]>([]);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('month');
  const [showUnidadesSection, setShowUnidadesSection] = useState(false);
  const [customDateStart, setCustomDateStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customDateEnd, setCustomDateEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [stats, setStats] = useState({
    totalKgToday: 0,
    totalUnidadesToday: 0,
    totalKg7Days: 0,
    totalUnidades7Days: 0,
    totalKgMonth: 0,
    totalUnidadesMonth: 0,
    totalValueToday: 0,
    totalValue7Days: 0,
    totalValueMonth: 0,
  });

  useEffect(() => {
    fetchData();
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

      const filteredLosses = lossesData?.filter((loss: any) => {
        if (!loss.lancamento_id) return true;
        return loss.lancamentos?.status === 'normal';
      }) || [];

      if (filteredLosses.length > 0) {
        setAllLosses(filteredLosses as unknown as LossData[]);
        setLosses(filteredLosses as unknown as LossData[]);
        
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

  const calculateStats = (lossesData: LossData[], today: Date) => {
    const todayStr = format(today, 'yyyy-MM-dd');
    const sevenDaysAgoStr = format(subDays(today, 7), 'yyyy-MM-dd');
    const monthStartStr = format(startOfMonth(today), 'yyyy-MM-dd');

    let totalKgToday = 0;
    let totalUnidadesToday = 0;
    let totalKg7Days = 0;
    let totalUnidades7Days = 0;
    let totalKgMonth = 0;
    let totalUnidadesMonth = 0;
    let totalValueToday = 0;
    let totalValue7Days = 0;
    let totalValueMonth = 0;

    lossesData.forEach((loss: any) => {
      const isKg = loss.produtos?.unidade_medida === 'kg';
      const lossAmount = isKg ? (loss.peso_perdido || 0) : (loss.quantidade_perdida || 0);
      const lossValue = lossAmount * (loss.produtos?.preco_unitario || 0);
      
      // Este mês
      if (loss.data_perda >= monthStartStr) {
        if (isKg) {
          totalKgMonth += lossAmount;
        } else {
          totalUnidadesMonth += lossAmount;
        }
        totalValueMonth += lossValue;
      }

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
      totalKgMonth,
      totalUnidadesMonth,
      totalValueToday,
      totalValue7Days,
      totalValueMonth,
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
        const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
        filtered = allLosses.filter(l => l.data_perda >= monthStart);
        break;
      case 'custom':
        filtered = allLosses.filter(l => l.data_perda >= customDateStart && l.data_perda <= customDateEnd);
        break;
      case 'all':
      default:
        filtered = allLosses;
    }

    setLosses(filtered);
  };

  const applyCustomFilter = () => {
    setFilterPeriod('custom');
  };

  // Prepare chart data
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

  const rankingColors = [
    '#ef4444',
    '#f97316',
    '#eab308',
    '#84cc16',
    '#22c55e',
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
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Dashboard de Perdas</h2>
          <p className="text-muted-foreground text-sm">Visão geral das perdas do hortifrúti</p>
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
            Este Mês
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={filterPeriod === 'custom' ? 'default' : 'outline'}
                size="sm"
              >
                <Filter className="w-4 h-4 mr-1" />
                Personalizado
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <Input
                    type="date"
                    value={customDateStart}
                    onChange={(e) => setCustomDateStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Input
                    type="date"
                    value={customDateEnd}
                    onChange={(e) => setCustomDateEnd(e.target.value)}
                  />
                </div>
                <Button onClick={applyCustomFilter} className="w-full">
                  Aplicar Filtro
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant={filterPeriod === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterPeriod('all')}
          >
            Tudo
          </Button>
        </div>
      </div>

      {/* Stats Grid - Perdas em KG */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <Scale className="w-4 h-4" />
          Perdas em Quilos (kg)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Hoje"
            value={`${stats.totalKgToday.toFixed(2)} kg`}
            icon={<TrendingDown className="w-5 h-5" />}
            variant="destructive"
          />
          <StatCard
            title="Últimos 7 dias"
            value={`${stats.totalKg7Days.toFixed(2)} kg`}
            icon={<TrendingDown className="w-5 h-5" />}
          />
          <StatCard
            title="Este Mês"
            value={`${stats.totalKgMonth.toFixed(2)} kg`}
            icon={<TrendingDown className="w-5 h-5" />}
            variant="secondary"
          />
        </div>
      </div>

      {/* Stats Grid - Perdas em Unidades (Collapsible) */}
      <div>
        <button 
          onClick={() => setShowUnidadesSection(!showUnidadesSection)}
          className="flex items-center gap-2 text-base font-semibold text-foreground mb-3 hover:text-primary transition-colors"
        >
          <Package className="w-4 h-4" />
          Perdas em Unidades
          {showUnidadesSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <div className={cn(
          "grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden transition-all duration-300",
          showUnidadesSection ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}>
          <StatCard
            title="Hoje"
            value={`${stats.totalUnidadesToday} un`}
            icon={<TrendingDown className="w-5 h-5" />}
            variant="destructive"
          />
          <StatCard
            title="Últimos 7 dias"
            value={`${stats.totalUnidades7Days} un`}
            icon={<TrendingDown className="w-5 h-5" />}
          />
          <StatCard
            title="Este Mês"
            value={`${stats.totalUnidadesMonth} un`}
            icon={<TrendingDown className="w-5 h-5" />}
            variant="secondary"
          />
        </div>
      </div>

      {/* Valor Total */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Valores Perdidos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Hoje"
            value={`R$ ${stats.totalValueToday.toFixed(2)}`}
            icon={<DollarSign className="w-5 h-5" />}
            variant="destructive"
          />
          <StatCard
            title="Últimos 7 dias"
            value={`R$ ${stats.totalValue7Days.toFixed(2)}`}
            icon={<DollarSign className="w-5 h-5" />}
          />
          <StatCard
            title="Este Mês"
            value={`R$ ${stats.totalValueMonth.toFixed(2)}`}
            icon={<DollarSign className="w-5 h-5" />}
            variant="secondary"
          />
        </div>
      </div>

      {/* Month-to-month comparison */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Comparativo Mês a Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Losses over time (kg) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Perdas KG ao Longo do Tempo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              {timeChartDataKg.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeChartDataKg}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
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
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Top 5 Produtos (KG)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              {productChartDataKg.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productChartDataKg} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <YAxis dataKey="name" type="category" width={70} stroke="hsl(var(--muted-foreground))" fontSize={10} />
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
      </div>
    </div>
  );
};

export default HortifrutiDashboard;
