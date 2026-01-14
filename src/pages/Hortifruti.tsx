import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  TrendingDown, 
  ClipboardList, 
  FileText,
  Loader2,
  Apple,
  BarChart3,
  Download,
  Filter,
  Calendar
} from 'lucide-react';
import LossCart from '@/components/losses/LossCart';
import LaunchList, { Launch } from '@/components/losses/LaunchList';
import HortifrutiDashboard from '@/components/hortifruti/HortifrutiDashboard';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

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
              .select(`
                peso_perdido, 
                quantidade_perdida,
                estoque!perdas_produto_id_estoque_fkey(preco_custo, unidade)
              `)
              .eq('lancamento_id', launch.id);

            const { data: profileData } = await supabase
              .from('profiles')
              .select('nome')
              .eq('id', launch.usuario_id)
              .single();

            // Calculate totals correctly
            let totalPeso = 0;
            let totalQtd = 0;
            let totalValue = 0;

            perdasData?.forEach((p: any) => {
              const isKg = p.estoque?.unidade?.toLowerCase() === 'kg';
              const qty = isKg ? (p.peso_perdido || 0) : (p.quantidade_perdida || 0);
              
              if (isKg) {
                totalPeso += qty;
              } else {
                totalQtd += qty;
              }
              
              totalValue += qty * (p.estoque?.preco_custo || 0);
            });

            return {
              ...launch,
              profiles: profileData || undefined,
              items_count: perdasData?.length || 0,
              total_value: totalValue,
              total_peso: totalPeso,
              total_quantidade: totalQtd,
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
  const [filterType, setFilterType] = useState<'week' | 'month' | 'custom'>('week');
  const [customDateStart, setCustomDateStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customDateEnd, setCustomDateEnd] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    fetchPerdas();
  }, [filterType, customDateStart, customDateEnd]);

  const getDateRange = () => {
    const today = new Date();
    
    switch (filterType) {
      case 'week':
        // Semana da segunda até domingo
        const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Segunda
        const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Domingo
        return { start: format(weekStart, 'yyyy-MM-dd'), end: format(weekEnd, 'yyyy-MM-dd') };
      case 'month':
        return { 
          start: format(startOfMonth(today), 'yyyy-MM-dd'), 
          end: format(endOfMonth(today), 'yyyy-MM-dd') 
        };
      case 'custom':
        return { start: customDateStart, end: customDateEnd };
      default:
        return { start: format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') };
    }
  };

  const fetchPerdas = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      
      const { data, error } = await supabase
        .from('perdas')
        .select(`
          *,
          estoque!perdas_produto_id_estoque_fkey(nome, unidade, preco_custo),
          lancamentos(numero)
        `)
        .gte('data_perda', start)
        .lte('data_perda', end)
        .order('data_perda', { ascending: false });
      
      if (error) throw error;
      setPerdas(data || []);
    } catch (error) {
      console.error('Erro ao buscar perdas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calcular valor corretamente baseado na unidade
  const calcularValorPerda = (perda: any) => {
    const isKg = perda.estoque?.unidade?.toLowerCase() === 'kg';
    const qty = isKg ? (perda.peso_perdido || 0) : (perda.quantidade_perdida || 0);
    return qty * (perda.estoque?.preco_custo || 0);
  };

  const totalPerdas = perdas.reduce((acc, p) => acc + calcularValorPerda(p), 0);
  const perdasPorMotivo = perdas.reduce((acc: any, p) => {
    acc[p.motivo_perda] = (acc[p.motivo_perda] || 0) + calcularValorPerda(p);
    return acc;
  }, {});

  const exportPDF = () => {
    if (perdas.length === 0) {
      toast.error('Nenhuma perda para exportar');
      return;
    }

    const doc = new jsPDF();
    const { start, end } = getDateRange();
    
    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO DE PERDAS - HORTIFRUTI', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('COMERCIAL COSTA', 105, 28, { align: 'center' });
    
    // Período
    doc.setFontSize(10);
    const startFormatted = format(new Date(start + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR });
    const endFormatted = format(new Date(end + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR });
    doc.text(`Período: ${startFormatted} a ${endFormatted}`, 105, 36, { align: 'center' });
    
    // Summary
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO', 14, 48);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total de Registros: ${perdas.length}`, 14, 56);
    doc.text(`Valor Total das Perdas: R$ ${formatarPreco(totalPerdas)}`, 14, 64);

    // Table
    const tableData = perdas.map(perda => {
      const isKg = perda.estoque?.unidade?.toLowerCase() === 'kg';
      const qty = isKg ? (perda.peso_perdido || 0) : (perda.quantidade_perdida || 0);
      const valorCalculado = qty * (perda.estoque?.preco_custo || 0);
      
      return [
        format(new Date(perda.data_perda + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }),
        (perda.estoque?.nome || 'Produto não encontrado').substring(0, 30),
        perda.motivo_perda.toUpperCase(),
        `${qty} ${perda.estoque?.unidade || 'UN'}`,
        `R$ ${formatarPreco(valorCalculado)}`
      ];
    });

    autoTable(doc, {
      startY: 72,
      head: [['Data', 'Produto', 'Motivo', 'Qtd/Peso', 'Valor']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [22, 163, 74], textColor: 255 },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 60 },
        2: { cellWidth: 30 },
        3: { cellWidth: 25 },
        4: { cellWidth: 30 },
      }
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Página ${i} de ${pageCount} - Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
        105,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    doc.save(`relatorio-perdas-hortifruti-${start}-${end}.pdf`);
    toast.success('PDF gerado com sucesso!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const { start, end } = getDateRange();

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Button
              variant={filterType === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('week')}
            >
              Esta Semana (Seg-Dom)
            </Button>
            <Button
              variant={filterType === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('month')}
            >
              Este Mês
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={filterType === 'custom' ? 'default' : 'outline'}
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
                  <Button onClick={() => setFilterType('custom')} className="w-full">
                    Aplicar Filtro
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            
            <div className="ml-auto">
              <Button onClick={exportPDF} className="gap-2 bg-green-600 hover:bg-green-700">
                <Download className="w-4 h-4" />
                Exportar PDF
              </Button>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground mt-3">
            Exibindo: {format(new Date(start + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })} até {format(new Date(end + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
          </p>
        </CardContent>
      </Card>

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
          <CardTitle>Perdas do Período</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {perdas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Nenhuma perda registrada no período</p>
            </div>
          ) : (
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
                {perdas.slice(0, 50).map(perda => {
                  const isKg = perda.estoque?.unidade?.toLowerCase() === 'kg';
                  const qty = isKg ? (perda.peso_perdido || 0) : (perda.quantidade_perdida || 0);
                  const valorCalculado = qty * (perda.estoque?.preco_custo || 0);
                  
                  return (
                    <TableRow key={perda.id}>
                      <TableCell>
                        {format(new Date(perda.data_perda + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">{perda.estoque?.nome || 'Produto não encontrado'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{perda.motivo_perda}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {qty} {perda.estoque?.unidade || 'UN'}
                      </TableCell>
                      <TableCell className="text-right text-destructive font-medium">
                        R$ {formatarPreco(valorCalculado)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Hortifruti;
