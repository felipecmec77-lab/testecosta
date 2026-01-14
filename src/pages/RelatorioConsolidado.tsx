import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  BarChart3, 
  TrendingDown, 
  Calendar, 
  Package, 
  DollarSign, 
  Loader2,
  Download,
  PieChart
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  Area,
  AreaChart
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type FilterPeriod = 'today' | 'week' | 'month' | '3months' | '6months' | 'year' | 'all';
type DataSource = 'all' | 'hortifruti' | 'geral';

interface LossData {
  id: string;
  data_perda: string;
  motivo_perda: string;
  valor_perda?: number;
  peso_perdido?: number;
  quantidade_perdida?: number;
  produto?: { nome_produto: string; categoria: string; preco_unitario: number; unidade_medida: string };
  item?: { nome_item: string; categoria: string; preco_custo: number };
  source: 'hortifruti' | 'geral';
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

const RelatorioConsolidado = () => {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [period, setPeriod] = useState<FilterPeriod>('month');
  const [source, setSource] = useState<DataSource>('all');
  const [losses, setLosses] = useState<LossData[]>([]);
  const { toast } = useToast();

  const getDateRange = (period: FilterPeriod) => {
    const now = new Date();
    switch (period) {
      case 'today':
        return { start: format(now, 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
      case 'week':
        return { start: format(subDays(now, 7), 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
      case 'month':
        return { start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') };
      case '3months':
        return { start: format(subMonths(now, 3), 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
      case '6months':
        return { start: format(subMonths(now, 6), 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
      case 'year':
        return { start: format(subMonths(now, 12), 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
      case 'all':
        return { start: '2000-01-01', end: format(now, 'yyyy-MM-dd') };
    }
  };

  useEffect(() => {
    fetchData();
  }, [period, source]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange(period);
      const allLosses: LossData[] = [];

      // Fetch hortifruti losses
      if (source === 'all' || source === 'hortifruti') {
        const { data: normalLaunches } = await supabase
          .from('lancamentos')
          .select('id')
          .eq('status', 'normal');
        
        const normalIds = normalLaunches?.map(l => l.id) || [];

        let hortifrutiQuery = supabase
          .from('perdas')
          .select(`*, estoque!perdas_produto_id_estoque_fkey(nome, grupo, preco_custo, unidade)`)
          .gte('data_perda', start)
          .lte('data_perda', end);

        if (normalIds.length > 0) {
          hortifrutiQuery = hortifrutiQuery.or(`lancamento_id.in.(${normalIds.join(',')}),lancamento_id.is.null`);
        }

        const { data: hortifrutiData } = await hortifrutiQuery;
        
        if (hortifrutiData) {
          hortifrutiData.forEach((item: any) => {
            const isKg = item.estoque?.unidade === 'kg' || item.estoque?.unidade === 'KG';
            const qty = isKg ? (item.peso_perdido || 0) : (item.quantidade_perdida || 0);
            const valorPerda = qty * (item.estoque?.preco_custo || 0);
            
            allLosses.push({
              id: item.id,
              data_perda: item.data_perda,
              motivo_perda: item.motivo_perda,
              valor_perda: valorPerda,
              peso_perdido: item.peso_perdido,
              quantidade_perdida: item.quantidade_perdida,
              produto: item.estoque ? {
                nome_produto: item.estoque.nome,
                categoria: item.estoque.grupo || 'Sem categoria',
                preco_unitario: item.estoque.preco_custo,
                unidade_medida: item.estoque.unidade || 'UN'
              } : null,
              source: 'hortifruti'
            });
          });
        }
      }

      // Fetch general losses
      if (source === 'all' || source === 'geral') {
        const { data: normalLaunchesGeral } = await supabase
          .from('lancamentos_perdas_geral')
          .select('id')
          .eq('status', 'normal');
        
        const normalGeralIds = normalLaunchesGeral?.map(l => l.id) || [];

        let geralQuery = supabase
          .from('perdas_geral')
          .select(`*, itens_perdas_geral(nome_item, categoria, preco_custo)`)
          .gte('data_perda', start)
          .lte('data_perda', end);

        if (normalGeralIds.length > 0) {
          geralQuery = geralQuery.or(`lancamento_id.in.(${normalGeralIds.join(',')}),lancamento_id.is.null`);
        }

        const { data: geralData } = await geralQuery;
        
        if (geralData) {
          geralData.forEach(item => {
            allLosses.push({
              id: item.id,
              data_perda: item.data_perda,
              motivo_perda: item.motivo_perda,
              valor_perda: item.valor_perda || (item.quantidade_perdida * item.preco_unitario),
              quantidade_perdida: item.quantidade_perdida,
              item: item.itens_perdas_geral,
              source: 'geral'
            });
          });
        }
      }

      setLosses(allLosses);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const totalValue = losses.reduce((sum, l) => sum + (l.valor_perda || 0), 0);
  const totalItems = losses.length;
  const hortifrutiLosses = losses.filter(l => l.source === 'hortifruti');
  const geralLosses = losses.filter(l => l.source === 'geral');
  const hortifrutiValue = hortifrutiLosses.reduce((sum, l) => sum + (l.valor_perda || 0), 0);
  const geralValue = geralLosses.reduce((sum, l) => sum + (l.valor_perda || 0), 0);

  // Data by motivo
  const motivoData = losses.reduce((acc, l) => {
    const motivo = l.motivo_perda || 'outros';
    if (!acc[motivo]) acc[motivo] = 0;
    acc[motivo] += l.valor_perda || 0;
    return acc;
  }, {} as Record<string, number>);

  const motivoChartData = Object.entries(motivoData)
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
    .sort((a, b) => b.value - a.value);

  // Data by date
  const dateData = losses.reduce((acc, l) => {
    const date = l.data_perda;
    if (!acc[date]) acc[date] = { hortifruti: 0, geral: 0 };
    if (l.source === 'hortifruti') {
      acc[date].hortifruti += l.valor_perda || 0;
    } else {
      acc[date].geral += l.valor_perda || 0;
    }
    return acc;
  }, {} as Record<string, { hortifruti: number; geral: number }>);

  const timeChartData = Object.entries(dateData)
    .map(([date, values]) => ({
      date: format(new Date(date), 'dd/MM', { locale: ptBR }),
      fullDate: date,
      Hortifruti: values.hortifruti,
      Geral: values.geral,
      Total: values.hortifruti + values.geral
    }))
    .sort((a, b) => a.fullDate.localeCompare(b.fullDate));

  // Top products/items
  const productData = losses.reduce((acc, l) => {
    const name = l.produto?.nome_produto || l.item?.nome_item || 'Desconhecido';
    if (!acc[name]) acc[name] = { value: 0, count: 0 };
    acc[name].value += l.valor_perda || 0;
    acc[name].count += 1;
    return acc;
  }, {} as Record<string, { value: number; count: number }>);

  const topProductsData = Object.entries(productData)
    .map(([name, data]) => ({ name: name.length > 20 ? name.substring(0, 20) + '...' : name, ...data }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Source distribution
  const sourceDistribution = [
    { name: 'Hortifruti', value: hortifrutiValue },
    { name: 'Geral', value: geralValue }
  ].filter(d => d.value > 0);

  const exportToPDF = () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      
      doc.setFillColor(34, 197, 94);
      doc.rect(0, 0, 220, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('RELATÓRIO CONSOLIDADO', 105, 18, { align: 'center' });
      doc.setFontSize(14);
      doc.text('COMERCIAL COSTA', 105, 28, { align: 'center' });
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      const { start, end } = getDateRange(period);
      doc.text(`Período: ${format(new Date(start), 'dd/MM/yyyy')} a ${format(new Date(end), 'dd/MM/yyyy')}`, 14, 52);
      doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 60);
      
      // Summary
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumo', 14, 75);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total de Registros: ${totalItems}`, 14, 85);
      doc.text(`Valor Total: R$ ${totalValue.toFixed(2).replace('.', ',')}`, 14, 93);
      doc.text(`Hortifruti: R$ ${hortifrutiValue.toFixed(2).replace('.', ',')}`, 14, 101);
      doc.text(`Geral: R$ ${geralValue.toFixed(2).replace('.', ',')}`, 14, 109);

      // Top products table
      const tableData = topProductsData.map(p => [
        p.name,
        p.count.toString(),
        `R$ ${p.value.toFixed(2).replace('.', ',')}`
      ]);

      autoTable(doc, {
        startY: 120,
        head: [['PRODUTO/ITEM', 'QTD', 'VALOR']],
        body: tableData,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255], fontStyle: 'bold' },
        margin: { left: 14, right: 14 }
      });

      doc.save(`relatorio_consolidado_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast({ title: 'PDF exportado com sucesso!' });
    } catch (error) {
      toast({ title: 'Erro ao exportar PDF', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const periodLabels: Record<FilterPeriod, string> = {
    today: 'Hoje',
    week: 'Últimos 7 dias',
    month: 'Este mês',
    '3months': 'Últimos 3 meses',
    '6months': 'Últimos 6 meses',
    year: 'Último ano',
    all: 'Todo período'
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Relatório Consolidado</h1>
            <p className="text-muted-foreground mt-1">Análise unificada de todas as perdas</p>
          </div>
          <Button onClick={exportToPDF} disabled={exporting || losses.length === 0}>
            {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
            Exportar PDF
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Período</label>
                <Select value={period} onValueChange={(v) => setPeriod(v as FilterPeriod)}>
                  <SelectTrigger>
                    <Calendar className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(periodLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Fonte</label>
                <Select value={source} onValueChange={(v) => setSource(v as DataSource)}>
                  <SelectTrigger>
                    <Package className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as fontes</SelectItem>
                    <SelectItem value="hortifruti">Hortifruti</SelectItem>
                    <SelectItem value="geral">Mercadoria Geral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Registros</p>
                    <p className="text-2xl font-bold">{totalItems}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <TrendingDown className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Total</p>
                    <p className="text-2xl font-bold text-destructive">
                      R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Package className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Hortifruti</p>
                    <p className="text-xl font-bold">
                      R$ {hortifrutiValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <DollarSign className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Geral</p>
                    <p className="text-xl font-bold">
                      R$ {geralValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Evolution Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Evolução das Perdas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {timeChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={timeChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
                        <Tooltip 
                          formatter={(value: number) => [`R$ ${value.toFixed(2)}`, '']}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        />
                        <Legend />
                        <Area type="monotone" dataKey="Hortifruti" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} />
                        <Area type="monotone" dataKey="Geral" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Nenhum dado para o período
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pie Chart - Source Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Distribuição por Fonte
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sourceDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPieChart>
                        <Pie
                          data={sourceDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {sourceDistribution.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Valor']} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Nenhum dado para o período
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* By Reason Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Perdas por Motivo</CardTitle>
                </CardHeader>
                <CardContent>
                  {motivoChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={motivoChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" tickFormatter={(v) => `R$${v}`} />
                        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Valor']} />
                        <Bar dataKey="value" fill="#22c55e" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Nenhum dado para o período
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Products */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top 10 Produtos/Itens</CardTitle>
                </CardHeader>
                <CardContent>
                  {topProductsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={topProductsData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" tickFormatter={(v) => `R$${v}`} />
                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Valor']} />
                        <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Nenhum dado para o período
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default RelatorioConsolidado;
