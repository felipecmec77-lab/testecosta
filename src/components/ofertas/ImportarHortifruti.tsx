import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Search, 
  Settings, 
  Eye, 
  EyeOff, 
  Package,
  Sparkles,
  Check
} from 'lucide-react';
import { searchMultiWord } from '@/lib/searchUtils';

interface ProdutoEstoque {
  id: string;
  nome: string;
  preco_custo: number;
  preco_venda: number;
  oculto_ofertas?: boolean;
}

interface ItemOferta {
  item_id: string;
  nome_item: string;
  preco_custo: number;
  preco_venda_normal: number;
  preco_oferta: number;
  margem_lucro?: number;
  lucro_real?: number;
  destaque: boolean;
}

interface ImportarHortifrutiProps {
  onVoltar: () => void;
  onConfirmar: (itens: ItemOferta[]) => void;
}

// Função de arredondamento comercial para sugestão de preço
function calcularPrecoSugerido(precoCusto: number): number {
  const margem = 1; // R$1 de margem
  const precoBase = precoCusto + margem;
  const parteInteira = Math.floor(precoBase);
  const parteDecimal = precoBase - parteInteira;
  
  if (parteDecimal <= 0.49) {
    return parteInteira + 0.49;
  } else {
    return parteInteira + 0.99;
  }
}

export function ImportarHortifruti({ onVoltar, onConfirmar }: ImportarHortifrutiProps) {
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [mostrarOcultos, setMostrarOcultos] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showConfigDialog, setShowConfigDialog] = useState(false);

  useEffect(() => {
    fetchProdutos();
  }, []);

  const fetchProdutos = async () => {
    try {
      const { data, error } = await supabase
        .from('estoque')
        .select('id, nome, preco_custo, preco_venda')
        .eq('ativo', true)
        .ilike('subgrupo', '%HORTIFRUTI%')
        .order('nome', { ascending: true });

      if (error) throw error;
      setProdutos(data || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const visiveis = filteredProdutos.map(p => p.id);
    if (visiveis.every(id => selectedItems.has(id))) {
      // Desmarcar todos os visíveis
      setSelectedItems(prev => {
        const next = new Set(prev);
        visiveis.forEach(id => next.delete(id));
        return next;
      });
    } else {
      // Selecionar todos os visíveis
      setSelectedItems(prev => {
        const next = new Set(prev);
        visiveis.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const formatarPreco = (valor: number) => {
    return valor.toFixed(2).replace('.', ',');
  };

  const filteredProdutos = produtos.filter(p => {
    const matchesSearch = searchMultiWord(p.nome, searchTerm);
    const matchesVisibility = mostrarOcultos || !p.oculto_ofertas;
    return matchesSearch && matchesVisibility;
  });

  const produtosOcultos = produtos.filter(p => p.oculto_ofertas).length;

  const handleConfirmar = () => {
    if (selectedItems.size === 0) {
      toast.error('Selecione pelo menos um produto');
      return;
    }

    const itens: ItemOferta[] = [];
    selectedItems.forEach(id => {
      const produto = produtos.find(p => p.id === id);
      if (produto) {
        const precoSugerido = calcularPrecoSugerido(produto.preco_custo);
        itens.push({
          item_id: produto.id,
          nome_item: produto.nome,
          preco_custo: produto.preco_custo,
          preco_venda_normal: produto.preco_venda,
          preco_oferta: precoSugerido,
          margem_lucro: ((precoSugerido - produto.preco_custo) / produto.preco_custo) * 100,
          lucro_real: precoSugerido - produto.preco_custo,
          destaque: false
        });
      }
    });

    onConfirmar(itens);
    toast.success(`${itens.length} produto(s) importado(s)!`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="rounded-full h-8 w-8 border-2 border-primary border-t-transparent"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onVoltar}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-green-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-lg font-bold">Importar do Estoque HORTIFRUTI</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-green-500 text-white">{produtos.length} produtos</Badge>
          <Button variant="outline" size="sm" onClick={() => setShowConfigDialog(true)}>
            <Settings className="h-4 w-4 mr-1" />
            Configurar Produtos
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <EyeOff className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="ocultos" className="text-sm">Ocultos</Label>
                <Switch
                  id="ocultos"
                  checked={mostrarOcultos}
                  onCheckedChange={setMostrarOcultos}
                />
              </div>
              <Button variant="outline" onClick={handleSelectAll}>
                Selecionar Todos
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-16">Sel.</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Sugestão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredProdutos.map((produto, index) => {
                    const precoSugerido = calcularPrecoSugerido(produto.preco_custo);
                    const isSelected = selectedItems.has(produto.id);
                    
                    return (
                      <motion.tr
                        key={produto.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.02 }}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-green-50 dark:bg-green-950/30' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => toggleItemSelection(produto.id)}
                      >
                        <TableCell>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isSelected 
                              ? 'bg-green-500 border-green-500' 
                              : 'border-muted-foreground/30'
                          }`}>
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{produto.nome}</TableCell>
                        <TableCell className="text-right text-orange-600 font-semibold">
                          R$ {formatarPreco(produto.preco_custo)}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-bold">
                          R$ {formatarPreco(precoSugerido)}
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Footer fixo com botão de confirmar */}
      {selectedItems.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <Button 
            size="lg" 
            className="bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/30"
            onClick={handleConfirmar}
          >
            <Check className="h-5 w-5 mr-2" />
            Confirmar ({selectedItems.size})
          </Button>
        </motion.div>
      )}

      {/* Dialog de Configuração (placeholder) */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Produtos</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Acesse Sistema → Fracionamento para configurar os produtos</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
