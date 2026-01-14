import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Plus, Trash2, ShoppingCart, Check, Loader2, WifiOff, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Product {
  id: string;
  nome_produto: string;
  quantidade_estoque: number;
  unidade_medida: string;
  preco_unitario: number;
}

interface CartItem {
  id: string;
  produto: Product;
  peso_perdido: number;
  quantidade_perdida: number;
  observacao: string;
}

interface LossCartProps {
  products: Product[];
  onSuccess: () => void;
}

const CART_STORAGE_KEY = 'horticomercial_cart_items';
const DATE_STORAGE_KEY = 'horticomercial_cart_date';

// Helper to load cart from sessionStorage
const loadCartFromStorage = (): CartItem[] => {
  try {
    const stored = sessionStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Helper to load date from sessionStorage
const loadDateFromStorage = (): string => {
  try {
    const stored = sessionStorage.getItem(DATE_STORAGE_KEY);
    return stored || format(new Date(), 'yyyy-MM-dd');
  } catch {
    return format(new Date(), 'yyyy-MM-dd');
  }
};

const LossCart = ({ products, onSuccess }: LossCartProps) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(loadCartFromStorage);
  const [saving, setSaving] = useState(false);
  const [dataPeda, setDataPerda] = useState(loadDateFromStorage);
  
  const [currentItem, setCurrentItem] = useState({
    produto_id: '',
    valor: '',
    observacao: '',
  });

  const { toast } = useToast();
  const { user, userRole } = useAuth();
  const { isOnline, addPendingLosses } = useOfflineSync();

  // Persist cart to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  // Persist date to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem(DATE_STORAGE_KEY, dataPeda);
  }, [dataPeda]);

  const isAdmin = userRole === 'administrador';
  const selectedProduct = products.find(p => p.id === currentItem.produto_id);
  const isKg = selectedProduct?.unidade_medida === 'kg';

  // Normaliza entrada: converte vírgula para ponto
  const parseDecimal = (value: string): number => {
    if (!value) return 0;
    // Remove espaços e converte vírgula para ponto
    const normalized = value.trim().replace(',', '.');
    return parseFloat(normalized) || 0;
  };

  const addToCart = () => {
    if (!currentItem.produto_id) {
      toast({ title: 'Selecione um produto', variant: 'destructive' });
      return;
    }

    const lossAmount = parseDecimal(currentItem.valor);
    
    if (lossAmount <= 0) {
      toast({ title: 'Informe a quantidade perdida', variant: 'destructive' });
      return;
    }

    const product = products.find(p => p.id === currentItem.produto_id);
    if (!product) return;

    const newItem: CartItem = {
      id: crypto.randomUUID(),
      produto: product,
      peso_perdido: isKg ? lossAmount : 0,
      quantidade_perdida: isKg ? 0 : lossAmount,
      observacao: currentItem.observacao,
    };

    setCartItems([...cartItems, newItem]);
    setCurrentItem({
      produto_id: '',
      valor: '',
      observacao: '',
    });

    toast({ title: 'Item adicionado!' });
  };

  const removeFromCart = (id: string) => {
    setCartItems(cartItems.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCartItems([]);
    sessionStorage.removeItem(CART_STORAGE_KEY);
    sessionStorage.removeItem(DATE_STORAGE_KEY);
    setDataPerda(format(new Date(), 'yyyy-MM-dd'));
    toast({ title: 'Carrinho limpo!' });
  };

  const getTotalValue = () => {
    return cartItems.reduce((sum, item) => {
      const qty = item.peso_perdido + item.quantidade_perdida;
      return sum + (qty * item.produto.preco_unitario);
    }, 0);
  };

  const finalizeLaunch = async () => {
    if (!user) {
      toast({ title: 'Erro', description: 'Você precisa estar logado', variant: 'destructive' });
      return;
    }

    if (cartItems.length === 0) {
      toast({ title: 'Carrinho vazio', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      if (isOnline) {
        // Online: Create launch first, then add items
        const { data: launchData, error: launchError } = await supabase
          .from('lancamentos')
          .insert({
            usuario_id: user.id,
            data_lancamento: dataPeda,
            status: 'normal',
          })
          .select('id, numero')
          .single();

        if (launchError) throw launchError;

        const losses = cartItems.map(item => ({
          produto_id: item.produto.id,
          usuario_id: user.id,
          peso_perdido: item.peso_perdido || null,
          quantidade_perdida: item.quantidade_perdida || null,
          motivo_perda: 'outros' as const,
          observacao: item.observacao || null,
          data_perda: dataPeda,
          lancamento_id: launchData.id,
        }));

        const { error } = await supabase.from('perdas').insert(losses);
        if (error) throw error;
        
        toast({ 
          title: `Lançamento #${launchData.numero} finalizado!`, 
          description: `${cartItems.length} item(s) registrado(s)` 
        });
      } else {
        // Offline: save to local storage for later sync
        const losses = cartItems.map(item => ({
          produto_id: item.produto.id,
          usuario_id: user.id,
          peso_perdido: item.peso_perdido || null,
          quantidade_perdida: item.quantidade_perdida || null,
          motivo_perda: 'outros' as const,
          observacao: item.observacao || null,
          data_perda: dataPeda,
        }));
        
        addPendingLosses(losses);
        
        toast({ 
          title: 'Salvo localmente!', 
          description: `${cartItems.length} perda(s) salvas. Será sincronizado quando voltar online.` 
        });
      }
      
      setCartItems([]);
      sessionStorage.removeItem(CART_STORAGE_KEY);
      sessionStorage.removeItem(DATE_STORAGE_KEY);
      onSuccess();
    } catch (error: any) {
      toast({ 
        title: 'Erro ao finalizar lançamento', 
        description: error.message, 
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // Mobile layout for operators
  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-4 pb-4">
        {/* Add Item Card - Mobile optimized */}
        <Card className="flex-shrink-0">
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-base">Adicionar Item</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Produto</Label>
              <Select
                value={currentItem.produto_id}
                onValueChange={(value) => setCurrentItem({ ...currentItem, produto_id: value, valor: '' })}
              >
                <SelectTrigger className="text-base h-12">
                  <SelectValue placeholder="Selecione o produto" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id} className="text-base py-3">
                      <span className="font-medium">{product.nome_produto}</span>
                      <span className="text-muted-foreground ml-2">
                        ({product.unidade_medida})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProduct && (
              <div className="space-y-1.5">
                <Label className="text-sm">{isKg ? 'Peso (kg)' : 'Quantidade'}</Label>
                <Input
                  type="text"
                  value={currentItem.valor}
                  onChange={e => setCurrentItem({ ...currentItem, valor: e.target.value })}
                  placeholder="0"
                  className="text-xl h-14 text-center font-semibold"
                  inputMode="decimal"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-sm">Observação (opcional)</Label>
              <Input
                value={currentItem.observacao}
                onChange={e => setCurrentItem({ ...currentItem, observacao: e.target.value })}
                placeholder="Opcional"
                className="h-11"
              />
            </div>

            <Button 
              onClick={addToCart} 
              variant="success" 
              size="lg" 
              className="w-full h-14 text-base"
              disabled={!selectedProduct}
            >
              <Plus className="w-5 h-5 mr-2" />
              Adicionar
            </Button>
          </CardContent>
        </Card>

        {/* Cart Card - Mobile optimized */}
        <Card className="flex-shrink-0">
          <CardHeader className="pb-2 border-b px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingCart className="w-4 h-4 text-primary" />
                Lançamento
              </CardTitle>
              <div className="flex items-center gap-2">
                {cartItems.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2">
                        <XCircle className="w-4 h-4 mr-1" />
                        Limpar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="mx-4 max-w-[calc(100%-2rem)]">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Limpar carrinho?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja remover todos os {cartItems.length} itens do lançamento?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-row gap-2">
                        <AlertDialogCancel className="flex-1 m-0">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={clearCart} className="flex-1 m-0 bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Limpar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-sm font-semibold min-w-[24px] text-center">
                  {cartItems.length}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Data</Label>
              <Input
                type="date"
                value={dataPeda}
                onChange={e => setDataPerda(e.target.value)}
                className="h-11"
              />
            </div>

            {cartItems.length === 0 ? (
              <div className="py-4 text-center text-muted-foreground">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum item</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {cartItems.map(item => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.produto.nome_produto}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.peso_perdido + item.quantidade_perdida} {item.produto.unidade_medida}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeFromCart(item.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {cartItems.length > 0 && (
              <Button 
                onClick={finalizeLaunch}
                variant="hero"
                size="lg"
                className="w-full h-14 text-base"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Finalizando...
                  </>
                ) : !isOnline ? (
                  <>
                    <WifiOff className="w-5 h-5 mr-2" />
                    Salvar Offline
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Finalizar
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin layout (desktop)
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Product Selection */}
      <div className="lg:col-span-3 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Adicionar Item</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>Produto</Label>
                <Select
                  value={currentItem.produto_id}
                  onValueChange={(value) => setCurrentItem({ ...currentItem, produto_id: value, valor: '' })}
                >
                  <SelectTrigger className="text-base h-12">
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(product => (
                      <SelectItem key={product.id} value={product.id} className="text-base py-3">
                        <span className="font-medium">{product.nome_produto}</span>
                        <span className="text-muted-foreground ml-2">
                          ({product.unidade_medida})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProduct && (
                <div className="sm:col-span-2 p-3 rounded-lg bg-accent/50 border border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Preço: <span className="font-semibold text-foreground">R$ {selectedProduct.preco_unitario.toFixed(2)}</span>
                    </span>
                  </div>
                </div>
              )}

              {selectedProduct && (
                <div className="space-y-2 sm:col-span-2">
                  <Label>{isKg ? 'Peso (kg)' : 'Quantidade'}</Label>
                  <Input
                    type="text"
                    value={currentItem.valor}
                    onChange={e => setCurrentItem({ ...currentItem, valor: e.target.value })}
                    placeholder=""
                    className="text-lg h-12"
                    inputMode="decimal"
                  />
                </div>
              )}

              <div className="space-y-2 sm:col-span-2">
                <Label>Observação</Label>
                <Input
                  value={currentItem.observacao}
                  onChange={e => setCurrentItem({ ...currentItem, observacao: e.target.value })}
                  placeholder="Opcional"
                  className="h-12"
                />
              </div>
            </div>

            <Button 
              onClick={addToCart} 
              variant="success" 
              size="lg" 
              className="w-full h-14 text-lg"
              disabled={!selectedProduct}
            >
              <Plus className="w-5 h-5 mr-2" />
              Adicionar ao Lançamento
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Cart */}
      <div className="lg:col-span-2">
        <Card className="sticky top-4">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                Lançamento
              </CardTitle>
              <div className="flex items-center gap-2">
                {cartItems.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        <XCircle className="w-4 h-4 mr-1" />
                        Limpar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Limpar carrinho?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja remover todos os {cartItems.length} itens do lançamento? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={clearCart} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Limpar tudo
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <span className="text-sm text-muted-foreground">
                  {cartItems.length} {cartItems.length === 1 ? 'item' : 'itens'}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Data do Lançamento</Label>
              <Input
                type="date"
                value={dataPeda}
                onChange={e => setDataPerda(e.target.value)}
                className="h-10"
              />
            </div>

            {cartItems.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Nenhum item no lançamento</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {cartItems.map(item => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.produto.nome_produto}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.peso_perdido + item.quantidade_perdida} {item.produto.unidade_medida}
                      </p>
                      <p className="text-sm font-semibold text-destructive">
                        R$ {((item.peso_perdido + item.quantidade_perdida) * item.produto.preco_unitario).toFixed(2)}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeFromCart(item.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {cartItems.length > 0 && (
              <>
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total da Perda:</span>
                    <span className="text-destructive">R$ {getTotalValue().toFixed(2)}</span>
                  </div>
                </div>

                <Button 
                  onClick={finalizeLaunch}
                  variant="hero"
                  size="lg"
                  className="w-full h-14 text-lg"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Finalizando...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Finalizar Lançamento
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LossCart;
