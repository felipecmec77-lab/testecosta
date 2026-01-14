import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Search, Trash2, Star, Package, Settings, Calculator, Eye, EyeOff, Sparkles, Box, ArrowRight, Check, TrendingUp, DollarSign, History, FileText, Users } from 'lucide-react';
import OfertasHortifrutiPDF from './OfertasHortifrutiPDF';
import { searchMultiWord } from '@/lib/searchUtils';

interface ProdutoHortifruti {
  id: string;
  nome_produto: string;
  categoria: string;
  unidade_medida: string;
  preco_unitario: number;
  preco_venda: number | null;
  quantidade_por_caixa: number;
  unidade_fracionamento: string;
  oculto_ofertas: boolean;
}

interface ItemOfertaHortifruti {
  id?: string;
  item_id: string;
  nome_item: string;
  preco_custo: number;
  preco_venda_normal: number;
  preco_oferta: number;
  margem_lucro?: number;
  lucro_real?: number;
  destaque: boolean;
  valor_caixa: number;
  quantidade_por_caixa: number;
  tipo_caixa: 'inteira' | 'meia' | 'customizada';
  unidade_fracionamento: string;
}

interface UltimoLancamento {
  valor_caixa: number;
  preco_oferta: number;
  tipo_caixa: 'inteira' | 'meia' | 'customizada';
}

interface HortifrutiOfertaTabProps {
  itensOferta: ItemOfertaHortifruti[];
  setItensOferta: (itens: ItemOfertaHortifruti[]) => void;
}

const STORAGE_KEY = 'horti_ultimos_lancamentos';
const ITENS_STORAGE_KEY = 'horti_itens_oferta_temp';

const HortifrutiOfertaTab = ({ itensOferta, setItensOferta }: HortifrutiOfertaTabProps) => {
  const [produtos, setProdutos] = useState<ProdutoHortifruti[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<ProdutoHortifruti | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [mostrarOcultos, setMostrarOcultos] = useState(false);
  const [ultimosLancamentos, setUltimosLancamentos] = useState<Record<string, UltimoLancamento>>({});
  const [showPDFDialog, setShowPDFDialog] = useState(false);
  const [pdfForMarketing, setPdfForMarketing] = useState(false);
  const initialLoadDone = useRef(false);
  
  const [fracionamentoData, setFracionamentoData] = useState<Record<string, {
    valor_caixa: string;
    tipo_caixa: 'inteira' | 'meia' | 'customizada';
    quantidade_custom: string;
    preco_oferta: string;
  }>>({});

  // Carregar últimos lançamentos do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setUltimosLancamentos(JSON.parse(saved));
      }
      
      // Carregar itens salvos temporariamente
      const savedItens = localStorage.getItem(ITENS_STORAGE_KEY);
      if (savedItens && !initialLoadDone.current) {
        const parsed = JSON.parse(savedItens);
        if (parsed.length > 0 && itensOferta.length === 0) {
          setItensOferta(parsed);
          toast.info('Itens restaurados do rascunho anterior');
        }
      }
      initialLoadDone.current = true;
    } catch (e) {
      console.error('Erro ao carregar dados:', e);
    }
  }, []);

  // Salvar itens no localStorage quando mudar
  useEffect(() => {
    if (initialLoadDone.current) {
      localStorage.setItem(ITENS_STORAGE_KEY, JSON.stringify(itensOferta));
    }
  }, [itensOferta]);

  // Salvar últimos lançamentos
  const salvarUltimoLancamento = useCallback((itemId: string, dados: UltimoLancamento) => {
    setUltimosLancamentos(prev => {
      const updated = { ...prev, [itemId]: dados };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  useEffect(() => {
    fetchProdutos();
  }, []);

  const fetchProdutos = async () => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .order('nome_produto', { ascending: true });

      if (error) throw error;
      
      setProdutos((data || []).map(p => ({
        ...p,
        quantidade_por_caixa: p.quantidade_por_caixa || 1,
        unidade_fracionamento: p.unidade_fracionamento || 'kg',
        oculto_ofertas: p.oculto_ofertas || false
      })));
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const formatarPreco = (valor: number) => {
    return valor.toFixed(2).replace('.', ',');
  };

  // Formatador para valores inteiros (valor da caixa - sem decimais)
  const formatarInputInteiro = (valor: string): string => {
    const numeros = valor.replace(/\D/g, '');
    if (!numeros) return '';
    return numeros;
  };

  // Formatador para preço de oferta com vírgula automática após 3º dígito
  // Ex: 299 → 2,99 | 1299 → 12,99 | 99 → 0,99
  const formatarPrecoOfertaInput = (valor: string): string => {
    const numeros = valor.replace(/\D/g, '');
    if (!numeros) return '';
    
    // Pad com zeros à esquerda se necessário
    const paddedNum = numeros.padStart(3, '0');
    const inteiro = paddedNum.slice(0, -2).replace(/^0+/, '') || '0';
    const decimal = paddedNum.slice(-2);
    
    return `${inteiro},${decimal}`;
  };

  // Parser que aceita valor inteiro ou com vírgula
  const parsePrecoSimples = (valor: string): number => {
    if (!valor) return 0;
    // Se tem vírgula, é decimal
    if (valor.includes(',')) {
      return parseFloat(valor.replace(',', '.')) || 0;
    }
    // Senão, é inteiro
    return parseInt(valor) || 0;
  };

  const calcularPrecoCusto = (itemId: string, produto: ProdutoHortifruti): number => {
    const data = fracionamentoData[itemId];
    if (!data || !data.valor_caixa) return produto.preco_unitario;

    const valorCaixa = parsePrecoSimples(data.valor_caixa);
    let quantidade = produto.quantidade_por_caixa;

    if (data.tipo_caixa === 'meia') {
      quantidade = produto.quantidade_por_caixa / 2;
    } else if (data.tipo_caixa === 'customizada' && data.quantidade_custom) {
      quantidade = parseFloat(data.quantidade_custom) || produto.quantidade_por_caixa;
    }

    return quantidade > 0 ? valorCaixa / quantidade : 0;
  };

  const calcularMargem = (precoCusto: number, precoVenda: number): number => {
    if (precoCusto <= 0) return 0;
    return ((precoVenda - precoCusto) / precoCusto) * 100;
  };

  const getMargemStyle = (margem: number) => {
    if (margem < 5) return 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-red-500/30';
    if (margem < 15) return 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-amber-500/30';
    if (margem < 30) return 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-emerald-500/30';
    return 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-blue-500/30';
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
    
    if (!fracionamentoData[itemId]) {
      const produto = produtos.find(p => p.id === itemId);
      const ultimo = ultimosLancamentos[itemId];
      
      if (produto) {
        setFracionamentoData(prev => ({
          ...prev,
          [itemId]: {
            // Sempre iniciar limpo (sem auto-preencher valores)
            valor_caixa: '',
            tipo_caixa: 'inteira',
            quantidade_custom: produto.quantidade_por_caixa.toString(),
            preco_oferta: ''
          }
        }));
      }
    }
  };

  const updateFracionamento = (itemId: string, field: string, value: string) => {
    setFracionamentoData(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
  };

  const addItemsToOferta = () => {
    const novosItens: ItemOfertaHortifruti[] = [];
    const itensInvalidos: string[] = [];

    selectedItems.forEach(itemId => {
      const produto = produtos.find(p => p.id === itemId);
      const data = fracionamentoData[itemId];
      
      if (!produto || !data) return;
      if (itensOferta.some(i => i.item_id === itemId)) return;

      const precoCusto = calcularPrecoCusto(itemId, produto);
      const precoOferta = parsePrecoSimples(data.preco_oferta);

      if (precoCusto <= 0 || precoOferta <= 0) {
        itensInvalidos.push(produto.nome_produto);
        return;
      }

      let quantidade = produto.quantidade_por_caixa;
      if (data.tipo_caixa === 'meia') {
        quantidade = produto.quantidade_por_caixa / 2;
      } else if (data.tipo_caixa === 'customizada' && data.quantidade_custom) {
        quantidade = parseFloat(data.quantidade_custom) || produto.quantidade_por_caixa;
      }

      // Salvar para próximos lançamentos
      salvarUltimoLancamento(itemId, {
        valor_caixa: parsePrecoSimples(data.valor_caixa),
        preco_oferta: precoOferta,
        tipo_caixa: data.tipo_caixa
      });

      novosItens.push({
        item_id: produto.id,
        nome_item: produto.nome_produto,
        preco_custo: precoCusto,
        preco_venda_normal: produto.preco_venda || precoCusto * 1.3,
        preco_oferta: precoOferta,
        margem_lucro: calcularMargem(precoCusto, precoOferta),
        lucro_real: precoOferta - precoCusto,
        destaque: false,
        valor_caixa: parsePrecoSimples(data.valor_caixa),
        quantidade_por_caixa: quantidade,
        tipo_caixa: data.tipo_caixa,
        unidade_fracionamento: produto.unidade_fracionamento
      });
    });

    if (itensInvalidos.length > 0) {
      toast.warning(`Preencha valor da caixa e preço de oferta: ${itensInvalidos.slice(0, 3).join(', ')}`);
    }

    if (novosItens.length === 0) {
      toast.error('Nenhum item válido para adicionar');
      return;
    }

    setItensOferta([...itensOferta, ...novosItens]);
    setShowAddDialog(false);
    setSelectedItems([]);
    setFracionamentoData({});
    toast.success(`${novosItens.length} item(ns) adicionado(s)!`);
  };

  const removeItem = (index: number) => {
    setItensOferta(itensOferta.filter((_, i) => i !== index));
  };

  const toggleDestaque = (index: number) => {
    setItensOferta(itensOferta.map((item, i) =>
      i === index ? { ...item, destaque: !item.destaque } : item
    ));
  };

  const updateItemPreco = (index: number, novoPreco: string) => {
    const preco = parsePrecoSimples(novoPreco);
    setItensOferta(itensOferta.map((item, i) => {
      if (i !== index) return item;
      return {
        ...item,
        preco_oferta: preco,
        margem_lucro: calcularMargem(item.preco_custo, preco),
        lucro_real: preco - item.preco_custo
      };
    }));
  };

  const saveConfig = async (produto: ProdutoHortifruti, quantidade: number, unidade: string) => {
    try {
      const { error } = await supabase
        .from('produtos')
        .update({
          quantidade_por_caixa: quantidade,
          unidade_fracionamento: unidade
        })
        .eq('id', produto.id);

      if (error) throw error;

      setProdutos(prev => prev.map(p =>
        p.id === produto.id
          ? { ...p, quantidade_por_caixa: quantidade, unidade_fracionamento: unidade }
          : p
      ));

      toast.success('Configuração salva!');
      setShowConfigDialog(false);
      setSelectedProduto(null);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configuração');
    }
  };

  const toggleOcultoOferta = async (produto: ProdutoHortifruti) => {
    try {
      const novoValor = !produto.oculto_ofertas;
      const { error } = await supabase
        .from('produtos')
        .update({ oculto_ofertas: novoValor })
        .eq('id', produto.id);

      if (error) throw error;

      setProdutos(prev => prev.map(p =>
        p.id === produto.id ? { ...p, oculto_ofertas: novoValor } : p
      ));

      toast.success(novoValor ? 'Produto oculto das ofertas' : 'Produto visível nas ofertas');
    } catch (error) {
      console.error('Erro ao atualizar visibilidade:', error);
      toast.error('Erro ao atualizar');
    }
  };

  const filteredProdutos = produtos.filter(p => {
    const matchesSearch = searchMultiWord(p.nome_produto, searchTerm);
    const matchesVisibility = mostrarOcultos || !p.oculto_ofertas;
    return matchesSearch && matchesVisibility;
  });

  const produtosOcultos = produtos.filter(p => p.oculto_ofertas).length;

  // Calcular totais
  const totalLucro = itensOferta.reduce((acc, item) => acc + (item.lucro_real || 0), 0);
  const mediaMargemGeral = itensOferta.length > 0 
    ? itensOferta.reduce((acc, item) => acc + (item.margem_lucro || 0), 0) / itensOferta.length 
    : 0;

  // Animações
  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.03, duration: 0.3, ease: [0.4, 0, 0.2, 1] as const }
    }),
    exit: { opacity: 0, x: 20, transition: { duration: 0.2 } }
  };

  const tableRowVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.05, duration: 0.25 }
    })
  };

  const hoverBg = { scale: 1.01, backgroundColor: 'rgba(16, 185, 129, 0.05)' };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
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
      {/* Header com botão de adicionar */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-emerald-600/10 via-green-500/10 to-teal-500/10">
          <CardTitle className="text-lg flex items-center gap-2 font-bold tracking-tight">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg">
              <Package className="h-5 w-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-emerald-700 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
              Itens Hortifruti
            </span>
          </CardTitle>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button 
              onClick={() => setShowAddDialog(true)} 
              size="sm" 
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25 border-0 font-semibold"
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </motion.div>
        </CardHeader>
        <CardContent className="p-4">
          <AnimatePresence mode="wait">
            {itensOferta.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-12 text-muted-foreground"
              >
                <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-3">
                  <Package className="h-12 w-12 opacity-30" />
                </div>
                <p className="font-medium">Nenhum item adicionado</p>
                <p className="text-sm opacity-70">Clique em "Adicionar" para começar</p>
              </motion.div>
            ) : (
              <motion.div
                key="table"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Resumo */}
                <div className="flex flex-wrap gap-4 mb-4">
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20"
                  >
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Margem Média</p>
                      <p className="text-lg font-bold text-emerald-600">{mediaMargemGeral.toFixed(1)}%</p>
                    </div>
                  </motion.div>
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500/10 to-blue-500/5 border border-blue-500/20"
                  >
                    <DollarSign className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Lucro Total</p>
                      <p className="text-lg font-bold text-blue-600">R$ {formatarPreco(totalLucro)}</p>
                    </div>
                  </motion.div>
                  
                  {/* Botões de PDF */}
                  <div className="flex gap-2 ml-auto">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPdfForMarketing(true);
                          setShowPDFDialog(true);
                        }}
                        className="border-secondary/50 hover:border-secondary hover:bg-secondary/10"
                      >
                        <Users className="h-4 w-4 mr-2 text-secondary" />
                        PDF Marketing
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPdfForMarketing(false);
                          setShowPDFDialog(true);
                        }}
                        className="border-primary/50 hover:border-primary hover:bg-primary/10"
                      >
                        <FileText className="h-4 w-4 mr-2 text-primary" />
                        PDF Interno
                      </Button>
                    </motion.div>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-border/50">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="w-12 text-center font-bold text-xs tracking-wider">★</TableHead>
                        <TableHead className="font-bold text-xs tracking-wider">PRODUTO</TableHead>
                        <TableHead className="text-center font-bold text-xs tracking-wider">CAIXA</TableHead>
                        <TableHead className="text-center font-bold text-xs tracking-wider">
                          <span className="px-2 py-1 rounded-lg bg-red-500/10 text-red-600">CUSTO</span>
                        </TableHead>
                        <TableHead className="text-center w-28 font-bold text-xs tracking-wider">
                          <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600">OFERTA</span>
                        </TableHead>
                        <TableHead className="text-center font-bold text-xs tracking-wider">MARGEM</TableHead>
                        <TableHead className="text-center font-bold text-xs tracking-wider">
                          <span className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-600">LUCRO</span>
                        </TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {itensOferta.map((item, index) => (
                          <motion.tr
                            key={item.item_id + index}
                            custom={index}
                            variants={tableRowVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            whileHover="hover"
                            className="border-b border-border/30"
                          >
                            <TableCell className="text-center">
                              <motion.button
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => toggleDestaque(index)}
                                className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                              >
                                <Star className={`h-5 w-5 transition-all ${item.destaque ? 'text-amber-400 fill-amber-400 drop-shadow-md' : 'text-muted-foreground/40'}`} />
                              </motion.button>
                            </TableCell>
                            <TableCell>
                              <span className="font-bold uppercase text-sm tracking-wide">{item.nome_item}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-xs text-muted-foreground font-mono">
                                {item.tipo_caixa === 'meia' ? '½ ' : ''}
                                R$ {item.valor_caixa} / {item.quantidade_por_caixa}{item.unidade_fracionamento}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="inline-block px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 font-mono font-bold text-sm">
                                R$ {formatarPreco(item.preco_custo)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Input
                                type="text"
                                value={formatarPreco(item.preco_oferta)}
                                onChange={(e) => {
                                  const rawValue = e.target.value.replace(/\D/g, '');
                                  const formatted = formatarPrecoOfertaInput(rawValue);
                                  updateItemPreco(index, formatted);
                                }}
                                className="w-24 h-9 text-center font-mono font-bold text-sm border-emerald-500/50 bg-emerald-500/5 focus:ring-emerald-500"
                                placeholder="0,00"
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <motion.span 
                                initial={{ scale: 0.9 }}
                                animate={{ scale: 1 }}
                                className={`inline-flex items-center justify-center px-3 py-1.5 rounded-full text-sm font-bold shadow-lg ${getMargemStyle(item.margem_lucro || 0)}`}
                              >
                                {(item.margem_lucro || 0).toFixed(0)}%
                              </motion.span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`font-mono font-bold text-sm ${(item.lucro_real || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                R$ {formatarPreco(item.lucro_real || 0)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                <Button variant="ghost" size="icon" onClick={() => removeItem(index)} className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </motion.div>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Dialog de Adicionar Itens */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-6xl h-[95vh] overflow-hidden p-0 bg-gradient-to-br from-background via-background to-accent/10 border-0 shadow-2xl flex flex-col">
          {/* Header Futurista */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg"
                  >
                    <Sparkles className="h-6 w-6 text-white" />
                  </motion.div>
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight">
                      Fracionamento Inteligente
                    </h2>
                    <p className="text-white/80 text-sm mt-0.5 font-medium">
                      Valor da caixa sem centavos • Preço oferta com vírgula automática
                    </p>
                  </div>
                </div>
                <AnimatePresence>
                  {selectedItems.length > 0 && (
                    <motion.div
                      initial={{ scale: 0, x: 20 }}
                      animate={{ scale: 1, x: 0 }}
                      exit={{ scale: 0, x: 20 }}
                      className="flex items-center gap-3 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/30"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white text-emerald-600 font-black">
                        {selectedItems.length}
                      </div>
                      <span className="text-white font-semibold">selecionado(s)</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          <div className="flex-1 min-h-0 p-6 space-y-5 overflow-y-auto">
            {/* Busca e Filtros */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex gap-3 items-center"
            >
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  placeholder="Buscar produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 text-base bg-muted/30 border-muted-foreground/20 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-medium"
                />
              </div>
              {produtosOcultos > 0 && (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant={mostrarOcultos ? "default" : "outline"}
                    onClick={() => setMostrarOcultos(!mostrarOcultos)}
                    className={`h-12 px-5 rounded-xl font-semibold transition-all ${
                      mostrarOcultos 
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 border-0' 
                        : 'border-muted-foreground/20 hover:bg-muted/80'
                    }`}
                  >
                    {mostrarOcultos ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                    {mostrarOcultos ? 'Ver todos' : `Ocultos (${produtosOcultos})`}
                  </Button>
                </motion.div>
              )}
            </motion.div>

            {/* Instruções Compactas */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-4 gap-3"
            >
              {[
                { step: '1', text: 'Selecione', icon: Check },
                { step: '2', text: 'Tipo caixa', icon: Box },
                { step: '3', text: 'Valor (inteiro)', icon: Calculator },
                { step: '4', text: 'Preço oferta', icon: Sparkles },
              ].map((item, idx) => (
                <motion.div 
                  key={idx} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + idx * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-sm font-black shadow-md">
                    {item.step}
                  </div>
                  <span className="text-sm font-semibold text-foreground/80">{item.text}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Tabela de Produtos */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border border-border/50 overflow-hidden bg-card/50 backdrop-blur-sm shadow-sm"
            >
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 border-b border-border/50 hover:bg-muted/50">
                      <TableHead className="w-12 text-center font-black text-[10px] uppercase tracking-widest text-muted-foreground py-4">Sel</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-4">Produto</TableHead>
                      <TableHead className="text-center w-28 font-black text-[10px] uppercase tracking-widest text-muted-foreground py-4">Tipo</TableHead>
                      <TableHead className="text-center w-20 font-black text-[10px] uppercase tracking-widest text-muted-foreground py-4">Qtd</TableHead>
                      <TableHead className="text-center w-28 font-black text-[10px] uppercase tracking-widest text-muted-foreground py-4">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500/10 text-orange-600">
                          <Box className="h-3 w-3" />
                          Caixa
                        </span>
                      </TableHead>
                      <TableHead className="text-center w-24 font-black text-[10px] uppercase tracking-widest text-muted-foreground py-4">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 text-red-600">
                          Custo
                        </span>
                      </TableHead>
                      <TableHead className="text-center w-28 font-black text-[10px] uppercase tracking-widest text-muted-foreground py-4">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600">
                          <Sparkles className="h-3 w-3" />
                          Oferta
                        </span>
                      </TableHead>
                      <TableHead className="text-center w-20 font-black text-[10px] uppercase tracking-widest text-muted-foreground py-4">Margem</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {filteredProdutos.slice(0, 50).map((produto, index) => {
                        const isSelected = selectedItems.includes(produto.id);
                        const jaAdicionado = itensOferta.some(i => i.item_id === produto.id);
                        const temHistorico = !!ultimosLancamentos[produto.id];
                        const data = fracionamentoData[produto.id] || {
                          valor_caixa: '',
                          tipo_caixa: 'inteira' as const,
                          quantidade_custom: produto.quantidade_por_caixa.toString(),
                          preco_oferta: ''
                        };

                        const precoCusto = calcularPrecoCusto(produto.id, produto);
                        const precoOferta = parsePrecoSimples(data.preco_oferta);
                        const margem = precoOferta > 0 ? calcularMargem(precoCusto, precoOferta) : 0;

                        let qtdDisplay = produto.quantidade_por_caixa;
                        if (data.tipo_caixa === 'meia') {
                          qtdDisplay = produto.quantidade_por_caixa / 2;
                        } else if (data.tipo_caixa === 'customizada' && data.quantidade_custom) {
                          qtdDisplay = parseFloat(data.quantidade_custom) || produto.quantidade_por_caixa;
                        }

                        return (
                          <motion.tr
                            key={produto.id}
                            custom={index}
                            variants={rowVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            whileHover={{ backgroundColor: isSelected ? undefined : 'rgba(0,0,0,0.02)' }}
                            className={`
                              transition-colors border-b border-border/30
                              ${isSelected 
                                ? 'bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-l-4 border-l-emerald-500' 
                                : ''
                              } 
                              ${jaAdicionado ? 'opacity-40' : ''}
                              ${produto.oculto_ofertas ? 'bg-muted/20' : ''}
                            `}
                          >
                            <TableCell className="text-center py-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleItemSelection(produto.id)}
                                disabled={jaAdicionado}
                                className="h-5 w-5 rounded-md border-2 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                              />
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="flex items-center gap-2">
                                <span className={`font-bold uppercase text-sm tracking-wide ${produto.oculto_ofertas ? 'text-muted-foreground' : ''}`}>
                                  {produto.nome_produto}
                                </span>
                                {temHistorico && !jaAdicionado && (
                                  <Badge className="text-[9px] bg-blue-500/10 text-blue-600 font-semibold px-1.5 py-0 gap-0.5">
                                    <History className="h-2.5 w-2.5" />
                                    HISTÓRICO
                                  </Badge>
                                )}
                                {jaAdicionado && (
                                  <Badge className="text-[9px] bg-muted text-muted-foreground font-semibold px-1.5 py-0">
                                    ADICIONADO
                                  </Badge>
                                )}
                                {produto.oculto_ofertas && (
                                  <Badge className="text-[9px] bg-amber-500/20 text-amber-600 font-semibold px-1.5 py-0">
                                    OCULTO
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center py-3">
                              {isSelected ? (
                                <Select
                                  value={data.tipo_caixa}
                                  onValueChange={(v) => updateFracionamento(produto.id, 'tipo_caixa', v)}
                                >
                                  <SelectTrigger className="h-9 text-xs font-semibold bg-background border-border/50 rounded-lg">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="inteira">Inteira</SelectItem>
                                    <SelectItem value="meia">Meia</SelectItem>
                                    <SelectItem value="customizada">Custom</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center py-3">
                              {isSelected && data.tipo_caixa === 'customizada' ? (
                                <Input
                                  type="text"
                                  value={data.quantidade_custom}
                                  onChange={(e) => updateFracionamento(produto.id, 'quantidade_custom', e.target.value)}
                                  className="w-16 h-9 text-center text-xs font-mono bg-background border-border/50 rounded-lg"
                                />
                              ) : (
                                <span className="text-sm font-mono text-muted-foreground font-medium">
                                  {qtdDisplay}{produto.unidade_fracionamento}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center py-3">
                              {isSelected ? (
                                <Input
                                  type="text"
                                  placeholder=""
                                  value={data.valor_caixa}
                                  onChange={(e) => updateFracionamento(produto.id, 'valor_caixa', formatarInputInteiro(e.target.value))}
                                  className="w-20 h-9 text-center font-mono text-sm font-bold bg-orange-500/5 border-orange-500/30 rounded-lg focus:border-orange-500 focus:ring-orange-500/30"
                                />
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center py-3">
                              {isSelected && data.valor_caixa ? (
                                <motion.div 
                                  initial={{ scale: 0.9 }}
                                  animate={{ scale: 1 }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-red-500/10 to-red-500/5 border border-red-500/20"
                                >
                                  <span className="text-red-600 font-mono font-bold text-sm">
                                    R$ {formatarPreco(precoCusto)}
                                  </span>
                                </motion.div>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center py-3">
                              {isSelected ? (
                                <Input
                                  type="text"
                                  placeholder=""
                                  value={data.preco_oferta}
                                  onChange={(e) => {
                                    const rawValue = e.target.value.replace(/\D/g, '');
                                    const formatted = rawValue ? formatarPrecoOfertaInput(rawValue) : '';
                                    updateFracionamento(produto.id, 'preco_oferta', formatted);
                                  }}
                                  className="w-20 h-9 text-center font-mono text-sm font-bold bg-emerald-500/5 border-emerald-500/30 rounded-lg focus:border-emerald-500 focus:ring-emerald-500/30"
                                />
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center py-3">
                              {isSelected && data.valor_caixa && data.preco_oferta ? (
                                <motion.div
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  className={`
                                    inline-flex items-center justify-center px-2.5 py-1.5 rounded-full text-xs font-black shadow-lg
                                    ${getMargemStyle(margem)}
                                  `}
                                >
                                  {margem.toFixed(0)}%
                                </motion.div>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="flex items-center gap-1">
                                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg hover:bg-muted/80"
                                    onClick={() => toggleOcultoOferta(produto)}
                                  >
                                    {produto.oculto_ofertas ? (
                                      <EyeOff className="h-4 w-4 text-amber-500" />
                                    ) : (
                                      <Eye className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </Button>
                                </motion.div>
                                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg hover:bg-muted/80"
                                    onClick={() => {
                                      setSelectedProduto(produto);
                                      setShowConfigDialog(true);
                                    }}
                                  >
                                    <Settings className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                </motion.div>
                              </div>
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            </motion.div>
          </div>

          {/* Footer */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="border-t border-border/50 bg-muted/30 backdrop-blur-sm px-6 py-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground font-medium">
                {filteredProdutos.length} produto(s)
              </p>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowAddDialog(false);
                    setSelectedItems([]);
                    setFracionamentoData({});
                  }}
                  className="h-11 px-6 rounded-xl border-border/50 hover:bg-muted/80 font-semibold"
                >
                  Cancelar
                </Button>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    onClick={addItemsToOferta} 
                    disabled={selectedItems.length === 0} 
                    className="h-11 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 border-0 shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:shadow-none font-bold"
                  >
                    <span>Adicionar {selectedItems.length > 0 ? selectedItems.length : ''} Produto(s)</span>
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Configuração */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              <Settings className="h-5 w-5 text-primary" />
              Configurar Fracionamento
            </DialogTitle>
          </DialogHeader>

          {selectedProduto && (
            <ConfiguracaoFracionamento
              produto={selectedProduto}
              onSave={saveConfig}
              onCancel={() => {
                setShowConfigDialog(false);
                setSelectedProduto(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de PDF */}
      {showPDFDialog && (
        <OfertasHortifrutiPDF
          oferta={{
            id: 'horti-temp',
            nome_campanha: 'Ofertas Hortifruti',
            data_inicio: new Date().toISOString().split('T')[0],
            data_fim: new Date().toISOString().split('T')[0],
            tipo: 'semanal',
            setor: 'hortifruti',
            observacao: null
          }}
          itens={itensOferta.map(item => ({
            nome_item: item.nome_item,
            preco_custo: item.preco_custo,
            preco_venda_normal: item.preco_venda_normal,
            preco_oferta: item.preco_oferta,
            margem_lucro: item.margem_lucro,
            destaque: item.destaque
          }))}
          onClose={() => setShowPDFDialog(false)}
          forMarketing={pdfForMarketing}
        />
      )}
    </div>
  );
};

// Componente separado para configuração
const ConfiguracaoFracionamento = ({
  produto,
  onSave,
  onCancel
}: {
  produto: ProdutoHortifruti;
  onSave: (produto: ProdutoHortifruti, quantidade: number, unidade: string) => void;
  onCancel: () => void;
}) => {
  const [quantidade, setQuantidade] = useState(produto.quantidade_por_caixa.toString());
  const [unidade, setUnidade] = useState(produto.unidade_fracionamento);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl border border-emerald-500/20">
        <p className="font-bold text-lg">{produto.nome_produto}</p>
        <p className="text-sm text-muted-foreground mt-1">
          Configure a quantidade padrão que vem em cada caixa.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="font-semibold">Quantidade por caixa</Label>
          <Input
            type="number"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            placeholder="Ex: 20"
            step="0.1"
            className="h-11 font-mono text-lg"
          />
        </div>

        <div className="space-y-2">
          <Label className="font-semibold">Unidade</Label>
          <Select value={unidade} onValueChange={setUnidade}>
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kg">Quilos (kg)</SelectItem>
              <SelectItem value="un">Unidades (un)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" onClick={onCancel} className="font-semibold">
          Cancelar
        </Button>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button 
            onClick={() => onSave(produto, parseFloat(quantidade) || 1, unidade)}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 font-semibold"
          >
            Salvar
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default HortifrutiOfertaTab;
