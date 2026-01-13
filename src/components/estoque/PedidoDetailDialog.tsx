import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Send, 
  CheckCircle, 
  Truck, 
  XCircle, 
  Calendar,
  User,
  CreditCard,
  Package,
  Edit,
  Download,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generatePedidoPDF } from "./PedidoPDF";

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

interface ItemOrdem {
  id: string;
  nome_produto: string;
  codigo_barras: string | null;
  quantidade: number;
  preco_unitario: number;
  preco_total: number | null;
}

interface PedidoDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedido: OrdemCompra | null;
  onEdit: () => void;
  onRefresh: () => void;
}

export function PedidoDetailDialog({ 
  open, 
  onOpenChange, 
  pedido,
  onEdit,
  onRefresh
}: PedidoDetailDialogProps) {
  const [itens, setItens] = useState<ItemOrdem[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  useEffect(() => {
    if (pedido && open) {
      fetchItens();
    }
  }, [pedido, open]);

  const fetchItens = async () => {
    if (!pedido) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('itens_ordem_compra')
        .select('*')
        .eq('ordem_compra_id', pedido.id);
      
      if (error) throw error;
      setItens(data || []);
    } catch (error) {
      console.error('Erro ao buscar itens:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      rascunho: { 
        label: 'Rascunho', 
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
        icon: <FileText className="h-4 w-4" />
      },
      enviada: { 
        label: 'Enviado', 
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        icon: <Send className="h-4 w-4" />
      },
      confirmada: { 
        label: 'Confirmado', 
        color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        icon: <CheckCircle className="h-4 w-4" />
      },
      entregue: { 
        label: 'Entregue', 
        color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
        icon: <Truck className="h-4 w-4" />
      },
      cancelada: { 
        label: 'Cancelado', 
        color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        icon: <XCircle className="h-4 w-4" />
      }
    };
    return configs[status] || configs.rascunho;
  };

  const updateStatus = async (newStatus: string) => {
    if (!pedido) return;
    setUpdating(true);
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'entregue') {
        updateData.data_entrega_real = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('ordens_compra')
        .update(updateData)
        .eq('id', pedido.id);
      
      if (error) throw error;
      
      toast.success(`Pedido ${newStatus === 'cancelada' ? 'cancelado' : 'atualizado'} com sucesso!`);
      onRefresh();
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Erro ao atualizar pedido: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!pedido) return;
    setGeneratingPDF(true);
    try {
      await generatePedidoPDF(pedido, itens);
      toast.success("PDF gerado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF");
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (!pedido) return null;

  const statusConfig = getStatusConfig(pedido.status);
  const total = itens.reduce((sum, item) => sum + (item.preco_total || item.quantidade * item.preco_unitario), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">
              Pedido #{String(pedido.numero).padStart(6, '0')}
            </DialogTitle>
            <Badge className={`${statusConfig.color} gap-1 text-sm px-3 py-1`}>
              {statusConfig.icon}
              {statusConfig.label}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Info Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <User className="h-4 w-4" />
                  Fornecedor
                </div>
                <p className="font-semibold mt-1">{pedido.fornecedores?.nome || '-'}</p>
                {pedido.fornecedores?.telefone && (
                  <p className="text-xs text-muted-foreground">{pedido.fornecedores.telefone}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Calendar className="h-4 w-4" />
                  Data do Pedido
                </div>
                <p className="font-semibold mt-1">{formatDate(pedido.criado_em)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Truck className="h-4 w-4" />
                  Entrega Prevista
                </div>
                <p className="font-semibold mt-1">{formatDate(pedido.data_entrega_prevista)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <CreditCard className="h-4 w-4" />
                  Pagamento
                </div>
                <p className="font-semibold mt-1">{pedido.condicao_pagamento || '-'}</p>
              </CardContent>
            </Card>
          </div>

          {pedido.observacao && (
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">Observações:</p>
              <p className="text-sm">{pedido.observacao}</p>
            </div>
          )}

          <Separator />

          {/* Items Table */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Itens do Pedido ({itens.length})
            </h3>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando itens...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-center">Qtd</TableHead>
                    <TableHead className="text-right">Preço Unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">
                        {item.codigo_barras || '-'}
                      </TableCell>
                      <TableCell className="font-medium">{item.nome_produto}</TableCell>
                      <TableCell className="text-center">{item.quantidade}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.preco_unitario)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(item.preco_total || item.quantidade * item.preco_unitario)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <div className="flex justify-end mt-4 pt-4 border-t">
              <div className="text-right">
                <p className="text-muted-foreground">Total do Pedido</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(total)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Actions based on status */}
          <div className="flex justify-between items-center">
            <Button 
              variant="outline" 
              onClick={handleGeneratePDF}
              disabled={generatingPDF || loading}
            >
              {generatingPDF ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Baixar PDF
            </Button>

            <div className="flex gap-3">
              {pedido.status === 'rascunho' && (
                <>
                  <Button variant="outline" onClick={onEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => updateStatus('cancelada')}
                    disabled={updating}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button onClick={() => updateStatus('enviada')} disabled={updating}>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Pedido
                  </Button>
                </>
              )}

              {pedido.status === 'enviada' && (
                <>
                  <Button 
                    variant="destructive" 
                    onClick={() => updateStatus('cancelada')}
                    disabled={updating}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button onClick={() => updateStatus('confirmada')} disabled={updating}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirmar Recebimento
                  </Button>
                </>
              )}

              {pedido.status === 'confirmada' && (
                <Button onClick={() => updateStatus('entregue')} disabled={updating}>
                  <Truck className="h-4 w-4 mr-2" />
                  Marcar como Entregue
                </Button>
              )}

              {(pedido.status === 'entregue' || pedido.status === 'cancelada') && (
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Fechar
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
