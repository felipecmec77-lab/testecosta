import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Download, Share2, X, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

// Helper para converter string de data para Date sem problemas de timezone
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

interface ItemOferta {
  id?: string;
  nome_item: string;
  preco_custo: number;
  preco_venda_normal: number;
  preco_oferta: number;
  margem_lucro?: number;
  economia_percentual?: number;
  destaque: boolean;
}

interface Oferta {
  id: string;
  nome_campanha: string;
  data_inicio: string;
  data_fim: string;
  tipo: string;
  setor: string;
  observacao: string | null;
}

interface OfertasPDFProps {
  oferta: Oferta;
  itens: ItemOferta[];
  onClose: () => void;
  forMarketing?: boolean;
}

const TIPOS_OFERTA: Record<string, string> = {
  'fim_de_semana': 'FIM DE SEMANA',
  'semanal': 'SEMANAL',
  'quinzenal': 'QUINZENAL',
  'mensal': 'MENSAL',
};

const SETORES: Record<string, string> = {
  'geral': 'GERAL',
  'varejo': 'VAREJO',
  'hortifruti': 'HORTIFRÚTI',
};

// Calcular margem de lucro baseado no custo vs oferta
const calcularMargemLucro = (precoCusto: number, precoOferta: number) => {
  if (precoCusto <= 0) return 0;
  return ((precoOferta - precoCusto) / precoCusto) * 100;
};

const OfertasPDF = ({ oferta, itens, onClose, forMarketing = false }: OfertasPDFProps) => {
  const previewRef = useRef<HTMLDivElement>(null);

  const generatePDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(220, 38, 38);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('COMERCIAL COSTA', pageWidth / 2, 18, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(forMarketing ? 'LISTA DE OFERTAS - MARKETING' : 'LISTA DE OFERTAS PARA ENCARTE', pageWidth / 2, 28, { align: 'center' });
    
    // Campaign info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(oferta.nome_campanha.toUpperCase(), 14, 50);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`PERÍODO: ${format(parseLocalDate(oferta.data_inicio), "dd 'DE' MMMM", { locale: ptBR }).toUpperCase()} A ${format(parseLocalDate(oferta.data_fim), "dd 'DE' MMMM 'DE' yyyy", { locale: ptBR }).toUpperCase()}`, 14, 58);
    doc.text(`TIPO: ${TIPOS_OFERTA[oferta.tipo] || oferta.tipo.toUpperCase()} | SETOR: ${SETORES[oferta.setor] || oferta.setor.toUpperCase()}`, 14, 65);
    
    // Sort items - destaques first
    const sortedItens = [...itens].sort((a, b) => {
      if (a.destaque && !b.destaque) return -1;
      if (!a.destaque && b.destaque) return 1;
      return 0;
    });
    
    // Format prices with fixed width for alignment
    const formatPrice = (value: number) => {
      return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };
    
    // Table data - different columns for marketing vs complete
    let tableHead: string[][];
    let tableData: string[][];

    if (forMarketing) {
      tableHead = [['PRODUTO', 'VALOR OFERTA', 'MARGEM', 'DESTAQUE']];
      tableData = sortedItens.map(item => [
        item.nome_item.toUpperCase(),
        formatPrice(item.preco_oferta),
        `${calcularMargemLucro(item.preco_custo, item.preco_oferta).toFixed(0)}%`,
        item.destaque ? 'SIM' : 'NÃO'
      ]);
    } else {
      tableHead = [['PRODUTO', 'CUSTO', 'OFERTA', 'MARGEM LUCRO', 'DESTAQUE']];
      tableData = sortedItens.map(item => [
        item.nome_item.toUpperCase(),
        formatPrice(item.preco_custo),
        formatPrice(item.preco_oferta),
        `${calcularMargemLucro(item.preco_custo, item.preco_oferta).toFixed(0)}%`,
        item.destaque ? 'SIM' : 'NÃO'
      ]);
    }

    // Calculate column widths based on page width
    const margin = 14;
    const tableWidth = pageWidth - (margin * 2);
    
    const columnStyles = forMarketing ? {
      0: { cellWidth: tableWidth * 0.45, halign: 'center' as const },
      1: { cellWidth: tableWidth * 0.22, halign: 'center' as const, fontStyle: 'bold' as const },
      2: { cellWidth: tableWidth * 0.16, halign: 'center' as const },
      3: { cellWidth: tableWidth * 0.17, halign: 'center' as const }
    } : {
      0: { cellWidth: tableWidth * 0.40, halign: 'center' as const },
      1: { cellWidth: tableWidth * 0.15, halign: 'center' as const },
      2: { cellWidth: tableWidth * 0.15, halign: 'center' as const, fontStyle: 'bold' as const },
      3: { cellWidth: tableWidth * 0.15, halign: 'center' as const },
      4: { cellWidth: tableWidth * 0.15, halign: 'center' as const }
    };

    autoTable(doc, {
      head: tableHead,
      body: tableData,
      startY: 75,
      margin: { left: margin, right: margin },
      tableWidth: 'auto',
      theme: 'striped',
      headStyles: { 
        fillColor: [220, 38, 38],
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold',
        cellPadding: 4
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles,
      alternateRowStyles: {
        fillColor: [248, 248, 248]
      },
      styles: {
        overflow: 'linebreak',
        valign: 'middle',
        lineWidth: 0.1,
        lineColor: [220, 220, 220]
      },
      didParseCell: (data) => {
        // Apply center alignment for all header columns
        if (data.section === 'head') {
          data.cell.styles.halign = 'center';
        }
        // Highlight destaque items in product column
        if (data.section === 'body' && data.column.index === 0) {
          const row = sortedItens[data.row.index];
          if (row?.destaque) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = [220, 38, 38];
          }
        }
        // Green color for economy column
        const economyColIndex = forMarketing ? 2 : 3;
        if (data.section === 'body' && data.column.index === economyColIndex) {
          data.cell.styles.textColor = [22, 163, 74];
          data.cell.styles.fontStyle = 'bold';
        }
        // Destaque column styling
        const destaqueColIndex = forMarketing ? 3 : 4;
        if (data.section === 'body' && data.column.index === destaqueColIndex) {
          const cellText = data.cell.text.join('');
          if (cellText === 'SIM') {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    // Footer
    const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    
    doc.setDrawColor(200, 200, 200);
    doc.line(14, finalY + 10, 196, finalY + 10);
    
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`TOTAL DE ${itens.length} ITENS EM OFERTA`, 14, finalY + 18);
    doc.text(`GERADO EM ${format(new Date(), "dd/MM/yyyy 'ÀS' HH:mm", { locale: ptBR }).toUpperCase()}`, 14, finalY + 24);
    
    if (oferta.observacao) {
      doc.setFontSize(10);
      doc.text(`OBS: ${oferta.observacao.toUpperCase()}`, 14, finalY + 32);
    }
    
    const footerText = forMarketing 
      ? 'COMERCIAL COSTA - LISTA PARA EQUIPE DE MARKETING' 
      : 'COMERCIAL COSTA - LISTA PARA CRIAÇÃO DE ENCARTE';
    doc.text(footerText, 196, finalY + 24, { align: 'right' });
    
    // Save
    const suffix = forMarketing ? '-marketing' : '';
    doc.save(`ofertas-${oferta.nome_campanha.replace(/\s+/g, '-').toLowerCase()}${suffix}.pdf`);
  };

  const generateImage = async () => {
    if (!previewRef.current) return;
    
    const canvas = await html2canvas(previewRef.current, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
    });
    
    const suffix = forMarketing ? '-marketing' : '';
    const link = document.createElement('a');
    link.download = `ofertas-${oferta.nome_campanha.replace(/\s+/g, '-').toLowerCase()}${suffix}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const shareWhatsApp = async () => {
    // Generate text summary for WhatsApp
    let text = `*${oferta.nome_campanha.toUpperCase()}*\n\n`;
    text += `📅 ${format(parseLocalDate(oferta.data_inicio), 'dd/MM', { locale: ptBR })} A ${format(parseLocalDate(oferta.data_fim), 'dd/MM/yyyy', { locale: ptBR })}\n\n`;
    text += `*OFERTAS:*\n`;
    
    itens.forEach(item => {
      text += `${item.destaque ? '⭐ ' : ''}${item.nome_item.toUpperCase()}\n`;
      if (forMarketing) {
        text += `   VALOR: R$ ${item.preco_oferta.toFixed(2)} (${calcularMargemLucro(item.preco_custo, item.preco_oferta).toFixed(0)}% margem)\n`;
      } else {
        text += `   CUSTO: R$ ${item.preco_custo.toFixed(2)} → OFERTA: R$ ${item.preco_oferta.toFixed(2)} (${calcularMargemLucro(item.preco_custo, item.preco_oferta).toFixed(0)}% margem)\n`;
      }
      text += `   DESTAQUE: ${item.destaque ? 'SIM' : 'NÃO'}\n\n`;
    });
    
    text += `_LISTA GERADA PELO SISTEMA COMERCIAL COSTA_`;
    
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  // Sort items for display
  const sortedItens = [...itens].sort((a, b) => {
    if (a.destaque && !b.destaque) return -1;
    if (!a.destaque && b.destaque) return 1;
    return 0;
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {forMarketing ? (
              <>
                <Users className="h-5 w-5 text-secondary" />
                PRÉVIA PDF - MARKETING
              </>
            ) : (
              'PRÉVIA DO PDF'
            )}
          </DialogTitle>
        </DialogHeader>

        {forMarketing && (
          <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-3 text-sm">
            <p className="font-medium text-secondary">PDF para Equipe de Marketing</p>
            <p className="text-muted-foreground">Este PDF não contém preços de custo, apenas itens e valores de oferta.</p>
          </div>
        )}

        {/* Preview */}
        <div 
          ref={previewRef}
          className="bg-white p-6 rounded-lg border shadow-sm text-black"
          style={{ minWidth: '500px' }}
        >
          {/* Header */}
          <div className="bg-red-600 text-white p-4 rounded-t-lg -mx-6 -mt-6 mb-4">
            <h1 className="text-2xl font-bold text-center">COMERCIAL COSTA</h1>
            <p className="text-center text-sm opacity-90">
              {forMarketing ? 'LISTA DE OFERTAS - MARKETING' : 'LISTA DE OFERTAS PARA ENCARTE'}
            </p>
          </div>

          {/* Campaign Info */}
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900">{oferta.nome_campanha.toUpperCase()}</h2>
            <p className="text-sm text-gray-600">
              PERÍODO: {format(parseLocalDate(oferta.data_inicio), "dd 'DE' MMMM", { locale: ptBR }).toUpperCase()} A {format(parseLocalDate(oferta.data_fim), "dd 'DE' MMMM 'DE' yyyy", { locale: ptBR }).toUpperCase()}
            </p>
            <p className="text-sm text-gray-600">
              {TIPOS_OFERTA[oferta.tipo]} • {SETORES[oferta.setor]}
            </p>
          </div>

          {/* Items Table */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-red-600">
                <th className="text-left py-2 font-bold">PRODUTO</th>
                {!forMarketing && <th className="text-right py-2 font-bold">CUSTO</th>}
                <th className="text-right py-2 font-bold">{forMarketing ? 'VALOR OFERTA' : 'OFERTA'}</th>
                <th className="text-center py-2 font-bold">MARGEM LUCRO</th>
                <th className="text-center py-2 font-bold">DESTAQUE</th>
              </tr>
            </thead>
            <tbody>
              {sortedItens.map((item, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className={`py-2 ${item.destaque ? 'font-bold text-red-600' : 'text-gray-900'}`}>
                    {item.destaque && '★ '}{item.nome_item.toUpperCase()}
                  </td>
                  {!forMarketing && (
                    <td className="text-right py-2 text-gray-500">
                      R$ {item.preco_custo.toFixed(2)}
                    </td>
                  )}
                  <td className="text-right py-2 font-bold text-gray-900">
                    R$ {item.preco_oferta.toFixed(2)}
                  </td>
                  <td className="text-center py-2 font-bold text-green-600">
                    {calcularMargemLucro(item.preco_custo, item.preco_oferta).toFixed(0)}%
                  </td>
                  <td className={`text-center py-2 font-bold ${item.destaque ? 'text-red-600' : 'text-gray-500'}`}>
                    {item.destaque ? 'SIM' : 'NÃO'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div className="mt-4 pt-4 border-t text-xs text-gray-600">
            <p>TOTAL DE {itens.length} ITENS EM OFERTA</p>
            <p>GERADO EM {format(new Date(), "dd/MM/yyyy 'ÀS' HH:mm", { locale: ptBR }).toUpperCase()}</p>
            {oferta.observacao && <p className="mt-1">OBS: {oferta.observacao.toUpperCase()}</p>}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            FECHAR
          </Button>
          <Button variant="outline" onClick={shareWhatsApp}>
            <Share2 className="h-4 w-4 mr-2" />
            WHATSAPP
          </Button>
          <Button variant="outline" onClick={generateImage}>
            <Download className="h-4 w-4 mr-2" />
            IMAGEM
          </Button>
          <Button onClick={generatePDF}>
            <Download className="h-4 w-4 mr-2" />
            BAIXAR PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OfertasPDF;
