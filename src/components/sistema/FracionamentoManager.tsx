import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Save, 
  Loader2, 
  Package, 
  Scale,
  Calculator,
  Box
} from 'lucide-react';

interface ConfigFracionamento {
  id: string;
  produto_id: string | null;
  nome_produto: string;
  peso_caixa_kg: number;
  unidades_por_caixa: number;
  peso_medio_unidade_kg: number | null;
  tipo_venda: 'kg' | 'unidade' | 'ambos';
  observacao: string | null;
  ativo: boolean;
}

interface ProdutoEstoque {
  id: string;
  nome: string;
  codigo: string;
}

export function FracionamentoManager() {
  const [configs, setConfigs] = useState<ConfigFracionamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  // Produtos do estoque para vincular
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  const [searchProduto, setSearchProduto] = useState('');
  
  // Form state
  const [form, setForm] = useState({
    produto_id: '',
    nome_produto: '',
    peso_caixa_kg: '',
    unidades_por_caixa: '',
    peso_medio_unidade_kg: '',
    tipo_venda: 'kg' as 'kg' | 'unidade' | 'ambos',
    observacao: ''
  });

  useEffect(() => {
    fetchConfigs();
    fetchProdutos();
  }, []);

  const fetchConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes_fracionamento')
        .select('*')
        .order('nome_produto');

      if (error) throw error;
      setConfigs((data || []).map(d => ({
        ...d,
        tipo_venda: d.tipo_venda as 'kg' | 'unidade' | 'ambos'
      })));
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const fetchProdutos = async () => {
    try {
      const { data, error } = await supabase
        .from('estoque')
        .select('id, nome, codigo')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setProdutos(data || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  const resetForm = () => {
    setForm({
      produto_id: '',
      nome_produto: '',
      peso_caixa_kg: '',
      unidades_por_caixa: '',
      peso_medio_unidade_kg: '',
      tipo_venda: 'kg',
      observacao: ''
    });
    setEditingId(null);
    setSearchProduto('');
  };

  const openNewDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (config: ConfigFracionamento) => {
    setForm({
      produto_id: config.produto_id || '',
      nome_produto: config.nome_produto,
      peso_caixa_kg: config.peso_caixa_kg.toString(),
      unidades_por_caixa: config.unidades_por_caixa.toString(),
      peso_medio_unidade_kg: config.peso_medio_unidade_kg?.toString() || '',
      tipo_venda: config.tipo_venda,
      observacao: config.observacao || ''
    });
    setEditingId(config.id);
    setShowDialog(true);
  };

  const handleSelectProduto = (produto: ProdutoEstoque) => {
    setForm(prev => ({
      ...prev,
      produto_id: produto.id,
      nome_produto: produto.nome
    }));
    setSearchProduto('');
  };

  const handleSave = async () => {
    if (!form.nome_produto.trim()) {
      toast.error('Nome do produto é obrigatório');
      return;
    }

    const peso = parseFloat(form.peso_caixa_kg) || 0;
    const unidades = parseInt(form.unidades_por_caixa) || 0;

    if (peso <= 0 && unidades <= 0) {
      toast.error('Informe o peso da caixa ou quantidade de unidades');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        produto_id: form.produto_id || null,
        nome_produto: form.nome_produto,
        peso_caixa_kg: peso,
        unidades_por_caixa: unidades,
        peso_medio_unidade_kg: parseFloat(form.peso_medio_unidade_kg) || null,
        tipo_venda: form.tipo_venda,
        observacao: form.observacao || null,
        ativo: true
      };

      if (editingId) {
        const { error } = await supabase
          .from('configuracoes_fracionamento')
          .update(payload)
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Configuração atualizada!');
      } else {
        const { error } = await supabase
          .from('configuracoes_fracionamento')
          .insert(payload);

        if (error) throw error;
        toast.success('Configuração criada!');
      }

      setShowDialog(false);
      resetForm();
      fetchConfigs();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta configuração?')) return;

    try {
      const { error } = await supabase
        .from('configuracoes_fracionamento')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Configuração excluída!');
      fetchConfigs();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir configuração');
    }
  };

  const formatarPreco = (valor: number) => {
    return valor.toFixed(2).replace('.', ',');
  };

  const filteredConfigs = configs.filter(c =>
    c.nome_produto.toLowerCase().includes(search.toLowerCase())
  );

  const filteredProdutos = produtos.filter(p =>
    p.nome.toLowerCase().includes(searchProduto.toLowerCase()) ||
    p.codigo.toLowerCase().includes(searchProduto.toLowerCase())
  ).slice(0, 10);

  

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5" />
              Fracionamento Inteligente
            </CardTitle>
            <CardDescription>
              Configure preços por kg/unidade baseado nos dados da caixa
            </CardDescription>
          </div>
          <Button onClick={openNewDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tabela */}
        {filteredConfigs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Box className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma configuração de fracionamento</p>
            <p className="text-sm">Clique em "Adicionar" para começar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Peso Caixa</TableHead>
                  <TableHead className="text-right">Unidades</TableHead>
                  <TableHead>Tipo Venda</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {filteredConfigs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">{config.nome_produto}</TableCell>
                    <TableCell className="text-right">{config.peso_caixa_kg} kg</TableCell>
                    <TableCell className="text-right">{config.unidades_por_caixa}</TableCell>
                    <TableCell>
                      <Badge variant={config.tipo_venda === 'kg' ? 'default' : config.tipo_venda === 'unidade' ? 'secondary' : 'outline'}>
                        {config.tipo_venda === 'kg' ? 'Por Kg' : config.tipo_venda === 'unidade' ? 'Por Unidade' : 'Ambos'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(config)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(config.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Dialog de criação/edição */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                {editingId ? 'Editar Fracionamento' : 'Novo Fracionamento'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Busca de produto */}
              <div className="space-y-2">
                <Label>Produto</Label>
                <div className="relative">
                  <Input
                    placeholder="Buscar produto do estoque..."
                    value={searchProduto || form.nome_produto}
                    onChange={(e) => {
                      setSearchProduto(e.target.value);
                      if (!produtos.some(p => p.nome === e.target.value)) {
                        setForm(prev => ({ ...prev, nome_produto: e.target.value, produto_id: '' }));
                      }
                    }}
                  />
                  {searchProduto && filteredProdutos.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredProdutos.map((produto) => (
                        <button
                          key={produto.id}
                          className="w-full px-3 py-2 text-left hover:bg-muted flex items-center justify-between"
                          onClick={() => handleSelectProduto(produto)}
                        >
                          <span>{produto.nome}</span>
                          <span className="text-xs text-muted-foreground">{produto.codigo}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Digite para buscar ou escreva um nome manualmente
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Peso da Caixa (kg)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="Ex: 18.5"
                    value={form.peso_caixa_kg}
                    onChange={(e) => setForm(prev => ({ ...prev, peso_caixa_kg: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unidades por Caixa</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 12"
                    value={form.unidades_por_caixa}
                    onChange={(e) => setForm(prev => ({ ...prev, unidades_por_caixa: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Peso Médio por Unidade (kg) - opcional</Label>
                <Input
                  type="number"
                  step="0.001"
                  placeholder="Ex: 0.250"
                  value={form.peso_medio_unidade_kg}
                  onChange={(e) => setForm(prev => ({ ...prev, peso_medio_unidade_kg: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Venda</Label>
                <Select
                  value={form.tipo_venda}
                  onValueChange={(value: 'kg' | 'unidade' | 'ambos') => 
                    setForm(prev => ({ ...prev, tipo_venda: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">Por Quilo</SelectItem>
                    <SelectItem value="unidade">Por Unidade</SelectItem>
                    <SelectItem value="ambos">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Observação</Label>
                <Input
                  placeholder="Observações sobre o produto"
                  value={form.observacao}
                  onChange={(e) => setForm(prev => ({ ...prev, observacao: e.target.value }))}
                />
              </div>

              <div className="p-4 bg-muted/50 rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground">
                  💡 O preço da caixa será informado no momento do fracionamento, 
                  na tela de Ofertas → Fracionamento
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {editingId ? 'Atualizar' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
