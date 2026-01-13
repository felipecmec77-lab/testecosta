import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  History,
  Package,
  Building2,
  Calendar,
  DollarSign,
  Loader2,
  BarChart3,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface HistoricoItem {
  id: string;
  preco_compra: number;
  data_compra: string;
  criado_em: string;
  fornecedor: {
    nome: string;
  } | null;
  ordem_compra: {
    numero: number;
  } | null;
}

interface ProdutoComHistorico {
  id: string;
  codigo: string;
  nome: string;
  preco_custo: number;
  marca: string | null;
  historico: HistoricoItem[];
}

interface HistoricoPrecosProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HistoricoPrecos({ open, onOpenChange }: HistoricoPrecosProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [produtos, setProdutos] = useState<ProdutoComHistorico[]>([]);
  const [selectedProduto, setSelectedProduto] = useState<ProdutoComHistorico | null>(null);

  const searchProducts = async () => {
    if (searchTerm.length < 2) {
      setProdutos([]);
      return;
    }

    setLoading(true);
    try {
      // Search for products
      const { data: estoqueData, error: estoqueError } = await supabase
        .from("estoque")
        .select("id, codigo, nome, preco_custo, marca")
        .or(`nome.ilike.%${searchTerm}%,codigo.ilike.%${searchTerm}%`)
        .limit(20);

      if (estoqueError) throw estoqueError;

      // For each product, get price history
      const produtosComHistorico: ProdutoComHistorico[] = [];
      
      for (const produto of estoqueData || []) {
        const { data: historicoData } = await supabase
          .from("historico_precos_compra")
          .select(`
            id,
            preco_compra,
            data_compra,
            criado_em,
            fornecedor:fornecedores(nome),
            ordem_compra:ordens_compra(numero)
          `)
          .eq("estoque_id", produto.id)
          .order("data_compra", { ascending: false })
          .limit(10);

        produtosComHistorico.push({
          ...produto,
          historico: (historicoData as any) || []
        });
      }

      setProdutos(produtosComHistorico);
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      searchProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const calcularVariacao = (atual: number, anterior: number) => {
    if (anterior === 0) return 0;
    return ((atual - anterior) / anterior) * 100;
  };

  const getVariacaoIcon = (variacao: number) => {
    if (variacao > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (variacao < 0) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getVariacaoBadge = (variacao: number) => {
    if (variacao === 0) return null;
    const isPositive = variacao > 0;
    return (
      <Badge
        variant="outline"
        className={`gap-1 ${
          isPositive
            ? "border-red-300 text-red-600 bg-red-50 dark:bg-red-950"
            : "border-green-300 text-green-600 bg-green-50 dark:bg-green-950"
        }`}
      >
        {getVariacaoIcon(variacao)}
        {isPositive ? "+" : ""}
        {variacao.toFixed(1)}%
      </Badge>
    );
  };

  const getEstatisticas = (historico: HistoricoItem[]) => {
    if (historico.length === 0) return { media: 0, min: 0, max: 0, ultimo: 0 };
    
    const precos = historico.map((h) => Number(h.preco_compra));
    return {
      media: precos.reduce((a, b) => a + b, 0) / precos.length,
      min: Math.min(...precos),
      max: Math.max(...precos),
      ultimo: precos[0] || 0,
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <History className="h-5 w-5 text-primary" />
            Histórico de Preços de Compra
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produto por nome ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Products List */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted p-3 border-b">
                <h3 className="font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Produtos ({produtos.length})
                </h3>
              </div>

              <ScrollArea className="h-[400px]">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : produtos.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    {searchTerm.length < 2
                      ? "Digite pelo menos 2 caracteres para buscar"
                      : "Nenhum produto encontrado"}
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    {produtos.map((produto) => {
                      const stats = getEstatisticas(produto.historico);
                      const variacao = produto.historico.length > 1
                        ? calcularVariacao(
                            Number(produto.historico[0]?.preco_compra || 0),
                            Number(produto.historico[1]?.preco_compra || 0)
                          )
                        : 0;

                      return (
                        <Card
                          key={produto.id}
                          className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                            selectedProduto?.id === produto.id
                              ? "border-primary bg-primary/5"
                              : ""
                          }`}
                          onClick={() => setSelectedProduto(produto)}
                        >
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {produto.nome}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Código: {produto.codigo}
                                  {produto.marca && ` | ${produto.marca}`}
                                </p>
                              </div>
                              <div className="text-right ml-2">
                                <p className="font-bold text-sm">
                                  {formatCurrency(produto.preco_custo)}
                                </p>
                                {produto.historico.length > 0 && (
                                  <div className="flex items-center gap-1 justify-end">
                                    <Badge variant="secondary" className="text-xs">
                                      {produto.historico.length} compras
                                    </Badge>
                                    {getVariacaoBadge(variacao)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Price History Details */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted p-3 border-b">
                <h3 className="font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Detalhes do Histórico
                </h3>
              </div>

              <ScrollArea className="h-[400px]">
                {selectedProduto ? (
                  <div className="p-3 space-y-4">
                    {/* Product Info */}
                    <div className="bg-primary/5 rounded-lg p-3">
                      <h4 className="font-bold text-lg">{selectedProduto.nome}</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedProduto.codigo}
                        {selectedProduto.marca && ` | ${selectedProduto.marca}`}
                      </p>
                    </div>

                    {/* Stats Cards */}
                    {selectedProduto.historico.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {(() => {
                          const stats = getEstatisticas(selectedProduto.historico);
                          return (
                            <>
                              <Card>
                                <CardContent className="p-3">
                                  <p className="text-xs text-muted-foreground">
                                    Último Preço
                                  </p>
                                  <p className="text-lg font-bold text-primary">
                                    {formatCurrency(stats.ultimo)}
                                  </p>
                                </CardContent>
                              </Card>
                              <Card>
                                <CardContent className="p-3">
                                  <p className="text-xs text-muted-foreground">
                                    Preço Médio
                                  </p>
                                  <p className="text-lg font-bold text-blue-600">
                                    {formatCurrency(stats.media)}
                                  </p>
                                </CardContent>
                              </Card>
                              <Card>
                                <CardContent className="p-3">
                                  <p className="text-xs text-muted-foreground">
                                    Menor Preço
                                  </p>
                                  <p className="text-lg font-bold text-green-600">
                                    {formatCurrency(stats.min)}
                                  </p>
                                </CardContent>
                              </Card>
                              <Card>
                                <CardContent className="p-3">
                                  <p className="text-xs text-muted-foreground">
                                    Maior Preço
                                  </p>
                                  <p className="text-lg font-bold text-red-600">
                                    {formatCurrency(stats.max)}
                                  </p>
                                </CardContent>
                              </Card>
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {/* History Table */}
                    {selectedProduto.historico.length > 0 ? (
                      <div>
                        <h5 className="font-semibold mb-2 text-sm">
                          Histórico de Compras
                        </h5>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Data</TableHead>
                              <TableHead className="text-xs">Fornecedor</TableHead>
                              <TableHead className="text-xs text-right">
                                Preço
                              </TableHead>
                              <TableHead className="text-xs text-right">
                                Var.
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedProduto.historico.map((item, index) => {
                              const anterior =
                                selectedProduto.historico[index + 1]?.preco_compra;
                              const variacao = anterior
                                ? calcularVariacao(
                                    Number(item.preco_compra),
                                    Number(anterior)
                                  )
                                : 0;

                              return (
                                <TableRow key={item.id}>
                                  <TableCell className="text-xs">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3 text-muted-foreground" />
                                      {format(
                                        new Date(item.data_compra),
                                        "dd/MM/yy",
                                        { locale: ptBR }
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    <div className="flex items-center gap-1">
                                      <Building2 className="h-3 w-3 text-muted-foreground" />
                                      <span className="truncate max-w-[100px]">
                                        {item.fornecedor?.nome || "-"}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-xs text-right font-medium">
                                    {formatCurrency(Number(item.preco_compra))}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {getVariacaoBadge(variacao)}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Nenhum histórico de compras registrado</p>
                        <p className="text-xs">
                          O histórico será preenchido automaticamente
                          <br />
                          quando pedidos de compra forem confirmados
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 text-center text-muted-foreground h-full flex flex-col items-center justify-center">
                    <DollarSign className="h-12 w-12 mb-3 opacity-30" />
                    <p>Selecione um produto para ver</p>
                    <p>o histórico de preços</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
