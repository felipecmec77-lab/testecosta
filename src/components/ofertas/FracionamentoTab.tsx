import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  Loader2, 
  Scale,
  Play,
  History,
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { IniciarFracionamento } from './IniciarFracionamento';

interface SessaoFracionamento {
  id: string;
  data_sessao: string;
  usuario_id: string;
  status: string;
  observacao: string | null;
  criado_em: string;
  finalizado_em: string | null;
}

interface ItemFracionamento {
  id: string;
  sessao_id: string;
  config_id: string;
  preco_caixa: number;
  preco_custo_kg: number | null;
  preco_custo_un: number | null;
  preco_venda_kg: number | null;
  preco_venda_un: number | null;
  margem_aplicada: number;
  config?: {
    nome_produto: string;
    peso_caixa_kg: number;
    unidades_por_caixa: number;
  };
}

export function FracionamentoTab() {
  const [sessoes, setSessoes] = useState<SessaoFracionamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [modo, setModo] = useState<'historico' | 'iniciar'>('historico');
  const [sessaoExpandida, setSessaoExpandida] = useState<string | null>(null);
  const [itensSessao, setItensSessao] = useState<Record<string, ItemFracionamento[]>>({});
  const [loadingItens, setLoadingItens] = useState<string | null>(null);

  useEffect(() => {
    fetchSessoes();
  }, []);

  const fetchSessoes = async () => {
    try {
      const { data, error } = await supabase
        .from('sessoes_fracionamento')
        .select('*')
        .order('data_sessao', { ascending: false })
        .limit(20);

      if (error) throw error;
      setSessoes(data || []);
    } catch (error) {
      console.error('Erro ao carregar sessões:', error);
      toast.error('Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  };

  const fetchItensSessao = async (sessaoId: string) => {
    if (itensSessao[sessaoId]) {
      // Já tem os itens carregados, só toggle
      setSessaoExpandida(sessaoExpandida === sessaoId ? null : sessaoId);
      return;
    }

    setLoadingItens(sessaoId);
    try {
      const { data, error } = await supabase
        .from('itens_fracionamento')
        .select(`
          *,
          config:config_id (
            nome_produto,
            peso_caixa_kg,
            unidades_por_caixa
          )
        `)
        .eq('sessao_id', sessaoId);

      if (error) throw error;
      
      setItensSessao(prev => ({
        ...prev,
        [sessaoId]: (data || []).map(item => ({
          ...item,
          config: item.config as unknown as ItemFracionamento['config']
        }))
      }));
      setSessaoExpandida(sessaoId);
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
      toast.error('Erro ao carregar detalhes');
    } finally {
      setLoadingItens(null);
    }
  };

  const formatarPreco = (valor: number | null) => {
    if (valor === null) return '-';
    return valor.toFixed(2).replace('.', ',');
  };

  const formatarData = (data: string) => {
    return format(new Date(data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (modo === 'iniciar') {
    return (
      <div className="space-y-4">
        <Button 
          variant="outline" 
          onClick={() => {
            setModo('historico');
            fetchSessoes();
          }}
        >
          <History className="w-4 h-4 mr-2" />
          Ver Histórico
        </Button>
        <IniciarFracionamento onVoltar={() => {
          setModo('historico');
          fetchSessoes();
        }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com ação */}
      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
                <Scale className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Fracionamento</h2>
                <p className="text-muted-foreground text-sm">
                  Calcule preços de venda baseado nos custos das caixas
                </p>
              </div>
            </div>
            <Button size="lg" onClick={() => setModo('iniciar')}>
              <Play className="w-5 h-5 mr-2" />
              INICIAR FRACIONAMENTO
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de sessões */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de Fracionamentos
          </CardTitle>
          <CardDescription>
            Últimas sessões de fracionamento realizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessoes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Scale className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum fracionamento realizado</p>
              <p className="text-sm">Clique em "Iniciar Fracionamento" para começar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessoes.map((sessao) => {
                const isExpanded = sessaoExpandida === sessao.id;
                const itens = itensSessao[sessao.id] || [];
                
                return (
                  <div key={sessao.id} className="border rounded-lg overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                      onClick={() => fetchItensSessao(sessao.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>{formatarData(sessao.criado_em)}</span>
                        </div>
                        <Badge variant={sessao.status === 'finalizada' ? 'default' : 'secondary'}>
                          {sessao.status === 'finalizada' ? 'Finalizada' : 'Em andamento'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {loadingItens === sessao.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </button>
                    
                    {isExpanded && itens.length > 0 && (
                      <div className="border-t bg-muted/30 p-4">
                        {sessao.observacao && (
                          <p className="text-sm text-muted-foreground mb-3">
                            Obs: {sessao.observacao}
                          </p>
                        )}
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Produto</TableHead>
                                <TableHead className="text-right">Caixa</TableHead>
                                <TableHead className="text-right">Custo/kg</TableHead>
                                <TableHead className="text-right">Venda/kg</TableHead>
                                <TableHead className="text-right">Custo/un</TableHead>
                                <TableHead className="text-right">Venda/un</TableHead>
                                <TableHead className="text-right">Margem</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {itens.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell className="font-medium">
                                    {item.config?.nome_produto || 'Produto removido'}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    R$ {formatarPreco(item.preco_caixa)}
                                  </TableCell>
                                  <TableCell className="text-right text-muted-foreground">
                                    R$ {formatarPreco(item.preco_custo_kg)}
                                  </TableCell>
                                  <TableCell className="text-right font-bold text-primary">
                                    R$ {formatarPreco(item.preco_venda_kg)}
                                  </TableCell>
                                  <TableCell className="text-right text-muted-foreground">
                                    R$ {formatarPreco(item.preco_custo_un)}
                                  </TableCell>
                                  <TableCell className="text-right font-bold text-primary">
                                    R$ {formatarPreco(item.preco_venda_un)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    R$ {formatarPreco(item.margem_aplicada)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
