import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { 
  Loader2, Package, Check, Printer, RotateCcw, Pencil, PackageX, 
  Trash2, Image, Share2, History, ShoppingCart, FileText, ChevronDown, 
  ChevronRight, Calendar, User, ArrowLeft, AlertCircle, Copy
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ThermalReceipt from '@/components/ThermalReceipt';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProdutoCoca {
  id: string;
  nome: string;
  estoque_atual: number;
  estoque_minimo: number;
}

interface ConferenciaItem {
  produto_coca_id: string;
  quantidade: number;
  tipo_unidade: 'fardo' | 'unidade';
  saved: boolean;
  semEstoque: boolean;
}

interface ReceiptItem {
  nome: string;
  quantidade: number;
  unidade?: string;
  semEstoque?: boolean;
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
    estoque?: { nome: string };
  }[];
}

const STORAGE_KEY = 'conferencia_coca_draft';

type ViewMode = 'form' | 'history' | 'order';

const ConferenciaCoca = () => {
  const [produtos, setProdutos] = useState<ProdutoCoca[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [conferencias, setConferencias] = useState<Record<string, ConferenciaItem>>({});
  const [submitted, setSubmitted] = useState(false);
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [receiptNumber, setReceiptNumber] = useState<number>(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [unitTypes, setUnitTypes] = useState<Record<string, 'fardo' | 'unidade'>>({});
  const [viewMode, setViewMode] = useState<ViewMode>('form');
  const [sessoes, setSessoes] = useState<SessaoConferencia[]>([]);
  const [expandedSessoes, setExpandedSessoes] = useState<Set<string>>(new Set());
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set());
  const receiptRef = useRef<HTMLDivElement>(null);
  const { user, userName, userRole, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const isAdmin = userRole === 'administrador';

  useEffect(() => {
    fetchProdutos();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && produtos.length > 0) {
      try {
        const parsed = JSON.parse(saved);
        setConferencias(parsed);
        const inputs: Record<string, string> = {};
        const units: Record<string, 'fardo' | 'unidade'> = {};
        produtos.forEach(p => {
          const item = parsed[p.id];
          if (item?.saved) {
            inputs[p.id] = item.semEstoque ? '0' : item.quantidade?.toString() || '';
          } else {
            inputs[p.id] = '';
          }
          units[p.id] = item?.tipo_unidade || 'unidade';
        });
        setInputValues(inputs);
        setUnitTypes(units);
      } catch (e) {
        initializeConferencias(produtos);
      }
    }
  }, [produtos]);

  useEffect(() => {
    if (Object.keys(conferencias).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conferencias));
    }
  }, [conferencias]);

  const fetchProdutos = async () => {
    try {
      const { data } = await supabase
        .from('estoque')
        .select('id, nome, estoque_atual, estoque_minimo, subgrupo')
        .ilike('subgrupo', 'COCA-COLA')
        .eq('ativo', true)
        .order('nome');

      if (data) {
        setProdutos(data);
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setConferencias(parsed);
            const inputs: Record<string, string> = {};
            const units: Record<string, 'fardo' | 'unidade'> = {};
            data.forEach(p => {
              const item = parsed[p.id];
              if (item?.saved) {
                inputs[p.id] = item.semEstoque ? '0' : item.quantidade?.toString() || '';
              } else {
                inputs[p.id] = '';
              }
              units[p.id] = item?.tipo_unidade || 'unidade';
            });
            setInputValues(inputs);
            setUnitTypes(units);
          } catch (e) {
            initializeConferencias(data);
          }
        } else {
          initializeConferencias(data);
        }
      }
    } catch (error) {
      console.error('Error fetching produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessoes = async () => {
    try {
      const { data } = await supabase
        .from('sessoes_conferencia_coca')
        .select(`
          *,
          profiles:usuario_id(nome)
        `)
        .order('criado_em', { ascending: false })
        .limit(20);

      if (data) {
        setSessoes(data as any);
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
          estoque:produto_coca_id(nome)
        `)
        .eq('sessao_id', sessaoId);

      if (data) {
        setSessoes(prev => prev.map(s => 
          s.id === sessaoId ? { ...s, items: data as any } : s
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

  const initializeConferencias = (data: ProdutoCoca[]) => {
    const initial: Record<string, ConferenciaItem> = {};
    const inputs: Record<string, string> = {};
    const units: Record<string, 'fardo' | 'unidade'> = {};
    data.forEach(p => {
      initial[p.id] = { produto_coca_id: p.id, quantidade: 0, tipo_unidade: 'unidade', saved: false, semEstoque: false };
      inputs[p.id] = '';
      units[p.id] = 'unidade';
    });
    setConferencias(initial);
    setInputValues(inputs);
    setUnitTypes(units);
  };

  const updateInputValue = (produtoId: string, value: string) => {
    setInputValues(prev => ({ ...prev, [produtoId]: value }));
  };

  const updateUnitType = (produtoId: string, value: 'fardo' | 'unidade') => {
    setUnitTypes(prev => ({ ...prev, [produtoId]: value }));
  };

  const handleAddItem = (produtoId: string) => {
    const value = Number(inputValues[produtoId] || 0);
    const unit = unitTypes[produtoId] || 'unidade';
    
    // If value is 0, mark as sem estoque
    const isSemEstoque = value === 0;
    
    setConferencias(prev => ({
      ...prev,
      [produtoId]: {
        produto_coca_id: produtoId,
        quantidade: value,
        tipo_unidade: unit,
        saved: true,
        semEstoque: isSemEstoque,
      },
    }));
    setEditingId(null);
    toast({ 
      title: 'Salvo!', 
      description: isSemEstoque ? 'Item marcado como sem estoque' : 'Quantidade adicionada' 
    });
  };

  const handleEdit = (produtoId: string) => {
    setEditingId(produtoId);
  };

  const handleRemoveItem = (produtoId: string) => {
    setConferencias(prev => ({
      ...prev,
      [produtoId]: {
        produto_coca_id: produtoId,
        quantidade: 0,
        tipo_unidade: 'unidade',
        saved: false,
        semEstoque: false,
      },
    }));
    setInputValues(prev => ({ ...prev, [produtoId]: '' }));
    setUnitTypes(prev => ({ ...prev, [produtoId]: 'unidade' }));
    toast({ title: 'Removido', description: 'Item removido da conferência' });
  };

  // Check if all products are filled
  const allProductsFilled = produtos.length > 0 && produtos.every(p => {
    const item = conferencias[p.id];
    return item?.saved === true;
  });

  const savedItemsCount = Object.values(conferencias).filter(c => c.saved).length;
  const semEstoqueCount = Object.values(conferencias).filter(c => c.saved && c.semEstoque).length;
  const pendingCount = produtos.length - savedItemsCount;

  const handleSubmit = async () => {
    if (!user) return;

    // Check if all products are filled
    if (!allProductsFilled) {
      toast({
        title: 'Atenção',
        description: `Preencha todos os ${pendingCount} produto(s) pendente(s) antes de enviar`,
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      // All items must be included
      const conferenciasList = Object.values(conferencias)
        .filter(c => c.saved)
        .map(c => ({
          produto_coca_id: c.produto_coca_id,
          usuario_id: user.id,
          quantidade_conferida: c.quantidade,
          tipo_unidade: c.tipo_unidade,
        }));

      // Create session first
      const { data: sessaoData, error: sessaoError } = await supabase
        .from('sessoes_conferencia_coca')
        .insert([{ usuario_id: user.id } as any])
        .select('id, numero')
        .single();

      if (sessaoError) throw sessaoError;

      // Insert conference items with session reference
      const itemsWithSession = conferenciasList.map(c => ({
        ...c,
        sessao_id: sessaoData.id,
      }));

      const { error } = await supabase
        .from('conferencias_coca')
        .insert(itemsWithSession);

      if (error) throw error;

      // Clear localStorage after successful submission
      localStorage.removeItem(STORAGE_KEY);

      // Prepare receipt items
      const items: ReceiptItem[] = Object.values(conferencias)
        .filter(c => c.saved)
        .map(c => {
          const produto = produtos.find(p => p.id === c.produto_coca_id);
          return {
            nome: produto?.nome || 'Produto',
            quantidade: c.quantidade,
            unidade: c.tipo_unidade === 'fardo' ? 'fd' : 'un',
            semEstoque: c.semEstoque,
          };
        });

      setReceiptItems(items);
      setReceiptNumber(sessaoData.numero);

      toast({
        title: 'Conferência Enviada!',
        description: `${conferenciasList.length} produto(s) conferido(s)`,
      });

      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting conferencia:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar conferência',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateOrderFromSessao = (sessao: SessaoConferencia) => {
    if (!sessao.items) return;
    
    const items: ReceiptItem[] = sessao.items.map(item => ({
      nome: item.estoque?.nome || 'Produto',
      quantidade: item.quantidade_conferida,
      unidade: item.tipo_unidade === 'fardo' ? 'fd' : 'un',
      semEstoque: item.quantidade_conferida === 0,
    }));

    setReceiptItems(items);
    setReceiptNumber(sessao.numero);
    setViewMode('order');
  };

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

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
            * { color: #000000 !important; }
          </style>
        </head>
        <body>
          <div class="receipt">${printContent.innerHTML}</div>
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
    if (!receiptRef.current) return;

    try {
      const canvas = await html2canvas(receiptRef.current, {
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
      console.error('Error saving image:', error);
      toast({ title: 'Erro', description: 'Não foi possível salvar a imagem', variant: 'destructive' });
    }
  };

  const handleShareWhatsApp = async () => {
    if (!receiptRef.current) return;

    try {
      const canvas = await html2canvas(receiptRef.current, {
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
        console.error('Error sharing:', error);
        toast({ title: 'Erro', description: 'Não foi possível compartilhar', variant: 'destructive' });
      }
    }
  };

  // Generate text for copying
  const generateTextReport = (): string => {
    const dataFormatada = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    
    let text = `📦 *CONFERÊNCIA COCA-COLA*\n`;
    text += `Nº ${String(receiptNumber).padStart(6, '0')}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📅 Data: ${dataFormatada}\n`;
    if (userName) text += `👤 Operador: ${userName}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    const itensComEstoque = receiptItems.filter(item => !item.semEstoque);
    const itensSemEstoque = receiptItems.filter(item => item.semEstoque);
    
    if (itensComEstoque.length > 0) {
      text += `✅ *EM ESTOQUE:*\n`;
      itensComEstoque.forEach(item => {
        text += `• ${item.nome.toUpperCase()} - ${item.quantidade} ${item.unidade || 'un'}\n`;
      });
      text += `\n`;
    }
    
    if (itensSemEstoque.length > 0) {
      text += `❌ *SEM ESTOQUE:*\n`;
      itensSemEstoque.forEach(item => {
        text += `• ${item.nome.toUpperCase()}\n`;
      });
      text += `\n`;
    }
    
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📊 *TOTAL: ${receiptItems.length} itens*\n`;
    text += `✅ Em estoque: ${itensComEstoque.length}\n`;
    text += `❌ Sem estoque: ${itensSemEstoque.length}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `\n_COMERCIAL COSTA_\n`;
    text += `_Preço baixo do jeito que você gosta!_`;
    
    return text;
  };

  const handleCopyText = async () => {
    const text = generateTextReport();
    try {
      await navigator.clipboard.writeText(text);
      toast({ 
        title: 'Texto copiado!', 
        description: 'Cole no WhatsApp ou onde preferir' 
      });
    } catch (error) {
      console.error('Error copying:', error);
      toast({ 
        title: 'Erro ao copiar', 
        description: 'Tente selecionar e copiar manualmente', 
        variant: 'destructive' 
      });
    }
  };

  const handleNewConferencia = () => {
    setSubmitted(false);
    setReceiptItems([]);
    setReceiptNumber(0);
    setViewMode('form');
    localStorage.removeItem(STORAGE_KEY);
    initializeConferencias(produtos);
  };

  const handleShowHistory = () => {
    fetchSessoes();
    setViewMode('history');
  };

  if (loading || authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  // Order view (for admin generating order from history)
  if (viewMode === 'order') {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <ShoppingCart className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">Pedido Gerado</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Nº {String(receiptNumber).padStart(6, '0')}
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="shadow-lg rounded-lg overflow-hidden border border-border">
              <ThermalReceipt
                ref={receiptRef}
                items={receiptItems}
                numero={receiptNumber}
                tipo="PEDIDO COCA-COLA"
                operador={userName || undefined}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 justify-center max-w-md mx-auto">
            <Button onClick={handleCopyText} size="lg" className="w-full bg-blue-600 hover:bg-blue-700">
              <Copy className="w-5 h-5 mr-2" />
              Copiar Texto (WhatsApp)
            </Button>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handleShareWhatsApp} size="lg" className="flex-1 bg-green-600 hover:bg-green-700">
                <Share2 className="w-5 h-5 mr-2" />
                Enviar Imagem
              </Button>
              <Button onClick={handlePrint} size="lg" className="flex-1" variant="outline">
                <Printer className="w-5 h-5 mr-2" />
                Imprimir
              </Button>
              <Button onClick={handleSaveAsImage} variant="secondary" size="lg" className="flex-1">
                <Image className="w-5 h-5 mr-2" />
                Salvar JPG
              </Button>
            </div>
          </div>
          <div className="flex justify-center gap-3">
            <Button onClick={() => setViewMode('history')} variant="outline" size="lg">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Voltar ao Histórico
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // History view (admin only)
  if (viewMode === 'history') {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
                <History className="w-8 h-8" />
                Histórico de Conferências
              </h1>
              <p className="text-muted-foreground mt-1">Clique para ver detalhes e gerar pedido</p>
            </div>
            <Button onClick={() => setViewMode('form')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>

          {sessoes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <History className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma conferência registrada</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sessoes.map((sessao) => (
                <Collapsible key={sessao.id} open={expandedSessoes.has(sessao.id)}>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader 
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
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
                              <CardTitle className="text-base flex items-center gap-2">
                                Conferência #{sessao.numero}
                              </CardTitle>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {format(new Date(sessao.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </span>
                                <span className="flex items-center gap-1">
                                  <User className="w-4 h-4" />
                                  {sessao.profiles?.nome || 'Usuário'}
                                </span>
                              </div>
                            </div>
                          </div>
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
                                  <span>{item.estoque?.nome}</span>
                                  <span className={`font-medium ${item.quantidade_conferida === 0 ? 'text-destructive' : ''}`}>
                                    {item.quantidade_conferida === 0 ? 'SEM ESTOQUE' : `${item.quantidade_conferida} ${item.tipo_unidade === 'fardo' ? 'fd' : 'un'}`}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <Button 
                              onClick={() => handleGenerateOrderFromSessao(sessao)}
                              className="w-full bg-green-600 hover:bg-green-700"
                            >
                              <ShoppingCart className="w-4 h-4 mr-2" />
                              Gerar Pedido
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
        </div>
      </MainLayout>
    );
  }

  // Submitted state
  if (submitted) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">Conferência Enviada!</h2>
              <p className="text-muted-foreground text-sm mt-1">Comprovante da conferência</p>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="shadow-lg rounded-lg overflow-hidden border border-border">
              <ThermalReceipt
                ref={receiptRef}
                items={receiptItems}
                numero={receiptNumber}
                tipo="CONFERÊNCIA COCA-COLA"
                operador={userName || undefined}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 justify-center max-w-md mx-auto">
            <Button onClick={handleCopyText} size="lg" className="w-full bg-green-600 hover:bg-green-700">
              <Copy className="w-5 h-5 mr-2" />
              Copiar Texto (WhatsApp)
            </Button>
          </div>
          <div className="flex justify-center">
            <Button onClick={handleNewConferencia} variant="outline" size="lg">
              <RotateCcw className="w-5 h-5 mr-2" />
              Nova Conferência
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Main form view
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
            <Package className="w-8 h-8" />
            Conferência Coca-Cola
          </h1>
          <p className="text-muted-foreground mt-1">
            Preencha a quantidade de TODOS os produtos antes de enviar
          </p>
        </div>

        {/* Admin navigation buttons */}
        {isAdmin && (
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={() => setViewMode('form')} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <FileText className="w-4 h-4 mr-2" />
              Conferência
            </Button>
            <Button 
              onClick={handleShowHistory}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <History className="w-4 h-4 mr-2" />
              Histórico / Gerar Pedido
            </Button>
          </div>
        )}

        {produtos.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum produto cadastrado ainda</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Progress indicator */}
            <Card className={pendingCount > 0 ? "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800" : "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {pendingCount > 0 ? (
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                    ) : (
                      <Check className="w-5 h-5 text-green-600" />
                    )}
                    <span className={pendingCount > 0 ? "font-medium text-amber-700 dark:text-amber-400" : "font-medium text-green-700 dark:text-green-400"}>
                      {pendingCount > 0 
                        ? `${pendingCount} produto(s) pendente(s) de ${produtos.length}`
                        : `Todos os ${produtos.length} produtos preenchidos!`
                      }
                    </span>
                  </div>
                  {semEstoqueCount > 0 && (
                    <span className="text-sm text-destructive">
                      {semEstoqueCount} sem estoque
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {produtos.map((produto) => {
                const item = conferencias[produto.id];
                const isSaved = item?.saved;
                const isEditing = editingId === produto.id;
                const isSemEstoque = item?.semEstoque;

                return (
                  <Card key={produto.id} className={`${isSaved && !isEditing ? (isSemEstoque ? 'border-destructive/50 bg-destructive/5' : 'border-primary/50 bg-primary/5') : 'border-amber-300 dark:border-amber-700'}`}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Package className="w-5 h-5 text-primary" />
                          {produto.nome}
                        </span>
                        {isSemEstoque && !isEditing ? (
                          <span className="text-sm font-normal text-destructive flex items-center gap-1">
                            <PackageX className="w-4 h-4" />
                            SEM ESTOQUE
                          </span>
                        ) : isSaved && !isEditing ? (
                          <span className="text-sm font-normal text-primary flex items-center gap-1">
                            <Check className="w-4 h-4" />
                            {item.quantidade} {item.tipo_unidade === 'fardo' ? 'fd' : 'un'}
                          </span>
                        ) : (
                          <span className="text-sm font-normal text-amber-600 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            Pendente
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isSaved && !isEditing ? (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(produto.id)}
                            className="flex-1"
                          >
                            <Pencil className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveItem(produto.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <Label>Tipo de Unidade</Label>
                            <RadioGroup
                              value={unitTypes[produto.id] || 'unidade'}
                              onValueChange={(v) => updateUnitType(produto.id, v as 'fardo' | 'unidade')}
                              className="flex gap-4 mt-1"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="unidade" id={`unidade-${produto.id}`} />
                                <Label htmlFor={`unidade-${produto.id}`} className="font-normal">Unidade</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="fardo" id={`fardo-${produto.id}`} />
                                <Label htmlFor={`fardo-${produto.id}`} className="font-normal">Fardo</Label>
                              </div>
                            </RadioGroup>
                          </div>
                          <div>
                            <Label>Quantidade em Estoque (0 = sem estoque)</Label>
                            <Input
                              type="number"
                              min="0"
                              value={inputValues[produto.id] || ''}
                              onChange={(e) => updateInputValue(produto.id, e.target.value)}
                              placeholder="Digite a quantidade"
                            />
                          </div>
                          <Button
                            onClick={() => handleAddItem(produto.id)}
                            className="w-full"
                            disabled={inputValues[produto.id] === '' || inputValues[produto.id] === undefined}
                          >
                            <Check className="w-4 h-4 mr-2" />
                            {Number(inputValues[produto.id] || 0) === 0 ? 'Confirmar Sem Estoque' : 'Confirmar Quantidade'}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Sticky footer with submit button */}
            <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border py-4 -mx-4 px-4 mt-6">
              <div className="flex flex-col gap-3 max-w-2xl mx-auto">
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !allProductsFilled}
                  size="lg"
                  className="w-full"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-5 h-5 mr-2" />
                  )}
                  {allProductsFilled 
                    ? `Enviar Conferência (${savedItemsCount} produtos)`
                    : `Preencha todos os produtos (${pendingCount} pendentes)`
                  }
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default ConferenciaCoca;
