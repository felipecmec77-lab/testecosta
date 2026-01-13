import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Trophy, TrendingDown, Check, FileCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Cotacao {
  id: string;
  numero: number;
  titulo: string | null;
  data_cotacao: string;
  status: string;
}

interface ItemCotacao {
  id: string;
  nome_produto: string;
  quantidade: number;
  codigo_barras: string | null;
}

interface Fornecedor {
  id: string;
  nome: string;
}

interface RespostaFornecedor {
  id: string;
  fornecedor_id: string;
  total_proposta: number;
  prazo_entrega_dias: number | null;
  condicao_pagamento: string | null;
  fornecedor?: Fornecedor;
}

interface ItemResposta {
  id: string;
  resposta_id: string;
  item_cotacao_id: string;
  preco_unitario: number;
  disponivel: boolean;
}

interface MapaPrecosProps {
  onGerarOrdem: (cotacaoId: string, fornecedorId: string, respostaId: string) => void;
}

const MapaPrecos = ({ onGerarOrdem }: MapaPrecosProps) => {
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [selectedCotacao, setSelectedCotacao] = useState<string>('');
  const [itensCotacao, setItensCotacao] = useState<ItemCotacao[]>([]);
  const [respostas, setRespostas] = useState<RespostaFornecedor[]>([]);
  const [itensResposta, setItensResposta] = useState<ItemResposta[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCotacoes();
  }, []);

  useEffect(() => {
    if (selectedCotacao) {
      fetchMapaData();
    }
  }, [selectedCotacao]);

  const fetchCotacoes = async () => {
    const { data, error } = await supabase
      .from('cotacoes')
      .select('id, numero, titulo, data_cotacao, status')
      .in('status', ['pendente', 'em_analise', 'aprovada'])
      .order('criado_em', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar cotações');
      return;
    }
    setCotacoes(data || []);
  };

  const fetchMapaData = async () => {
    setLoading(true);
    try {
      // Buscar itens da cotação
      const { data: itens, error: itensError } = await supabase
        .from('itens_cotacao')
        .select('*')
        .eq('cotacao_id', selectedCotacao);

      if (itensError) throw itensError;
      setItensCotacao(itens || []);

      // Buscar respostas dos fornecedores
      const { data: respostasData, error: respostasError } = await supabase
        .from('respostas_fornecedor')
        .select('*, fornecedor:fornecedores(*)')
        .eq('cotacao_id', selectedCotacao);

      if (respostasError) throw respostasError;
      setRespostas(respostasData || []);

      // Buscar itens das respostas
      const respostaIds = (respostasData || []).map(r => r.id);
      if (respostaIds.length > 0) {
        const { data: itensRespostaData, error: itensRespostaError } = await supabase
          .from('itens_resposta_fornecedor')
          .select('*')
          .in('resposta_id', respostaIds);

        if (itensRespostaError) throw itensRespostaError;
        setItensResposta(itensRespostaData || []);
      } else {
        setItensResposta([]);
      }
    } catch (error) {
      console.error('Erro ao carregar mapa de preços:', error);
      toast.error('Erro ao carregar mapa de preços');
    } finally {
      setLoading(false);
    }
  };

  const getPrecoItem = (itemId: string, respostaId: string) => {
    const itemResposta = itensResposta.find(
      ir => ir.item_cotacao_id === itemId && ir.resposta_id === respostaId
    );
    return itemResposta;
  };

  const getMenorPreco = (itemId: string) => {
    const precos = itensResposta
      .filter(ir => ir.item_cotacao_id === itemId && ir.disponivel)
      .map(ir => ir.preco_unitario);
    
    if (precos.length === 0) return null;
    return Math.min(...precos);
  };

  const getFornecedorVencedor = () => {
    if (respostas.length === 0) return null;
    
    // Fornecedor com menor total
    const menorTotal = Math.min(...respostas.map(r => r.total_proposta || 0));
    return respostas.find(r => r.total_proposta === menorTotal);
  };

  const fornecedorVencedor = getFornecedorVencedor();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5" />
            Mapa Comparativo de Preços
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedCotacao} onValueChange={setSelectedCotacao}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma cotação para comparar" />
            </SelectTrigger>
            <SelectContent>
              {cotacoes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  #{c.numero} - {c.titulo || 'Sem título'} ({format(new Date(c.data_cotacao), 'dd/MM/yyyy', { locale: ptBR })})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {selectedCotacao && !loading && respostas.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>Nenhum fornecedor respondeu esta cotação ainda.</p>
          </CardContent>
        </Card>
      )}

      {selectedCotacao && !loading && respostas.length > 0 && (
        <>
          {/* Ranking de Fornecedores */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Ranking de Propostas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {respostas
                  .sort((a, b) => (a.total_proposta || 0) - (b.total_proposta || 0))
                  .map((resposta, index) => (
                    <Card 
                      key={resposta.id} 
                      className={`relative overflow-hidden ${
                        index === 0 ? 'border-2 border-green-500 bg-green-500/5' : ''
                      }`}
                    >
                      {index === 0 && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-green-500">
                            <Trophy className="w-3 h-3 mr-1" />
                            MENOR PREÇO
                          </Badge>
                        </div>
                      )}
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <p className="font-bold text-lg">{resposta.fornecedor?.nome}</p>
                          <p className="text-2xl font-bold text-primary">
                            R$ {(resposta.total_proposta || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <div className="text-sm text-muted-foreground">
                            {resposta.prazo_entrega_dias && (
                              <p>Prazo: {resposta.prazo_entrega_dias} dias</p>
                            )}
                            {resposta.condicao_pagamento && (
                              <p>Pagamento: {resposta.condicao_pagamento}</p>
                            )}
                          </div>
                          {index === 0 && (
                            <Button 
                              className="w-full mt-4 bg-gradient-to-br from-green-500 to-green-600"
                              onClick={() => onGerarOrdem(selectedCotacao, resposta.fornecedor_id, resposta.id)}
                            >
                              <FileCheck className="w-4 h-4 mr-2" />
                              Gerar Ordem de Compra
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Tabela Comparativa por Item */}
          <Card>
            <CardHeader>
              <CardTitle>Comparativo por Item</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Produto</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      {respostas.map((r) => (
                        <TableHead key={r.id} className="text-center min-w-[150px]">
                          {r.fornecedor?.nome}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensCotacao.map((item) => {
                      const menorPreco = getMenorPreco(item.id);
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.nome_produto}</TableCell>
                          <TableCell className="text-center">{item.quantidade}</TableCell>
                          {respostas.map((r) => {
                            const itemResposta = getPrecoItem(item.id, r.id);
                            const isMenor = itemResposta && menorPreco && itemResposta.preco_unitario === menorPreco;
                            
                            return (
                              <TableCell key={r.id} className="text-center">
                                {itemResposta ? (
                                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded ${
                                    isMenor ? 'bg-green-500/20 text-green-600 font-bold' : ''
                                  }`}>
                                    {!itemResposta.disponivel ? (
                                      <span className="text-muted-foreground">Indisponível</span>
                                    ) : (
                                      <>
                                        R$ {itemResposta.preco_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        {isMenor && <Check className="w-4 h-4" />}
                                      </>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                    {/* Linha de Total */}
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell>TOTAL</TableCell>
                      <TableCell></TableCell>
                      {respostas.map((r) => (
                        <TableCell key={r.id} className="text-center">
                          <span className={r === fornecedorVencedor ? 'text-green-600' : ''}>
                            R$ {(r.total_proposta || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default MapaPrecos;
