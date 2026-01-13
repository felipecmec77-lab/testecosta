import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, MessageSquare, Save } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Cotacao {
  id: string;
  numero: number;
  titulo: string | null;
}

interface Fornecedor {
  id: string;
  nome: string;
}

interface ItemCotacao {
  id: string;
  nome_produto: string;
  quantidade: number;
  codigo_barras: string | null;
}

interface ItemResposta {
  item_cotacao_id: string;
  preco_unitario: number;
  disponivel: boolean;
  observacao: string;
}

interface RespostaFornecedorProps {
  cotacao: Cotacao;
  fornecedores: Fornecedor[];
  onClose: () => void;
  onSuccess: () => void;
}

const RespostaFornecedor = ({ cotacao, fornecedores, onClose, onSuccess }: RespostaFornecedorProps) => {
  const { user } = useAuth();
  const [selectedFornecedor, setSelectedFornecedor] = useState('');
  const [prazoEntrega, setPrazoEntrega] = useState('');
  const [condicaoPagamento, setCondicaoPagamento] = useState('');
  const [validadeProposta, setValidadeProposta] = useState('');
  const [observacao, setObservacao] = useState('');
  const [itens, setItens] = useState<ItemCotacao[]>([]);
  const [itensResposta, setItensResposta] = useState<Record<string, ItemResposta>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchItens();
  }, [cotacao.id]);

  const fetchItens = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('itens_cotacao')
        .select('*')
        .eq('cotacao_id', cotacao.id);

      if (error) throw error;
      
      setItens(data || []);
      
      // Initialize itensResposta
      const initialResposta: Record<string, ItemResposta> = {};
      (data || []).forEach(item => {
        initialResposta[item.id] = {
          item_cotacao_id: item.id,
          preco_unitario: 0,
          disponivel: true,
          observacao: ''
        };
      });
      setItensResposta(initialResposta);
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
      toast.error('Erro ao carregar itens');
    } finally {
      setLoading(false);
    }
  };

  const updateItemResposta = (itemId: string, field: keyof ItemResposta, value: any) => {
    setItensResposta(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value }
    }));
  };

  const salvarResposta = async () => {
    if (!selectedFornecedor) {
      toast.error('Selecione um fornecedor');
      return;
    }

    setSaving(true);
    try {
      // Verificar se já existe resposta deste fornecedor
      const { data: existingResposta } = await supabase
        .from('respostas_fornecedor')
        .select('id')
        .eq('cotacao_id', cotacao.id)
        .eq('fornecedor_id', selectedFornecedor)
        .single();

      let respostaId: string;

      if (existingResposta) {
        // Atualizar resposta existente
        const { error: updateError } = await supabase
          .from('respostas_fornecedor')
          .update({
            prazo_entrega_dias: prazoEntrega ? parseInt(prazoEntrega) : null,
            condicao_pagamento: condicaoPagamento || null,
            validade_proposta: validadeProposta || null,
            observacao: observacao || null
          })
          .eq('id', existingResposta.id);

        if (updateError) throw updateError;
        respostaId = existingResposta.id;

        // Deletar itens antigos
        await supabase
          .from('itens_resposta_fornecedor')
          .delete()
          .eq('resposta_id', respostaId);
      } else {
        // Criar nova resposta
        const { data: newResposta, error: insertError } = await supabase
          .from('respostas_fornecedor')
          .insert({
            cotacao_id: cotacao.id,
            fornecedor_id: selectedFornecedor,
            prazo_entrega_dias: prazoEntrega ? parseInt(prazoEntrega) : null,
            condicao_pagamento: condicaoPagamento || null,
            validade_proposta: validadeProposta || null,
            observacao: observacao || null
          })
          .select()
          .single();

        if (insertError) throw insertError;
        respostaId = newResposta.id;
      }

      // Inserir itens da resposta
      const itensToInsert = Object.values(itensResposta).map(item => ({
        resposta_id: respostaId,
        item_cotacao_id: item.item_cotacao_id,
        preco_unitario: item.preco_unitario,
        disponivel: item.disponivel,
        observacao: item.observacao || null
      }));

      const { error: itensError } = await supabase
        .from('itens_resposta_fornecedor')
        .insert(itensToInsert);

      if (itensError) throw itensError;

      // Atualizar convite se existir
      await supabase
        .from('convites_fornecedor')
        .update({ 
          status: 'respondido',
          respondido_em: new Date().toISOString()
        })
        .eq('cotacao_id', cotacao.id)
        .eq('fornecedor_id', selectedFornecedor);

      toast.success('Resposta salva com sucesso!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar resposta:', error);
      toast.error('Erro ao salvar resposta');
    } finally {
      setSaving(false);
    }
  };

  const calcularTotal = () => {
    return itens.reduce((total, item) => {
      const resposta = itensResposta[item.id];
      if (resposta && resposta.disponivel) {
        return total + (resposta.preco_unitario * item.quantidade);
      }
      return total;
    }, 0);
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Fornecedor *</Label>
          <Select value={selectedFornecedor} onValueChange={setSelectedFornecedor}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o fornecedor" />
            </SelectTrigger>
            <SelectContent>
              {fornecedores.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Prazo de Entrega (dias)</Label>
          <Input
            type="number"
            value={prazoEntrega}
            onChange={(e) => setPrazoEntrega(e.target.value)}
            placeholder="Ex: 7"
          />
        </div>
        <div>
          <Label>Condição de Pagamento</Label>
          <Input
            value={condicaoPagamento}
            onChange={(e) => setCondicaoPagamento(e.target.value)}
            placeholder="Ex: 30/60 dias"
          />
        </div>
        <div>
          <Label>Validade da Proposta</Label>
          <Input
            type="date"
            value={validadeProposta}
            onChange={(e) => setValidadeProposta(e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label>Observação</Label>
        <Textarea
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Observações sobre a proposta..."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Preços por Item</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-center">Qtd</TableHead>
                <TableHead className="w-32">Preço Unit.</TableHead>
                <TableHead className="text-center">Disponível</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((item) => {
                const resposta = itensResposta[item.id];
                const subtotal = resposta?.disponivel ? resposta.preco_unitario * item.quantidade : 0;
                
                return (
                  <TableRow key={item.id}>
                    <TableCell>{item.nome_produto}</TableCell>
                    <TableCell className="text-center">{item.quantidade}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={resposta?.preco_unitario || ''}
                        onChange={(e) => updateItemResposta(item.id, 'preco_unitario', parseFloat(e.target.value) || 0)}
                        placeholder="0,00"
                        className="w-28"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={resposta?.disponivel ?? true}
                        onCheckedChange={(checked) => updateItemResposta(item.id, 'disponivel', checked)}
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {subtotal.toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <span className="text-lg font-bold">Total da Proposta:</span>
            <span className="text-2xl font-bold text-primary">
              R$ {calcularTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={salvarResposta} disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar Resposta
        </Button>
      </div>
    </div>
  );
};

export default RespostaFornecedor;
