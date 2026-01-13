import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  PlayCircle,
  ShoppingCart,
  Calendar,
  Clock,
  Loader2,
  Package
} from 'lucide-react';

interface NovaCotacaoProps {
  userId: string;
  onCotacaoCreated: () => void;
  onNavigateToProducts?: () => void;
}

const NovaCotacao = ({ userId, onCotacaoCreated, onNavigateToProducts }: NovaCotacaoProps) => {
  const [iniciado, setIniciado] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [titulo, setTitulo] = useState('');
  const [dataLimite, setDataLimite] = useState('');
  const [observacao, setObservacao] = useState('');
  
  // Agendamento automático
  const [modoAbertura, setModoAbertura] = useState<'manual' | 'automatico'>('manual');
  const [modoFechamento, setModoFechamento] = useState<'manual' | 'automatico'>('manual');
  const [dataAberturaAutomatica, setDataAberturaAutomatica] = useState('');
  const [dataFechamentoAutomatico, setDataFechamentoAutomatico] = useState('');

  const saveCotacao = async () => {
    if (!titulo.trim()) {
      toast.error('Digite um título para a cotação');
      return;
    }

    setSaving(true);
    try {
      const { data: cotacao, error: cotacaoError } = await supabase
        .from('cotacoes')
        .insert({
          titulo: titulo,
          data_limite_resposta: dataLimite || null,
          total: 0,
          observacao: observacao || null,
          usuario_id: userId,
          status: modoAbertura === 'automatico' ? 'pendente' : 'pendente',
          modo_abertura: modoAbertura,
          modo_fechamento: modoFechamento,
          data_abertura_automatica: modoAbertura === 'automatico' && dataAberturaAutomatica ? dataAberturaAutomatica : null,
          data_fechamento_automatico: modoFechamento === 'automatico' && dataFechamentoAutomatico ? dataFechamentoAutomatico : null
        })
        .select()
        .single();

      if (cotacaoError) throw cotacaoError;

      toast.success(`Cotação #${cotacao.numero} criada com sucesso!`);
      
      // Reset form
      setTitulo('');
      setDataLimite('');
      setObservacao('');
      setModoAbertura('manual');
      setModoFechamento('manual');
      setDataAberturaAutomatica('');
      setDataFechamentoAutomatico('');
      setIniciado(false);
      
      onCotacaoCreated();
    } catch (error) {
      console.error('Erro ao salvar cotação:', error);
      toast.error('Erro ao salvar cotação');
    } finally {
      setSaving(false);
    }
  };

  if (!iniciado) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="text-center space-y-2">
          <ShoppingCart className="w-16 h-16 mx-auto text-primary" />
          <h2 className="text-2xl font-bold">Nova Cotação</h2>
          <p className="text-muted-foreground">Crie uma nova cotação para enviar aos fornecedores</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            size="lg" 
            onClick={() => setIniciado(true)}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-lg px-8 py-6 h-auto"
          >
            <PlayCircle className="w-6 h-6 mr-2" />
            INICIAR NOVA COTAÇÃO
          </Button>
          {onNavigateToProducts && (
            <Button 
              size="lg" 
              variant="outline"
              onClick={onNavigateToProducts}
              className="text-lg px-8 py-6 h-auto"
            >
              <Package className="w-6 h-6 mr-2" />
              GERENCIAR PRODUTOS
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com título e data limite */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Dados da Cotação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Título da Cotação *</Label>
            <Input
              placeholder="Ex: Compra mensal de alimentos"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Data Limite para Resposta
            </Label>
            <Input
              type="datetime-local"
              value={dataLimite}
              onChange={(e) => setDataLimite(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Agendamento Automático */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Agendamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Abertura */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Abertura da Cotação</Label>
                <p className="text-sm text-muted-foreground">
                  {modoAbertura === 'manual' ? 'A cotação ficará aberta imediatamente' : 'A cotação será aberta automaticamente na data/hora especificada'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Manual</span>
                <Switch
                  checked={modoAbertura === 'automatico'}
                  onCheckedChange={(checked) => setModoAbertura(checked ? 'automatico' : 'manual')}
                />
                <span className="text-sm text-muted-foreground">Automático</span>
              </div>
            </div>
            {modoAbertura === 'automatico' && (
              <div className="space-y-2 ml-4 pl-4 border-l-2 border-primary/20">
                <Label>Data/Hora de Abertura Automática</Label>
                <Input
                  type="datetime-local"
                  value={dataAberturaAutomatica}
                  onChange={(e) => setDataAberturaAutomatica(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Fechamento */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Fechamento da Cotação</Label>
                <p className="text-sm text-muted-foreground">
                  {modoFechamento === 'manual' ? 'Você fechará a cotação manualmente' : 'A cotação será fechada automaticamente na data/hora especificada'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Manual</span>
                <Switch
                  checked={modoFechamento === 'automatico'}
                  onCheckedChange={(checked) => setModoFechamento(checked ? 'automatico' : 'manual')}
                />
                <span className="text-sm text-muted-foreground">Automático</span>
              </div>
            </div>
            {modoFechamento === 'automatico' && (
              <div className="space-y-2 ml-4 pl-4 border-l-2 border-primary/20">
                <Label>Data/Hora de Fechamento Automático</Label>
                <Input
                  type="datetime-local"
                  value={dataFechamentoAutomatico}
                  onChange={(e) => setDataFechamentoAutomatico(e.target.value)}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Observação */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              placeholder="Observações sobre a cotação..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              onClick={() => setIniciado(false)}
            >
              CANCELAR
            </Button>
            <Button 
              onClick={saveCotacao} 
              disabled={saving || !titulo.trim()}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShoppingCart className="w-4 h-4 mr-2" />}
              CRIAR COTAÇÃO
            </Button>
          </div>

          {onNavigateToProducts && (
            <Button 
              variant="secondary" 
              onClick={onNavigateToProducts}
              className="w-full"
            >
              <Package className="w-4 h-4 mr-2" />
              IR PARA PRODUTOS DA COTAÇÃO
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NovaCotacao;
