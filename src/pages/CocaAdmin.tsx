import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Loader2, Plus, Trash2, History, Package, Printer, FileText, 
  ShoppingCart, ChevronDown, ChevronRight, Calendar, User, Share2, Image, Bell, Pencil, Copy
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ThermalReceipt from '@/components/ThermalReceipt';
import SupplierReceipt from '@/components/receipts/SupplierReceipt';
import StockReceipt from '@/components/receipts/StockReceipt';
import html2canvas from 'html2canvas';

interface ProdutoCoca {
  id: string;
  nome_produto: string;
  quantidade_estoque: number;
  estoque_minimo: number;
  preco_unitario: number;
  unidades_por_fardo: number;
}

interface SessaoConferencia {
  id: string;
  numero: number;
  data_conferencia: string;
  usuario_id: string;
  observacao: string | null;
  criado_em: string;
  profiles?: { nome: string };
  items?: {
    id: string;
    quantidade_conferida: number;
    tipo_unidade: string;
    produto_coca_id: string;
    produtos_coca?: { nome_produto: string };
  }[];
}

interface PedidoItem {
  produtoId: string;
  nome: string;
  quantidade: number;
  unidade: string;
  quantidadeConferida: number;
  unidadesPorFardo: number;
}

interface ReceiptItem {
  nome: string;
  quantidade: number;
  unidade?: string;
  unidadesPorFardo?: number;
  semEstoque?: boolean;
}

type ReceiptType = 'fornecedor' | 'estoque';

interface PedidoCoca {
  id: string;
  numero: number;
  data_pedido: string;
  total_itens: number;
  total_unidades: number;
  sessao_id: string | null;
  observacao: string | null;
}

type ViewMode = 'resumo' | 'historico' | 'produtos' | 'pedido' | 'editar_pedido' | 'historico_pedidos';

const CocaAdmin = () => {
  const [produtos, setProdutos] = useState<ProdutoCoca[]>([]);
  const [sessoes, setSessoes] = useState<SessaoConferencia[]>([]);
  const [conferenciasCount, setConferenciasCount] = useState({ hoje: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<ProdutoCoca | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('resumo');
  const [expandedSessoes, setExpandedSessoes] = useState<Set<string>>(new Set());
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set());
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [receiptNumber, setReceiptNumber] = useState<number>(0);
  const [newSessoes, setNewSessoes] = useState<SessaoConferencia[]>([]);
  const [pedidoItems, setPedidoItems] = useState<PedidoItem[]>([]);
  const [selectedSessao, setSelectedSessao] = useState<SessaoConferencia | null>(null);
  const [pedidosCoca, setPedidosCoca] = useState<PedidoCoca[]>([]);
  const [savingPedido, setSavingPedido] = useState(false);
  const [deletingSessao, setDeletingSessao] = useState<string | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const visualReceiptRef = useRef<HTMLDivElement>(null);
  
  const [newProduto, setNewProduto] = useState({
    nome_produto: '',
    quantidade_estoque: '',
    estoque_minimo: '',
    preco_unitario: '',
    unidades_por_fardo: '6',
  });
  const [receiptType, setReceiptType] = useState<ReceiptType>('fornecedor');
  
  const { userRole, userName, loading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    const cleanup = subscribeToSessoes();
    return () => {
      cleanup.then(fn => fn?.());
    };
  }, []);

  const subscribeToSessoes = async () => {
    const channel = supabase
      .channel('sessoes-coca-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sessoes_conferencia_coca',
        },
        async (payload) => {
          const { data: sessaoData } = await supabase
            .from('sessoes_conferencia_coca')
            .select('*, profiles:usuario_id(nome)')
            .eq('id', payload.new.id)
            .single();

          if (sessaoData) {
            setNewSessoes(prev => [sessaoData as any, ...prev]);
            
            toast({
              title: '🔔 Nova Conferência Coca!',
              description: `${(sessaoData as any).profiles?.nome || 'Conferente'} enviou uma nova conferência`,
            });

            fetchData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchData = async () => {
    try {
      // Buscar produtos do estoque com subgrupo COCA-COLA
      const { data: produtosData } = await supabase
        .from('estoque')
        .select('id, nome, estoque_atual, estoque_minimo, preco_custo, preco_venda')
        .ilike('subgrupo', 'COCA-COLA')
        .eq('ativo', true)
        .order('nome');

      if (produtosData) {
        // Mapear para a interface esperada
        const produtos: ProdutoCoca[] = produtosData.map(p => ({
          id: p.id,
          nome_produto: p.nome,
          quantidade_estoque: p.estoque_atual,
          estoque_minimo: p.estoque_minimo,
          preco_unitario: p.preco_venda || p.preco_custo || 0,
          unidades_por_fardo: 6 // Valor padrão
        }));
        setProdutos(produtos);
      }

      const hoje = new Date().toISOString().split('T')[0];
      const { count: countHoje } = await supabase
        .from('sessoes_conferencia_coca')
        .select('*', { count: 'exact', head: true })
        .eq('data_conferencia', hoje);

      const { count: countTotal } = await supabase
        .from('sessoes_conferencia_coca')
        .select('*', { count: 'exact', head: true });

      setConferenciasCount({
        hoje: countHoje || 0,
        total: countTotal || 0,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessoes = async () => {
    try {
      const { data, error } = await supabase
        .from('sessoes_conferencia_coca')
        .select('*')
        .order('criado_em', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching sessoes:', error);
        return;
      }

      if (data && data.length > 0) {
        // Fetch profile names separately
        const userIds = [...new Set(data.map(s => s.usuario_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, nome')
          .in('id', userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p.nome]) || []);
        
        const sessoesWithProfiles = data.map(s => ({
          ...s,
          profiles: { nome: profilesMap.get(s.usuario_id) || 'Conferente' }
        }));
        
        setSessoes(sessoesWithProfiles as any);
      } else {
        setSessoes([]);
      }
    } catch (error) {
      console.error('Error fetching sessoes:', error);
    }
  };

  const fetchItemsForSessao = async (sessaoId: string) => {
    setLoadingItems(prev => new Set(prev).add(sessaoId));
    try {
      const { data } = await supabase
        .from('conferencias_coca')
        .select(`
          id,
          quantidade_conferida,
          tipo_unidade,
          produto_coca_id
        `)
        .eq('sessao_id', sessaoId);

      if (data) {
        // Buscar nomes dos produtos do estoque
        const productIds = data.map(d => d.produto_coca_id);
        const { data: produtosData } = await supabase
          .from('estoque')
          .select('id, nome')
          .in('id', productIds);

        const produtosMap = new Map(produtosData?.map(p => [p.id, p.nome]) || []);
        
        const itemsWithNames = data.map(item => ({
          ...item,
          produtos_coca: { nome_produto: produtosMap.get(item.produto_coca_id) || 'Produto' }
        }));

        setSessoes(prev => prev.map(s => 
          s.id === sessaoId ? { ...s, items: itemsWithNames as any } : s
        ));
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoadingItems(prev => {
        const next = new Set(prev);
        next.delete(sessaoId);
        return next;
      });
    }
  };

  const toggleSessao = (sessaoId: string) => {
    const sessao = sessoes.find(s => s.id === sessaoId);
    if (!sessao?.items) {
      fetchItemsForSessao(sessaoId);
    }
    setExpandedSessoes(prev => {
      const next = new Set(prev);
      if (next.has(sessaoId)) {
        next.delete(sessaoId);
      } else {
        next.add(sessaoId);
      }
      return next;
    });
  };

  const handleAddProduto = async () => {
    if (!newProduto.nome_produto.trim()) {
      toast({ title: 'Informe o nome do produto', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('produtos_coca').insert([{
        nome_produto: newProduto.nome_produto,
        quantidade_estoque: Number(newProduto.quantidade_estoque) || 0,
        estoque_minimo: Number(newProduto.estoque_minimo) || 0,
        preco_unitario: Number(newProduto.preco_unitario) || 0,
        unidades_por_fardo: Number(newProduto.unidades_por_fardo) || 6,
      }]);
      if (error) throw error;

      toast({ title: 'Produto adicionado com sucesso!' });
      setDialogOpen(false);
      setNewProduto({ nome_produto: '', quantidade_estoque: '', estoque_minimo: '', preco_unitario: '', unidades_por_fardo: '6' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro ao adicionar produto', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduto = async (id: string) => {
    try {
      const { error } = await supabase.from('produtos_coca').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Produto removido!' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro ao remover produto', description: error.message, variant: 'destructive' });
    }
  };

  const handleEditPrice = (produto: ProdutoCoca) => {
    setEditingProduto(produto);
    setEditPrice(produto.preco_unitario.toString());
    setEditDialogOpen(true);
  };

  const handleSavePrice = async () => {
    if (!editingProduto) return;
    
    const newPrice = parseFloat(editPrice);
    if (isNaN(newPrice) || newPrice < 0) {
      toast({ title: 'Informe um preço válido', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('produtos_coca')
        .update({ preco_unitario: newPrice })
        .eq('id', editingProduto.id);
      
      if (error) throw error;
      
      toast({ title: 'Preço atualizado!' });
      setEditDialogOpen(false);
      setEditingProduto(null);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar preço', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditOrder = (sessao: SessaoConferencia) => {
    if (!sessao.items) return;
    
    // Create editable items based on conference data
    const items: PedidoItem[] = sessao.items.map(item => {
      // Find the product to get unidades_por_fardo
      const produto = produtos.find(p => p.id === item.produto_coca_id);
      return {
        produtoId: item.produto_coca_id,
        nome: item.produtos_coca?.nome_produto || 'Produto',
        quantidade: item.quantidade_conferida === 0 ? 0 : item.quantidade_conferida,
        unidade: item.tipo_unidade === 'fardo' ? 'fd' : 'un',
        quantidadeConferida: item.quantidade_conferida,
        unidadesPorFardo: produto?.unidades_por_fardo || 6,
      };
    });

    setPedidoItems(items);
    setSelectedSessao(sessao);
    setViewMode('editar_pedido');
  };

  const updatePedidoQuantidade = (produtoId: string, quantidade: number) => {
    setPedidoItems(prev => prev.map(item => 
      item.produtoId === produtoId ? { ...item, quantidade: Math.max(0, quantidade) } : item
    ));
  };

  const incrementPedido = (produtoId: string) => {
    setPedidoItems(prev => prev.map(item => 
      item.produtoId === produtoId ? { ...item, quantidade: item.quantidade + 1 } : item
    ));
  };

  const decrementPedido = (produtoId: string) => {
    setPedidoItems(prev => prev.map(item => 
      item.produtoId === produtoId ? { ...item, quantidade: Math.max(0, item.quantidade - 1) } : item
    ));
  };

  const handleConfirmOrder = async () => {
    const items: ReceiptItem[] = pedidoItems.map(item => ({
      nome: item.nome,
      quantidade: item.quantidade,
      unidade: item.unidade,
      unidadesPorFardo: item.unidadesPorFardo,
      semEstoque: item.quantidadeConferida === 0,
    }));

    setReceiptItems(items);
    setReceiptNumber(selectedSessao?.numero || 0);
    setViewMode('pedido');
  };

  const handleSavePedido = async () => {
    if (!selectedSessao) return;
    
    setSavingPedido(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      const totalItens = pedidoItems.filter(item => item.quantidade > 0).length;
      const totalUnidades = pedidoItems.reduce((acc, item) => acc + item.quantidade, 0);

      // Create the order
      const { data: pedidoData, error: pedidoError } = await supabase
        .from('pedidos_coca')
        .insert({
          usuario_id: user.user.id,
          sessao_id: selectedSessao.id,
          total_itens: totalItens,
          total_unidades: totalUnidades,
        })
        .select()
        .single();

      if (pedidoError) throw pedidoError;

      // Create order items
      const itensToInsert = pedidoItems
        .filter(item => item.quantidade > 0)
        .map(item => ({
          pedido_id: pedidoData.id,
          produto_coca_id: item.produtoId,
          quantidade: item.quantidade,
        }));

      if (itensToInsert.length > 0) {
        const { error: itensError } = await supabase
          .from('itens_pedido_coca')
          .insert(itensToInsert);

        if (itensError) throw itensError;
      }

      toast({ title: 'Pedido salvo com sucesso!' });
      fetchPedidosCoca();
    } catch (error: any) {
      toast({ title: 'Erro ao salvar pedido', description: error.message, variant: 'destructive' });
    } finally {
      setSavingPedido(false);
    }
  };

  const fetchPedidosCoca = async () => {
    try {
      const { data, error } = await supabase
        .from('pedidos_coca')
        .select('*')
        .order('criado_em', { ascending: false })
        .limit(50);

      if (error) throw error;
      setPedidosCoca(data || []);
    } catch (error) {
      console.error('Error fetching pedidos:', error);
    }
  };

  const handleDeleteSessao = async (sessaoId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conferência? Esta ação não pode ser desfeita.')) {
      return;
    }

    setDeletingSessao(sessaoId);
    try {
      // First delete the conference items
      const { error: itemsError } = await supabase
        .from('conferencias_coca')
        .delete()
        .eq('sessao_id', sessaoId);

      if (itemsError) throw itemsError;

      // Then delete the session
      const { error: sessaoError } = await supabase
        .from('sessoes_conferencia_coca')
        .delete()
        .eq('id', sessaoId);

      if (sessaoError) throw sessaoError;

      toast({ title: 'Conferência excluída com sucesso!' });
      setSessoes(prev => prev.filter(s => s.id !== sessaoId));
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro ao excluir conferência', description: error.message, variant: 'destructive' });
    } finally {
      setDeletingSessao(null);
    }
  };

  const handleDeletePedidoCoca = async (pedidoId: string) => {
    if (!confirm('Tem certeza que deseja excluir este pedido?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('pedidos_coca')
        .delete()
        .eq('id', pedidoId);

      if (error) throw error;

      toast({ title: 'Pedido excluído!' });
      fetchPedidosCoca();
    } catch (error: any) {
      toast({ title: 'Erro ao excluir pedido', description: error.message, variant: 'destructive' });
    }
  };

  const handlePrint = () => {
    if (!receiptRef.current) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: 'Erro', description: 'Não foi possível abrir a janela de impressão.', variant: 'destructive' });
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pedido Coca-Cola</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { margin: 0; padding: 0; font-family: 'Courier New', Courier, monospace; background: white; }
            .receipt { width: 80mm; padding: 5mm; box-sizing: border-box; }
            * { color: #000000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          </style>
        </head>
        <body>
          <div class="receipt">${receiptRef.current.innerHTML}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleSaveAsImage = async () => {
    if (!visualReceiptRef.current) return;

    try {
      const canvas = await html2canvas(visualReceiptRef.current, {
        backgroundColor: '#ffffff',
        scale: 3,
        useCORS: true,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `pedido-coca-${String(receiptNumber).padStart(6, '0')}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 1.0);
      link.click();

      toast({ title: 'Imagem salva!' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível salvar a imagem', variant: 'destructive' });
    }
  };

  const handleShareWhatsApp = async () => {
    if (!visualReceiptRef.current) return;

    try {
      const canvas = await html2canvas(visualReceiptRef.current, {
        backgroundColor: '#ffffff',
        scale: 3,
        useCORS: true,
        logging: false,
      });

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 1.0);
      });

      const file = new File([blob], `pedido-coca-${String(receiptNumber).padStart(6, '0')}.jpg`, { type: 'image/jpeg' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Pedido Coca-Cola',
          text: 'Pedido de produtos Coca-Cola',
        });
      } else {
        const link = document.createElement('a');
        link.download = `pedido-coca-${String(receiptNumber).padStart(6, '0')}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 1.0);
        link.click();
        toast({ title: 'Imagem salva!', description: 'Abra o WhatsApp e envie manualmente' });
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        toast({ title: 'Erro', description: 'Não foi possível compartilhar', variant: 'destructive' });
      }
    }
  };

  const generateTextReport = () => {
    const fardos = receiptItems.filter(item => item.unidade === 'fd' && item.quantidade > 0 && !item.semEstoque);
    const unidades = receiptItems.filter(item => item.unidade !== 'fd' && item.quantidade > 0 && !item.semEstoque);
    const semEstoque = receiptItems.filter(item => item.semEstoque || item.quantidade === 0);
    
    let text = `📦 *ESTOQUE COCA-COLA*\n`;
    text += `Nº ${String(receiptNumber).padStart(6, '0')} - ${format(new Date(), 'dd/MM/yyyy HH:mm')}\n\n`;
    
    if (fardos.length > 0) {
      text += `🟢 *FARDOS* (${fardos.length})\n`;
      fardos.forEach(item => {
        text += `• ${item.nome}: ${item.quantidade} fd\n`;
      });
      text += '\n';
    }
    
    if (unidades.length > 0) {
      text += `🟡 *UNIDADES* (${unidades.length})\n`;
      unidades.forEach(item => {
        text += `• ${item.nome}: ${item.quantidade} un\n`;
      });
      text += '\n';
    }
    
    if (semEstoque.length > 0) {
      text += `🔴 *SEM ESTOQUE* (${semEstoque.length})\n`;
      semEstoque.forEach(item => {
        text += `• ${item.nome}\n`;
      });
      text += '\n';
    }
    
    if (userName) {
      text += `Por: ${userName}\n`;
    }
    
    return text;
  };

  const handleCopyText = async () => {
    const text = generateTextReport();
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Texto copiado!', description: 'Cole no WhatsApp para enviar' });
    } catch (error) {
      toast({ title: 'Erro ao copiar', variant: 'destructive' });
    }
  };

  const handleShowHistorico = () => {
    fetchSessoes();
    setViewMode('historico');
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

  if (userRole !== 'administrador') {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Acesso restrito a administradores</p>
        </div>
      </MainLayout>
    );
  }

  // View: Pedido gerado
  if (viewMode === 'pedido') {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <ShoppingCart className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">Comprovante Gerado</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Baseado na conferência #{String(receiptNumber).padStart(6, '0')}
              </p>
            </div>
          </div>

          {/* Seletor de tipo de comprovante */}
          <div className="flex justify-center gap-3">
            <Button
              variant={receiptType === 'fornecedor' ? 'default' : 'outline'}
              onClick={() => setReceiptType('fornecedor')}
              className={receiptType === 'fornecedor' ? 'bg-blue-600 hover:bg-blue-700' : ''}
            >
              📋 Para Fornecedor
            </Button>
            <Button
              variant={receiptType === 'estoque' ? 'default' : 'outline'}
              onClick={() => setReceiptType('estoque')}
              className={receiptType === 'estoque' ? 'bg-orange-600 hover:bg-orange-700' : ''}
            >
              📦 Controle Interno
            </Button>
          </div>

          {/* Comprovante Visual para WhatsApp/JPEG */}
          <div className="flex justify-center">
            {receiptType === 'fornecedor' ? (
              <SupplierReceipt
                ref={visualReceiptRef}
                items={receiptItems}
                numero={receiptNumber}
                operador={userName || undefined}
              />
            ) : (
              <StockReceipt
                ref={visualReceiptRef}
                items={receiptItems}
                numero={receiptNumber}
                operador={userName || undefined}
              />
            )}
          </div>

          {/* Comprovante Térmico (escondido, só para impressão) */}
          <div className="hidden">
            <ThermalReceipt
              ref={receiptRef}
              items={receiptItems}
              numero={receiptNumber}
              tipo="PEDIDO COCA-COLA"
              operador={userName || undefined}
            />
          </div>

          {receiptType === 'estoque' ? (
            <div className="flex justify-center max-w-md mx-auto">
              <Button onClick={handleCopyText} size="lg" className="w-full bg-green-600 hover:bg-green-700">
                <Copy className="w-5 h-5 mr-2" />
                Copiar Texto (WhatsApp)
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
              <Button onClick={handleShareWhatsApp} size="lg" className="flex-1 bg-green-600 hover:bg-green-700">
                <Share2 className="w-5 h-5 mr-2" />
                WhatsApp
              </Button>
              <Button onClick={handlePrint} size="lg" className="flex-1">
                <Printer className="w-5 h-5 mr-2" />
                Imprimir
              </Button>
              <Button onClick={handleSaveAsImage} variant="secondary" size="lg" className="flex-1">
                <Image className="w-5 h-5 mr-2" />
                Salvar JPG
              </Button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
            <Button 
              onClick={handleSavePedido} 
              size="lg" 
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={savingPedido}
            >
              {savingPedido ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <FileText className="w-5 h-5 mr-2" />}
              Salvar Pedido
            </Button>
            <Button onClick={() => setViewMode('historico')} variant="outline" size="lg" className="flex-1">
              Voltar ao Histórico
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // View: Editar Pedido
  if (viewMode === 'editar_pedido') {
    const totalItens = pedidoItems.filter(item => item.quantidade > 0).length;
    const totalQuantidade = pedidoItems.reduce((acc, item) => acc + item.quantidade, 0);

    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Editar Pedido</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Conferência #{selectedSessao?.numero ? String(selectedSessao.numero).padStart(6, '0') : ''} - Ajuste as quantidades conforme necessário
              </p>
            </div>
            <Button variant="outline" onClick={() => setViewMode('historico')}>
              Cancelar
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista de produtos para edição */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Itens da Conferência
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-bold">Produto</TableHead>
                        <TableHead className="font-bold text-center">Conferido</TableHead>
                        <TableHead className="font-bold text-right">Qtd. a Pedir</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pedidoItems.map((item) => (
                        <TableRow key={item.produtoId} className={item.quantidade > 0 ? 'bg-green-50 dark:bg-green-900/20' : 'hover:bg-muted/30'}>
                          <TableCell className="font-semibold">{item.nome}</TableCell>
                          <TableCell className="text-center">
                            {item.quantidadeConferida === 0 ? (
                              <Badge variant="destructive">SEM ESTOQUE</Badge>
                            ) : (
                              <Badge variant="outline" className="text-base font-bold px-3 py-1 bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-300">
                                {item.quantidadeConferida} {item.unidade}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-9 w-9" 
                                onClick={() => decrementPedido(item.produtoId)} 
                                disabled={item.quantidade === 0}
                              >
                                <span className="text-lg">-</span>
                              </Button>
                              <Input 
                                type="number" 
                                min="0" 
                                value={item.quantidade || ''} 
                                onChange={(e) => updatePedidoQuantidade(item.produtoId, Number(e.target.value))} 
                                className="w-20 h-9 text-center text-lg font-bold" 
                                placeholder="0" 
                              />
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-9 w-9" 
                                onClick={() => incrementPedido(item.produtoId)}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Resumo do pedido */}
            <div>
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Resumo do Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {totalItens === 0 ? (
                    <p className="text-center text-muted-foreground py-4">Nenhum item adicionado ao pedido</p>
                  ) : (
                    <>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {pedidoItems.filter(item => item.quantidade > 0).map((item) => (
                          <div key={item.produtoId} className="flex justify-between items-center text-sm">
                            <span className="truncate">{item.nome}</span>
                            <Badge variant="secondary" className="ml-2">{item.quantidade} {item.unidade}</Badge>
                          </div>
                        ))}
                      </div>
                      <div className="border-t pt-4 space-y-2">
                        <div className="flex justify-between font-medium">
                          <span>Total de Itens:</span>
                          <span>{totalItens}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg">
                          <span>Quantidade Total:</span>
                          <span>{totalQuantidade}</span>
                        </div>
                      </div>
                    </>
                  )}
                  
                  <Button 
                    onClick={handleConfirmOrder} 
                    className="w-full bg-green-600 hover:bg-green-700" 
                    size="lg"
                    disabled={totalItens === 0}
                  >
                    <Printer className="w-5 h-5 mr-2" />
                    Gerar Comprovante
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header clicável - estilo moderno */}
        <button 
          onClick={() => setViewMode('resumo')}
          className="w-full text-center p-4 rounded-xl bg-gradient-to-br from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center justify-center gap-3">
            🥤 COCA-COLA
          </h1>
          <p className="text-white/80 text-sm mt-1">COMERCIAL COSTA</p>
        </button>

        {/* New conferencias notification */}
        {newSessoes.length > 0 && (
          <Card className="border-rose-500/30 bg-rose-500/5">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-rose-600 animate-bounce" />
                <span className="font-medium uppercase">
                  {newSessoes.length} NOVA(S) CONFERÊNCIA(S) RECEBIDA(S)
                </span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setNewSessoes([]);
                    handleShowHistorico();
                  }}
                  className="uppercase"
                >
                  VER E GERAR PEDIDO
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setNewSessoes([])}
                  className="uppercase"
                >
                  LIMPAR
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Botões de navegação - estilo moderno com gradientes */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Button 
            onClick={() => setViewMode('resumo')}
            className={`py-3 rounded-xl font-semibold transition-all duration-200 ${viewMode === 'resumo' ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white ring-2 ring-white/40 shadow-lg scale-[1.02]' : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white opacity-80 hover:opacity-100'}`}
          >
            <FileText className="w-4 h-4 mr-2" />
            RESUMO
          </Button>
          <Button 
            onClick={handleShowHistorico}
            className={`py-3 rounded-xl font-semibold transition-all duration-200 ${viewMode === 'historico' ? 'bg-gradient-to-br from-green-500 to-green-600 text-white ring-2 ring-white/40 shadow-lg scale-[1.02]' : 'bg-gradient-to-br from-green-500 to-green-600 text-white opacity-80 hover:opacity-100'}`}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            CONFERÊNCIAS
          </Button>
          <Button 
            onClick={() => setViewMode('produtos')}
            className={`py-3 rounded-xl font-semibold transition-all duration-200 ${viewMode === 'produtos' ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white ring-2 ring-white/40 shadow-lg scale-[1.02]' : 'bg-gradient-to-br from-orange-500 to-orange-600 text-white opacity-80 hover:opacity-100'}`}
          >
            <Package className="w-4 h-4 mr-2" />
            PRODUTOS
          </Button>
          <Button 
            onClick={() => {
              fetchPedidosCoca();
              setViewMode('historico_pedidos');
            }}
            className={`py-3 rounded-xl font-semibold transition-all duration-200 ${viewMode === 'historico_pedidos' ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white ring-2 ring-white/40 shadow-lg scale-[1.02]' : 'bg-gradient-to-br from-purple-500 to-purple-600 text-white opacity-80 hover:opacity-100'}`}
          >
            <History className="w-4 h-4 mr-2" />
            PEDIDOS
          </Button>
        </div>

        {/* View: Resumo */}
        {viewMode === 'resumo' && (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-primary/10">
                      <Package className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Produtos</p>
                      <p className="text-2xl font-bold">{produtos.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                      <FileText className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Conferências Hoje</p>
                      <p className="text-2xl font-bold">{conferenciasCount.hoje}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-destructive/10">
                      <Package className="w-6 h-6 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Estoque Baixo</p>
                      <p className="text-2xl font-bold">{produtos.filter(p => p.quantidade_estoque <= p.estoque_minimo).length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick actions */}
            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button onClick={handleShowHistorico} variant="outline" className="justify-start h-auto py-4">
                    <ShoppingCart className="w-5 h-5 mr-3 text-green-600" />
                    <div className="text-left">
                      <p className="font-medium">Ver Conferências / Gerar Pedido</p>
                      <p className="text-xs text-muted-foreground">{conferenciasCount.total} conferências registradas</p>
                    </div>
                  </Button>
                  <Button onClick={() => setViewMode('produtos')} variant="outline" className="justify-start h-auto py-4">
                    <Package className="w-5 h-5 mr-3 text-orange-600" />
                    <div className="text-left">
                      <p className="font-medium">Gerenciar Produtos</p>
                      <p className="text-xs text-muted-foreground">{produtos.length} produtos cadastrados</p>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* View: Histórico de Conferências */}
        {viewMode === 'historico' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Conferências dos Conferentes
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Clique em uma conferência para ver os itens e gerar o pedido baseado nos dados do conferente
                </p>
              </CardHeader>
              <CardContent>
                {sessoes.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma conferência registrada</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sessoes.map((sessao) => (
                      <Collapsible key={sessao.id} open={expandedSessoes.has(sessao.id)}>
                        <Card className="border">
                          <CollapsibleTrigger asChild>
                            <CardHeader 
                              className="cursor-pointer hover:bg-muted/50 transition-colors py-4"
                              onClick={() => toggleSessao(sessao.id)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {expandedSessoes.has(sessao.id) ? (
                                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                  )}
                                  <div>
                                    <CardTitle className="text-base">
                                      Conferência #{sessao.numero}
                                    </CardTitle>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        {format(new Date(sessao.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <User className="w-4 h-4" />
                                        {sessao.profiles?.nome || 'Conferente'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSessao(sessao.id);
                                  }}
                                  disabled={deletingSessao === sessao.id}
                                >
                                  {deletingSessao === sessao.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent className="pt-0">
                              {loadingItems.has(sessao.id) ? (
                                <div className="flex justify-center py-4">
                                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                </div>
                              ) : sessao.items ? (
                                <div className="space-y-4">
                                  <div className="divide-y divide-border">
                                    {sessao.items.map((item) => (
                                      <div key={item.id} className="flex justify-between py-2">
                                        <span>{item.produtos_coca?.nome_produto}</span>
                                        <span className={`font-medium ${item.quantidade_conferida === 0 ? 'text-destructive' : ''}`}>
                                          {item.quantidade_conferida === 0 ? 'SEM ESTOQUE' : `${item.quantidade_conferida} ${item.tipo_unidade === 'fardo' ? 'fd' : 'un'}`}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                  <Button 
                                    onClick={() => handleEditOrder(sessao)}
                                    className="w-full bg-green-600 hover:bg-green-700"
                                  >
                                    <ShoppingCart className="w-4 h-4 mr-2" />
                                    Gerar Pedido Baseado Nesta Conferência
                                  </Button>
                                </div>
                              ) : null}
                            </CardContent>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* View: Produtos */}
        {viewMode === 'produtos' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Produtos Cadastrados</CardTitle>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 mr-2" />Adicionar Produto</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Produto Coca-Cola</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nome do Produto</Label>
                      <Input value={newProduto.nome_produto} onChange={(e) => setNewProduto({ ...newProduto, nome_produto: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Estoque Atual</Label>
                        <Input type="number" value={newProduto.quantidade_estoque} onChange={(e) => setNewProduto({ ...newProduto, quantidade_estoque: e.target.value })} placeholder="0" />
                      </div>
                      <div>
                        <Label>Estoque Mínimo</Label>
                        <Input type="number" value={newProduto.estoque_minimo} onChange={(e) => setNewProduto({ ...newProduto, estoque_minimo: e.target.value })} placeholder="0" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Preço Unitário (R$)</Label>
                        <Input type="number" step="0.01" value={newProduto.preco_unitario} onChange={(e) => setNewProduto({ ...newProduto, preco_unitario: e.target.value })} placeholder="0.00" />
                      </div>
                      <div>
                        <Label>Unidades por Fardo</Label>
                        <Input type="number" value={newProduto.unidades_por_fardo} onChange={(e) => setNewProduto({ ...newProduto, unidades_por_fardo: e.target.value })} placeholder="6" />
                      </div>
                    </div>
                    <Button onClick={handleAddProduto} disabled={saving} className="w-full">
                      {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Adicionar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                    <TableHead className="text-right">Un/Fardo</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {produtos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Nenhum produto cadastrado</TableCell>
                    </TableRow>
                  ) : (
                    produtos.map(produto => (
                      <TableRow key={produto.id} className={produto.quantidade_estoque <= produto.estoque_minimo ? 'bg-destructive/5' : ''}>
                        <TableCell className="font-medium">{produto.nome_produto}</TableCell>
                        <TableCell className="text-right">{produto.quantidade_estoque}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="font-mono">
                            {produto.unidades_por_fardo}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto py-1 px-2 font-medium hover:bg-primary/10"
                            onClick={() => handleEditPrice(produto)}
                          >
                            R$ {produto.preco_unitario.toFixed(2)}
                            <Pencil className="w-3 h-3 ml-1 opacity-50" />
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteProduto(produto.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>

            {/* Edit Price Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Preço de Custo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Produto</Label>
                    <p className="font-medium text-lg">{editingProduto?.nome_produto}</p>
                  </div>
                  <div>
                    <Label>Novo Preço (R$)</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      placeholder="0.00"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      ⚠️ Esta alteração não afeta os valores já contabilizados em lançamentos anteriores.
                    </p>
                  </div>
                  <Button onClick={handleSavePrice} disabled={saving} className="w-full">
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Salvar Preço
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </Card>
        )}

        {/* View: Histórico de Pedidos */}
        {viewMode === 'historico_pedidos' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Pedidos Salvos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pedidosCoca.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum pedido salvo</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº Pedido</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-center">Itens</TableHead>
                      <TableHead className="text-center">Unidades</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pedidosCoca.map(pedido => (
                      <TableRow key={pedido.id}>
                        <TableCell className="font-medium">#{String(pedido.numero).padStart(6, '0')}</TableCell>
                        <TableCell>{format(new Date(pedido.data_pedido), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</TableCell>
                        <TableCell className="text-center">{pedido.total_itens}</TableCell>
                        <TableCell className="text-center">{pedido.total_unidades}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeletePedidoCoca(pedido.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default CocaAdmin;
