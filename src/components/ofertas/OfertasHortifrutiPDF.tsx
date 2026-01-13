import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Download, Share2, X } from 'lucide-react';
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
    
    // Header verde para hortifruti
    doc.setFillColor(22, 163, 74);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('COMERCIAL COSTA', pageWidth / 2, 18, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('OFERTAS HORTIFRUTI', pageWidth / 2, 28, { align: 'center' });
    
    // Campaign info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(oferta.nome_campanha.toUpperCase(), 14, 50);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`PERÍODO: ${format(parseLocalDate(oferta.data_inicio), "dd 'DE' MMMM", { locale: ptBR }).toUpperCase()} A ${format(parseLocalDate(oferta.data_fim), "dd 'DE' MMMM 'DE' yyyy", { locale: ptBR }).toUpperCase()}`, 14, 58);
    doc.text(`TIPO: ${TIPOS_OFERTA[oferta.tipo] || oferta.tipo.toUpperCase()}`, 14, 65);
    
    const pdfTitle = forMarketing ? 'OFERTAS HORTIFRUTI - MARKETING' : 'OFERTAS HORTIFRUTI - INTERNO';
    doc.setTextColor(255, 255, 255);
    doc.text(pdfTitle, pageWidth / 2, 28, { align: 'center' });
    
    // Sort items - destaques first
    const sortedItens = [...itens].sort((a, b) => {
      if (a.destaque && !b.destaque) return -1;
      if (!a.destaque && b.destaque) return 1;
      return 0;
    });
    
    // Format prices
    const formatPrice = (value: number) => {
      return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };
    
    // Table structure based on forMarketing
    const margin = 14;
    const tableWidth = pageWidth - (margin * 2);
    
    let tableHead: string[][];
    let tableData: string[][];
    let columnStyles: Record<number, { cellWidth: number; halign: 'center'; fontStyle?: 'bold' }>;
    
    if (forMarketing) {
      // Marketing: Produto, Oferta, Destaque (sem custo/margem)
      tableHead = [['PRODUTO', 'VALOR OFERTA', 'DESTAQUE']];
      tableData = sortedItens.map(item => [
        item.nome_item.toUpperCase(),
        formatPrice(item.preco_oferta),
        item.destaque ? 'SIM' : 'NÃO'
      ]);
      columnStyles = {
        0: { cellWidth: tableWidth * 0.55, halign: 'center' as const },
        1: { cellWidth: tableWidth * 0.25, halign: 'center' as const, fontStyle: 'bold' as const },
        2: { cellWidth: tableWidth * 0.20, halign: 'center' as const }
      };
    } else {
      // Interno: Produto, Custo, Oferta, Margem, Destaque
      tableHead = [['PRODUTO', 'CUSTO', 'OFERTA', 'MARGEM', 'DESTAQUE']];
      tableData = sortedItens.map(item => [
        item.nome_item.toUpperCase(),
        formatPrice(item.preco_custo),
        formatPrice(item.preco_oferta),
        `${calcularMargemLucro(item.preco_custo, item.preco_oferta).toFixed(0)}%`,
        item.destaque ? 'SIM' : 'NÃO'
      ]);
      columnStyles = {
        0: { cellWidth: tableWidth * 0.35, halign: 'center' as const },
        1: { cellWidth: tableWidth * 0.15, halign: 'center' as const },
        2: { cellWidth: tableWidth * 0.15, halign: 'center' as const, fontStyle: 'bold' as const },
        3: { cellWidth: tableWidth * 0.18, halign: 'center' as const },
        4: { cellWidth: tableWidth * 0.17, halign: 'center' as const }
      };
    }

    autoTable(doc, {
      head: tableHead,
      body: tableData,
      startY: 75,
      margin: { left: margin, right: margin },
      tableWidth: 'auto',
      theme: 'striped',
      headStyles: { 
        fillColor: [22, 163, 74],
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
        // Destaque column styling
        if (data.section === 'body' && data.column.index === 2) {
          const cellText = data.cell.text.join('');
          if (cellText === 'SIM') {
            data.cell.styles.textColor = [22, 163, 74];
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
    
    doc.text('COMERCIAL COSTA - HORTIFRUTI', 196, finalY + 24, { align: 'right' });
    
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
    text += `*OFERTAS HORTIFRUTI*\n\n`;
    text += `${format(parseLocalDate(oferta.data_inicio), 'dd/MM', { locale: ptBR })} A ${format(parseLocalDate(oferta.data_fim), 'dd/MM/yyyy', { locale: ptBR })}\n\n`;
    
    itens.forEach(item => {
      text += `${item.destaque ? '* ' : ''}${item.nome_item.toUpperCase()}\n`;
      text += `   R$ ${item.preco_oferta.toFixed(2).replace('.', ',')}\n\n`;
    });
    
    text += `_COMERCIAL COSTA - HORTIFRUTI_`;
    
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
            OFERTAS HORTIFRUTI - PRÉVIA
          </DialogTitle>
        </DialogHeader>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
          <p className="font-medium text-green-700">PDF Simplificado para Hortifruti</p>
          <p className="text-green-600">Contém apenas: Produto, Preço de Oferta e Destaque.</p>
        </div>

        {/* Preview */}
        <div 
          ref={previewRef}
          className="bg-white p-6 rounded-lg border shadow-sm text-black"
          style={{ minWidth: '400px' }}
        >
          {/* Header verde */}
          <div className="bg-green-600 text-white p-4 rounded-t-lg -mx-6 -mt-6 mb-4">
            <h1 className="text-2xl font-bold text-center">COMERCIAL COSTA</h1>
            <p className="text-center text-sm opacity-90">OFERTAS HORTIFRUTI</p>
          </div>

          {/* Campaign Info */}
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900">{oferta.nome_campanha.toUpperCase()}</h2>
            <p className="text-sm text-gray-600">
              PERÍODO: {format(parseLocalDate(oferta.data_inicio), "dd 'DE' MMMM", { locale: ptBR }).toUpperCase()} A {format(parseLocalDate(oferta.data_fim), "dd 'DE' MMMM 'DE' yyyy", { locale: ptBR }).toUpperCase()}
            </p>
            <p className="text-sm text-gray-600">
              {TIPOS_OFERTA[oferta.tipo]}
            </p>
          </div>

          {/* Items Table - Simplified */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-green-600">
                <th className="text-left py-2 font-bold">PRODUTO</th>
                <th className="text-right py-2 font-bold">OFERTA</th>
                <th className="text-center py-2 font-bold">DESTAQUE</th>
              </tr>
            </thead>
            <tbody>
              {sortedItens.map((item, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className={`py-2 ${item.destaque ? 'font-bold text-green-600' : 'text-gray-900'}`}>
                    {item.destaque && '* '}{item.nome_item.toUpperCase()}
                  </td>
                  <td className="text-right py-2 font-bold text-gray-900">
                    R$ {item.preco_oferta.toFixed(2).replace('.', ',')}
                  </td>
                  <td className={`text-center py-2 font-bold ${item.destaque ? 'text-green-600' : 'text-gray-500'}`}>
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
