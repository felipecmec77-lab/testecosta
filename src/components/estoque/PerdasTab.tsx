import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  TrendingDown,
  Package,
  DollarSign,
  Calendar,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EstoqueItem {
  id: string;
  codigo: string;
  nome: string;
  preco_custo: number;
  estoque_atual: number;
  estoque_minimo: number;
}

interface PerdasTabProps {
  items: EstoqueItem[];
}

const PerdasTab = ({ items }: PerdasTabProps) => {
  const { toast } = useToast();
  const [perdas, setPerdas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerdas();
  }, []);

  const fetchPerdas = async () => {
    try {
      const { data, error } = await supabase
        .from("perdas_geral")
        .select(`
          id,
          data_perda,
          quantidade_perdida,
          valor_perda,
          motivo_perda,
          item:itens_perdas_geral(nome_item)
        `)
        .order("data_perda", { ascending: false })
        .limit(50);

      if (error) throw error;
      setPerdas(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar perdas:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate items below minimum stock
  const abaixoMinimo = useMemo(() => {
    return items.filter((i) => i.estoque_atual < i.estoque_minimo);
  }, [items]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  const getMotivoLabel = (motivo: string) => {
    const motivos: Record<string, string> = {
      vencido: "Vencido",
      danificado: "Danificado",
      quebrado: "Quebrado",
      avaria: "Avaria",
      outros: "Outros",
    };
    return motivos[motivo] || motivo;
  };

  const stats = {
    totalPerdas: perdas.length,
    valorTotal: perdas.reduce((acc, p) => acc + (p.valor_perda || 0), 0),
    abaixoMinimo: abaixoMinimo.length,
    potencialPerda: abaixoMinimo.reduce(
      (acc, i) => acc + i.preco_custo * Math.max(0, i.estoque_minimo - i.estoque_atual),
      0
    ),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Controle de Perdas
        </h2>
        <p className="text-sm text-muted-foreground">
          Monitore perdas e produtos abaixo do estoque mínimo
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/20 rounded-lg">
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">{stats.totalPerdas}</p>
                <p className="text-sm text-muted-foreground">Registros de Perdas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-500/50 bg-orange-50 dark:bg-orange-950">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-200 dark:bg-orange-900 rounded-lg">
                <DollarSign className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(stats.valorTotal)}</p>
                <p className="text-sm text-muted-foreground">Valor em Perdas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-200 dark:bg-yellow-900 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{stats.abaixoMinimo}</p>
                <p className="text-sm text-muted-foreground">Abaixo do Mínimo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(stats.potencialPerda)}</p>
                <p className="text-sm text-muted-foreground">Reposição Necessária</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items below minimum */}
      {abaixoMinimo.length > 0 && (
        <Card className="border-destructive/30">
          <CardContent className="p-4">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Produtos Abaixo do Estoque Mínimo
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Atual</TableHead>
                  <TableHead className="text-right">Mínimo</TableHead>
                  <TableHead className="text-right">Falta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {abaixoMinimo.slice(0, 10).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{item.nome}</TableCell>
                    <TableCell className="text-right text-destructive font-bold">
                      {item.estoque_atual}
                    </TableCell>
                    <TableCell className="text-right">{item.estoque_minimo}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive">
                        -{item.estoque_minimo - item.estoque_atual}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {abaixoMinimo.length > 10 && (
              <p className="text-sm text-muted-foreground mt-4 text-center">
                E mais {abaixoMinimo.length - 10} produtos...
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent losses */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Últimas Perdas Registradas
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-center">Qtd</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perdas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhuma perda registrada
                  </TableCell>
                </TableRow>
              ) : (
                perdas.map((perda) => (
                  <TableRow key={perda.id}>
                    <TableCell>
                      {format(new Date(perda.data_perda), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {perda.item?.nome_item || "—"}
                    </TableCell>
                    <TableCell className="text-center">{perda.quantidade_perdida}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getMotivoLabel(perda.motivo_perda)}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      {formatCurrency(perda.valor_perda)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerdasTab;
