import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Calendar, User, Package } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Launch } from './LaunchList';

interface LossItem {
  id: string;
  produto_id: string;
  peso_perdido: number | null;
  quantidade_perdida: number | null;
  motivo_perda: string;
  observacao: string | null;
  estoque?: {
    nome: string;
    preco_custo: number;
    unidade: string;
  };
}

interface LaunchDetailProps {
  launch: Launch;
  onClose: () => void;
  onRefresh: () => void;
}

const LaunchDetail = ({ launch, onClose, onRefresh }: LaunchDetailProps) => {
  const [items, setItems] = useState<LossItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, [launch.id]);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('perdas')
        .select(`
          id,
          produto_id,
          peso_perdido,
          quantidade_perdida,
          motivo_perda,
          observacao,
          estoque (nome, preco_custo, unidade)
        `)
        .eq('lancamento_id', launch.id);

      if (error) throw error;
      setItems((data || []) as LossItem[]);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMotivoLabel = (motivo: string) => {
    const labels: Record<string, string> = {
      murcha: 'Murcha',
      vencimento: 'Vencimento',
      avaria: 'Avaria',
      transporte: 'Transporte',
      outros: 'Outros',
    };
    return labels[motivo] || motivo;
  };

  const totalValue = items.reduce((sum, item) => {
    const qty = (item.peso_perdido || 0) + (item.quantidade_perdida || 0);
    return sum + qty * (item.estoque?.preco_custo || 0);
  }, 0);

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex flex-wrap items-center gap-4 p-4 rounded-lg bg-muted/50">
        <Badge variant={launch.status === 'normal' ? 'default' : 'secondary'} className="text-sm">
          {launch.status === 'normal' ? 'Normal' : 'Cancelado'}
        </Badge>
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          {format(new Date(launch.data_lancamento), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </span>
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <User className="w-4 h-4" />
          {launch.profiles?.nome || 'N/A'}
        </span>
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <Package className="w-4 h-4" />
          {items.length} {items.length === 1 ? 'item' : 'itens'}
        </span>
      </div>

      {launch.observacao && (
        <div className="p-3 rounded-lg bg-accent/50 border">
          <p className="text-sm text-muted-foreground">Observação:</p>
          <p className="text-sm">{launch.observacao}</p>
        </div>
      )}

      {/* Items Table */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>Nenhum item neste lançamento</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => {
                const qty = (item.peso_perdido || 0) + (item.quantidade_perdida || 0);
                const value = qty * (item.estoque?.preco_custo || 0);
                
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.estoque?.nome || 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      {qty} {item.estoque?.unidade || 'UN'}
                    </TableCell>
                    <TableCell className="text-right text-destructive font-medium">
                      R$ {value.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs px-2 py-1 rounded-full bg-muted">
                        {getMotivoLabel(item.motivo_perda)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Total */}
      {items.length > 0 && (
        <div className="flex justify-between items-center p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <span className="font-semibold">Total da Perda:</span>
          <span className="text-xl font-bold text-destructive">R$ {totalValue.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
};

export default LaunchDetail;
