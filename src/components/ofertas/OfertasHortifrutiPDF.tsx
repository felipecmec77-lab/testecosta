import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Download, Share2, X, Leaf } from 'lucide-react';
import { format } from 'date-fns';
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

interface OfertasHortifrutiPDFProps {
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

// Calcular margem de lucro
const calcularMargemLucro = (precoCusto: number, precoOferta: number) => {
  if (precoCusto <= 0) return 0;
  return ((precoOferta - precoCusto) / precoCusto) * 100;
};

const OfertasHortifrutiPDF = ({ oferta, itens, onClose, forMarketing = false }: OfertasHortifrutiPDFProps) => {
  const previewRef = useRef<HTMLDivElement>(null);

  const generatePDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header verde compacto
    doc.setFillColor(22, 163, 74);
    doc.rect(0, 0, pageWidth, 18, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('COMERCIAL COSTA', pageWidth / 2, 8, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('OFERTAS HORTIFRUTI', pageWidth / 2, 14, { align: 'center' });
    
    // Campaign info compacto
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(oferta.nome_campanha.toUpperCase(), 10, 26);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    const periodo = `${format(parseLocalDate(oferta.data_inicio), "dd/MM", { locale: ptBR })} A ${format(parseLocalDate(oferta.data_fim), "dd/MM/yyyy", { locale: ptBR })}`;
    doc.text(`${TIPOS_OFERTA[oferta.tipo] || oferta.tipo} | ${periodo}`, 10, 31);
    
    // Sort items - destaques first
    const sortedItens = [...itens].sort((a, b) => {
      if (a.destaque && !b.destaque) return -1;
      if (!a.destaque && b.destaque) return 1;
      return 0;
    });
    
    // Format prices
    const formatPrice = (value: number) => {
      return `R$ ${value.toFixed(2).replace('.', ',')}`;
    };
    
    // Table structure otimizada
    const margin = 10;
    const tableWidth = pageWidth - (margin * 2);
    
    let tableHead: string[][];
    let tableData: string[][];
    let columnStyles: Record<number, { cellWidth: number; halign: 'center' | 'left'; fontStyle?: 'bold' }>;
    
    if (forMarketing) {
      tableHead = [['PRODUTO', 'OFERTA', '★']];
      tableData = sortedItens.map(item => [
        item.nome_item.toUpperCase(),
        formatPrice(item.preco_oferta),
        item.destaque ? '★' : ''
      ]);
      columnStyles = {
        0: { cellWidth: tableWidth * 0.60, halign: 'left' as const },
        1: { cellWidth: tableWidth * 0.28, halign: 'center' as const, fontStyle: 'bold' as const },
        2: { cellWidth: tableWidth * 0.12, halign: 'center' as const }
      };
    } else {
      tableHead = [['PRODUTO', 'CUSTO', 'OFERTA', 'MARGEM', '★']];
      tableData = sortedItens.map(item => [
        item.nome_item.toUpperCase(),
        formatPrice(item.preco_custo),
        formatPrice(item.preco_oferta),
        `${calcularMargemLucro(item.preco_custo, item.preco_oferta).toFixed(0)}%`,
        item.destaque ? '★' : ''
      ]);
      columnStyles = {
        0: { cellWidth: tableWidth * 0.38, halign: 'left' as const },
        1: { cellWidth: tableWidth * 0.15, halign: 'center' as const },
        2: { cellWidth: tableWidth * 0.18, halign: 'center' as const, fontStyle: 'bold' as const },
        3: { cellWidth: tableWidth * 0.17, halign: 'center' as const },
        4: { cellWidth: tableWidth * 0.12, halign: 'center' as const }
      };
    }

    autoTable(doc, {
      head: tableHead,
      body: tableData,
      startY: 36,
      margin: { left: margin, right: margin },
      tableWidth: 'auto',
      theme: 'striped',
      headStyles: { 
        fillColor: [22, 163, 74],
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold',
        cellPadding: 2
      },
      bodyStyles: {
        fontSize: 11,
        cellPadding: 2,
        minCellHeight: 6
      },
      columnStyles,
      alternateRowStyles: {
        fillColor: [248, 253, 248]
      },
      styles: {
        overflow: 'linebreak',
        valign: 'middle',
        lineWidth: 0.1,
        lineColor: [220, 240, 220]
      },
      didParseCell: (data) => {
        if (data.section === 'head') {
          data.cell.styles.halign = 'center';
        }
        // Highlight destaque items
        if (data.section === 'body' && data.column.index === 0) {
          const row = sortedItens[data.row.index];
          if (row?.destaque) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = [22, 163, 74];
          }
        }
        // Star column styling
        const starColIndex = forMarketing ? 2 : 4;
        if (data.section === 'body' && data.column.index === starColIndex) {
          const cellText = data.cell.text.join('');
          if (cellText === '★') {
            data.cell.styles.textColor = [22, 163, 74];
            data.cell.styles.fontSize = 12;
          }
        }
        // Margin column green
        if (!forMarketing && data.section === 'body' && data.column.index === 3) {
          data.cell.styles.textColor = [22, 163, 74];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    // Footer compacto
    const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(`${itens.length} itens | Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, 10, finalY + 5);
    
    if (oferta.observacao) {
      doc.text(`Obs: ${oferta.observacao}`, 10, finalY + 9);
    }
    
    doc.text('COMERCIAL COSTA - HORTIFRUTI', pageWidth - 10, finalY + 5, { align: 'right' });
    
    // Save
    doc.save(`ofertas-hortifruti-${oferta.nome_campanha.replace(/\s+/g, '-').toLowerCase()}.pdf`);
  };

  const generateImage = async () => {
    if (!previewRef.current) return;
    
    const canvas = await html2canvas(previewRef.current, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
    });
    
    const link = document.createElement('a');
    link.download = `ofertas-hortifruti-${oferta.nome_campanha.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const shareWhatsApp = async () => {
    let text = `*${oferta.nome_campanha.toUpperCase()}*\n`;
    text += `🥬 *OFERTAS HORTIFRUTI*\n\n`;
    text += `📅 ${format(parseLocalDate(oferta.data_inicio), 'dd/MM', { locale: ptBR })} A ${format(parseLocalDate(oferta.data_fim), 'dd/MM/yyyy', { locale: ptBR })}\n\n`;
    
    itens.forEach(item => {
      text += `${item.destaque ? '⭐ ' : ''}${item.nome_item.toUpperCase()}\n`;
      text += `   *R$ ${item.preco_oferta.toFixed(2).replace('.', ',')}*\n`;
    });
    
    text += `\n_COMERCIAL COSTA - HORTIFRUTI_`;
    
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <Leaf className="h-5 w-5" />
            OFERTAS HORTIFRUTI
          </DialogTitle>
        </DialogHeader>

        <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-sm">
          <p className="font-medium text-green-700">PDF otimizado para impressão em uma folha</p>
        </div>

        {/* Preview */}
        <div 
          ref={previewRef}
          className="bg-white p-4 rounded-lg border shadow-sm text-black"
        >
          {/* Header verde compacto */}
          <div className="bg-green-600 text-white p-3 rounded-t-lg -mx-4 -mt-4 mb-3">
            <h1 className="text-xl font-bold text-center">COMERCIAL COSTA</h1>
            <p className="text-center text-xs opacity-90">OFERTAS HORTIFRUTI</p>
          </div>

          {/* Campaign Info compacto */}
          <div className="mb-3">
            <h2 className="text-lg font-bold text-gray-900">{oferta.nome_campanha.toUpperCase()}</h2>
            <p className="text-xs text-gray-600">
              {TIPOS_OFERTA[oferta.tipo]} | {format(parseLocalDate(oferta.data_inicio), "dd/MM", { locale: ptBR })} A {format(parseLocalDate(oferta.data_fim), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>

          {/* Items Table com fonte maior */}
          <table className="w-full text-base">
            <thead>
              <tr className="border-b-2 border-green-600">
                <th className="text-left py-1 font-bold">PRODUTO</th>
                {!forMarketing && <th className="text-center py-1 font-bold">CUSTO</th>}
                <th className="text-center py-1 font-bold">OFERTA</th>
                {!forMarketing && <th className="text-center py-1 font-bold">MARGEM</th>}
                <th className="text-center py-1 font-bold w-10">★</th>
              </tr>
            </thead>
            <tbody>
              {sortedItens.map((item, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className={`py-1.5 ${item.destaque ? 'font-bold text-green-600' : 'text-gray-900'}`}>
                    {item.nome_item.toUpperCase()}
                  </td>
                  {!forMarketing && (
                    <td className="text-center py-1.5 text-gray-500 text-sm">
                      R$ {item.preco_custo.toFixed(2).replace('.', ',')}
                    </td>
                  )}
                  <td className="text-center py-1.5 font-bold text-gray-900">
                    R$ {item.preco_oferta.toFixed(2).replace('.', ',')}
                  </td>
                  {!forMarketing && (
                    <td className="text-center py-1.5 font-bold text-green-600">
                      {calcularMargemLucro(item.preco_custo, item.preco_oferta).toFixed(0)}%
                    </td>
                  )}
                  <td className="text-center py-1.5 text-green-600 text-lg">
                    {item.destaque ? '★' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer compacto */}
          <div className="mt-3 pt-2 border-t text-xs text-gray-500 flex justify-between">
            <span>{itens.length} itens | {format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
            <span>COMERCIAL COSTA - HORTIFRUTI</span>
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
          <Button onClick={generatePDF} className="bg-green-600 hover:bg-green-700">
            <Download className="h-4 w-4 mr-2" />
            BAIXAR PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OfertasHortifrutiPDF;