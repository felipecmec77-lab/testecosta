import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Package, 
  TrendingDown, 
  ClipboardList, 
  FileText,
  Loader2,
  Apple,
  Search,
  Plus,
  Trash2,
  Pencil,
  BarChart3
} from 'lucide-react';
import LossCart from '@/components/losses/LossCart';
import LaunchList, { Launch } from '@/components/losses/LaunchList';
import HortifrutiDashboard from '@/components/hortifruti/HortifrutiDashboard';
import type { Database } from '@/integrations/supabase/types';

type CategoriaType = Database['public']['Enums']['categoria_produto'];
type UnidadeType = Database['public']['Enums']['unidade_medida'];

interface Product {
  id: string;
  nome_produto: string;
  quantidade_estoque: number;
  unidade_medida: string;
  preco_unitario: number;
  preco_venda: number | null;
}

// Helper function to format prices with comma
const formatarPreco = (valor: number): string => {
  return valor.toFixed(2).replace('.', ',');
};

const Hortifruti = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [loading, setLoading] = useState(true);
  const { userRole, loading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('produtos')
        .select('*')
        .order('nome_produto');
      
      if (productsError) {
        console.error('Erro ao buscar produtos:', productsError);
      }
      
      console.log('Produtos carregados:', productsData?.length);
      if (productsData) setProducts(productsData);

      // Fetch launches with counts
      const { data: launchesData } = await supabase
        .from('lancamentos')
        .select('*')
        .order('numero', { ascending: false })
        .limit(50);

      if (launchesData) {
        const launchesWithCounts = await Promise.all(
          launchesData.map(async (launch) => {
            const { data: perdasData } = await supabase
              .from('perdas')
              .select('valor_perda')
              .eq('lancamento_id', launch.id);

            const { data: profileData } = await supabase
              .from('profiles')
              .select('nome')
              .eq('id', launch.usuario_id)
              .single();

            return {
              ...launch,
              profiles: profileData || undefined,
              items_count: perdasData?.length || 0,
              total_value: perdasData?.reduce((acc, p) => acc + (p.valor_perda || 0), 0) || 0,
            } as Launch;
          })
        );
        setLaunches(launchesWithCounts);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  const isAdmin = userRole === 'administrador';

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header clicável - estilo moderno */}
        <button 
          onClick={() => setActiveTab('perdas')}
          className="w-full text-center p-4 rounded-xl bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center justify-center gap-3">
            <Apple className="w-8 h-8" />
            HORTIFRÚTI
          </h1>
          <p className="text-white/80 text-sm mt-1">COMERCIAL COSTA</p>
        </button>

        {/* Navigation Tabs - estilo moderno com gradientes */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto gap-2 bg-transparent p-0">
            <TabsTrigger 
              value="perdas"
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 bg-gradient-to-br from-red-500 to-red-600 data-[state=active]:ring-2 data-[state=active]:ring-white/40 data-[state=active]:shadow-lg data-[state=active]:scale-[1.02] data-[state=inactive]:opacity-80 hover:opacity-100"
            >
              <TrendingDown className="w-5 h-5" />
              <span className="text-sm">LANÇAR PERDA</span>
            </TabsTrigger>
            
            {isAdmin && (
              <>
                <TabsTrigger 
                  value="dashboard"
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 bg-gradient-to-br from-emerald-500 to-emerald-600 data-[state=active]:ring-2 data-[state=active]:ring-white/40 data-[state=active]:shadow-lg data-[state=active]:scale-[1.02] data-[state=inactive]:opacity-80 hover:opacity-100"
                >
                  <BarChart3 className="w-5 h-5" />
                  <span className="text-sm">DASHBOARD</span>
                </TabsTrigger>

                <TabsTrigger 
                  value="produtos"
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 bg-gradient-to-br from-blue-500 to-blue-600 data-[state=active]:ring-2 data-[state=active]:ring-white/40 data-[state=active]:shadow-lg data-[state=active]:scale-[1.02] data-[state=inactive]:opacity-80 hover:opacity-100"
                >
                  <Package className="w-5 h-5" />
                  <span className="text-sm">PRODUTOS</span>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="lancamentos"
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 bg-gradient-to-br from-purple-500 to-purple-600 data-[state=active]:ring-2 data-[state=active]:ring-white/40 data-[state=active]:shadow-lg data-[state=active]:scale-[1.02] data-[state=inactive]:opacity-80 hover:opacity-100"
                >
                  <ClipboardList className="w-5 h-5" />
                  <span className="text-sm">LANÇAMENTOS</span>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="relatorios"
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 bg-gradient-to-br from-orange-500 to-orange-600 data-[state=active]:ring-2 data-[state=active]:ring-white/40 data-[state=active]:shadow-lg data-[state=active]:scale-[1.02] data-[state=inactive]:opacity-80 hover:opacity-100"
                >
                  <FileText className="w-5 h-5" />
                  <span className="text-sm">RELATÓRIOS</span>
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Content */}
          <div className="mt-6">
            <TabsContent value="perdas" className="mt-0 space-y-0">
              <LossCart products={products} onSuccess={fetchData} />
            </TabsContent>
            
            {isAdmin && (
              <>
                <TabsContent value="dashboard" className="mt-0 space-y-0">
                  <HortifrutiDashboard />
                </TabsContent>

                <TabsContent value="produtos" className="mt-0 space-y-0">
                  <ProductsSection products={products} onRefresh={fetchData} />
                </TabsContent>
                
                <TabsContent value="lancamentos" className="mt-0 space-y-0">
                  <LaunchList launches={launches} onRefresh={fetchData} />
                </TabsContent>
                
                <TabsContent value="relatorios" className="mt-0 space-y-0">
                  <ReportsSection />
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      </div>
    </MainLayout>
  );
};

// Products Section Component
const ProductsSection = ({ products, onRefresh }: { products: Product[]; onRefresh: () => void }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editPrecoCusto, setEditPrecoCusto] = useState('');
  const [newProduct, setNewProduct] = useState({
    nome_produto: '',
    categoria: 'fruta' as CategoriaType,
    unidade_medida: 'kg' as UnidadeType,
    quantidade_estoque: '',
    estoque_minimo: '',
    preco_unitario: '',
  });
  const { toast } = useToast();


  const handleAddProduct = async () => {
    if (!newProduct.nome_produto) {
      toast({ title: 'Informe o nome do produto', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('produtos').insert([{
        nome_produto: newProduct.nome_produto,
        categoria: newProduct.categoria,
        unidade_medida: newProduct.unidade_medida,
        quantidade_estoque: Number(newProduct.quantidade_estoque) || 0,
        estoque_minimo: Number(newProduct.estoque_minimo) || 0,
        preco_unitario: Number(newProduct.preco_unitario) || 0,
      }]);
      
      if (error) throw error;
      
      toast({ title: 'Produto adicionado!' });
      setDialogOpen(false);
      setNewProduct({
        nome_produto: '',
        categoria: 'fruta',
        unidade_medida: 'kg',
        quantidade_estoque: '',
        estoque_minimo: '',
        preco_unitario: '',
      });
      onRefresh();
    } catch (error: any) {
      toast({ title: 'Erro ao adicionar', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const { error } = await supabase.from('produtos').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Produto removido!' });
      onRefresh();
    } catch (error: any) {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    }
  };

  const handleEditPrices = (product: Product) => {
    setEditingProduct(product);
    setEditPrecoCusto(product.preco_unitario.toString());
    setEditDialogOpen(true);
  };

  const handleSavePrices = async () => {
    if (!editingProduct) return;
    
    const newPrecoCusto = parseFloat(editPrecoCusto);
    
    if (isNaN(newPrecoCusto) || newPrecoCusto < 0) {
      toast({ title: 'Informe um preço de custo válido', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('produtos')
        .update({ 
          preco_unitario: newPrecoCusto
        })
        .eq('id', editingProduct.id);
      
      if (error) throw error;
      
      toast({ title: 'Preço atualizado!' });
      setEditDialogOpen(false);
      setEditingProduct(null);
      onRefresh();
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar preço', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.nome_produto.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
        <CardTitle>Produtos do Hortifrúti</CardTitle>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar produto..." 
              className="pl-10 w-48"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          

          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Adicionar</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Produto</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome do Produto</Label>
                  <Input 
                    value={newProduct.nome_produto} 
                    onChange={(e) => setNewProduct({...newProduct, nome_produto: e.target.value})} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Categoria</Label>
                    <Select 
                      value={newProduct.categoria} 
                      onValueChange={(v: CategoriaType) => setNewProduct({...newProduct, categoria: v})}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fruta">Fruta</SelectItem>
                        <SelectItem value="verdura">Verdura</SelectItem>
                        <SelectItem value="legume">Legume</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Unidade</Label>
                    <Select 
                      value={newProduct.unidade_medida} 
                      onValueChange={(v: UnidadeType) => setNewProduct({...newProduct, unidade_medida: v})}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">Kg</SelectItem>
                        <SelectItem value="unidade">Unidade</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Estoque</Label>
                    <Input 
                      type="number" 
                      value={newProduct.quantidade_estoque} 
                      onChange={(e) => setNewProduct({...newProduct, quantidade_estoque: e.target.value})}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Mínimo</Label>
                    <Input 
                      type="number" 
                      value={newProduct.estoque_minimo} 
                      onChange={(e) => setNewProduct({...newProduct, estoque_minimo: e.target.value})}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Preço Custo (R$)</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      value={newProduct.preco_unitario} 
                      onChange={(e) => setNewProduct({...newProduct, preco_unitario: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <Button onClick={handleAddProduct} disabled={saving} className="w-full">
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Adicionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead className="text-right">Preço Custo</TableHead>
              <TableHead className="w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                  Nenhum produto encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map(produto => (
                <TableRow key={produto.id} className={produto.quantidade_estoque <= 0 ? 'bg-destructive/5' : ''}>
                  <TableCell className="font-medium">{produto.nome_produto}</TableCell>
                  <TableCell className="text-right">
                    R$ {formatarPreco(produto.preco_unitario)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-primary/10"
                        onClick={() => handleEditPrices(produto)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteProduct(produto.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    {/* Edit Price Dialog */}
    <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Preço de Custo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-muted-foreground">Produto</Label>
            <p className="font-medium text-lg">{editingProduct?.nome_produto}</p>
          </div>
          <div>
            <Label>Preço de Custo (R$)</Label>
            <Input 
              type="number" 
              step="0.01"
              value={editPrecoCusto}
              onChange={(e) => setEditPrecoCusto(e.target.value)}
              placeholder="0.00"
              autoFocus
            />
          </div>
          <p className="text-xs text-muted-foreground">
            ⚠️ Esta alteração não afeta os valores já contabilizados em lançamentos anteriores.
          </p>
          <Button onClick={handleSavePrices} disabled={saving} className="w-full">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </>
  );
};

// Reports Section Component
const ReportsSection = () => {
  const [perdas, setPerdas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerdas();
  }, []);

  const fetchPerdas = async () => {
    try {
      const { data, error } = await supabase
        .from('perdas')
        .select(`
          *,
          produtos(nome_produto, categoria, unidade_medida),
          lancamentos(numero)
        `)
        .order('data_perda', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      setPerdas(data || []);
    } catch (error) {
      console.error('Erro ao buscar perdas:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPerdas = perdas.reduce((acc, p) => acc + (p.valor_perda || 0), 0);
  const perdasPorMotivo = perdas.reduce((acc: any, p) => {
    acc[p.motivo_perda] = (acc[p.motivo_perda] || 0) + (p.valor_perda || 0);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total de Perdas</p>
              <p className="text-2xl font-bold text-destructive">R$ {formatarPreco(totalPerdas)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Registros</p>
              <p className="text-2xl font-bold">{perdas.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Principal Motivo</p>
              <p className="text-2xl font-bold capitalize">
                {Object.entries(perdasPorMotivo).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || '-'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Losses */}
      <Card>
        <CardHeader>
          <CardTitle>Últimas Perdas Registradas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead className="text-right">Qtd/Peso</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perdas.slice(0, 20).map(perda => (
                <TableRow key={perda.id}>
                  <TableCell>
                    {format(new Date(perda.data_perda + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="font-medium">{perda.produtos?.nome_produto}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{perda.motivo_perda}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {perda.quantidade_perdida || perda.peso_perdido || 0} {perda.produtos?.unidade_medida}
                  </TableCell>
                  <TableCell className="text-right text-destructive font-medium">
                    R$ {formatarPreco(perda.valor_perda || 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Hortifruti;
