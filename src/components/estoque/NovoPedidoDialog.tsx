import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Search, Plus, Trash2, Package, AlertTriangle, Save, Send, X, Building2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

interface ItemPedido {
  id: string;
  estoque_id: string;
  codigo: string;
  nome: string;
  quantidade: number;
  preco_unitario: number;
  preco_custo_atual: number;
  estoque_atual: number;
}

interface OrdemCompra {
  id: string;
  numero: number;
  status: string;
  data_ordem: string | null;
  data_entrega_prevista: string | null;
  fornecedor_id: string;
  condicao_pagamento: string | null;
  observacao: string | null;
  total: number | null;
}

interface Fornecedor {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
}

interface NovoPedidoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estoqueItems: EstoqueItem[];
  onSuccess: () => void;
  editingPedido?: OrdemCompra | null;
  editingItens?: ItemPedido[];
}

export function NovoPedidoDialog({ 
  open, 
  onOpenChange, 
  estoqueItems, 
  onSuccess,
  editingPedido,
  editingItens = []
}: NovoPedidoDialogProps) {
  const [fornecedorId, setFornecedorId] = useState(editingPedido?.fornecedor_id || "");
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [dataEntrega, setDataEntrega] = useState<Date | undefined>(
    editingPedido?.data_entrega_prevista ? new Date(editingPedido.data_entrega_prevista) : undefined
  );
  const [condicaoPagamento, setCondicaoPagamento] = useState(editingPedido?.condicao_pagamento || "");
  const [observacao, setObservacao] = useState(editingPedido?.observacao || "");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<EstoqueItem | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [precoUnitario, setPrecoUnitario] = useState(0);
  const [itensCarrinho, setItensCarrinho] = useState<ItemPedido[]>(editingItens);
  const [saving, setSaving] = useState(false);

  // Fetch fornecedores on mount
  useEffect(() => {
    const fetchFornecedores = async () => {
      const { data } = await supabase
        .from("fornecedores")
        .select("id, nome, telefone, email")
        .eq("ativo", true)
        .order("nome");
      setFornecedores(data || []);
    };
    fetchFornecedores();
  }, [open]);

  // Reset form when dialog opens/closes
  const resetForm = () => {
    if (!editingPedido) {
      setFornecedorId("");
      setDataEntrega(undefined);
      setCondicaoPagamento("");
      setObservacao("");
      setItensCarrinho([]);
    }
    setSearchTerm("");
    setSelectedProduct(null);
    setQuantidade(1);
    setPrecoUnitario(0);
  };

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return [];
    const term = searchTerm.toLowerCase();
    return estoqueItems
      .filter(item => 
        item.nome.toLowerCase().includes(term) ||
        item.codigo.toLowerCase().includes(term) ||
        (item.codigo_barras && item.codigo_barras.includes(term))
      )
      .slice(0, 20);
  }, [searchTerm, estoqueItems]);

  // Calculate total
  const totalPedido = useMemo(() => {
    return itensCarrinho.reduce((sum, item) => sum + (item.quantidade * item.preco_unitario), 0);
  }, [itensCarrinho]);

  // Select product for details
  const handleSelectProduct = (product: EstoqueItem) => {
    setSelectedProduct(product);
    setPrecoUnitario(product.preco_custo);
    setQuantidade(1);
  };

  // Add item to cart
  const handleAddToCart = () => {
    if (!selectedProduct) return;
    
    const existingIndex = itensCarrinho.findIndex(item => item.estoque_id === selectedProduct.id);
    
    if (existingIndex >= 0) {
      // Update quantity
      const updated = [...itensCarrinho];
      updated[existingIndex].quantidade += quantidade;
      updated[existingIndex].preco_unitario = precoUnitario;
      setItensCarrinho(updated);
    } else {
      // Add new item
      const newItem: ItemPedido = {
        id: crypto.randomUUID(),
        estoque_id: selectedProduct.id,
        codigo: selectedProduct.codigo,
        nome: selectedProduct.nome,
        quantidade,
        preco_unitario: precoUnitario,
        preco_custo_atual: selectedProduct.preco_custo,
        estoque_atual: selectedProduct.estoque_atual
      };
      setItensCarrinho([...itensCarrinho, newItem]);
    }
    
    setSelectedProduct(null);
    setSearchTerm("");
    toast.success("Item adicionado ao pedido");
  };

  // Remove item from cart
  const handleRemoveItem = (id: string) => {
    setItensCarrinho(itensCarrinho.filter(item => item.id !== id));
  };

  // Update item in cart
  const handleUpdateItem = (id: string, field: 'quantidade' | 'preco_unitario', value: number) => {
    setItensCarrinho(itensCarrinho.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // Save order
  const handleSave = async (status: 'rascunho' | 'enviada') => {
    if (!fornecedorId) {
      toast.error("Selecione um fornecedor");
      return;
    }
    if (itensCarrinho.length === 0) {
      toast.error("Adicione pelo menos um item ao pedido");
      return;
    }

    setSaving(true);
    try {
      if (editingPedido) {
        // Update existing order
        const { error: updateError } = await supabase
          .from('ordens_compra')
          .update({
            fornecedor_id: fornecedorId,
            data_entrega_prevista: dataEntrega?.toISOString().split('T')[0],
            condicao_pagamento: condicaoPagamento || null,
            observacao: observacao || null,
            total: totalPedido,
            status
          })
          .eq('id', editingPedido.id);
        
        if (updateError) throw updateError;

        // Delete existing items
        await supabase
          .from('itens_ordem_compra')
          .delete()
          .eq('ordem_compra_id', editingPedido.id);

        // Insert new items
        const itensToInsert = itensCarrinho.map(item => ({
          ordem_compra_id: editingPedido.id,
          nome_produto: item.nome,
          codigo_barras: item.codigo,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          preco_total: item.quantidade * item.preco_unitario,
          estoque_id: item.estoque_id
        }));

        const { error: itensError } = await supabase
          .from('itens_ordem_compra')
          .insert(itensToInsert);

        if (itensError) throw itensError;

        toast.success("Pedido atualizado com sucesso!");
      } else {
        // Create new order
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) throw new Error("Usuário não autenticado");

        const { data: newOrder, error: orderError } = await supabase
          .from('ordens_compra')
          .insert({
            fornecedor_id: fornecedorId,
            usuario_id: user.user.id,
            data_entrega_prevista: dataEntrega?.toISOString().split('T')[0],
            condicao_pagamento: condicaoPagamento || null,
            observacao: observacao || null,
            total: totalPedido,
            status
          })
          .select('id')
          .single();

        if (orderError) throw orderError;

        // Insert items
        const itensToInsert = itensCarrinho.map(item => ({
          ordem_compra_id: newOrder.id,
          nome_produto: item.nome,
          codigo_barras: item.codigo,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          preco_total: item.quantidade * item.preco_unitario,
          estoque_id: item.estoque_id
        }));

        const { error: itensError } = await supabase
          .from('itens_ordem_compra')
          .insert(itensToInsert);

        if (itensError) throw itensError;

        toast.success(status === 'rascunho' ? "Rascunho salvo!" : "Pedido enviado!");
      }

      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar pedido:', error);
      toast.error("Erro ao salvar pedido: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const calcularMargem = (custo: number, venda: number) => {
    if (custo === 0) return 0;
    return ((venda - custo) / custo) * 100;
  };

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) resetForm(); onOpenChange(value); }}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {editingPedido ? `Editar Pedido #${String(editingPedido.numero).padStart(6, '0')}` : 'Novo Pedido de Compra'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column - Order Details */}
          <div className="space-y-4 overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="fornecedor">Fornecedor *</Label>
                <Select value={fornecedorId} onValueChange={setFornecedorId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o fornecedor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {fornecedores.length === 0 ? (
                      <div className="p-3 text-center text-muted-foreground text-sm">
                        <Building2 className="h-5 w-5 mx-auto mb-1 opacity-50" />
                        Nenhum fornecedor cadastrado.
                        <br />
                        <span className="text-xs">Cadastre em Sistema → Fornecedores</span>
                      </div>
                    ) : (
                      fornecedores.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Data Prevista de Entrega</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dataEntrega && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataEntrega ? format(dataEntrega, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dataEntrega}
                      onSelect={setDataEntrega}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="condicao">Condição de Pagamento</Label>
                <Input
                  id="condicao"
                  placeholder="Ex: 30/60/90 dias"
                  value={condicaoPagamento}
                  onChange={(e) => setCondicaoPagamento(e.target.value)}
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="observacao">Observações</Label>
                <Textarea
                  id="observacao"
                  placeholder="Observações do pedido..."
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            {/* Cart */}
            <div className="border rounded-lg p-3">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Itens do Pedido ({itensCarrinho.length})
              </h3>
              
              {itensCarrinho.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  Nenhum item adicionado. Busque produtos ao lado.
                </p>
              ) : (
                <ScrollArea className="h-[200px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead className="w-20">Qtd</TableHead>
                        <TableHead className="w-28">Preço</TableHead>
                        <TableHead className="w-24">Total</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itensCarrinho.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium text-xs">
                            {item.nome}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantidade}
                              onChange={(e) => handleUpdateItem(item.id, 'quantidade', parseInt(e.target.value) || 1)}
                              className="h-8 w-16"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.preco_unitario}
                              onChange={(e) => handleUpdateItem(item.id, 'preco_unitario', parseFloat(e.target.value) || 0)}
                              className="h-8 w-24"
                            />
                          </TableCell>
                          <TableCell className="font-semibold text-xs">
                            {formatCurrency(item.quantidade * item.preco_unitario)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
              
              <div className="flex justify-between items-center mt-3 pt-3 border-t">
                <span className="font-semibold">Total do Pedido:</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(totalPedido)}</span>
              </div>
            </div>
          </div>

          {/* Right Column - Product Search */}
          <div className="space-y-4 overflow-hidden flex flex-col">
            <div>
              <Label htmlFor="search">Buscar Produto</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Digite nome, código ou código de barras..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Search Results */}
            {filteredProducts.length > 0 && !selectedProduct && (
              <ScrollArea className="flex-1 border rounded-lg">
                <div className="p-2 space-y-1">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="p-2 hover:bg-muted rounded cursor-pointer flex justify-between items-center"
                      onClick={() => handleSelectProduct(product)}
                    >
                      <div>
                        <p className="font-medium text-sm">{product.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.codigo} | {product.subgrupo || 'Sem grupo'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(product.preco_custo)}</p>
                        <p className="text-xs text-muted-foreground">Estoque: {product.estoque_atual}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Selected Product Card */}
            {selectedProduct && (
              <Card className="border-2 border-primary">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-lg">{selectedProduct.nome}</h4>
                      <p className="text-sm text-muted-foreground">
                        Código: {selectedProduct.codigo}
                        {selectedProduct.codigo_barras && ` | Barras: ${selectedProduct.codigo_barras}`}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedProduct(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-muted p-2 rounded">
                      <p className="text-muted-foreground">Grupo</p>
                      <p className="font-medium">{selectedProduct.subgrupo || '-'}</p>
                    </div>
                    <div className="bg-muted p-2 rounded">
                      <p className="text-muted-foreground">Marca</p>
                      <p className="font-medium">{selectedProduct.marca || '-'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="bg-blue-50 dark:bg-blue-950 p-2 rounded">
                      <p className="text-muted-foreground">Preço Custo</p>
                      <p className="font-bold text-blue-600">{formatCurrency(selectedProduct.preco_custo)}</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-950 p-2 rounded">
                      <p className="text-muted-foreground">Preço Venda</p>
                      <p className="font-bold text-green-600">{formatCurrency(selectedProduct.preco_venda)}</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-950 p-2 rounded">
                      <p className="text-muted-foreground">Margem</p>
                      <p className="font-bold text-purple-600">
                        {calcularMargem(selectedProduct.preco_custo, selectedProduct.preco_venda).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={selectedProduct.estoque_atual <= selectedProduct.estoque_minimo ? "destructive" : "secondary"}
                      className="gap-1"
                    >
                      {selectedProduct.estoque_atual <= selectedProduct.estoque_minimo && (
                        <AlertTriangle className="h-3 w-3" />
                      )}
                      Estoque: {selectedProduct.estoque_atual} {selectedProduct.unidade || 'UN'}
                    </Badge>
                    <Badge variant="outline">
                      Mín: {selectedProduct.estoque_minimo}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    <div>
                      <Label htmlFor="qtd">Quantidade</Label>
                      <Input
                        id="qtd"
                        type="number"
                        min="1"
                        value={quantidade}
                        onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="preco">Preço Unitário</Label>
                      <Input
                        id="preco"
                        type="number"
                        min="0"
                        step="0.01"
                        value={precoUnitario}
                        onChange={(e) => setPrecoUnitario(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-bold text-lg">{formatCurrency(quantidade * precoUnitario)}</span>
                  </div>

                  <Button className="w-full" onClick={handleAddToCart}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar ao Pedido
                  </Button>
                </CardContent>
              </Card>
            )}

            {!selectedProduct && searchTerm.length < 2 && (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                <p>Digite pelo menos 2 caracteres para buscar produtos</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => handleSave('rascunho')} 
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar Rascunho
          </Button>
          <Button 
            onClick={() => handleSave('enviada')} 
            disabled={saving}
          >
            <Send className="h-4 w-4 mr-2" />
            Enviar Pedido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NovoPedidoDialog;
