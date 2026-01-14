import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Eye, XCircle, Loader2, Calendar, User, Package, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import LaunchDetail from './LaunchDetail';

export interface Launch {
  id: string;
  numero: number;
  usuario_id: string;
  data_lancamento: string;
  status: 'normal' | 'cancelado';
  observacao: string | null;
  criado_em: string;
  profiles?: {
    nome: string;
  };
  items_count?: number;
  total_value?: number;
  total_peso?: number;
  total_quantidade?: number;
}

interface LaunchListProps {
  launches: Launch[];
  onRefresh: () => void;
}

const LaunchList = ({ launches, onRefresh }: LaunchListProps) => {
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedLaunch, setSelectedLaunch] = useState<Launch | null>(null);
  const { toast } = useToast();
  const { userRole } = useAuth();

  const isAdmin = userRole === 'administrador';

  // Filtrar lançamentos com valor > 0 OU itens > 0
  const filteredLaunches = launches.filter(launch => 
    (launch.total_value && launch.total_value > 0) || (launch.items_count && launch.items_count > 0)
  );

  const handleCancel = async (launch: Launch) => {
    setCancellingId(launch.id);

    try {
      // Update launch status to cancelled
      const { error } = await supabase
        .from('lancamentos')
        .update({ status: 'cancelado' })
        .eq('id', launch.id);

      if (error) throw error;

      // Restore stock for all items in this launch
      const { data: items } = await supabase
        .from('perdas')
        .select('produto_id, peso_perdido, quantidade_perdida')
        .eq('lancamento_id', launch.id);

      if (items) {
        for (const item of items) {
          const restoreAmount = (item.peso_perdido || 0) + (item.quantidade_perdida || 0);
          await supabase.rpc('restore_stock', {
            p_produto_id: item.produto_id,
            p_quantidade: restoreAmount
          });
        }
      }

      toast({ title: 'Lançamento cancelado com sucesso!' });
      onRefresh();
    } catch (error: any) {
      toast({ 
        title: 'Erro ao cancelar lançamento', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setCancellingId(null);
    }
  };

  const handleDelete = async (launch: Launch) => {
    setDeletingId(launch.id);

    try {
      // First delete associated perdas
      const { error: perdasError } = await supabase
        .from('perdas')
        .delete()
        .eq('lancamento_id', launch.id);

      if (perdasError) throw perdasError;

      // Then delete the launch
      const { error } = await supabase
        .from('lancamentos')
        .delete()
        .eq('id', launch.id);

      if (error) throw error;

      toast({ title: 'Lançamento excluído com sucesso!' });
      onRefresh();
    } catch (error: any) {
      toast({ 
        title: 'Erro ao excluir lançamento', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Lançamentos de Perdas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {launches.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Nenhum lançamento registrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLaunches.map(launch => (
                <div 
                  key={launch.id} 
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                    launch.status === 'cancelado' 
                      ? 'bg-muted/30 border-muted opacity-60' 
                      : 'bg-card hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-lg cursor-pointer hover:bg-primary/20 transition-colors"
                      onClick={() => setSelectedLaunch(launch)}
                    >
                      #{launch.numero}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Lançamento #{launch.numero}</span>
                        <Badge variant={launch.status === 'normal' ? 'default' : 'secondary'}>
                          {launch.status === 'normal' ? 'Normal' : 'Cancelado'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(launch.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {launch.profiles?.nome || 'N/A'}
                        </span>
                        {launch.items_count !== undefined && (
                          <span className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            {launch.items_count} {launch.items_count === 1 ? 'item' : 'itens'}
                          </span>
                        )}
                        {launch.total_peso !== undefined && launch.total_peso > 0 && (
                          <span className="text-muted-foreground">
                            {launch.total_peso.toFixed(2)} kg
                          </span>
                        )}
                        {launch.total_quantidade !== undefined && launch.total_quantidade > 0 && (
                          <span className="text-muted-foreground">
                            {launch.total_quantidade} un
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {launch.total_value !== undefined && (
                      <span className="text-destructive font-semibold mr-4">
                        R$ {launch.total_value.toFixed(2)}
                      </span>
                    )}
                    
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setSelectedLaunch(launch)}
                      title="Visualizar detalhes"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>

                    {isAdmin && launch.status === 'normal' && (
                      <>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={cancellingId === launch.id}
                              title="Cancelar lançamento"
                            >
                              {cancellingId === launch.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <XCircle className="w-4 h-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancelar lançamento #{launch.numero}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação irá cancelar o lançamento e restaurar o estoque dos produtos. 
                                O lançamento permanecerá registrado com status "Cancelado" e não será 
                                contabilizado nos relatórios.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Voltar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleCancel(launch)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Cancelar Lançamento
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={deletingId === launch.id}
                              title="Excluir lançamento"
                            >
                              {deletingId === launch.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir lançamento #{launch.numero}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação irá excluir permanentemente o lançamento e todos os itens associados. 
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Voltar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(launch)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir Lançamento
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedLaunch} onOpenChange={() => setSelectedLaunch(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lançamento #{selectedLaunch?.numero}</DialogTitle>
          </DialogHeader>
          {selectedLaunch && (
            <LaunchDetail 
              launch={selectedLaunch} 
              onClose={() => setSelectedLaunch(null)}
              onRefresh={onRefresh}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LaunchList;
