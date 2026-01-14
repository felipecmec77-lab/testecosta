import { useState, useEffect } from "react";
import { searchAcrossFields } from "@/lib/searchUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  ShoppingCart,
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
  Loader2,
  Plus,
  Search,
  Trash2,
  Edit,
  Send,
  Truck,
  History,
  DollarSign,
  FileEdit,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { NovoPedidoDialog } from "./NovoPedidoDialog";
import { PedidoDetailDialog } from "./PedidoDetailDialog";
import { HistoricoPrecos } from "./HistoricoPrecos";

interface PedidosTabProps {
  isAdmin: boolean;
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

interface EstoqueItem {
  id: string;
  codigo: string;
  nome: string;
  codigo_barras: string | null;
  grupo: string | null;
  subgrupo: string | null;
  marca: string | null;
  preco_custo: number;
  preco_venda: number;
  estoque_atual: number;
  estoque_minimo: number;
  unidade: string | null;
}

const PedidosTab = ({ isAdmin }: PedidosTabProps) => {
  const { toast } = useToast();
  const [pedidos, setPedidos] = useState<OrdemCompra[]>([]);
  const [estoqueItems, setEstoqueItems] = useState<EstoqueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [novoPedidoOpen, setNovoPedidoOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<OrdemCompra | null>(null);
  const [editingPedido, setEditingPedido] = useState<OrdemCompra | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pedidoToDelete, setPedidoToDelete] = useState<OrdemCompra | null>(null);

  useEffect(() => {
    fetchPedidos();
    fetchEstoqueItems();
  }, []);

  const fetchEstoqueItems = async () => {
    try {
      const { data, error } = await supabase
        .from("estoque")
        .select("id, codigo, nome, codigo_barras, grupo, subgrupo, marca, preco_custo, preco_venda, estoque_atual, estoque_minimo, unidade")
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      setEstoqueItems(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar estoque:", error);
    }
  };

  const fetchPedidos = async () => {
    try {
      const { data, error } = await supabase
        .from("ordens_compra")
        .select(`
          id, numero, status, data_ordem, data_entrega_prevista, data_entrega_real,
          fornecedor_id, condicao_pagamento, observacao, total, criado_em,
          fornecedores(nome, telefone, email, endereco, cnpj)
        `)
        .order("criado_em", { ascending: false })
        .limit(100);

      if (error) throw error;
      setPedidos(data as any || []);
    } catch (error: any) {
      toast({ title: "Erro ao carregar pedidos", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePedido = async () => {
    if (!pedidoToDelete) return;
    try {
      await supabase.from("itens_ordem_compra").delete().eq("ordem_compra_id", pedidoToDelete.id);
      const { error } = await supabase.from("ordens_compra").delete().eq("id", pedidoToDelete.id);
      if (error) throw error;
      toast({ title: "Pedido excluído", description: "O pedido foi removido com sucesso." });
      fetchPedidos();
    } catch (error: any) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } finally {
      setDeleteConfirmOpen(false);
      setPedidoToDelete(null);
    }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; icon: any; label: string; className?: string }> = {
      rascunho: { variant: "secondary", icon: Clock, label: "Rascunho" },
      enviada: { variant: "default", icon: Send, label: "Enviado", className: "bg-yellow-500" },
      confirmada: { variant: "default", icon: CheckCircle, label: "Confirmado", className: "bg-green-500" },
      entregue: { variant: "default", icon: Truck, label: "Entregue", className: "bg-purple-500" },
      cancelada: { variant: "destructive", icon: AlertTriangle, label: "Cancelado" },
    };
    const config = statusConfig[status] || statusConfig.rascunho;
    const Icon = config.icon;
    return <Badge variant={config.variant} className={`flex items-center gap-1 ${config.className || ''}`}><Icon className="h-3 w-3" />{config.label}</Badge>;
  };

  const filteredPedidos = pedidos.filter(p => {
    const matchesSearch = searchAcrossFields([String(p.numero), p.fornecedores?.nome], searchTerm);
    return matchesSearch && (statusFilter === "todos" || p.status === statusFilter);
  });

  const stats = {
    total: pedidos.length,
    rascunhos: pedidos.filter(p => p.status === "rascunho").length,
    enviados: pedidos.filter(p => p.status === "enviada").length,
    confirmados: pedidos.filter(p => p.status === "confirmada").length,
    entregues: pedidos.filter(p => p.status === "entregue").length,
    valorTotal: pedidos.reduce((acc, p) => acc + (p.total || 0), 0),
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-primary" />Pedidos de Compra</h2>
          <p className="text-sm text-muted-foreground">Gerencie pedidos de compra e acompanhe entregas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setHistoricoOpen(true)}><History className="h-4 w-4 mr-2" />Histórico de Preços</Button>
          <Button onClick={() => { setEditingPedido(null); setNovoPedidoOpen(true); }}><Plus className="h-4 w-4 mr-2" />Novo Pedido</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card><CardContent className="p-3"><div className="flex items-center gap-2"><div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg"><ShoppingCart className="h-4 w-4 text-blue-600" /></div><div><p className="text-xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></div></div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="flex items-center gap-2"><div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg"><FileEdit className="h-4 w-4 text-gray-600" /></div><div><p className="text-xl font-bold">{stats.rascunhos}</p><p className="text-xs text-muted-foreground">Rascunhos</p></div></div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="flex items-center gap-2"><div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg"><Send className="h-4 w-4 text-yellow-600" /></div><div><p className="text-xl font-bold">{stats.enviados}</p><p className="text-xs text-muted-foreground">Enviados</p></div></div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="flex items-center gap-2"><div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg"><CheckCircle className="h-4 w-4 text-green-600" /></div><div><p className="text-xl font-bold">{stats.confirmados}</p><p className="text-xs text-muted-foreground">Confirmados</p></div></div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="flex items-center gap-2"><div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg"><Truck className="h-4 w-4 text-purple-600" /></div><div><p className="text-xl font-bold">{stats.entregues}</p><p className="text-xs text-muted-foreground">Entregues</p></div></div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="flex items-center gap-2"><div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg"><DollarSign className="h-4 w-4 text-emerald-600" /></div><div><p className="text-sm font-bold">{formatCurrency(stats.valorTotal)}</p><p className="text-xs text-muted-foreground">Valor Total</p></div></div></CardContent></Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar por número ou fornecedor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" /></div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}><TabsList><TabsTrigger value="todos">Todos</TabsTrigger><TabsTrigger value="rascunho">Rascunho</TabsTrigger><TabsTrigger value="enviada">Enviado</TabsTrigger><TabsTrigger value="confirmada">Confirmado</TabsTrigger><TabsTrigger value="entregue">Entregue</TabsTrigger></TabsList></Tabs>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Nº</TableHead><TableHead>Fornecedor</TableHead><TableHead>Data</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead><TableHead className="w-[100px]">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {filteredPedidos.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground"><ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />Nenhum pedido encontrado</TableCell></TableRow>
            ) : filteredPedidos.map((pedido) => (
              <TableRow key={pedido.id}>
                <TableCell className="font-mono font-bold">#{String(pedido.numero).padStart(6, "0")}</TableCell>
                <TableCell>{pedido.fornecedores?.nome || "—"}</TableCell>
                <TableCell>{pedido.criado_em ? format(new Date(pedido.criado_em), "dd/MM/yyyy", { locale: ptBR }) : "—"}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(pedido.total || 0)}</TableCell>
                <TableCell>{getStatusBadge(pedido.status)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setSelectedPedido(pedido); setDetailOpen(true); }}><Eye className="h-4 w-4" /></Button>
                    {pedido.status === "rascunho" && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => { setEditingPedido(pedido); setNovoPedidoOpen(true); }}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { setPedidoToDelete(pedido); setDeleteConfirmOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <NovoPedidoDialog open={novoPedidoOpen} onOpenChange={setNovoPedidoOpen} estoqueItems={estoqueItems} onSuccess={fetchPedidos} editingPedido={editingPedido} />
      <PedidoDetailDialog open={detailOpen} onOpenChange={setDetailOpen} pedido={selectedPedido} onEdit={() => { setDetailOpen(false); if (selectedPedido) { setEditingPedido(selectedPedido); setNovoPedidoOpen(true); } }} onRefresh={fetchPedidos} />
      <HistoricoPrecos open={historicoOpen} onOpenChange={setHistoricoOpen} />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar exclusão</AlertDialogTitle><AlertDialogDescription>Excluir pedido #{pedidoToDelete?.numero ? String(pedidoToDelete.numero).padStart(6, "0") : ""}? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeletePedido} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PedidosTab;
