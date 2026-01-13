import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle, XCircle, Clock, Loader2, Eye, AlertCircle, Trash2 } from 'lucide-react';
import CotacaoDetail from './CotacaoDetail';

interface Cotacao {
  id: string;
  numero: number;
  titulo: string | null;
  data_cotacao: string;
  data_validade: string | null;
  data_limite_resposta: string | null;
  status: 'pendente' | 'aprovada' | 'rejeitada' | 'cancelada' | 'em_analise' | 'finalizada';
  total: number | null;
  observacao: string | null;
  justificativa_escolha: string | null;
  criado_em: string | null;
}

interface HistoricoCotacoesProps {
  onRefresh?: () => void;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pendente: { label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-500', icon: <Clock className="w-4 h-4" /> },
  em_analise: { label: 'Em Análise', color: 'bg-blue-500/20 text-blue-500', icon: <Eye className="w-4 h-4" /> },
  aprovada: { label: 'Aprovada', color: 'bg-green-500/20 text-green-500', icon: <CheckCircle className="w-4 h-4" /> },
  rejeitada: { label: 'Rejeitada', color: 'bg-red-500/20 text-red-500', icon: <XCircle className="w-4 h-4" /> },
  cancelada: { label: 'Cancelada', color: 'bg-gray-500/20 text-gray-500', icon: <AlertCircle className="w-4 h-4" /> },
  finalizada: { label: 'Finalizada', color: 'bg-purple-500/20 text-purple-500', icon: <CheckCircle className="w-4 h-4" /> }
};

const HistoricoCotacoes = ({ onRefresh }: HistoricoCotacoesProps) => {
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCotacao, setSelectedCotacao] = useState<Cotacao | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchCotacoes();
  }, []);

  const fetchCotacoes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cotacoes')
        .select('*')
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setCotacoes(data || []);
    } catch (error) {
      console.error('Erro ao carregar cotações:', error);
      toast.error('Erro ao carregar cotações');
    } finally {
      setLoading(false);
    }
  };

  const deleteCotacao = async (cotacaoId: string) => {
    setDeleting(cotacaoId);
    try {
      // Deletar itens da cotação primeiro
      await supabase.from('itens_cotacao').delete().eq('cotacao_id', cotacaoId);
      
      // Deletar convites
      await supabase.from('convites_fornecedor').delete().eq('cotacao_id', cotacaoId);
      
      // Deletar respostas
      const { data: respostas } = await supabase
        .from('respostas_fornecedor')
        .select('id')
        .eq('cotacao_id', cotacaoId);
      
      if (respostas && respostas.length > 0) {
        const respostaIds = respostas.map(r => r.id);
        await supabase.from('itens_resposta_fornecedor').delete().in('resposta_id', respostaIds);
        await supabase.from('respostas_fornecedor').delete().eq('cotacao_id', cotacaoId);
      }
      
      // Deletar ordens de compra relacionadas
      const { data: ordens } = await supabase
        .from('ordens_compra')
        .select('id')
        .eq('cotacao_id', cotacaoId);
      
      if (ordens && ordens.length > 0) {
        const ordemIds = ordens.map(o => o.id);
        await supabase.from('itens_ordem_compra').delete().in('ordem_compra_id', ordemIds);
        await supabase.from('ordens_compra').delete().eq('cotacao_id', cotacaoId);
      }
      
      // Por fim, deletar a cotação
      const { error } = await supabase.from('cotacoes').delete().eq('id', cotacaoId);
      
      if (error) throw error;
      
      toast.success('Cotação excluída com sucesso!');
      fetchCotacoes();
      onRefresh?.();
    } catch (error) {
      console.error('Erro ao excluir cotação:', error);
      toast.error('Erro ao excluir cotação');
    } finally {
      setDeleting(null);
    }
  };

  const handleStatusUpdate = () => {
    fetchCotacoes();
    onRefresh?.();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{cotacoes.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-500">
                {cotacoes.filter(c => c.status === 'pendente').length}
              </p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-500">
                {cotacoes.filter(c => c.status === 'em_analise').length}
              </p>
              <p className="text-xs text-muted-foreground">Em Análise</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">
                {cotacoes.filter(c => c.status === 'aprovada').length}
              </p>
              <p className="text-xs text-muted-foreground">Aprovadas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Limite</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cotacoes.map((cotacao) => {
                  const config = statusConfig[cotacao.status] || statusConfig.pendente;
                  return (
                    <TableRow key={cotacao.id}>
                      <TableCell className="font-mono font-bold">#{cotacao.numero}</TableCell>
                      <TableCell>{cotacao.titulo || 'Sem título'}</TableCell>
                      <TableCell>
                        {format(new Date(cotacao.data_cotacao), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {cotacao.data_limite_resposta 
                          ? format(new Date(cotacao.data_limite_resposta), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge className={config.color}>
                          {config.icon}
                          <span className="ml-1">{config.label}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedCotacao(cotacao);
                              setShowDetail(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            VER
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                disabled={deleting === cotacao.id}
                              >
                                {deleting === cotacao.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Cotação #{cotacao.numero}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. Todos os dados relacionados a esta cotação (itens, convites, respostas e ordens de compra) serão excluídos permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteCotacao(cotacao.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {cotacoes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhuma cotação encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cotação #{selectedCotacao?.numero}</DialogTitle>
          </DialogHeader>
          {selectedCotacao && (
            <CotacaoDetail 
              cotacao={selectedCotacao}
              onClose={() => setShowDetail(false)}
              onStatusUpdate={handleStatusUpdate}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HistoricoCotacoes;
