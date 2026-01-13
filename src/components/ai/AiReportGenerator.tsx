import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileText, Loader2, Download, Sparkles } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AiReportGeneratorProps {
  className?: string;
}

export function AiReportGenerator({ className }: AiReportGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('30days');

  const generateReport = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para gerar relatórios');
        return;
      }

      toast.info('Gerando relatório com IA... Isso pode levar alguns segundos.');

      const { data, error } = await supabase.functions.invoke('generate-ai-report', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: { reportType: 'completo', period }
      });

      if (error) {
        console.error('Error generating report:', error);
        toast.error('Erro ao gerar relatório');
        return;
      }

      // Generate PDF from the data
      generatePDF(data.report);
      toast.success('Relatório gerado com sucesso!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = (report: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    doc.setFillColor(34, 197, 94);
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO INTELIGENTE', pageWidth / 2, 18, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text('Análise Gerada por IA', pageWidth / 2, 28, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Comercial Costa • ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, pageWidth / 2, 38, { align: 'center' });

    yPos = 55;
    doc.setTextColor(0, 0, 0);

    // Period and generation info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const periodLabel = period === '7days' ? '7 dias' : period === '30days' ? '30 dias' : '90 dias';
    doc.text(`Período: ${periodLabel}`, 14, yPos);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - 14 - doc.getTextWidth(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`), yPos);
    yPos += 15;

    // AI Analysis Section
    if (report.aiAnalysis) {
      // Executive Summary
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 197, 94);
      doc.text('RESUMO EXECUTIVO', 14, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      const resumo = report.aiAnalysis.resumoExecutivo || report.aiAnalysis.resumo_executivo || 'Análise não disponível';
      const resumoText = typeof resumo === 'string' ? resumo : JSON.stringify(resumo);
      const splitResumo = doc.splitTextToSize(resumoText, pageWidth - 28);
      doc.text(splitResumo, 14, yPos);
      yPos += splitResumo.length * 5 + 10;

      // Check for page break
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
    }

    // Loss Summary Table
    if (report.data?.resumoPerdas) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 197, 94);
      doc.text('RESUMO DE PERDAS', 14, yPos);
      yPos += 8;

      const perdasData = [
        ['Total em Valor', `R$ ${report.data.resumoPerdas.totalValor?.toFixed(2) || '0,00'}`],
        ['Total em Kg', `${report.data.resumoPerdas.totalKg?.toFixed(2) || '0'} kg`],
        ['Total em Unidades', `${report.data.resumoPerdas.totalUnidades || 0} un`],
        ['Total de Registros', `${report.data.resumoPerdas.totalRegistros || 0}`],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Métrica', 'Valor']],
        body: perdasData,
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94], fontStyle: 'bold' },
        styles: { fontSize: 10 },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Check for page break
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }

    // Top Products with Losses
    if (report.data?.topProdutosPerdas?.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 197, 94);
      doc.text('TOP PRODUTOS COM PERDAS', 14, yPos);
      yPos += 8;

      const produtosData = report.data.topProdutosPerdas.map((p: any) => [
        p.nome,
        `${p.kg?.toFixed(2) || '0'} kg`,
        `${p.un || 0} un`,
        `R$ ${p.valor?.toFixed(2) || '0,00'}`
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Produto', 'Kg', 'Unidades', 'Valor']],
        body: produtosData,
        theme: 'striped',
        headStyles: { fillColor: [220, 38, 38], fontStyle: 'bold' },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Check for page break
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }

    // Critical Stock
    const criticalItems = [
      ...(report.data?.estoqueCritico?.estoqueGeral || []),
      ...(report.data?.estoqueCritico?.hortifruti || [])
    ];

    if (criticalItems.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 197, 94);
      doc.text('ESTOQUE CRÍTICO', 14, yPos);
      yPos += 8;

      const estoqueData = criticalItems.slice(0, 10).map((p: any) => [
        p.nome,
        p.atual?.toString() || '0',
        p.minimo?.toString() || '0',
        (p.deficit || (p.minimo - p.atual))?.toString() || '0'
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Produto', 'Atual', 'Mínimo', 'Déficit']],
        body: estoqueData,
        theme: 'striped',
        headStyles: { fillColor: [234, 179, 8], fontStyle: 'bold', textColor: [0, 0, 0] },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Recommendations
    if (report.aiAnalysis?.recomendacoes?.length > 0) {
      // Check for page break
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 197, 94);
      doc.text('RECOMENDAÇÕES DA IA', 14, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      report.aiAnalysis.recomendacoes.forEach((rec: any, index: number) => {
        const recText = typeof rec === 'string' ? rec : rec.acao || rec.descricao || JSON.stringify(rec);
        const bulletText = `${index + 1}. ${recText}`;
        const splitText = doc.splitTextToSize(bulletText, pageWidth - 28);
        
        if (yPos + splitText.length * 5 > 280) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.text(splitText, 14, yPos);
        yPos += splitText.length * 5 + 5;
      });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Página ${i} de ${pageCount} • Relatório gerado automaticamente por IA`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    // Save
    doc.save(`relatorio-ia-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`);
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-primary" />
          Relatório com IA
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Gere um relatório PDF completo com análises de perdas, estoque e recomendações personalizadas geradas por Inteligência Artificial.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">7 dias</SelectItem>
                <SelectItem value="30days">30 dias</SelectItem>
                <SelectItem value="90days">90 dias</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              onClick={generateReport} 
              disabled={loading}
              className="gap-2 flex-1 sm:flex-none"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <Download className="h-4 w-4" />
                </>
              )}
              {loading ? 'Gerando...' : 'Gerar Relatório PDF'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
