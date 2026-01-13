import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  DollarSign, 
  TrendingUp, 
  Archive, 
  Calendar, 
  Tag,
  ArrowLeft,
  Loader2,
  AlertCircle,
  ShieldAlert,
  LogIn
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProdutoData {
  id: string;
  codigo: string;
  nome: string;
  preco_venda: number;
  preco_custo: number;
  preco_promocao: number | null;
  estoque_atual: number;
  estoque_minimo: number;
  unidade: string | null;
  grupo: string | null;
  marca: string | null;
  atualizado_em: string | null;
  criado_em: string | null;
}

const ProdutoInfo = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const productId = searchParams.get('id');
  const { user, userRole, loading: authLoading } = useAuth();
  
  const [produto, setProduto] = useState<ProdutoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = userRole === 'administrador';

  useEffect(() => {
    const fetchProduct = async () => {
      // Aguardar autenticação
      if (authLoading) return;

      // Verificar se usuário está autenticado
      if (!user) {
        setLoading(false);
        return;
      }

      // Verificar se é admin
      if (!isAdmin) {
        setLoading(false);
        return;
      }

      if (!productId) {
        setError('ID do produto não informado');
        setLoading(false);
        return;
      }

      try {
        const { data, error: dbError } = await supabase
          .from('estoque')
          .select('*')
          .eq('id', productId)
          .single();

        if (dbError) {
          console.error('Erro ao buscar produto:', dbError);
          setError('Produto não encontrado');
        } else {
          setProduto(data);
        }
      } catch (err) {
        console.error('Erro:', err);
        setError('Erro ao carregar informações do produto');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId, user, userRole, authLoading, isAdmin]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return 'N/A';
    }
  };

  const calcularMargem = () => {
    if (!produto || produto.preco_custo === 0) return 0;
    return ((produto.preco_venda - produto.preco_custo) / produto.preco_custo) * 100;
  };

  const getEstoqueStatus = () => {
    if (!produto) return { status: 'normal', label: 'Normal', color: 'bg-green-500' };
    if (produto.estoque_atual <= 0) return { status: 'zerado', label: 'Sem Estoque', color: 'bg-red-500' };
    if (produto.estoque_atual <= produto.estoque_minimo) return { status: 'baixo', label: 'Estoque Baixo', color: 'bg-yellow-500' };
    return { status: 'normal', label: 'Normal', color: 'bg-green-500' };
  };

  // Estado de carregamento (incluindo autenticação)
  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Usuário não autenticado
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="p-4 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <LogIn className="h-12 w-12 text-amber-600 dark:text-amber-400" />
              </div>
              <h1 className="text-xl font-bold">Acesso Restrito</h1>
              <p className="text-muted-foreground">
                Você precisa estar autenticado para visualizar as informações do produto.
              </p>
              <Button onClick={() => navigate('/auth')} className="mt-2">
                <LogIn className="h-4 w-4 mr-2" />
                Fazer Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Usuário não é admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/30">
                <ShieldAlert className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-xl font-bold">Acesso Negado</h1>
              <p className="text-muted-foreground">
                Somente administradores podem visualizar as informações detalhadas do produto.
              </p>
              <Button asChild variant="outline" className="mt-2">
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao início
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Erro ou produto não encontrado
  if (error || !produto) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="h-16 w-16 text-destructive" />
              <h1 className="text-xl font-bold">Produto não encontrado</h1>
              <p className="text-muted-foreground">{error}</p>
              <Button asChild variant="outline">
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao início
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const estoqueStatus = getEstoqueStatus();
  const margem = calcularMargem();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="text-center pt-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Package className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">{produto.nome}</h1>
          <p className="text-muted-foreground font-mono">Código: {produto.codigo}</p>
          {produto.marca && (
            <Badge variant="secondary" className="mt-2">{produto.marca}</Badge>
          )}
        </div>

        {/* Preço Principal */}
        <Card className="border-2 border-primary">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Preço de Venda</p>
              <p className="text-4xl font-bold text-primary">
                {formatCurrency(produto.preco_venda)}
              </p>
              {produto.preco_promocao && produto.preco_promocao < produto.preco_venda && (
                <div className="mt-2">
                  <Badge variant="destructive" className="text-lg px-4 py-1">
                    PROMOÇÃO: {formatCurrency(produto.preco_promocao)}
                  </Badge>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {produto.unidade || 'UN'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Informações Financeiras */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Informações Financeiras
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Preço de Custo</span>
              <span className="font-semibold">{formatCurrency(produto.preco_custo)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Preço de Venda</span>
              <span className="font-semibold">{formatCurrency(produto.preco_venda)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                Margem de Lucro
              </span>
              <Badge variant={margem >= 0 ? 'default' : 'destructive'}>
                {margem.toFixed(1)}%
              </Badge>
            </div>
            {produto.preco_promocao && (
              <>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Tag className="h-4 w-4" />
                    Preço Promocional
                  </span>
                  <span className="font-semibold text-destructive">
                    {formatCurrency(produto.preco_promocao)}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Estoque */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Estoque
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Quantidade Atual</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg">{produto.estoque_atual}</span>
                <span className={`w-3 h-3 rounded-full ${estoqueStatus.color}`} />
              </div>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Estoque Mínimo</span>
              <span className="font-semibold">{produto.estoque_minimo}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Status</span>
              <Badge 
                variant={estoqueStatus.status === 'normal' ? 'default' : 
                         estoqueStatus.status === 'baixo' ? 'secondary' : 'destructive'}
              >
                {estoqueStatus.label}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Detalhes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Detalhes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {produto.grupo && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Grupo</span>
                  <span className="font-semibold">{produto.grupo}</span>
                </div>
                <Separator />
              </>
            )}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Unidade</span>
              <span className="font-semibold">{produto.unidade || 'UN'}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Cadastrado em</span>
              <span className="text-sm">{formatDate(produto.criado_em)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Última Atualização</span>
              <span className="text-sm">{formatDate(produto.atualizado_em)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center pb-8">
          <p className="text-xs text-muted-foreground">
            Informações atualizadas em tempo real
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProdutoInfo;