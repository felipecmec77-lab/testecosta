import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, History, Calendar, User, Package, ChevronDown, ChevronRight, Scale, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Perda {
  id: string;
  produto_id: string;
  peso_perdido: number | null;
  quantidade_perdida: number | null;
  motivo_perda: string;
  valor_perda: number | null;
  observacao: string | null;
  produtos?: {
    nome_produto: string;
    unidade_medida: string;
  };
}

interface Launch {
  id: string;
  numero: number;
  data_lancamento: string;
  status: string;
  observacao: string | null;
  criado_em: string;
  usuario_id: string;
  profiles?: {
    nome: string;
  };
  perdas_count?: number;
  perdas?: Perda[];
}

const motivoLabels: Record<string, string> = {
  murcha: 'Murcha',
  vencimento: 'Vencimento',
  avaria: 'Avaria',
  transporte: 'Transporte',
  outros: 'Outros',
};

const LaunchHistory = () => {
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLaunches, setExpandedLaunches] = useState<Set<string>>(new Set());
  const [loadingPerdas, setLoadingPerdas] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchLaunches();
  }, []);

  const fetchLaunches = async () => {
    try {
      const { data: launchesData } = await supabase
        .from('lancamentos')
        .select('*')
        .order('criado_em', { ascending: false });

      if (launchesData) {
        const userIds = [...new Set(launchesData.map(l => l.usuario_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, nome')
          .in('id', userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

        const launchesWithData = await Promise.all(
          launchesData.map(async (launch) => {
            const { count } = await supabase
              .from('perdas')
              .select('*', { count: 'exact', head: true })
              .eq('lancamento_id', launch.id);
            
            return {
              ...launch,
              profiles: profilesMap.get(launch.usuario_id),
              perdas_count: count || 0,
            };
          })
        );
        setLaunches(launchesWithData as Launch[]);
      }
    } catch (error) {
      console.error('Error fetching launches:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPerdasForLaunch = async (launchId: string) => {
    setLoadingPerdas(prev => new Set(prev).add(launchId));
    
    try {
      const { data: perdasData } = await supabase
        .from('perdas')
        .select(`
          *,
          produtos(nome_produto, unidade_medida)
        `)
        .eq('lancamento_id', launchId)
        .order('criado_em', { ascending: true });

      if (perdasData) {
        setLaunches(prev => 
          prev.map(launch => 
            launch.id === launchId 
              ? { ...launch, perdas: perdasData as Perda[] }
              : launch
          )
        );
      }
    } catch (error) {
      console.error('Error fetching perdas:', error);
    } finally {
      setLoadingPerdas(prev => {
        const newSet = new Set(prev);
        newSet.delete(launchId);
        return newSet;
      });
    }
  };

  const toggleLaunch = async (launchId: string) => {
    const isCurrentlyExpanded = expandedLaunches.has(launchId);
    
    if (isCurrentlyExpanded) {
      setExpandedLaunches(prev => {
        const newSet = new Set(prev);
        newSet.delete(launchId);
        return newSet;
      });
    } else {
      setExpandedLaunches(prev => new Set(prev).add(launchId));
      
      // Fetch perdas if not already loaded
      const launch = launches.find(l => l.id === launchId);
      if (launch && !launch.perdas) {
        await fetchPerdasForLaunch(launchId);
      }
    }
  };

  const formatQuantity = (perda: Perda) => {
    if (perda.produtos?.unidade_medida === 'kg' && perda.peso_perdido) {
      return `${perda.peso_perdido} kg`;
    }
    if (perda.quantidade_perdida) {
      return `${perda.quantidade_perdida} un`;
    }
    return '-';
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
            <History className="w-8 h-8" />
            Histórico de Lançamentos
          </h1>
          <p className="text-muted-foreground mt-1">
            Clique em um lançamento para ver os itens de perda
          </p>
        </div>

        {launches.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <History className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum lançamento encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {launches.map((launch) => (
              <Collapsible 
                key={launch.id}
                open={expandedLaunches.has(launch.id)}
                onOpenChange={() => toggleLaunch(launch.id)}
              >
                <Card className="overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {expandedLaunches.has(launch.id) ? (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          )}
                          Lançamento #{launch.numero}
                          <Badge variant={launch.status === 'normal' ? 'default' : 'destructive'}>
                            {launch.status === 'normal' ? 'Normal' : 'Cancelado'}
                          </Badge>
                        </CardTitle>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {launch.perdas_count || 0} itens
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-2 ml-7">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {format(new Date(launch.data_lancamento + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="w-4 h-4" />
                          <span>
                            {launch.profiles?.nome || 'Não identificado'}
                          </span>
                        </div>
                        <div className="text-muted-foreground">
                          {format(new Date(launch.criado_em!), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0 border-t">
                      {launch.observacao && (
                        <p className="mb-4 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                          Obs: {launch.observacao}
                        </p>
                      )}
                      
                      {loadingPerdas.has(launch.id) ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      ) : launch.perdas && launch.perdas.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Produto</TableHead>
                              <TableHead>Quantidade</TableHead>
                              <TableHead>Motivo</TableHead>
                              <TableHead>Valor</TableHead>
                              <TableHead>Observação</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {launch.perdas.map((perda) => (
                              <TableRow key={perda.id}>
                                <TableCell className="font-medium">
                                  {perda.produtos?.nome_produto || 'Produto não encontrado'}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Scale className="w-3 h-3 text-muted-foreground" />
                                    {formatQuantity(perda)}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                    <AlertTriangle className="w-3 h-3" />
                                    {motivoLabels[perda.motivo_perda] || perda.motivo_perda}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {perda.valor_perda 
                                    ? `R$ ${perda.valor_perda.toFixed(2)}`
                                    : '-'
                                  }
                                </TableCell>
                                <TableCell className="max-w-[150px] truncate">
                                  {perda.observacao || '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center py-6 text-muted-foreground">
                          Nenhum item de perda neste lançamento
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default LaunchHistory;