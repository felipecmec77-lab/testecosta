import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Edit, Trash2, Package, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

type Categoria = 'verdura' | 'legume' | 'fruta' | 'outros';
type UnidadeMedida = 'kg' | 'unidade';

interface Product {
  id: string;
  nome_produto: string;
  categoria: Categoria;
  unidade_medida: UnidadeMedida;
  quantidade_estoque: number;
  preco_unitario: number;
  estoque_minimo: number;
}

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    nome_produto: '',
    categoria: 'verdura' as Categoria,
    unidade_medida: 'kg' as UnidadeMedida,
    quantidade_estoque: '',
    preco_unitario: '',
    estoque_minimo: '',
  });

  const { toast } = useToast();
  const { userRole } = useAuth();
  const isAdmin = userRole === 'administrador';

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .order('nome_produto');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({ title: 'Erro ao carregar produtos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const productData = {
        nome_produto: formData.nome_produto,
        categoria: formData.categoria,
        unidade_medida: formData.unidade_medida,
        quantidade_estoque: parseFloat(formData.quantidade_estoque) || 0,
        preco_unitario: parseFloat(formData.preco_unitario) || 0,
        estoque_minimo: parseFloat(formData.estoque_minimo) || 0,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('produtos')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast({ title: 'Produto atualizado com sucesso!' });
      } else {
        const { error } = await supabase
          .from('produtos')
          .insert([productData]);

        if (error) throw error;
        toast({ title: 'Produto cadastrado com sucesso!' });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchProducts();
    } catch (error: any) {
      toast({ title: 'Erro ao salvar produto', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      nome_produto: product.nome_produto,
      categoria: product.categoria,
      unidade_medida: product.unidade_medida,
      quantidade_estoque: product.quantidade_estoque.toString(),
      preco_unitario: product.preco_unitario.toString(),
      estoque_minimo: product.estoque_minimo.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from('produtos')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;
      toast({ title: 'Produto excluído com sucesso!' });
      fetchProducts();
    } catch (error: any) {
      toast({ title: 'Erro ao excluir produto', description: error.message, variant: 'destructive' });
    } finally {
      setDeleteId(null);
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      nome_produto: '',
      categoria: 'verdura',
      unidade_medida: 'kg',
      quantidade_estoque: '',
      preco_unitario: '',
      estoque_minimo: '',
    });
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.nome_produto.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.categoria === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryBadge = (categoria: Categoria) => {
    const colors = {
      verdura: 'bg-primary/10 text-primary',
      legume: 'bg-secondary/10 text-secondary',
      fruta: 'bg-info/10 text-info',
      outros: 'bg-muted text-muted-foreground',
    };
    return colors[categoria];
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">ESTOQUE</h1>
            <p className="text-muted-foreground mt-1">GERENCIE SEU ESTOQUE DE HORTIFRUTI</p>
          </div>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button variant="hero" size="lg">
                  <Plus className="w-5 h-5" />
                  Novo Produto
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome do Produto</Label>
                    <Input
                      id="nome"
                      value={formData.nome_produto}
                      onChange={e => setFormData({ ...formData, nome_produto: e.target.value })}
                      placeholder="Ex: Tomate"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Categoria</Label>
                      <Select
                        value={formData.categoria}
                        onValueChange={(value: Categoria) => setFormData({ ...formData, categoria: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="verdura">Verdura</SelectItem>
                          <SelectItem value="legume">Legume</SelectItem>
                          <SelectItem value="fruta">Fruta</SelectItem>
                          <SelectItem value="outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Unidade</Label>
                      <Select
                        value={formData.unidade_medida}
                        onValueChange={(value: UnidadeMedida) => setFormData({ ...formData, unidade_medida: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kg">Kg</SelectItem>
                          <SelectItem value="unidade">Unidade</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="estoque">Estoque</Label>
                      <Input
                        id="estoque"
                        type="number"
                        step="0.01"
                        value={formData.quantidade_estoque}
                        onChange={e => setFormData({ ...formData, quantidade_estoque: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="preco">Preço (R$)</Label>
                      <Input
                        id="preco"
                        type="number"
                        step="0.01"
                        value={formData.preco_unitario}
                        onChange={e => setFormData({ ...formData, preco_unitario: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="minimo">Mínimo</Label>
                      <Input
                        id="minimo"
                        type="number"
                        step="0.01"
                        value={formData.estoque_minimo}
                        onChange={e => setFormData({ ...formData, estoque_minimo: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <Button type="submit" variant="hero" className="w-full" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      editingProduct ? 'Atualizar' : 'Cadastrar'
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="verdura">Verduras</SelectItem>
                  <SelectItem value="legume">Legumes</SelectItem>
                  <SelectItem value="fruta">Frutas</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PRODUTO</TableHead>
                    <TableHead>CATEGORIA</TableHead>
                    <TableHead className="text-right">ESTOQUE</TableHead>
                    <TableHead className="text-right">PREÇO</TableHead>
                    <TableHead className="text-right">MÍNIMO</TableHead>
                    {isAdmin && <TableHead className="text-right">AÇÕES</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-12">
                        <Package className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
                        <p className="text-muted-foreground">Nenhum produto encontrado</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map(product => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium uppercase">{product.nome_produto.toUpperCase()}</TableCell>
                        <TableCell>
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium uppercase ${getCategoryBadge(product.categoria)}`}>
                            {product.categoria.toUpperCase()}
                          </span>
                        </TableCell>
                        <TableCell className={`text-right font-medium ${product.quantidade_estoque <= product.estoque_minimo ? 'text-destructive' : ''}`}>
                          {product.quantidade_estoque} {product.unidade_medida.toUpperCase()}
                        </TableCell>
                        <TableCell className="text-right">
                          R$ {product.preco_unitario.toFixed(2).replace('.', ',')}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {product.estoque_minimo} {product.unidade_medida.toUpperCase()}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(product)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteId(product.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default Products;
