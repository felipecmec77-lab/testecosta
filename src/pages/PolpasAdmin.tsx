import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Plus, Cherry, ClipboardList, BarChart3, Pencil, Trash2, Bell, FileDown, ShoppingCart, Minus, FileText, Printer, History, Package, Image, Save, Receipt, Eye, Calendar, Share2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';

interface PedidoItem {
  polpaId: string;
  quantidade: number;
}

interface Polpa {
  id: string;
  nome_polpa: string;
  quantidade_estoque: number;
  estoque_minimo: number;
  preco_unitario: number;
  criado_em: string;
}

interface Conferencia {
  id: string;
  polpa_id: string;
  usuario_id: string;
  quantidade_conferida: number;
  observacao: string | null;
  data_conferencia: string;
  criado_em: string;
  polpas?: {
    nome_polpa: string;
  };
  profiles?: {
    nome: string;
  };
}

interface PedidoSalvo {
  id: string;
  numero: number;
  data_pedido: string;
  total_itens: number;
  total_unidades: number;
  observacao: string | null;
  itens?: {
    id: string;
    quantidade: number;
    polpa_id: string;
    polpas?: {
      nome_polpa: string;
    };
  }[];
}

type ViewMode = 'resumo' | 'pedido' | 'produtos' | 'historico' | 'pedidos_salvos';

const PolpasAdmin = () => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('resumo');
  const [polpas, setPolpas] = useState<Polpa[]>([]);
  const [conferencias, setConferencias] = useState<Conferencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPolpa, setSelectedPolpa] = useState<Polpa | null>(null);
  const [newPolpa, setNewPolpa] = useState({
    nome_polpa: '',
    quantidade_estoque: '',
    preco_unitario: '',
  });
  const [editPolpa, setEditPolpa] = useState({
    nome_polpa: '',
    quantidade_estoque: '',
    preco_unitario: '',
  });
  const [newConferencias, setNewConferencias] = useState<Conferencia[]>([]);
  const [pedidoItems, setPedidoItems] = useState<Map<string, PedidoItem>>(new Map());
  const [pedidosSalvos, setPedidosSalvos] = useState<PedidoSalvo[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<PedidoSalvo | null>(null);
  const [pedidoDetailOpen, setPedidoDetailOpen] = useState(false);

  const pedidoReceiptRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    fetchPedidosSalvos();
    subscribeToConferencias();
  }, []);

  const subscribeToConferencias = () => {
    const channel = supabase
      .channel('conferencias-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conferencias_polpas',
        },
        async (payload) => {
          const { data: confData } = await supabase
            .from('conferencias_polpas')
            .select('*, polpas(nome_polpa)')
            .eq('id', payload.new.id)
            .single();

          if (confData) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('nome')
              .eq('id', confData.usuario_id)
              .single();

            const newConf = {
              ...confData,
              profiles: profileData,
            };

            setNewConferencias(prev => [newConf, ...prev]);
            
            toast({
              title: '🔔 Nova Conferência!',
              description: `${profileData?.nome || 'Operador'} conferiu ${confData.quantidade_conferida} unidades de ${confData.polpas?.nome_polpa}`,
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
      // Buscar produtos do estoque com subgrupo POLPA DE FRUTA
      const { data: polpasData } = await supabase
        .from('estoque')
        .select('id, nome, estoque_atual, estoque_minimo, preco_custo, preco_venda, criado_em')
        .ilike('subgrupo', 'POLPA DE FRUTA')
        .eq('ativo', true)
        .order('nome');

      if (polpasData) {
        // Mapear para a interface esperada
        const polpas: Polpa[] = polpasData.map(p => ({
          id: p.id,
          nome_polpa: p.nome,
          quantidade_estoque: p.estoque_atual,
          estoque_minimo: p.estoque_minimo,
          preco_unitario: p.preco_venda || p.preco_custo || 0,
          criado_em: p.criado_em || new Date().toISOString()
        }));
        setPolpas(polpas);
      }

      const { data: conferenciasData } = await supabase
        .from('conferencias_polpas')
        .select(`*, polpas:polpa_id(nome_polpa)`)
        .order('criado_em', { ascending: false })
        .limit(100);

      if (conferenciasData) {
        const userIds = [...new Set(conferenciasData.map(c => c.usuario_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, nome')
          .in('id', userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        
        // Buscar nomes dos produtos do estoque
        const polpaIds = [...new Set(conferenciasData.map(c => c.polpa_id))];
        const { data: produtosData } = await supabase
          .from('estoque')
          .select('id, nome')
          .in('id', polpaIds);

        const polpasMap = new Map(produtosData?.map(p => [p.id, p.nome]) || []);
        
        const conferenciasWithProfiles = conferenciasData.map(c => ({
          ...c,
          profiles: profilesMap.get(c.usuario_id),
          polpas: { nome_polpa: polpasMap.get(c.polpa_id) || c.polpas?.nome_polpa || 'Produto' }
        }));
        
        setConferencias(conferenciasWithProfiles);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPedidosSalvos = async () => {
    setLoadingPedidos(true);
    try {
      const { data: pedidosData } = await supabase
        .from('pedidos_polpas')
        .select('*')
        .order('data_pedido', { ascending: false })
        .limit(50);

      if (pedidosData) {
        const pedidosWithItens = await Promise.all(
          pedidosData.map(async (pedido) => {
            const { data: itensData } = await supabase
              .from('itens_pedido_polpas')
              .select('*, polpas(nome_polpa)')
              .eq('pedido_id', pedido.id);
            return { ...pedido, itens: itensData || [] };
          })
        );
        setPedidosSalvos(pedidosWithItens as PedidoSalvo[]);
      }
    } catch (error) {
      console.error('Error fetching pedidos:', error);
    } finally {
      setLoadingPedidos(false);
    }
  };

  const handleAddPolpa = async () => {
    if (!newPolpa.nome_polpa) {
      toast({ title: 'Erro', description: 'Preencha o nome da polpa', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('polpas').insert([{
      nome_polpa: newPolpa.nome_polpa,
      quantidade_estoque: newPolpa.quantidade_estoque ? Number(newPolpa.quantidade_estoque) : 0,
      estoque_minimo: 0,
      preco_unitario: newPolpa.preco_unitario ? Number(newPolpa.preco_unitario) : 0,
    }]);

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao cadastrar polpa', variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Polpa cadastrada com sucesso' });
      setDialogOpen(false);
      setNewPolpa({ nome_polpa: '', quantidade_estoque: '', preco_unitario: '' });
      fetchData();
    }
  };

  const handleEditPolpa = async () => {
    if (!selectedPolpa) return;

    const { error } = await supabase
      .from('polpas')
      .update({
        nome_polpa: editPolpa.nome_polpa,
        quantidade_estoque: editPolpa.quantidade_estoque ? Number(editPolpa.quantidade_estoque) : 0,
        preco_unitario: editPolpa.preco_unitario ? Number(editPolpa.preco_unitario) : 0,
      })
      .eq('id', selectedPolpa.id);

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao editar polpa', variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Polpa atualizada com sucesso' });
      setEditDialogOpen(false);
      setSelectedPolpa(null);
      fetchData();
    }
  };

  const handleDeletePolpa = async () => {
    if (!selectedPolpa) return;

    const { error } = await supabase.from('polpas').delete().eq('id', selectedPolpa.id);

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao excluir polpa. Verifique se não há conferências associadas.', variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Polpa excluída com sucesso' });
      setDeleteDialogOpen(false);
      setSelectedPolpa(null);
      fetchData();
    }
  };

  const openEditDialog = (polpa: Polpa) => {
    setSelectedPolpa(polpa);
    setEditPolpa({
      nome_polpa: polpa.nome_polpa,
      quantidade_estoque: String(polpa.quantidade_estoque),
      preco_unitario: String(polpa.preco_unitario),
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (polpa: Polpa) => {
    setSelectedPolpa(polpa);
    setDeleteDialogOpen(true);
  };

  const latestConferenciasByPolpa = polpas.map(polpa => {
    const conferenciasPolpa = conferencias.filter(c => c.polpa_id === polpa.id);
    const latest = conferenciasPolpa[0];
    return { polpa, latestConferencia: latest };
  });

  const totalPolpas = polpas.length;
  const polpasComConferencia = latestConferenciasByPolpa.filter(p => p.latestConferencia).length;
  const conferenciasHoje = conferencias.filter(c => c.data_conferencia === format(new Date(), 'yyyy-MM-dd')).length;

  // Pedido functions
  const updatePedidoQuantidade = (polpaId: string, quantidade: number) => {
    if (quantidade <= 0) {
      setPedidoItems(prev => { const newMap = new Map(prev); newMap.delete(polpaId); return newMap; });
    } else {
      setPedidoItems(prev => { const newMap = new Map(prev); newMap.set(polpaId, { polpaId, quantidade }); return newMap; });
    }
  };

  const incrementPedido = (polpaId: string) => {
    const current = pedidoItems.get(polpaId)?.quantidade || 0;
    updatePedidoQuantidade(polpaId, current + 1);
  };

  const decrementPedido = (polpaId: string) => {
    const current = pedidoItems.get(polpaId)?.quantidade || 0;
    if (current > 0) updatePedidoQuantidade(polpaId, current - 1);
  };

  const clearPedido = () => setPedidoItems(new Map());

  const generatePedidoContent = () => {
    const items = Array.from(pedidoItems.values()).map(item => {
      const polpa = polpas.find(p => p.id === item.polpaId);
      return { polpa, quantidade: item.quantidade };
    }).filter(item => item.polpa);

    const dataAtual = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    const numeroRecibo = Math.floor(Date.now() / 1000) % 1000000;
    const totalItens = items.length;
    const totalQuantidade = items.reduce((acc, item) => acc + item.quantidade, 0);

    return { items, dataAtual, numeroRecibo, totalItens, totalQuantidade };
  };

  const generatePedidoPDF = () => {
    if (pedidoItems.size === 0) {
      toast({ title: 'Atenção', description: 'Adicione pelo menos uma polpa ao pedido', variant: 'destructive' });
      return;
    }

    const { items, dataAtual, numeroRecibo, totalItens, totalQuantidade } = generatePedidoContent();

    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (!printWindow) {
      toast({ title: 'Erro', description: 'Não foi possível abrir a janela de impressão. Verifique se pop-ups estão permitidos.', variant: 'destructive' });
      return;
    }

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Pedido de Polpas</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', Courier, monospace; font-size: 11px; line-height: 1.4; width: 80mm; padding: 5mm; background: white; color: #000000; }
          .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .header h1 { font-size: 16px; font-weight: bold; letter-spacing: 2px; color: #000000; }
          .header .divider { font-size: 10px; margin: 5px 0; color: #000000; }
          .header .tipo { font-size: 14px; font-weight: bold; margin-top: 8px; color: #000000; }
          .header .numero { font-size: 10px; color: #000000; }
          .info { border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; font-size: 11px; color: #000000; }
          .info-row { display: flex; justify-content: space-between; }
          .items-header { display: flex; justify-content: space-between; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 5px; font-size: 11px; color: #000000; }
          .items-header .item-name { flex: 1; }
          .items-header .item-qty { width: 50px; text-align: right; }
          .item-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 11px; color: #000000; }
          .item-row .item-name { flex: 1; text-transform: uppercase; padding-right: 10px; }
          .item-row .item-qty { width: 50px; text-align: right; font-weight: bold; }
          .item-separator { text-align: center; font-size: 9px; color: #666; padding: 3px 0; }
          .items { border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .totals { border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 15px; font-weight: bold; color: #000000; }
          .totals-row { display: flex; justify-content: space-between; }
          .footer { text-align: center; padding-top: 10px; color: #000000; }
          .footer .divider { font-size: 10px; }
          .footer .brand { font-size: 14px; font-weight: bold; letter-spacing: 2px; margin: 8px 0; }
          .footer .slogan { font-size: 10px; font-style: italic; line-height: 1.3; }
          .footer .end { font-size: 10px; margin-top: 8px; }
          .footer .thanks { font-size: 9px; color: #333; margin-top: 10px; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>COMERCIAL COSTA</h1>
          <div class="divider">================================</div>
          <div class="tipo">PEDIDO DE POLPAS</div>
          <div class="numero">Nº ${String(numeroRecibo).padStart(6, '0')}</div>
        </div>
        <div class="info">
          <div class="info-row"><span>Data:</span><span>${dataAtual}</span></div>
        </div>
        <div class="items-header"><span class="item-name">ITEM</span><span class="item-qty">QTD</span></div>
        <div class="items">
          ${items.map(item => `<div class="item-separator">- - - - - - - - - - - - - - - -</div><div class="item-row"><span class="item-name">${item.polpa!.nome_polpa}</span><span class="item-qty">${item.quantidade}</span></div>`).join('')}
        </div>
        <div class="totals">
          <div class="totals-row"><span>TOTAL DE ITENS:</span><span>${totalItens}</span></div>
          <div class="totals-row"><span>QTD. TOTAL:</span><span>${totalQuantidade}</span></div>
        </div>
        <div class="footer">
          <div class="divider">================================</div>
          <div class="brand">COMERCIAL COSTA</div>
          <div class="slogan">PREÇO BAIXO DO JEITO QUE VOCÊ GOSTA!</div>
          <div class="end">********************************</div>
          <div class="thanks">Obrigado pela preferência!</div>
        </div>
        <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };</script>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    toast({ title: 'Pedido gerado!', description: 'O comprovante foi enviado para impressão' });
  };

  const generatePedidoJPEG = async () => {
    if (pedidoItems.size === 0) {
      toast({ title: 'Atenção', description: 'Adicione pelo menos uma polpa ao pedido', variant: 'destructive' });
      return;
    }

    const { items, dataAtual, numeroRecibo, totalItens, totalQuantidade } = generatePedidoContent();

    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 350px; background: white; padding: 25px; font-family: Courier New, monospace;';
    tempDiv.innerHTML = `
      <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 15px; margin-bottom: 15px;">
        <h1 style="font-size: 24px; font-weight: bold; color: #000; margin: 0;">COMERCIAL COSTA</h1>
        <p style="font-size: 14px; color: #000; margin: 8px 0;">================================</p>
        <p style="font-size: 20px; font-weight: bold; color: #000; margin: 0;">PEDIDO DE POLPAS</p>
        <p style="font-size: 14px; color: #000; margin: 4px 0;">Nº ${String(numeroRecibo).padStart(6, '0')}</p>
      </div>
      <div style="border-bottom: 2px dashed #000; padding-bottom: 15px; margin-bottom: 15px;">
        <p style="font-size: 16px; color: #000; margin: 0;"><strong>Data:</strong> ${dataAtual}</p>
      </div>
      <div style="font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 8px; display: flex; justify-content: space-between;">
        <span style="font-size: 18px; color: #000;">ITEM</span>
        <span style="font-size: 18px; color: #000;">QTD</span>
      </div>
      <div style="border-bottom: 2px dashed #000; padding-bottom: 15px; margin-bottom: 15px;">
        ${items.map(item => `
          <div style="text-align: center; font-size: 12px; color: #666; padding-top: 10px;">- - - - - - - - - - - - - - - - - -</div>
          <div style="display: flex; justify-content: space-between; padding: 6px 0;"><span style="font-size: 18px; color: #000; text-transform: uppercase; font-weight: 600;">${item.polpa!.nome_polpa}</span><span style="font-size: 20px; font-weight: bold; color: #000;">${item.quantidade}</span></div>
        `).join('')}
      </div>
      <div style="font-weight: bold; color: #000; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;"><span style="font-size: 16px;">TOTAL DE ITENS:</span><span style="font-size: 16px;">${totalItens}</span></div>
        <div style="display: flex; justify-content: space-between;"><span style="font-size: 16px;">QTD. TOTAL:</span><span style="font-size: 16px;">${totalQuantidade}</span></div>
      </div>
      <div style="text-align: center; padding-top: 15px; border-top: 2px dashed #000;">
        <p style="font-size: 12px; color: #000; margin: 0;">================================</p>
        <p style="font-size: 18px; font-weight: bold; color: #000; margin: 10px 0;">COMERCIAL COSTA</p>
        <p style="font-size: 12px; font-style: italic; color: #000; margin: 0;">PREÇO BAIXO DO JEITO QUE VOCÊ GOSTA!</p>
        <p style="font-size: 12px; color: #000; margin: 10px 0;">********************************</p>
        <p style="font-size: 11px; color: #333; margin: 0;">Obrigado pela preferência!</p>
      </div>
    `;

    document.body.appendChild(tempDiv);

    try {
      const canvas = await html2canvas(tempDiv, { scale: 3, backgroundColor: '#ffffff', useCORS: true });
      const link = document.createElement('a');
      link.download = `pedido-polpas-${format(new Date(), 'yyyy-MM-dd-HHmm')}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 1.0);
      link.click();
      toast({ title: 'Imagem gerada!', description: 'O pedido foi salvo como imagem JPEG' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao gerar imagem', variant: 'destructive' });
    } finally {
      document.body.removeChild(tempDiv);
    }
  };

  const savePedidoToDatabase = async () => {
    if (pedidoItems.size === 0) {
      toast({ title: 'Atenção', description: 'Adicione pelo menos uma polpa ao pedido', variant: 'destructive' });
      return;
    }

    if (!user) {
      toast({ title: 'Erro', description: 'Usuário não autenticado', variant: 'destructive' });
      return;
    }

    const items = Array.from(pedidoItems.values());
    const totalItens = items.length;
    const totalUnidades = items.reduce((acc, item) => acc + item.quantidade, 0);

    try {
      // Insert pedido
      const { data: pedidoData, error: pedidoError } = await supabase
        .from('pedidos_polpas')
        .insert({
          usuario_id: user.id,
          total_itens: totalItens,
          total_unidades: totalUnidades,
        })
        .select()
        .single();

      if (pedidoError) throw pedidoError;

      // Insert itens
      const itensToInsert = items.map(item => ({
        pedido_id: pedidoData.id,
        polpa_id: item.polpaId,
        quantidade: item.quantidade,
      }));

      const { error: itensError } = await supabase
        .from('itens_pedido_polpas')
        .insert(itensToInsert);

      if (itensError) throw itensError;

      toast({ title: 'Sucesso!', description: `Pedido Nº ${pedidoData.numero} salvo com sucesso!` });
      clearPedido();
      fetchPedidosSalvos();
    } catch (error) {
      console.error('Error saving pedido:', error);
      toast({ title: 'Erro', description: 'Erro ao salvar pedido', variant: 'destructive' });
    }
  };

  const viewPedidoDetails = (pedido: PedidoSalvo) => {
    setSelectedPedido(pedido);
    setPedidoDetailOpen(true);
  };

  const deletePedidoSalvo = async (pedidoId: string) => {
    try {
      const { error } = await supabase
        .from('pedidos_polpas')
        .delete()
        .eq('id', pedidoId);

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Pedido excluído' });
      fetchPedidosSalvos();
      setPedidoDetailOpen(false);
    } catch (error) {
      console.error('Error deleting pedido:', error);
      toast({ title: 'Erro', description: 'Erro ao excluir pedido', variant: 'destructive' });
    }
  };

  const generateSavedPedidoContent = (pedido: PedidoSalvo) => {
    const items = pedido.itens?.map(item => ({
      polpa: { nome_polpa: item.polpas?.nome_polpa || 'N/A' },
      quantidade: item.quantidade,
    })) || [];
    const dataAtual = format(new Date(pedido.data_pedido), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    return { items, dataAtual, numeroRecibo: pedido.numero, totalItens: pedido.total_itens, totalQuantidade: pedido.total_unidades };
  };

  const printSavedPedidoPDF = (pedido: PedidoSalvo) => {
    const { items, dataAtual, numeroRecibo, totalItens, totalQuantidade } = generateSavedPedidoContent(pedido);

    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (!printWindow) {
      toast({ title: 'Erro', description: 'Não foi possível abrir a janela de impressão.', variant: 'destructive' });
      return;
    }

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Pedido de Polpas</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', Courier, monospace; font-size: 11px; line-height: 1.4; width: 80mm; padding: 5mm; background: white; color: #000000; }
          .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .header h1 { font-size: 16px; font-weight: bold; letter-spacing: 2px; color: #000000; }
          .header .divider { font-size: 10px; margin: 5px 0; color: #000000; }
          .header .tipo { font-size: 14px; font-weight: bold; margin-top: 8px; color: #000000; }
          .header .numero { font-size: 10px; color: #000000; }
          .info { border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; font-size: 11px; color: #000000; }
          .info-row { display: flex; justify-content: space-between; }
          .items-header { display: flex; justify-content: space-between; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 5px; font-size: 11px; color: #000000; }
          .item-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 11px; color: #000000; }
          .item-row .item-name { flex: 1; text-transform: uppercase; padding-right: 10px; }
          .item-row .item-qty { width: 50px; text-align: right; font-weight: bold; }
          .item-separator { text-align: center; font-size: 9px; color: #666; padding: 3px 0; }
          .items { border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .totals { border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 15px; font-weight: bold; color: #000000; }
          .totals-row { display: flex; justify-content: space-between; }
          .footer { text-align: center; padding-top: 10px; color: #000000; }
          .footer .brand { font-size: 14px; font-weight: bold; letter-spacing: 2px; margin: 8px 0; }
          .footer .slogan { font-size: 10px; font-style: italic; line-height: 1.3; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>COMERCIAL COSTA</h1>
          <div class="divider">================================</div>
          <div class="tipo">PEDIDO DE POLPAS</div>
          <div class="numero">Nº ${String(numeroRecibo).padStart(6, '0')}</div>
        </div>
        <div class="info"><div class="info-row"><span>Data:</span><span>${dataAtual}</span></div></div>
        <div class="items-header"><span>ITEM</span><span>QTD</span></div>
        <div class="items">
          ${items.map(item => `<div class="item-separator">- - - - - - - - - - - -</div><div class="item-row"><span class="item-name">${item.polpa.nome_polpa}</span><span class="item-qty">${item.quantidade}</span></div>`).join('')}
        </div>
        <div class="totals">
          <div class="totals-row"><span>TOTAL DE ITENS:</span><span>${totalItens}</span></div>
          <div class="totals-row"><span>QTD. TOTAL:</span><span>${totalQuantidade}</span></div>
        </div>
        <div class="footer">
          <div class="brand">COMERCIAL COSTA</div>
          <div class="slogan">PREÇO BAIXO DO JEITO QUE VOCÊ GOSTA!</div>
        </div>
        <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };</script>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    toast({ title: 'Pedido enviado para impressão!' });
  };

  const generateSavedPedidoJPEG = async (pedido: PedidoSalvo) => {
    const { items, dataAtual, numeroRecibo, totalItens, totalQuantidade } = generateSavedPedidoContent(pedido);

    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 350px; background: white; padding: 25px; font-family: Courier New, monospace;';
    tempDiv.innerHTML = `
      <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 15px; margin-bottom: 15px;">
        <h1 style="font-size: 24px; font-weight: bold; color: #000; margin: 0;">COMERCIAL COSTA</h1>
        <p style="font-size: 14px; color: #000; margin: 8px 0;">================================</p>
        <p style="font-size: 20px; font-weight: bold; color: #000; margin: 0;">PEDIDO DE POLPAS</p>
        <p style="font-size: 14px; color: #000; margin: 4px 0;">Nº ${String(numeroRecibo).padStart(6, '0')}</p>
      </div>
      <div style="border-bottom: 2px dashed #000; padding-bottom: 15px; margin-bottom: 15px;">
        <p style="font-size: 16px; color: #000; margin: 0;"><strong>Data:</strong> ${dataAtual}</p>
      </div>
      <div style="font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 8px; display: flex; justify-content: space-between;">
        <span style="font-size: 18px; color: #000;">ITEM</span>
        <span style="font-size: 18px; color: #000;">QTD</span>
      </div>
      <div style="border-bottom: 2px dashed #000; padding-bottom: 15px; margin-bottom: 15px;">
        ${items.map(item => `
          <div style="text-align: center; font-size: 12px; color: #666; padding-top: 10px;">- - - - - - - - - - - - - - - - - -</div>
          <div style="display: flex; justify-content: space-between; padding: 6px 0;"><span style="font-size: 18px; color: #000; text-transform: uppercase; font-weight: 600;">${item.polpa.nome_polpa}</span><span style="font-size: 20px; font-weight: bold; color: #000;">${item.quantidade}</span></div>
        `).join('')}
      </div>
      <div style="font-weight: bold; color: #000; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;"><span style="font-size: 16px;">TOTAL DE ITENS:</span><span style="font-size: 16px;">${totalItens}</span></div>
        <div style="display: flex; justify-content: space-between;"><span style="font-size: 16px;">QTD. TOTAL:</span><span style="font-size: 16px;">${totalQuantidade}</span></div>
      </div>
      <div style="text-align: center; padding-top: 15px; border-top: 2px dashed #000;">
        <p style="font-size: 18px; font-weight: bold; color: #000; margin: 10px 0;">COMERCIAL COSTA</p>
        <p style="font-size: 12px; font-style: italic; color: #000; margin: 0;">PREÇO BAIXO DO JEITO QUE VOCÊ GOSTA!</p>
      </div>
    `;

    document.body.appendChild(tempDiv);

    try {
      const canvas = await html2canvas(tempDiv, { scale: 3, backgroundColor: '#ffffff', useCORS: true });
      const link = document.createElement('a');
      link.download = `pedido-polpas-${pedido.numero}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 1.0);
      link.click();
      toast({ title: 'Imagem gerada!', description: 'O pedido foi salvo como JPEG' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao gerar imagem', variant: 'destructive' });
    } finally {
      document.body.removeChild(tempDiv);
    }
  };

  const shareSavedPedidoWhatsApp = async (pedido: PedidoSalvo) => {
    const { items, dataAtual, numeroRecibo, totalItens, totalQuantidade } = generateSavedPedidoContent(pedido);

    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 350px; background: white; padding: 25px; font-family: Courier New, monospace;';
    tempDiv.innerHTML = `
      <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 15px; margin-bottom: 15px;">
        <h1 style="font-size: 24px; font-weight: bold; color: #000; margin: 0;">COMERCIAL COSTA</h1>
        <p style="font-size: 20px; font-weight: bold; color: #000; margin: 8px 0;">PEDIDO DE POLPAS</p>
        <p style="font-size: 14px; color: #000;">Nº ${String(numeroRecibo).padStart(6, '0')}</p>
      </div>
      <div style="margin-bottom: 15px;">
        <p style="font-size: 16px; color: #000;"><strong>Data:</strong> ${dataAtual}</p>
      </div>
      <div style="border-bottom: 2px dashed #000; padding-bottom: 15px; margin-bottom: 15px;">
        ${items.map(item => `<div style="display: flex; justify-content: space-between; padding: 6px 0;"><span style="font-size: 16px; color: #000; text-transform: uppercase;">${item.polpa.nome_polpa}</span><span style="font-size: 18px; font-weight: bold; color: #000;">${item.quantidade}</span></div>`).join('')}
      </div>
      <div style="font-weight: bold; color: #000;">
        <div style="display: flex; justify-content: space-between;"><span>TOTAL ITENS:</span><span>${totalItens}</span></div>
        <div style="display: flex; justify-content: space-between;"><span>QTD. TOTAL:</span><span>${totalQuantidade}</span></div>
      </div>
    `;

    document.body.appendChild(tempDiv);

    try {
      const canvas = await html2canvas(tempDiv, { scale: 3, backgroundColor: '#ffffff', useCORS: true });
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', 1.0));
      const file = new File([blob], `pedido-polpas-${pedido.numero}.jpg`, { type: 'image/jpeg' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Pedido de Polpas #${pedido.numero}`,
          text: `Pedido de Polpas - ${totalQuantidade} unidades`,
          files: [file],
        });
        toast({ title: 'Compartilhado!', description: 'Pedido enviado com sucesso' });
      } else {
        const link = document.createElement('a');
        link.download = `pedido-polpas-${pedido.numero}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 1.0);
        link.click();
        toast({ title: 'Imagem salva', description: 'Compartilhe manualmente via WhatsApp' });
      }
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao compartilhar', variant: 'destructive' });
    } finally {
      document.body.removeChild(tempDiv);
    }
  };

  const totalPedidoItens = Array.from(pedidoItems.values()).reduce((acc, item) => acc + item.quantidade, 0);
  const totalPedidoValor = Array.from(pedidoItems.values()).reduce((acc, item) => {
    const polpa = polpas.find(p => p.id === item.polpaId);
    return acc + (item.quantidade * (polpa?.preco_unitario || 0));
  }, 0);

  const exportConferenciasPDF = () => {
    if (conferencias.length === 0) {
      toast({ title: 'Atenção', description: 'Não há conferências para exportar', variant: 'destructive' });
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO DE CONFERÊNCIAS DE POLPAS', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 105, 30, { align: 'center' });

    const tableData = conferencias.slice(0, 50).map(conf => [
      format(new Date(conf.criado_em), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
      conf.polpas?.nome_polpa || '-',
      conf.quantidade_conferida.toString(),
      conf.profiles?.nome || 'Desconhecido',
      conf.observacao || '-',
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Data', 'Polpa', 'Quantidade', 'Operador', 'Observação']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [34, 139, 34], textColor: 255, fontStyle: 'bold' },
    });

    doc.save(`relatorio-conferencias-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast({ title: 'PDF Gerado!', description: 'O relatório foi salvo' });
  };

  const printConferenciasThermal = () => {
    const hoje = format(new Date(), 'yyyy-MM-dd');
    const conferenciasHojeList = conferencias.filter(c => c.data_conferencia === hoje);

    if (conferenciasHojeList.length === 0) {
      toast({ title: 'Atenção', description: 'Nenhuma conferência registrada hoje', variant: 'destructive' });
      return;
    }

    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) return;

    const items = conferenciasHojeList.map(conf => ({
      nome: conf.polpas?.nome_polpa || 'N/A',
      quantidade: conf.quantidade_conferida,
    }));

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Conferências de Polpas</title>
        <style>
          @page { size: 80mm auto; margin: 5mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.4; width: 70mm; color: #000; }
          .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
          .header h1 { font-size: 16px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; }
          th, td { text-align: left; padding: 4px 2px; border-bottom: 1px dotted #ccc; }
          th { font-weight: bold; border-bottom: 1px solid #000; }
          .footer { text-align: center; margin-top: 16px; font-size: 10px; border-top: 1px dashed #000; padding-top: 8px; }
        </style>
      </head>
      <body>
        <div class="header"><h1>CONFERÊNCIAS</h1><p>Comercial Costa</p></div>
        <p style="text-align: center; margin-bottom: 8px;">${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
        <table>
          <thead><tr><th>Polpa</th><th>Qtd</th></tr></thead>
          <tbody>${items.map(item => `<tr><td>${item.nome}</td><td>${item.quantidade}</td></tr>`).join('')}</tbody>
        </table>
        <div class="footer"><p>Total: ${items.length} polpas</p><p>*** FIM DO COMPROVANTE ***</p></div>
        <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };</script>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
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
      <div className="space-y-4 md:space-y-6">
        {/* Header clicável - estilo moderno */}
        <button 
          onClick={() => setViewMode('resumo')}
          className="w-full text-center p-4 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center justify-center gap-3">
            <Cherry className="w-8 h-8" />
            POLPAS
          </h1>
          <p className="text-white/80 text-sm mt-1">COMERCIAL COSTA</p>
        </button>

        {newConferencias.length > 0 && (
          <Card className="border-primary bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-primary animate-bounce" />
                <span className="font-medium">{newConferencias.length} NOVA(S) CONFERÊNCIA(S) RECEBIDA(S)</span>
                <Button variant="ghost" size="sm" onClick={() => setNewConferencias([])}>LIMPAR</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-pink-500/10 to-pink-600/10 border-pink-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-pink-500/20"><Cherry className="w-6 h-6 text-pink-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground uppercase">TOTAL DE POLPAS</p>
                  <p className="text-2xl font-bold">{totalPolpas}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-500/20"><ClipboardList className="w-6 h-6 text-blue-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground uppercase">CONFERÊNCIAS HOJE</p>
                  <p className="text-2xl font-bold">{conferenciasHoje}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border-emerald-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-emerald-500/20"><BarChart3 className="w-6 h-6 text-emerald-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground uppercase">POLPAS CONFERIDAS</p>
                  <p className="text-2xl font-bold">{polpasComConferencia}/{totalPolpas}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation buttons - estilo moderno com gradientes */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Button 
            onClick={() => setViewMode('resumo')} 
            className={`py-3 rounded-xl font-semibold transition-all duration-200 ${viewMode === 'resumo' ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white ring-2 ring-white/40 shadow-lg scale-[1.02]' : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white opacity-80 hover:opacity-100'}`}
          >
            <FileText className="w-4 h-4 mr-2" />RESUMO
          </Button>
          <Button 
            onClick={() => setViewMode('pedido')} 
            className={`py-3 rounded-xl font-semibold transition-all duration-200 ${viewMode === 'pedido' ? 'bg-gradient-to-br from-green-500 to-green-600 text-white ring-2 ring-white/40 shadow-lg scale-[1.02]' : 'bg-gradient-to-br from-green-500 to-green-600 text-white opacity-80 hover:opacity-100'}`}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />PEDIDO
            {pedidoItems.size > 0 && <Badge variant="secondary" className="ml-2 bg-white/20">{pedidoItems.size}</Badge>}
          </Button>
          <Button 
            onClick={() => setViewMode('pedidos_salvos')} 
            className={`py-3 rounded-xl font-semibold transition-all duration-200 ${viewMode === 'pedidos_salvos' ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white ring-2 ring-white/40 shadow-lg scale-[1.02]' : 'bg-gradient-to-br from-teal-500 to-teal-600 text-white opacity-80 hover:opacity-100'}`}
          >
            <Receipt className="w-4 h-4 mr-2" />SALVOS
            {pedidosSalvos.length > 0 && <Badge variant="secondary" className="ml-2 bg-white/20">{pedidosSalvos.length}</Badge>}
          </Button>
          <Button 
            onClick={() => setViewMode('historico')} 
            className={`py-3 rounded-xl font-semibold transition-all duration-200 ${viewMode === 'historico' ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white ring-2 ring-white/40 shadow-lg scale-[1.02]' : 'bg-gradient-to-br from-purple-500 to-purple-600 text-white opacity-80 hover:opacity-100'}`}
          >
            <History className="w-4 h-4 mr-2" />HISTÓRICO
          </Button>
          <Button 
            onClick={() => setViewMode('produtos')} 
            className={`py-3 rounded-xl font-semibold transition-all duration-200 ${viewMode === 'produtos' ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white ring-2 ring-white/40 shadow-lg scale-[1.02]' : 'bg-gradient-to-br from-orange-500 to-orange-600 text-white opacity-80 hover:opacity-100'}`}
          >
            <Package className="w-4 h-4 mr-2" />PRODUTOS
          </Button>
        </div>

        {/* Botão Nova Polpa */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full md:w-auto bg-gradient-to-br from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700">
              <Plus className="w-4 h-4 mr-2" />NOVA POLPA
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>CADASTRAR NOVA POLPA</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>NOME DA POLPA</Label>
                <Input value={newPolpa.nome_polpa} onChange={(e) => setNewPolpa({ ...newPolpa, nome_polpa: e.target.value })} placeholder="Ex: Polpa de Açaí" className="uppercase" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>QUANTIDADE EM ESTOQUE</Label>
                  <Input type="number" value={newPolpa.quantidade_estoque} onChange={(e) => setNewPolpa({ ...newPolpa, quantidade_estoque: e.target.value })} placeholder="0" />
                </div>
                <div>
                  <Label>PREÇO UNITÁRIO (R$)</Label>
                  <Input type="number" step="0.01" value={newPolpa.preco_unitario} onChange={(e) => setNewPolpa({ ...newPolpa, preco_unitario: e.target.value })} placeholder="0.00" />
                </div>
              </div>
              <Button onClick={handleAddPolpa} className="w-full">CADASTRAR POLPA</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* RESUMO VIEW */}
        {viewMode === 'resumo' && (
          <Card>
            <CardHeader><CardTitle>Última Conferência por Polpa</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-bold">Polpa</TableHead>
                      <TableHead className="font-bold text-center">Qtd. Conferida</TableHead>
                      <TableHead className="font-bold text-center">Qtd. a Pedir</TableHead>
                      <TableHead className="font-bold">Conferido por</TableHead>
                      <TableHead className="font-bold">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {latestConferenciasByPolpa.map(({ polpa, latestConferencia }) => (
                      <TableRow key={polpa.id} className="hover:bg-muted/30">
                        <TableCell className="font-semibold text-foreground">{polpa.nome_polpa}</TableCell>
                        <TableCell className="text-center">
                          {latestConferencia ? (
                            <Badge variant="outline" className="text-lg font-bold px-4 py-1 bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-300">
                              {latestConferencia.quantidade_conferida}
                            </Badge>
                          ) : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="default" className="text-lg font-bold px-4 py-1 bg-green-500 text-white">
                            {latestConferencia ? Math.max(0, 10 - latestConferencia.quantidade_conferida) : 0}
                          </Badge>
                        </TableCell>
                        <TableCell>{latestConferencia?.profiles?.nome || '-'}</TableCell>
                        <TableCell>
                          {latestConferencia ? format(new Date(latestConferencia.data_conferencia + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PEDIDO VIEW */}
        {viewMode === 'pedido' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" />Selecionar Polpas para Pedido</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-bold">Polpa</TableHead>
                          <TableHead className="font-bold text-center">Qtd. Conferida</TableHead>
                          <TableHead className="font-bold text-right">Qtd. a Pedir</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {latestConferenciasByPolpa.map(({ polpa, latestConferencia }) => {
                          const pedidoQtd = pedidoItems.get(polpa.id)?.quantidade || 0;
                          const qtdConferida = latestConferencia?.quantidade_conferida;
                          
                          return (
                            <TableRow key={polpa.id} className={pedidoQtd > 0 ? 'bg-green-50 dark:bg-green-900/20' : 'hover:bg-muted/30'}>
                              <TableCell className="font-semibold">{polpa.nome_polpa}</TableCell>
                              <TableCell className="text-center">
                                {qtdConferida !== undefined ? (
                                  <Badge variant="outline" className="text-base font-bold px-3 py-1 bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-300">
                                    {qtdConferida}
                                  </Badge>
                                ) : <span className="text-muted-foreground">-</span>}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-2">
                                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => decrementPedido(polpa.id)} disabled={pedidoQtd === 0}>
                                    <Minus className="w-4 h-4" />
                                  </Button>
                                  <Input type="number" min="0" value={pedidoQtd || ''} onChange={(e) => updatePedidoQuantidade(polpa.id, Number(e.target.value))} className="w-20 h-9 text-center text-lg font-bold" placeholder="0" />
                                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => incrementPedido(polpa.id)}>
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="sticky top-4">
                <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />Resumo do Pedido</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {pedidoItems.size === 0 ? (
                    <p className="text-center text-muted-foreground py-4">Nenhum item adicionado ao pedido</p>
                  ) : (
                    <>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {Array.from(pedidoItems.values()).map((item) => {
                          const polpa = polpas.find(p => p.id === item.polpaId);
                          if (!polpa) return null;
                          return (
                            <div key={item.polpaId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate">{polpa.nome_polpa}</p>
                                <p className="text-sm text-muted-foreground">{item.quantidade} x R$ {polpa.preco_unitario.toFixed(2)}</p>
                              </div>
                              <span className="font-bold text-primary">R$ {(item.quantidade * polpa.preco_unitario).toFixed(2)}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="border-t pt-4 space-y-2">
                        <div className="flex justify-between"><span>Itens:</span><span className="font-medium">{pedidoItems.size}</span></div>
                        <div className="flex justify-between"><span>Quantidade total:</span><span className="font-medium">{totalPedidoItens} un</span></div>
                        <div className="flex justify-between text-lg font-bold"><span>Total:</span><span className="text-primary">R$ {totalPedidoValor.toFixed(2)}</span></div>
                      </div>
                      <div className="space-y-2 pt-2">
                        <Button onClick={savePedidoToDatabase} className="w-full bg-teal-600 hover:bg-teal-700"><Save className="w-4 h-4 mr-2" />Salvar Pedido</Button>
                        <Button onClick={generatePedidoPDF} variant="outline" className="w-full"><Printer className="w-4 h-4 mr-2" />Imprimir PDF</Button>
                        <Button onClick={generatePedidoJPEG} variant="outline" className="w-full"><Image className="w-4 h-4 mr-2" />Salvar como JPEG</Button>
                        <Button variant="ghost" onClick={clearPedido} className="w-full">Limpar Pedido</Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* PRODUTOS VIEW */}
        {viewMode === 'produtos' && (
          <Card>
            <CardHeader><CardTitle>Produtos Cadastrados</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Estoque Atual</TableHead>
                    <TableHead>Preço Unit.</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {polpas.map((polpa) => (
                    <TableRow key={polpa.id}>
                      <TableCell className="font-medium">{polpa.nome_polpa}</TableCell>
                      <TableCell><Badge variant="outline">{polpa.quantidade_estoque}</Badge></TableCell>
                      <TableCell>R$ {polpa.preco_unitario.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(polpa)}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => openDeleteDialog(polpa)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* HISTÓRICO VIEW */}
        {viewMode === 'historico' && (
          <Card>
            <CardHeader><CardTitle>Histórico de Conferências</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Polpa</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Operador</TableHead>
                    <TableHead>Observação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conferencias.map((conf) => (
                    <TableRow key={conf.id}>
                      <TableCell>{format(new Date(conf.criado_em), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</TableCell>
                      <TableCell className="font-medium">{conf.polpas?.nome_polpa}</TableCell>
                      <TableCell>{conf.quantidade_conferida}</TableCell>
                      <TableCell>{conf.profiles?.nome || 'Desconhecido'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{conf.observacao || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* PEDIDOS SALVOS VIEW */}
        {viewMode === 'pedidos_salvos' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Histórico de Pedidos Salvos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPedidos ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : pedidosSalvos.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum pedido salvo ainda</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº Pedido</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-center">Itens</TableHead>
                      <TableHead className="text-center">Unidades</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pedidosSalvos.map((pedido) => (
                      <TableRow key={pedido.id}>
                        <TableCell className="font-bold text-primary">#{pedido.numero}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {format(new Date(pedido.data_pedido), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{pedido.total_itens}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-green-500">{pedido.total_unidades}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => viewPedidoDetails(pedido)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => deletePedidoSalvo(pedido.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pedido Detail Dialog */}
        <Dialog open={pedidoDetailOpen} onOpenChange={setPedidoDetailOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Pedido #{selectedPedido?.numero}
              </DialogTitle>
            </DialogHeader>
            {selectedPedido && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  {format(new Date(selectedPedido.data_pedido), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
                <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
                  {selectedPedido.itens?.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3">
                      <span className="font-medium">{item.polpas?.nome_polpa || 'N/A'}</span>
                      <Badge variant="outline" className="text-lg font-bold">{item.quantidade}</Badge>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-4 space-y-1">
                  <div className="flex justify-between">
                    <span>Total de itens:</span>
                    <span className="font-bold">{selectedPedido.total_itens}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total de unidades:</span>
                    <span className="font-bold text-primary">{selectedPedido.total_unidades}</span>
                  </div>
                </div>

                {/* Botões de compartilhamento */}
                <div className="border-t pt-4 space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Compartilhar</p>
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => printSavedPedidoPDF(selectedPedido)}
                      className="flex flex-col gap-1 h-auto py-2"
                    >
                      <Printer className="w-4 h-4" />
                      <span className="text-xs">Imprimir</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => generateSavedPedidoJPEG(selectedPedido)}
                      className="flex flex-col gap-1 h-auto py-2"
                    >
                      <Image className="w-4 h-4" />
                      <span className="text-xs">JPEG</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => shareSavedPedidoWhatsApp(selectedPedido)}
                      className="flex flex-col gap-1 h-auto py-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <Share2 className="w-4 h-4" />
                      <span className="text-xs">WhatsApp</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Polpa Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar Polpa</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div><Label>Nome da Polpa</Label><Input value={editPolpa.nome_polpa} onChange={(e) => setEditPolpa({ ...editPolpa, nome_polpa: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Quantidade em Estoque</Label><Input type="number" value={editPolpa.quantidade_estoque} onChange={(e) => setEditPolpa({ ...editPolpa, quantidade_estoque: e.target.value })} /></div>
                <div><Label>Preço Unitário (R$)</Label><Input type="number" step="0.01" value={editPolpa.preco_unitario} onChange={(e) => setEditPolpa({ ...editPolpa, preco_unitario: e.target.value })} /></div>
              </div>
              <Button onClick={handleEditPolpa} className="w-full">Salvar Alterações</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Polpa Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Polpa</AlertDialogTitle>
              <AlertDialogDescription>Tem certeza que deseja excluir "{selectedPolpa?.nome_polpa}"? Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeletePolpa} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default PolpasAdmin;
