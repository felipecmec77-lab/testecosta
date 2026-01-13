import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Scale, 
  Loader2, 
  Play, 
  Check, 
  ArrowRight, 
  ArrowLeft,
  Save,
  Printer,
  Box,
  Settings,
  Calculator
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface ConfigFracionamento {
  id: string;
  nome_produto: string;
  peso_caixa_kg: number;
  unidades_por_caixa: number;
  peso_medio_unidade_kg: number | null;
  tipo_venda: 'kg' | 'unidade' | 'ambos';
}

interface ItemSelecionado {
  config: ConfigFracionamento;
  preco_caixa: string;
  custo_kg: number;
  custo_un: number;
  preco_venda_kg: number;
  preco_venda_un: number;
  margem: number;
  preco_venda_kg_manual: string;
  preco_venda_un_manual: string;
}

// Função de arredondamento comercial
function calcularPrecoVenda(custoPorKg: number, margem: number = 1): number {
  const precoBase = custoPorKg + margem;
  const parteInteira = Math.floor(precoBase);
  const parteDecimal = precoBase - parteInteira;
  
  if (parteDecimal <= 0.49) {
    return parteInteira + 0.49;
  } else {
    return parteInteira + 0.99;
  }
}

interface IniciarFracionamentoProps {
  onVoltar?: () => void;
}

export function IniciarFracionamento({ onVoltar }: IniciarFracionamentoProps) {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<ConfigFracionamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [etapa, setEtapa] = useState<'selecao' | 'precos' | 'confirmacao'>('selecao');
  const [observacao, setObservacao] = useState('');
  const [margemPadrao, setMargemPadrao] = useState(1);
  
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [itensSelecionados, setItensSelecionados] = useState<ItemSelecionado[]>([]);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes_fracionamento')
        .select('id, nome_produto, peso_caixa_kg, unidades_por_caixa, peso_medio_unidade_kg, tipo_venda')
        .eq('ativo', true)
        .order('nome_produto');

      if (error) throw error;
      setConfigs((data || []).map(d => ({
        ...d,
        tipo_venda: d.tipo_venda as 'kg' | 'unidade' | 'ambos'
      })));
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelecao = (id: string) => {
    setSelecionados(prev => {
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
    if (selecionados.size === configs.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(configs.map(c => c.id)));
    }
  };

  const iniciarPreenchimentoPrecos = () => {
    const itens = configs
      .filter(c => selecionados.has(c.id))
      .map(config => ({
        config,
        preco_caixa: '',
        custo_kg: 0,
        custo_un: 0,
        preco_venda_kg: 0,
        preco_venda_un: 0,
        margem: margemPadrao,
        preco_venda_kg_manual: '',
        preco_venda_un_manual: ''
      }));
    
    setItensSelecionados(itens);
    setEtapa('precos');
  };

  const handlePrecoCaixaChange = (index: number, valor: string) => {
    setItensSelecionados(prev => {
      const next = [...prev];
      const item = next[index];
      item.preco_caixa = valor;
      
      const precoCaixa = parseFloat(valor.replace(',', '.')) || 0;
      const pesoCaixa = item.config.peso_caixa_kg || 1;
      const unidadesCaixa = item.config.unidades_por_caixa || 1;
      
      // Calcular custos
      item.custo_kg = pesoCaixa > 0 ? precoCaixa / pesoCaixa : 0;
      item.custo_un = unidadesCaixa > 0 ? precoCaixa / unidadesCaixa : 0;
      
      // Calcular preços de venda com arredondamento comercial
      item.preco_venda_kg = calcularPrecoVenda(item.custo_kg, item.margem);
      item.preco_venda_un = calcularPrecoVenda(item.custo_un, item.margem);
      item.preco_venda_kg_manual = '';
      item.preco_venda_un_manual = '';
      
      return next;
    });
  };

  const handleMargemChange = (index: number, valor: number) => {
    setItensSelecionados(prev => {
      const next = [...prev];
      const item = next[index];
      item.margem = valor;
      
      // Recalcular preços de venda
      item.preco_venda_kg = calcularPrecoVenda(item.custo_kg, valor);
      item.preco_venda_un = calcularPrecoVenda(item.custo_un, valor);
      item.preco_venda_kg_manual = '';
      item.preco_venda_un_manual = '';
      
      return next;
    });
  };

  const handlePrecoVendaManual = (index: number, tipo: 'kg' | 'un', valor: string) => {
    setItensSelecionados(prev => {
      const next = [...prev];
      const item = next[index];
      
      if (tipo === 'kg') {
        item.preco_venda_kg_manual = valor;
        const parsed = parseFloat(valor.replace(',', '.'));
        if (!isNaN(parsed)) {
          item.preco_venda_kg = parsed;
        }
      } else {
        item.preco_venda_un_manual = valor;
        const parsed = parseFloat(valor.replace(',', '.'));
        if (!isNaN(parsed)) {
          item.preco_venda_un = parsed;
        }
      }
      
      return next;
    });
  };

  const aplicarMargemTodos = () => {
    setItensSelecionados(prev => prev.map(item => ({
      ...item,
      margem: margemPadrao,
      preco_venda_kg: calcularPrecoVenda(item.custo_kg, margemPadrao),
      preco_venda_un: calcularPrecoVenda(item.custo_un, margemPadrao),
      preco_venda_kg_manual: '',
      preco_venda_un_manual: ''
    })));
    toast.success(`Margem de R$ ${margemPadrao.toFixed(2)} aplicada a todos!`);
  };

  const formatarPreco = (valor: number) => {
    return valor.toFixed(2).replace('.', ',');
  };

  const itensValidos = itensSelecionados.filter(item => {
    const preco = parseFloat(item.preco_caixa.replace(',', '.')) || 0;
    return preco > 0;
  });

  const handleSalvar = async () => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    if (itensValidos.length === 0) {
      toast.error('Nenhum item com preço válido');
      return;
    }

    setSaving(true);
    try {
      // Criar sessão
      const { data: sessao, error: sessaoError } = await supabase
        .from('sessoes_fracionamento')
        .insert({
          usuario_id: user.id,
          observacao: observacao || null,
          status: 'finalizada',
          finalizado_em: new Date().toISOString()
        })
        .select()
        .single();

      if (sessaoError) throw sessaoError;

      // Inserir itens
      const itensParaInserir = itensValidos.map(item => ({
        sessao_id: sessao.id,
        config_id: item.config.id,
        preco_caixa: parseFloat(item.preco_caixa.replace(',', '.')),
        preco_custo_kg: item.custo_kg,
        preco_custo_un: item.custo_un,
        preco_venda_kg: item.preco_venda_kg,
        preco_venda_un: item.preco_venda_un,
        margem_aplicada: item.margem
      }));

      const { error: itensError } = await supabase
        .from('itens_fracionamento')
        .insert(itensParaInserir);

      if (itensError) throw itensError;

      toast.success(`Fracionamento salvo com ${itensValidos.length} produtos!`);
      
      // Voltar ao início
      setEtapa('selecao');
      setSelecionados(new Set());
      setItensSelecionados([]);
      setObservacao('');
      
      if (onVoltar) onVoltar();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar fracionamento');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (configs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <Box className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
            <div>
              <h3 className="text-lg font-semibold">Nenhum produto configurado</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Configure os dados de fracionamento nas Configurações do Sistema antes de iniciar
              </p>
            </div>
            <Button asChild>
              <Link to="/sistema">
                <Settings className="w-4 h-4 mr-2" />
                Ir para Configurações
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ETAPA 1: Seleção de Produtos (estilo da imagem de referência)
  if (etapa === 'selecao') {
    const dataHoje = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
    
    return (
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600">
                <Play className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Iniciar Fracionamento</CardTitle>
                <p className="text-sm text-muted-foreground capitalize">{dataHoje}</p>
              </div>
            </div>
            <Button 
              onClick={iniciarPreenchimentoPrecos}
              disabled={selecionados.size === 0}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Continuar ({selecionados.size})
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
            >
              {selecionados.size === configs.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
            </Button>
          </div>

          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-16"></TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center">Peso Caixa</TableHead>
                  <TableHead className="text-center">Unidades</TableHead>
                  <TableHead className="text-center">Tipo Venda</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {configs.map((config, index) => {
                    const isSelected = selecionados.has(config.id);
                    
                    return (
                      <motion.tr
                        key={config.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.02 }}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => handleToggleSelecao(config.id)}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleSelecao(config.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{config.nome_produto}</TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {config.peso_caixa_kg} kg
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {config.unidades_por_caixa}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant="secondary"
                            className={
                              config.tipo_venda === 'kg' 
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' 
                                : config.tipo_venda === 'unidade'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                            }
                          >
                            {config.tipo_venda === 'kg' ? 'Por Kg' : config.tipo_venda === 'unidade' ? 'Por Un' : 'Ambos'}
                          </Badge>
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
    );
  }

  // ETAPA 2: Preencher Preços
  if (etapa === 'precos') {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>Preencha os Preços das Caixas</CardTitle>
              <CardDescription>
                Informe o preço de cada caixa para calcular automaticamente os preços de venda
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Margem padrão:</span>
              <Input
                type="number"
                step="0.50"
                value={margemPadrao}
                onChange={(e) => setMargemPadrao(parseFloat(e.target.value) || 1)}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">R$</span>
              <Button size="sm" variant="outline" onClick={aplicarMargemTodos}>
                <Calculator className="w-4 h-4 mr-1" />
                Aplicar a todos
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {itensSelecionados.map((item, index) => {
              const precoCaixaValido = parseFloat(item.preco_caixa.replace(',', '.')) > 0;
              
              return (
                <div key={item.config.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{item.config.nome_produto}</h4>
                    <Badge variant="outline">
                      {item.config.peso_caixa_kg}kg | {item.config.unidades_por_caixa} un
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Preço da Caixa (R$)</Label>
                      <Input
                        placeholder="0,00"
                        value={item.preco_caixa}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^\d,]/g, '');
                          handlePrecoCaixaChange(index, val);
                        }}
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Margem (R$)</Label>
                      <Input
                        type="number"
                        step="0.50"
                        value={item.margem}
                        onChange={(e) => handleMargemChange(index, parseFloat(e.target.value) || 1)}
                        disabled={!precoCaixaValido}
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Custo/kg</Label>
                      <div className="flex items-center h-10 px-3 bg-muted rounded-md text-sm">
                        R$ {formatarPreco(item.custo_kg)}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Venda/kg</Label>
                      <Input
                        placeholder={formatarPreco(item.preco_venda_kg)}
                        value={item.preco_venda_kg_manual}
                        onChange={(e) => handlePrecoVendaManual(index, 'kg', e.target.value)}
                        disabled={!precoCaixaValido}
                        className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200"
                      />
                    </div>
                  </div>
                  
                  {item.config.tipo_venda !== 'kg' && (
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                      <div className="space-y-1">
                        <Label className="text-xs">Custo/un</Label>
                        <div className="flex items-center h-10 px-3 bg-muted rounded-md text-sm">
                          R$ {formatarPreco(item.custo_un)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Venda/un</Label>
                        <Input
                          placeholder={formatarPreco(item.preco_venda_un)}
                          value={item.preco_venda_un_manual}
                          onChange={(e) => handlePrecoVendaManual(index, 'un', e.target.value)}
                          disabled={!precoCaixaValido}
                          className="bg-blue-50 dark:bg-blue-950/30 border-blue-200"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-3 pt-4 border-t">
            <Label>Observação (opcional)</Label>
            <Textarea
              placeholder="Ex: Mercadoria do CEASA, fornecedor X..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => setEtapa('selecao')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <Button 
              onClick={handleSalvar}
              disabled={saving || itensValidos.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar ({itensValidos.length} itens)
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
