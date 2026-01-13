import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import logoApp from "@/assets/logo-app.png";

interface ItemOrdem {
  id: string;
  nome_produto: string;
  codigo_barras: string | null;
  quantidade: number;
  preco_unitario: number;
  preco_total: number | null;
}

interface OrdemCompra {
  id: string;
  numero: number;
  status: string;
  data_ordem: string | null;
  data_entrega_prevista: string | null;
  data_entrega_real: string | null;
  fornecedor_id: string;
  condicao_pagamento: string | null;
  observacao: string | null;
  total: number | null;
  criado_em: string | null;
  fornecedores?: {
    nome: string;
    telefone: string | null;
    email: string | null;
    endereco: string | null;
    cnpj: string | null;
  };
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const formatDate = (date: string | null) => {
  if (!date) return '-';
  return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    rascunho: 'RASCUNHO',
    enviada: 'ENVIADO',
    confirmada: 'CONFIRMADO',
    entregue: 'ENTREGUE',
    cancelada: 'CANCELADO'
  };
  return labels[status] || status.toUpperCase();
};

export async function generatePedidoPDF(pedido: OrdemCompra, itens: ItemOrdem[]): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Load logo
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    await new Promise<void>((resolve) => {
      img.onload = () => {
        // Header background
        doc.setFillColor(34, 197, 94); // Green
        doc.rect(0, 0, pageWidth, 45, 'F');
        
        // Add logo
        try {
          doc.addImage(img, 'PNG', 14, 8, 30, 30);
        } catch (e) {
          console.log('Could not add logo to PDF');
        }
        resolve();
      };
      img.onerror = () => resolve();
      img.src = logoApp;
    });
  } catch (e) {
    // Header without logo
    doc.setFillColor(34, 197, 94);
    doc.rect(0, 0, pageWidth, 45, 'F');
  }
  
  // Company Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('COMERCIAL COSTA', 50, 20);
  
  // Document Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('PEDIDO DE COMPRA', 50, 30);
  
  // Order Number
  doc.setFontSize(12);
  doc.text(`Nº ${String(pedido.numero).padStart(6, '0')}`, 50, 38);
  
  // Status badge on the right
  const statusLabel = getStatusLabel(pedido.status);
  doc.setFontSize(10);
  const statusWidth = doc.getTextWidth(statusLabel) + 10;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageWidth - statusWidth - 14, 15, statusWidth, 12, 2, 2, 'F');
  doc.setTextColor(34, 197, 94);
  doc.text(statusLabel, pageWidth - 14 - statusWidth / 2, 23, { align: 'center' });
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  // Info Section
  let yPos = 55;
  
  // Dates row
  doc.setFillColor(240, 240, 240);
  doc.rect(14, yPos, pageWidth - 28, 25, 'F');
  
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Data do Pedido', 20, yPos + 8);
  doc.text('Entrega Prevista', 70, yPos + 8);
  doc.text('Entrega Real', 120, yPos + 8);
  doc.text('Condição Pagamento', 165, yPos + 8);
  
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(formatDate(pedido.criado_em), 20, yPos + 18);
  doc.text(formatDate(pedido.data_entrega_prevista), 70, yPos + 18);
  doc.text(formatDate(pedido.data_entrega_real), 120, yPos + 18);
  doc.text(pedido.condicao_pagamento || '-', 165, yPos + 18);
  
  yPos += 35;
  
  // Supplier Section
  doc.setFillColor(59, 130, 246); // Blue
  doc.rect(14, yPos, pageWidth - 28, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('FORNECEDOR', 20, yPos + 6);
  
  yPos += 12;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(pedido.fornecedores?.nome || 'Não informado', 20, yPos);
  
  yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  
  if (pedido.fornecedores?.cnpj) {
    doc.text(`CNPJ: ${pedido.fornecedores.cnpj}`, 20, yPos);
    yPos += 6;
  }
  if (pedido.fornecedores?.endereco) {
    doc.text(`Endereço: ${pedido.fornecedores.endereco}`, 20, yPos);
    yPos += 6;
  }
  if (pedido.fornecedores?.telefone) {
    doc.text(`Telefone: ${pedido.fornecedores.telefone}`, 20, yPos);
    yPos += 6;
  }
  if (pedido.fornecedores?.email) {
    doc.text(`Email: ${pedido.fornecedores.email}`, 20, yPos);
    yPos += 6;
  }
  
  yPos += 8;
  
  // Items Table
  doc.setFillColor(59, 130, 246);
  doc.rect(14, yPos, pageWidth - 28, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`ITENS DO PEDIDO (${itens.length})`, 20, yPos + 6);
  
  yPos += 12;
  
  // Table
  const tableData = itens.map((item, index) => [
    (index + 1).toString(),
    item.codigo_barras || '-',
    item.nome_produto,
    item.quantidade.toString(),
    formatCurrency(item.preco_unitario),
    formatCurrency(item.preco_total || item.quantidade * item.preco_unitario)
  ]);
  
  autoTable(doc, {
    head: [['#', 'Código', 'Produto', 'Qtd', 'Preço Unit.', 'Total']],
    body: tableData,
    startY: yPos,
    theme: 'striped',
    headStyles: { 
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 30 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 14, right: 14 }
  });
  
  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  
  // Total Section
  doc.setFillColor(34, 197, 94);
  doc.rect(pageWidth - 80, finalY + 5, 66, 20, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('TOTAL DO PEDIDO', pageWidth - 77, finalY + 13);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const total = itens.reduce((sum, item) => sum + (item.preco_total || item.quantidade * item.preco_unitario), 0);
  doc.text(formatCurrency(total), pageWidth - 77, finalY + 22);
  
  // Observations
  if (pedido.observacao) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Observações:', 14, finalY + 35);
    doc.setFont('helvetica', 'normal');
    doc.text(pedido.observacao, 14, finalY + 42, { maxWidth: pageWidth - 100 });
  }
  
  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(240, 240, 240);
  doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
  
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );
  
  // Save
  doc.save(`pedido_${String(pedido.numero).padStart(6, '0')}.pdf`);
}
