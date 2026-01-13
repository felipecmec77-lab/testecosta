import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Search, Barcode, Loader2, Pencil, Trash2, Package } from 'lucide-react';

interface ProdutoCotacao {
  id: string;
  codigo_barras: string | null;
  nome: string;
  marca: string | null;
  categoria: string | null;
  descricao: string | null;
  imagem_url: string | null;
  preco_medio: number | null;
  unidade_medida: string | null;
  criado_em: string | null;
}

const ProdutosCotacao = () => {
  const [produtos, setProdutos] = useState<ProdutoCotacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProdutoCotacao | null>(null);
  const [searchingBarcode, setSearchingBarcode] = useState(false);
  
  const [formData, setFormData] = useState({
    codigo_barras: '',
    nome: '',
    marca: '',
    categoria: '',
    descricao: '',
    unidade_medida: 'unidade'
  });

  useEffect(() => {
    fetchProdutos();
  }, []);

  const fetchProdutos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('produtos_cotacao')
        .select('*')
        .order('nome');

      if (error) throw error;
      setProdutos(data || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const searchBarcode = async () => {
    if (!formData.codigo_barras.trim()) return;

    setSearchingBarcode(true);
    try {
      const response = await supabase.functions.invoke('barcode-lookup', {
        body: { barcode: formData.codigo_barras }
      });

      if (response.error) throw response.error;

      const data = response.data;
      if (data.found) {
        setFormData(prev => ({
          ...prev,
          nome: data.product.nome || '',
          marca: data.product.marca || '',
          categoria: data.product.categoria || '',
          descricao: data.product.descricao || ''
        }));
        toast.success('Produto encontrado!');
      } else {
        toast.info('Produto não encontrado na API. Preencha manualmente.');
      }
    } catch (error) {
      console.error('Erro ao buscar código de barras:', error);
      toast.error('Erro ao buscar produto');
    } finally {
      setSearchingBarcode(false);
    }
  };

  const saveProduct = async () => {
    if (!formData.nome.trim()) {
      toast.error('Nome do produto é obrigatório');
      return;
    }

    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('produtos_cotacao')
          .update({
            codigo_barras: formData.codigo_barras || null,
            nome: formData.nome,
            marca: formData.marca || null,
            categoria: formData.categoria || null,
            descricao: formData.descricao || null,
            unidade_medida: formData.unidade_medida
          })
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast.success('Produto atualizado!');
      } else {
        const { error } = await supabase
          .from('produtos_cotacao')
          .insert({
            codigo_barras: formData.codigo_barras || null,
            nome: formData.nome,
            marca: formData.marca || null,
            categoria: formData.categoria || null,
            descricao: formData.descricao || null,
            unidade_medida: formData.unidade_medida
          });

        if (error) throw error;
        toast.success('Produto cadastrado!');
      }

      setShowDialog(false);
      resetForm();
      fetchProdutos();
    } catch (error: any) {
      console.error('Erro ao salvar produto:', error);
      if (error.message?.includes('duplicate')) {
        toast.error('Código de barras já cadastrado');
      } else {
        toast.error('Erro ao salvar produto');
      }
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Deseja realmente excluir este produto?')) return;

    try {
      const { error } = await supabase
        .from('produtos_cotacao')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Produto excluído!');
      fetchProdutos();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      toast.error('Erro ao excluir produto');
    }
  };

  const editProduct = (product: ProdutoCotacao) => {
    setEditingProduct(product);
    setFormData({
      codigo_barras: product.codigo_barras || '',
      nome: product.nome,
      marca: product.marca || '',
      categoria: product.categoria || '',
      descricao: product.descricao || '',
      unidade_medida: product.unidade_medida || 'unidade'
    });
    setShowDialog(true);
  };

  const resetForm = () => {
    setFormData({
      codigo_barras: '',
      nome: '',
      marca: '',
      categoria: '',
      descricao: '',
      unidade_medida: 'unidade'
    });
    setEditingProduct(null);
  };

  const filteredProducts = produtos.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo_barras?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.marca?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={showDialog} onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              NOVO PRODUTO
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label>Código de Barras</Label>
                  <Input
                    value={formData.codigo_barras}
                    onChange={(e) => setFormData(prev => ({ ...prev, codigo_barras: e.target.value }))}
                    placeholder="Digite ou escaneie"
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={searchBarcode}
                    disabled={searchingBarcode || !formData.codigo_barras}
                  >
                    {searchingBarcode ? <Loader2 className="w-4 h-4 animate-spin" /> : <Barcode className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <Label>Nome *</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Marca</Label>
                  <Input
                    value={formData.marca}
                    onChange={(e) => setFormData(prev => ({ ...prev, marca: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Input
                    value={formData.categoria}
                    onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label>Unidade de Medida</Label>
                <Input
                  value={formData.unidade_medida}
                  onChange={(e) => setFormData(prev => ({ ...prev, unidade_medida: e.target.value }))}
                  placeholder="unidade, kg, cx..."
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Input
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                />
              </div>
              <Button onClick={saveProduct} className="w-full bg-gradient-to-r from-blue-500 to-blue-600">
                {editingProduct ? 'ATUALIZAR' : 'CADASTRAR'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Produtos Cadastrados ({filteredProducts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imagem</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((produto) => (
                  <TableRow key={produto.id}>
                    <TableCell>
                      {produto.imagem_url ? (
                        <img src={produto.imagem_url} alt="" className="w-10 h-10 object-cover rounded" />
                      ) : (
                        <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                          <Package className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{produto.codigo_barras || '-'}</TableCell>
                    <TableCell className="font-medium">{produto.nome}</TableCell>
                    <TableCell>{produto.marca || '-'}</TableCell>
                    <TableCell>{produto.categoria || '-'}</TableCell>
                    <TableCell>{produto.unidade_medida || 'unidade'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => editProduct(produto)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteProduct(produto.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhum produto encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProdutosCotacao;
