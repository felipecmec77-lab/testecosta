import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, FileCheck, Eye, Printer, Send, CheckCircle, Package, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface OrdemCompra {
  id: string;
  numero: number;
  cotacao_id: string | null;
  fornecedor_id: string;
  status: string;
  data_ordem: string;
  data_entrega_prevista: string | null;
  total: number;
  condicao_pagamento: string | null;
  observacao: string | null;
  criado_em: string;
  fornecedor?: {
    id: string;
    nome: string;
    telefone: string | null;
    email: string | null;
    endereco: string | null;
  };
}

interface ItemOrdem {
  id: string;
  nome_produto: string;
  quantidade: number;
  preco_unitario: number;
  preco_total: number;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  rascunho: { label: 'Rascunho', color: 'bg-gray-500/20 text-gray-500' },
  enviada: { label: 'Enviada', color: 'bg-blue-500/20 text-blue-500' },
  confirmada: { label: 'Confirmada', color: 'bg-green-500/20 text-green-500' },
  entregue: { label: 'Entregue', color: 'bg-emerald-500/20 text-emerald-500' },
  cancelada: { label: 'Cancelada', color: 'bg-red-500/20 text-red-500' },
};

const OrdensCompra = () => {
  const [ordens, setOrdens] = useState<OrdemCompra[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrdem, setSelectedOrdem] = useState<OrdemCompra | null>(null);
  const [itensOrdem, setItensOrdem] = useState<ItemOrdem[]>([]);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    fetchOrdens();
  }, []);

  const fetchOrdens = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ordens_compra')
        .select('*, fornecedor:fornecedores(*)')
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setOrdens(data || []);
    } catch (error) {
      console.error('Erro ao carregar ordens:', error);
      toast.error('Erro ao carregar ordens de compra');
    } finally {
      setLoading(false);
    }
  };

  const viewOrdemDetail = async (ordem: OrdemCompra) => {
    setSelectedOrdem(ordem);
    try {
      const { data, error } = await supabase
        .from('itens_ordem_compra')
        .select('*')
        .eq('ordem_compra_id', ordem.id);

      if (error) throw error;
      setItensOrdem(data || []);
      setShowDetail(true);
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
      toast.error('Erro ao carregar itens da ordem');
    }
  };

  const updateOrdemStatus = async (ordemId: string, status: 'rascunho' | 'enviada' | 'confirmada' | 'entregue' | 'cancelada') => {
    try {
      const { error } = await supabase
        .from('ordens_compra')
        .update({ status })
        .eq('id', ordemId);

      if (error) throw error;
      toast.success(`Ordem ${status === 'enviada' ? 'enviada' : status === 'confirmada' ? 'confirmada' : status === 'entregue' ? 'marcada como entregue' : 'atualizada'}!`);
      fetchOrdens();
      setShowDetail(false);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const generatePDF = (ordem: OrdemCompra, itens: ItemOrdem[]) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('ORDEM DE COMPRA', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Nº ${ordem.numero}`, 105, 28, { align: 'center' });
    
    // Info
    doc.setFontSize(10);
    doc.text(`Data: ${format(new Date(ordem.data_ordem), 'dd/MM/yyyy', { locale: ptBR })}`, 14, 45);
    if (ordem.data_entrega_prevista) {
      doc.text(`Entrega Prevista: ${format(new Date(ordem.data_entrega_prevista), 'dd/MM/yyyy', { locale: ptBR })}`, 14, 52);
    }
    
    // Fornecedor
    doc.setFontSize(12);
    doc.text('FORNECEDOR:', 14, 65);
    doc.setFontSize(10);
    doc.text(ordem.fornecedor?.nome || '', 14, 72);
    if (ordem.fornecedor?.endereco) doc.text(ordem.fornecedor.endereco, 14, 79);
    if (ordem.fornecedor?.telefone) doc.text(`Tel: ${ordem.fornecedor.telefone}`, 14, 86);
    if (ordem.fornecedor?.email) doc.text(`Email: ${ordem.fornecedor.email}`, 14, 93);
    
    // Items table
    const tableData = itens.map(item => [
      item.nome_produto,
      item.quantidade.toString(),
      `R$ ${item.preco_unitario.toFixed(2)}`,
      `R$ ${item.preco_total.toFixed(2)}`
    ]);

    autoTable(doc, {
      head: [['Produto', 'Qtd', 'Preço Unit.', 'Total']],
      body: tableData,
      startY: 105,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });

    const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    
    // Total
    doc.setFontSize(14);
    doc.text(`TOTAL: R$ ${ordem.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, finalY + 15);
    
    if (ordem.condicao_pagamento) {
      doc.setFontSize(10);
      doc.text(`Condição de Pagamento: ${ordem.condicao_pagamento}`, 14, finalY + 25);
    }
    
    if (ordem.observacao) {
      doc.text(`Observação: ${ordem.observacao}`, 14, finalY + 32);
    }
    
    doc.save(`ordem-compra-${ordem.numero}.pdf`);
    toast.success('PDF gerado com sucesso!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-primary">{ordens.length}</p>
            <p className="text-sm text-muted-foreground">Total de Ordens</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-blue-500">
              {ordens.filter(o => o.status === 'enviada').length}
            </p>
            <p className="text-sm text-muted-foreground">Enviadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-green-500">
              {ordens.filter(o => o.status === 'confirmada').length}
            </p>
            <p className="text-sm text-muted-foreground">Confirmadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-emerald-500">
              {ordens.filter(o => o.status === 'entregue').length}
            </p>
            <p className="text-sm text-muted-foreground">Entregues</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Ordens */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="w-5 h-5" />
            Ordens de Compra
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ordens.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma ordem de compra encontrada.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordens.map((ordem) => (
                  <TableRow key={ordem.id}>
                    <TableCell className="font-mono">#{ordem.numero}</TableCell>
                    <TableCell>{ordem.fornecedor?.nome}</TableCell>
                    <TableCell>
                      {format(new Date(ordem.data_ordem), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      R$ {ordem.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig[ordem.status]?.color}>
                        {statusConfig[ordem.status]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => viewOrdemDetail(ordem)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalhes */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ordem de Compra #{selectedOrdem?.numero}</DialogTitle>
          </DialogHeader>
          
          {selectedOrdem && (
            <div className="space-y-4">
              {/* Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Fornecedor</p>
                  <p className="font-medium">{selectedOrdem.fornecedor?.nome}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data</p>
                  <p className="font-medium">
                    {format(new Date(selectedOrdem.data_ordem), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
                {selectedOrdem.data_entrega_prevista && (
                  <div>
                    <p className="text-sm text-muted-foreground">Entrega Prevista</p>
                    <p className="font-medium">
                      {format(new Date(selectedOrdem.data_entrega_prevista), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={statusConfig[selectedOrdem.status]?.color}>
                    {statusConfig[selectedOrdem.status]?.label}
                  </Badge>
                </div>
              </div>

              {/* Itens */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-center">Qtd</TableHead>
                    <TableHead className="text-right">Preço Unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itensOrdem.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.nome_produto}</TableCell>
                      <TableCell className="text-center">{item.quantidade}</TableCell>
                      <TableCell className="text-right">
                        R$ {item.preco_unitario.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {item.preco_total.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex justify-between items-center border-t pt-4">
                <span className="text-lg font-bold">Total:</span>
                <span className="text-2xl font-bold text-primary">
                  R$ {selectedOrdem.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 justify-end border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => generatePDF(selectedOrdem, itensOrdem)}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir PDF
                </Button>
                
                {selectedOrdem.status === 'rascunho' && (
                  <Button
                    className="bg-blue-500 hover:bg-blue-600"
                    onClick={() => updateOrdemStatus(selectedOrdem.id, 'enviada')}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Enviar ao Fornecedor
                  </Button>
                )}
                
                {selectedOrdem.status === 'enviada' && (
                  <Button
                    className="bg-green-500 hover:bg-green-600"
                    onClick={() => updateOrdemStatus(selectedOrdem.id, 'confirmada')}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirmar Recebimento
                  </Button>
                )}
                
                {selectedOrdem.status === 'confirmada' && (
                  <Button
                    className="bg-emerald-500 hover:bg-emerald-600"
                    onClick={() => updateOrdemStatus(selectedOrdem.id, 'entregue')}
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Marcar como Entregue
                  </Button>
                )}
                
                {['rascunho', 'enviada'].includes(selectedOrdem.status) && (
                  <Button
                    variant="destructive"
                    onClick={() => updateOrdemStatus(selectedOrdem.id, 'cancelada')}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrdensCompra;
