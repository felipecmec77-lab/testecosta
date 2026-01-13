import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Loader2, Calendar, Filter, FileDown } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportData {
  id: string;
  produto_id: string;
  peso_perdido: number;
  quantidade_perdida: number;
  motivo_perda: string;
  data_perda: string;
  criado_em: string;
  produtos?: {
    nome_produto: string;
    preco_unitario: number;
    categoria: string;
    unidade_medida: string;
  };
  profiles?: {
    nome: string;
  };
}

const Reports = () => {
  const [data, setData] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  const [filters, setFilters] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    category: 'all',
    product: 'all',
  });

  const [products, setProducts] = useState<{ id: string; nome_produto: string }[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
    fetchReport();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from('produtos').select('id, nome_produto').order('nome_produto');
    if (data) setProducts(data);
  };

  const fetchReport = async () => {
    setLoading(true);
    
    try {
      // First get only normal launches (not cancelled)
      const { data: normalLaunches } = await supabase
        .from('lancamentos')
        .select('id')
        .eq('status', 'normal');

      const normalLaunchIds = normalLaunches?.map(l => l.id) || [];

      let query = supabase
        .from('perdas')
        .select(`
          *,
          produtos (nome_produto, preco_unitario, categoria, unidade_medida)
        `)
        .gte('data_perda', filters.startDate)
        .lte('data_perda', filters.endDate)
        .order('data_perda', { ascending: false });

      // Filter only items from normal launches or items without launch (legacy)
      if (normalLaunchIds.length > 0) {
        query = query.or(`lancamento_id.in.(${normalLaunchIds.join(',')}),lancamento_id.is.null`);
      }

      if (filters.product !== 'all') {
        query = query.eq('produto_id', filters.product);
      }

      const { data: perdasData, error } = await query;

      if (error) throw error;

      let filtered = perdasData || [];
      
      if (filters.category !== 'all') {
        filtered = filtered.filter(item => item.produtos?.categoria === filters.category);
      }

      // Fetch profile names separately
      const userIds = [...new Set(filtered.map(item => item.usuario_id))];
      
      let profilesMap: Record<string, string> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, nome')
          .in('id', userIds);
        
        if (profilesData) {
          profilesMap = profilesData.reduce((acc, p) => {
            acc[p.id] = p.nome;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      // Merge profiles into data
      const dataWithProfiles = filtered.map(item => ({
        ...item,
        profiles: { nome: profilesMap[item.usuario_id] || 'N/A' }
      }));

      setData(dataWithProfiles as unknown as ReportData[]);
    } catch (error) {
      console.error('Error fetching report:', error);
      toast({ title: 'Erro ao carregar relatório', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    fetchReport();
  };

  const exportToCSV = () => {
    setExporting(true);
    
    try {
      const headers = ['Data', 'Produto', 'Categoria', 'Unidade', 'Quantidade', 'Valor', 'Motivo', 'Operador'];
      const rows = data.map(item => {
        const isKg = item.produtos?.unidade_medida === 'kg';
        const qty = isKg ? (item.peso_perdido || 0) : (item.quantidade_perdida || 0);
        const value = qty * (item.produtos?.preco_unitario || 0);
        
        return [
          format(new Date(item.data_perda), 'dd/MM/yyyy'),
          item.produtos?.nome_produto || '',
          item.produtos?.categoria || '',
          item.produtos?.unidade_medida || '',
          qty.toFixed(2),
          value.toFixed(2),
          item.motivo_perda,
          item.profiles?.nome || '',
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `relatorio_perdas_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();

      toast({ title: 'Relatório exportado com sucesso!' });
    } catch (error) {
      toast({ title: 'Erro ao exportar relatório', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = () => {
    setExporting(true);
    
    try {
      const doc = new jsPDF();
      
      // Header with logo effect
      doc.setFillColor(34, 197, 94);
      doc.rect(0, 0, 220, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('RELATÓRIO DE PERDAS', 105, 18, { align: 'center' });
      doc.setFontSize(14);
      doc.text('COMERCIAL COSTA', 105, 28, { align: 'center' });
      
      // Reset text color
      doc.setTextColor(0, 0, 0);
      
      // Period and date info
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Período: ${format(new Date(filters.startDate), 'dd/MM/yyyy')} a ${format(new Date(filters.endDate), 'dd/MM/yyyy')}`, 14, 52);
      doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 60);
      
      // Format number to Brazilian format (comma as decimal separator)
      const formatBRL = (value: number) => {
        return value.toFixed(2).replace('.', ',');
      };
      
      const tableData = data.map(item => {
        const isKg = item.produtos?.unidade_medida === 'kg';
        const qty = isKg ? (item.peso_perdido || 0) : (item.quantidade_perdida || 0);
        const value = qty * (item.produtos?.preco_unitario || 0);
        
        return [
          format(new Date(item.data_perda), 'dd/MM/yyyy'),
          (item.produtos?.nome_produto || '').toUpperCase(),
          `${formatBRL(qty)} ${isKg ? 'kg' : 'un'}`,
          `R$ ${formatBRL(value)}`,
          item.motivo_perda.charAt(0).toUpperCase() + item.motivo_perda.slice(1),
        ];
      });
      
      // Calculate total for footer
      const totalValorPerdas = data.reduce((sum, item) => {
        const isKg = item.produtos?.unidade_medida === 'kg';
        const qty = isKg ? (item.peso_perdido || 0) : (item.quantidade_perdida || 0);
        return sum + qty * (item.produtos?.preco_unitario || 0);
      }, 0);
      
      autoTable(doc, {
        startY: 68,
        head: [['DATA', 'PRODUTO', 'QUANTIDADE', 'VALOR', 'MOTIVO']],
        body: tableData,
        styles: { 
          fontSize: 10,
          cellPadding: 4,
        },
        headStyles: { 
          fillColor: [34, 197, 94],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 11,
          halign: 'center',
        },
        bodyStyles: {
          halign: 'center',
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 28 },
          1: { halign: 'left', cellWidth: 55 },
          2: { halign: 'center', cellWidth: 30 },
          3: { halign: 'right', cellWidth: 30 },
          4: { halign: 'center', cellWidth: 30 },
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        margin: { left: 14, right: 14 },
      });
      
      // Get final Y position
      const finalY = (doc as any).lastAutoTable.finalY || 100;
      
      // Total box
      doc.setFillColor(34, 197, 94);
      doc.roundedRect(110, finalY + 10, 85, 25, 3, 3, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('VALOR TOTAL:', 118, finalY + 20);
      doc.setFontSize(16);
      doc.text(`R$ ${formatBRL(totalValorPerdas)}`, 118, finalY + 30);
      
      // Footer
      doc.setTextColor(128, 128, 128);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Comercial Costa - Sistema de Gestão', 105, 285, { align: 'center' });
      
      doc.save(`relatorio_perdas_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast({ title: 'PDF exportado com sucesso!' });
    } catch (error) {
      toast({ title: 'Erro ao exportar PDF', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const totalQuantity = data.reduce((sum, item) => {
    const isKg = item.produtos?.unidade_medida === 'kg';
    return sum + (isKg ? (item.peso_perdido || 0) : (item.quantidade_perdida || 0));
  }, 0);
  
  const totalValue = data.reduce((sum, item) => {
    const isKg = item.produtos?.unidade_medida === 'kg';
    const qty = isKg ? (item.peso_perdido || 0) : (item.quantidade_perdida || 0);
    return sum + qty * (item.produtos?.preco_unitario || 0);
  }, 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Relatórios</h1>
            <p className="text-muted-foreground mt-1">Análise detalhada de perdas</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToPDF} disabled={exporting || data.length === 0}>
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              PDF
            </Button>
            <Button variant="hero" onClick={exportToCSV} disabled={exporting || data.length === 0}>
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Data Inicial</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Data Final</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={filters.category} onValueChange={value => setFilters({ ...filters, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="verdura">Verduras</SelectItem>
                    <SelectItem value="legume">Legumes</SelectItem>
                    <SelectItem value="fruta">Frutas</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Produto</Label>
                <Select value={filters.product} onValueChange={value => setFilters({ ...filters, product: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nome_produto}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button onClick={handleFilter} className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Filtrar'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total de Registros</p>
            <p className="text-2xl font-bold">{data.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Quantidade Total</p>
            <p className="text-2xl font-bold">{totalQuantity.toFixed(2)} kg</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Valor Total Perdido</p>
            <p className="text-2xl font-bold text-destructive">R$ {totalValue.toFixed(2)}</p>
          </Card>
        </div>

        {/* Data Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Operador</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <FileText className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
                        <p className="text-muted-foreground">Nenhum dado encontrado</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map(item => {
                      const isKg = item.produtos?.unidade_medida === 'kg';
                      const qty = isKg ? (item.peso_perdido || 0) : (item.quantidade_perdida || 0);
                      const value = qty * (item.produtos?.preco_unitario || 0);
                      
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            {format(new Date(item.data_perda), 'dd/MM/yyyy', { locale: ptBR })}
                          </TableCell>
                          <TableCell className="font-medium">
                            {item.produtos?.nome_produto || 'N/A'}
                          </TableCell>
                          <TableCell className="capitalize">
                            {item.produtos?.categoria || 'N/A'}
                          </TableCell>
                          <TableCell className="capitalize">
                            {item.produtos?.unidade_medida || 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">{qty.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-destructive font-medium">
                            R$ {value.toFixed(2)}
                          </TableCell>
                          <TableCell className="capitalize">{item.motivo_perda}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.profiles?.nome || 'N/A'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Reports;
