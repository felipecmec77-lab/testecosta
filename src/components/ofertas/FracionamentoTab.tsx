import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  Search, 
  Loader2, 
  Scale,
  Calculator,
  Box,
  Settings,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface ConfigFracionamento {
  id: string;
  produto_id: string | null;
  nome_produto: string;
  peso_caixa_kg: number;
  unidades_por_caixa: number;
  preco_caixa: number;
  preco_por_kg: number;
  preco_por_unidade: number;
  peso_medio_unidade_kg: number | null;
  tipo_venda: 'kg' | 'unidade' | 'ambos';
  observacao: string | null;
  ativo: boolean;
}

interface FracionamentoCalculado extends ConfigFracionamento {
  margem_sugerida_kg: number;
  margem_sugerida_un: number;
  preco_venda_kg: number;
  preco_venda_un: number;
}

export function FracionamentoTab() {
  const [configs, setConfigs] = useState<FracionamentoCalculado[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [margemPadrao, setMargemPadrao] = useState('30');

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes_fracionamento')
        .select('*')
        .eq('ativo', true)
        .order('nome_produto');

      if (error) throw error;
      
      // Calcular preços de venda com margem padrão
      const margem = parseFloat(margemPadrao) / 100;
      const calculados = (data || []).map(d => {
        const config = {
          ...d,
          tipo_venda: d.tipo_venda as 'kg' | 'unidade' | 'ambos'
        };
        return {
          ...config,
          margem_sugerida_kg: margem * 100,
          margem_sugerida_un: margem * 100,
          preco_venda_kg: config.preco_por_kg * (1 + margem),
          preco_venda_un: config.preco_por_unidade * (1 + margem)
        };
      });
      
      setConfigs(calculados);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast.error('Erro ao carregar dados de fracionamento');
    } finally {
      setLoading(false);
    }
  };

  const recalcularPrecos = () => {
    const margem = parseFloat(margemPadrao) / 100;
    setConfigs(prev => prev.map(config => ({
      ...config,
      margem_sugerida_kg: margem * 100,
      margem_sugerida_un: margem * 100,
      preco_venda_kg: config.preco_por_kg * (1 + margem),
      preco_venda_un: config.preco_por_unidade * (1 + margem)
    })));
    toast.success('Preços recalculados!');
  };

  const formatarPreco = (valor: number) => {
    return valor.toFixed(2).replace('.', ',');
  };

  const filteredConfigs = configs.filter(c =>
    c.nome_produto.toLowerCase().includes(search.toLowerCase())
  );

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
                Configure os dados de fracionamento nas Configurações do Sistema
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5" />
            Fracionamento Inteligente
          </CardTitle>
          <CardDescription>
            Visualize os preços calculados automaticamente baseado nos dados da caixa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Controles */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Margem:</span>
              <Input
                type="number"
                value={margemPadrao}
                onChange={(e) => setMargemPadrao(e.target.value)}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">%</span>
              <Button onClick={recalcularPrecos} size="sm">
                <Calculator className="w-4 h-4 mr-2" />
                Aplicar
              </Button>
            </div>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Peso Caixa</TableHead>
                  <TableHead className="text-right">Preço Caixa</TableHead>
                  <TableHead className="text-right">Custo/kg</TableHead>
                  <TableHead className="text-right">Custo/un</TableHead>
                  <TableHead className="text-right">Venda/kg</TableHead>
                  <TableHead className="text-right">Venda/un</TableHead>
                  <TableHead>Tipo Venda</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConfigs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">{config.nome_produto}</TableCell>
                    <TableCell className="text-right">{config.peso_caixa_kg} kg</TableCell>
                    <TableCell className="text-right">R$ {formatarPreco(config.preco_caixa)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      R$ {formatarPreco(config.preco_por_kg)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      R$ {formatarPreco(config.preco_por_unidade)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      R$ {formatarPreco(config.preco_venda_kg)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      R$ {formatarPreco(config.preco_venda_un)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        config.tipo_venda === 'kg' ? 'default' : 
                        config.tipo_venda === 'unidade' ? 'secondary' : 
                        'outline'
                      }>
                        {config.tipo_venda === 'kg' ? 'Por Kg' : 
                         config.tipo_venda === 'unidade' ? 'Por Unidade' : 
                         'Ambos'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Link para configurações */}
          <div className="flex justify-end">
            <Button variant="outline" asChild>
              <Link to="/sistema">
                <Settings className="w-4 h-4 mr-2" />
                Gerenciar Configurações
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
