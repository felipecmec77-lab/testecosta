import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Search, 
  Barcode, 
  Loader2, 
  ShoppingCart, 
  Plus, 
  X, 
  Package,
  Minus,
  Trash2,
  Settings2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchAcrossFields } from '@/lib/searchUtils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

type TipoUnidade = 'UN' | 'CX' | 'DP';

interface ProdutoEstoque {
  id: string;
  codigo_barras: string | null;
  nome: string;
  marca: string | null;
  grupo: string | null;
  subgrupo: string | null;
  unidade: string | null;
}

interface ItemCarrinho {
  produto: ProdutoEstoque;
  quantidade: number;
  tipoUnidade: TipoUnidade;
}

interface SelecionarProdutosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cotacaoId: string;
  cotacaoTitulo: string;
  onProdutosAdicionados: () => void;
}

const UNIDADES: { value: TipoUnidade; label: string }[] = [
  { value: 'UN', label: 'Unidade' },
  { value: 'CX', label: 'Caixa' },
  { value: 'DP', label: 'Display' },
];

const SelecionarProdutosModal = ({ 
  open, 
  onOpenChange, 
  cotacaoId, 
  cotacaoTitulo,
  onProdutosAdicionados 
}: SelecionarProdutosModalProps) => {
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 250;
  
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [showCarrinho, setShowCarrinho] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subgruposOcultos, setSubgruposOcultos] = useState<string[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  useEffect(() => {
    if (open) {
      fetchProdutos();
      loadSubgruposOcultos();
      setCarrinho([]);
      setSearchTerm('');
      setFocusedIndex(-1);
    }
  }, [open]);

  const fetchProdutos = async () => {
    setLoading(true);
    try {
      const allProducts: ProdutoEstoque[] = [];
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('estoque')
          .select('id, codigo_barras, nome, marca, grupo, subgrupo, unidade')
          .eq('ativo', true)
          .order('nome')
          .range(offset, offset + batchSize - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allProducts.push(...data);
          offset += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      setProdutos(allProducts);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const loadSubgruposOcultos = async () => {
    try {
      const { data } = await supabase
        .from('configuracoes_sistema')
        .select('valor')
        .eq('chave', 'cotacoes_subgrupos_ocultos')
        .single();
      
      if (data?.valor && Array.isArray(data.valor)) {
        setSubgruposOcultos(data.valor as string[]);
      }
    } catch (error) {
      // Configuração não existe ainda
    }
  };

  const saveSubgruposOcultos = async (ocultos: string[]) => {
    try {
      const { error } = await supabase
        .from('configuracoes_sistema')
        .upsert({
          chave: 'cotacoes_subgrupos_ocultos',
          valor: ocultos
        }, { onConflict: 'chave' });
      
      if (error) throw error;
      setSubgruposOcultos(ocultos);
      toast.success('Configuração salva!');
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast.error('Erro ao salvar configuração');
    }
  };

  // Subgrupos únicos
  const subgrupos = useMemo(() => {
    const subs = produtos
      .map(p => p.subgrupo)
      .filter((s): s is string => !!s);
    return [...new Set(subs)].sort();
  }, [produtos]);

  // Produtos filtrados
  const produtosFiltrados = useMemo(() => {
    const termoBusca = searchTerm.trim().toLowerCase();
    
    return produtos.filter(p => {
      if (p.subgrupo && subgruposOcultos.includes(p.subgrupo)) {
        return false;
      }
      
      if (!termoBusca) return true;
      
      if (p.codigo_barras) {
        const codigoNormalizado = p.codigo_barras.replace(/^0+/, '');
        const termoNormalizado = termoBusca.replace(/^0+/, '');
        if (p.codigo_barras.includes(termoBusca) || 
            codigoNormalizado.includes(termoNormalizado) ||
            p.codigo_barras === termoBusca) {
          return true;
        }
      }
      
      const matchSearch = searchAcrossFields([p.nome, p.marca, p.grupo], termoBusca);
      return matchSearch;
    });
  }, [produtos, searchTerm, subgruposOcultos]);

  // Paginação
  const totalPages = Math.ceil(produtosFiltrados.length / ITEMS_PER_PAGE);
  const paginatedProdutos = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return produtosFiltrados.slice(start, start + ITEMS_PER_PAGE);
  }, [produtosFiltrados, currentPage]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
    setFocusedIndex(-1);
  }, [searchTerm]);

  // Toggle de seleção
  const toggleProduto = useCallback((produto: ProdutoEstoque) => {
    setCarrinho(prev => {
      const existing = prev.find(item => item.produto.id === produto.id);
      if (existing) {
        return prev.filter(item => item.produto.id !== produto.id);
      }
      return [...prev, { produto, quantidade: 1, tipoUnidade: 'UN' as TipoUnidade }];
    });
  }, []);

  // Funções do carrinho
  const addToCarrinho = (produto: ProdutoEstoque) => {
    setCarrinho(prev => {
      const existing = prev.find(item => item.produto.id === produto.id);
      if (existing) {
        return prev.map(item => 
          item.produto.id === produto.id 
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        );
      }
      return [...prev, { produto, quantidade: 1, tipoUnidade: 'UN' as TipoUnidade }];
    });
  };

  const removeFromCarrinho = (produtoId: string) => {
    setCarrinho(prev => prev.filter(item => item.produto.id !== produtoId));
  };

  const updateQuantidade = (produtoId: string, quantidade: number) => {
    if (quantidade < 1) {
      removeFromCarrinho(produtoId);
      return;
    }
    setCarrinho(prev => prev.map(item => 
      item.produto.id === produtoId ? { ...item, quantidade } : item
    ));
  };

  const updateTipoUnidade = (produtoId: string, tipoUnidade: TipoUnidade) => {
    setCarrinho(prev => prev.map(item => 
      item.produto.id === produtoId ? { ...item, tipoUnidade } : item
    ));
  };

  const isInCarrinho = (produtoId: string) => {
    return carrinho.some(item => item.produto.id === produtoId);
  };

  const getQuantidadeCarrinho = (produtoId: string) => {
    return carrinho.find(item => item.produto.id === produtoId)?.quantidade || 0;
  };

  const getTipoUnidadeCarrinho = (produtoId: string): TipoUnidade => {
    return carrinho.find(item => item.produto.id === produtoId)?.tipoUnidade || 'UN';
  };

  const totalItensCarrinho = carrinho.reduce((sum, item) => sum + item.quantidade, 0);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent, produto: ProdutoEstoque, index: number) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggleProduto(produto);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(Math.min(index + 1, paginatedProdutos.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(Math.max(index - 1, 0));
    }
  }, [toggleProduto, paginatedProdutos.length]);

  // Focus management
  useEffect(() => {
    if (focusedIndex >= 0) {
      const element = document.getElementById(`produto-row-${focusedIndex}`);
      element?.focus();
    }
  }, [focusedIndex]);

  // Salvar itens na cotação - NÃO enviar produto_id pois referencia tabela produtos_cotacao
  const salvarItens = async () => {
    if (carrinho.length === 0) {
      toast.error('Adicione pelo menos um produto');
      return;
    }

    setSaving(true);
    try {
      const itens = carrinho.map(item => ({
        cotacao_id: cotacaoId,
        nome_produto: `${item.produto.nome} (${item.tipoUnidade})`,
        quantidade: item.quantidade,
        codigo_barras: item.produto.codigo_barras,
        observacao: `Tipo: ${UNIDADES.find(u => u.value === item.tipoUnidade)?.label || item.tipoUnidade}`
      }));

      const { error } = await supabase.from('itens_cotacao').insert(itens);
      if (error) throw error;

      toast.success(`${carrinho.length} produto(s) adicionado(s) à cotação!`);
      onProdutosAdicionados();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao adicionar produtos:', error);
      toast.error('Erro ao adicionar produtos');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg">Adicionar produtos na cotação:</DialogTitle>
              <p className="text-sm text-primary font-medium mt-1">{cotacaoTitulo}</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Search and Filters */}
        <div className="px-6 py-4 border-b space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome, código de barras ou marca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button variant="outline" size="icon" className="shrink-0">
              <Barcode className="w-4 h-4" />
            </Button>
            
            {/* Configuração de subgrupos ocultos */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0">
                  <Settings2 className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-popover border shadow-lg z-50" align="end">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Ocultar Subgrupos</h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      Selecione os subgrupos que não devem aparecer nas cotações
                    </p>
                  </div>
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {subgrupos.map(subgrupo => (
                        <div key={subgrupo} className="flex items-center gap-2">
                          <Checkbox
                            id={`sub-${subgrupo}`}
                            checked={subgruposOcultos.includes(subgrupo)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                saveSubgruposOcultos([...subgruposOcultos, subgrupo]);
                              } else {
                                saveSubgruposOcultos(subgruposOcultos.filter(s => s !== subgrupo));
                              }
                            }}
                          />
                          <label 
                            htmlFor={`sub-${subgrupo}`}
                            className="text-sm cursor-pointer"
                          >
                            {subgrupo}
                          </label>
                        </div>
                      ))}
                      {subgrupos.length === 0 && (
                        <p className="text-sm text-muted-foreground">Nenhum subgrupo encontrado</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <p className="text-xs text-muted-foreground">
            💡 Dica: Clique na linha ou pressione <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Espaço</kbd> para selecionar um produto
          </p>
        </div>

        {/* Products List */}
        <ScrollArea className="flex-1 px-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : produtosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Package className="w-12 h-12 mb-4" />
              <p>Nenhum produto encontrado</p>
            </div>
          ) : (
            <div className="py-4">
              {/* Pagination Info */}
              <div className="flex items-center justify-between px-3 py-2 mb-2 bg-muted/30 rounded-lg">
                <span className="text-sm text-muted-foreground">
                  Exibindo {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, produtosFiltrados.length)} de {produtosFiltrados.length} produtos
                </span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm font-medium px-2">
                      {currentPage} / {totalPages}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Próximo
                    </Button>
                  </div>
                )}
              </div>

              {/* Table Header */}
              <div className="grid grid-cols-[1fr_100px_120px_100px_100px] gap-4 px-3 py-2 text-xs font-medium text-muted-foreground uppercase border-b">
                <div>Produto</div>
                <div className="text-center">Unidade</div>
                <div className="text-center">Quantidade</div>
                <div className="text-center">Marca</div>
                <div className="text-center">Categoria</div>
              </div>

              {/* Products */}
              {paginatedProdutos.map((produto, index) => {
                const inCarrinho = isInCarrinho(produto.id);
                const quantidade = getQuantidadeCarrinho(produto.id);
                const tipoUnidade = getTipoUnidadeCarrinho(produto.id);

                return (
                  <div 
                    key={produto.id}
                    id={`produto-row-${index}`}
                    tabIndex={0}
                    role="button"
                    onClick={() => toggleProduto(produto)}
                    onKeyDown={(e) => handleKeyDown(e, produto, index)}
                    className={cn(
                      "grid grid-cols-[1fr_100px_120px_100px_100px] gap-4 px-3 py-3 items-center border-b transition-colors cursor-pointer outline-none",
                      "hover:bg-muted/50 focus:bg-muted/50 focus:ring-2 focus:ring-primary/20",
                      inCarrinho && "bg-primary/10 hover:bg-primary/15"
                    )}
                  >
                    {/* Produto Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                        inCarrinho ? "bg-primary border-primary" : "border-muted-foreground/30"
                      )}>
                        {inCarrinho && (
                          <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{produto.nome}</p>
                        {produto.codigo_barras && (
                          <p className="text-xs text-muted-foreground font-mono">{produto.codigo_barras}</p>
                        )}
                      </div>
                    </div>

                    {/* Tipo Unidade */}
                    <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                      {inCarrinho ? (
                        <Select 
                          value={tipoUnidade} 
                          onValueChange={(value) => updateTipoUnidade(produto.id, value as TipoUnidade)}
                        >
                          <SelectTrigger className="w-20 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border shadow-lg z-[100]">
                            {UNIDADES.map(u => (
                              <SelectItem key={u.value} value={u.value} className="text-xs">
                                {u.value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm text-muted-foreground">UN</span>
                      )}
                    </div>

                    {/* Quantidade */}
                    <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {inCarrinho ? (
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => updateQuantidade(produto.id, quantidade - 1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Input 
                            type="number"
                            min="1"
                            value={quantidade}
                            onChange={(e) => updateQuantidade(produto.id, parseInt(e.target.value) || 1)}
                            className="w-14 h-7 text-center text-sm"
                          />
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => updateQuantidade(produto.id, quantidade + 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </div>

                    {/* Marca */}
                    <div className="text-center text-sm text-muted-foreground truncate">
                      {produto.marca || '-'}
                    </div>

                    {/* Grupo */}
                    <div className="text-center">
                      {produto.grupo && (
                        <Badge variant="secondary" className="text-xs">
                          {produto.grupo}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer with Cart */}
        <div className="border-t px-6 py-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline"
                onClick={() => setShowCarrinho(!showCarrinho)}
                className="relative"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Ver Carrinho
                {totalItensCarrinho > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {totalItensCarrinho}
                  </Badge>
                )}
              </Button>
              <span className="text-sm text-muted-foreground">
                {carrinho.length} produto(s) selecionado(s)
              </span>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={salvarItens}
                disabled={carrinho.length === 0 || saving}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Adicionar Produtos
              </Button>
            </div>
          </div>

          {/* Carrinho Expandido */}
          {showCarrinho && carrinho.length > 0 && (
            <div className="mt-4 p-4 bg-background rounded-lg border max-h-48 overflow-y-auto">
              <div className="space-y-2">
                {carrinho.map(item => (
                  <div key={item.produto.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                        <Package className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.produto.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          Qtd: {item.quantidade} {item.tipoUnidade === 'CX' ? 'Caixa(s)' : item.tipoUnidade === 'DP' ? 'Display(s)' : 'Unidade(s)'}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => removeFromCarrinho(item.produto.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SelecionarProdutosModal;
