import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Cherry, Check, Send, Printer, RotateCcw, Plus, Pencil, PackageX, Trash2, Image, Share2, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import ThermalReceipt from '@/components/ThermalReceipt';
import html2canvas from 'html2canvas';

interface Polpa {
  id: string;
  nome: string;
  estoque_atual: number;
  estoque_minimo: number;
}

interface ConferenciaItem {
  polpa_id: string;
  quantidade: number;
  saved: boolean;
  semEstoque?: boolean;
}

interface ReceiptItem {
  nome: string;
  quantidade: number;
  semEstoque?: boolean;
}

const STORAGE_KEY = 'conferencia_polpas_draft';

const ConferenciaPolpas = () => {
  const [polpas, setPolpas] = useState<Polpa[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [conferencias, setConferencias] = useState<Record<string, ConferenciaItem>>({});
  const [submitted, setSubmitted] = useState(false);
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [receiptNumber, setReceiptNumber] = useState<number>(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const receiptRef = useRef<HTMLDivElement>(null);
  const { user, userName } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchPolpas();
  }, []);

  // Load saved draft from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && polpas.length > 0) {
      try {
        const parsed = JSON.parse(saved);
        setConferencias(parsed);
      } catch (e) {
        console.error('Error loading draft:', e);
      }
    }
  }, [polpas]);

  // Save draft to localStorage when conferencias changes
  useEffect(() => {
    if (Object.keys(conferencias).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conferencias));
    }
  }, [conferencias]);

  const fetchPolpas = async () => {
    try {
      const { data } = await supabase
        .from('estoque')
        .select('id, nome, estoque_atual, estoque_minimo, subgrupo')
        .ilike('subgrupo', 'POLPA DE FRUTA')
        .eq('ativo', true)
        .order('nome');

      if (data) {
        setPolpas(data);
        // Check for saved draft first
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setConferencias(parsed);
            // Initialize input values
            const inputs: Record<string, string> = {};
            data.forEach(p => {
              inputs[p.id] = parsed[p.id]?.quantidade?.toString() || '';
            });
            setInputValues(inputs);
          } catch (e) {
            initializeConferencias(data);
          }
        } else {
          initializeConferencias(data);
        }
      }
    } catch (error) {
      console.error('Error fetching polpas:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeConferencias = (data: Polpa[]) => {
    const initial: Record<string, ConferenciaItem> = {};
    const inputs: Record<string, string> = {};
    data.forEach(p => {
      initial[p.id] = { polpa_id: p.id, quantidade: 0, saved: false, semEstoque: false };
      inputs[p.id] = '';
    });
    setConferencias(initial);
    setInputValues(inputs);
  };

  const handleMarkNoStock = (polpaId: string) => {
    setConferencias(prev => ({
      ...prev,
      [polpaId]: {
        polpa_id: polpaId,
        quantidade: 0,
        saved: true,
        semEstoque: true,
      },
    }));
    setInputValues(prev => ({ ...prev, [polpaId]: '0' }));
    toast({ title: 'Marcado!', description: 'Item marcado como sem estoque' });
  };

  const updateInputValue = (polpaId: string, value: string) => {
    setInputValues(prev => ({
      ...prev,
      [polpaId]: value,
    }));
  };

  const handleAddItem = (polpaId: string) => {
    const value = Number(inputValues[polpaId] || 0);
    setConferencias(prev => ({
      ...prev,
      [polpaId]: {
        polpa_id: polpaId,
        quantidade: value,
        saved: true,
      },
    }));
    setEditingId(null);
    toast({
      title: 'Salvo!',
      description: 'Quantidade adicionada',
    });
  };

  const handleEdit = (polpaId: string) => {
    setEditingId(polpaId);
  };

  const handleRemoveItem = (polpaId: string) => {
    setConferencias(prev => ({
      ...prev,
      [polpaId]: {
        polpa_id: polpaId,
        quantidade: 0,
        saved: false,
        semEstoque: false,
      },
    }));
    setInputValues(prev => ({
      ...prev,
      [polpaId]: '',
    }));
    toast({
      title: 'Removido',
      description: 'Item removido da conferência',
    });
  };

  const handleSubmit = async () => {
    if (!user) return;

    setSubmitting(true);

    try {
      const conferenciasList = Object.values(conferencias)
        .filter(c => c.saved && (c.quantidade > 0 || c.semEstoque))
        .map(c => ({
          polpa_id: c.polpa_id,
          usuario_id: user.id,
          quantidade_conferida: c.quantidade,
          observacao: c.semEstoque ? 'SEM ESTOQUE' : null,
        }));

      if (conferenciasList.length === 0) {
        toast({
          title: 'Atenção',
          description: 'Adicione pelo menos uma polpa antes de enviar',
          variant: 'destructive',
        });
        setSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from('conferencias_polpas')
        .insert(conferenciasList);

      if (error) throw error;

      // Clear localStorage after successful submission
      localStorage.removeItem(STORAGE_KEY);

      // Prepare receipt items including semEstoque flag
      const items: ReceiptItem[] = Object.values(conferencias)
        .filter(c => c.saved && (c.quantidade > 0 || c.semEstoque))
        .map(c => {
          const polpa = polpas.find(p => p.id === c.polpa_id);
          return {
            nome: polpa?.nome || 'Polpa',
            quantidade: c.quantidade,
            semEstoque: c.semEstoque,
          };
        });

      // Generate a receipt number based on timestamp
      const receiptNum = Math.floor(Date.now() / 1000) % 1000000;

      setReceiptItems(items);
      setReceiptNumber(receiptNum);

      toast({
        title: 'Conferência Enviada!',
        description: `${conferenciasList.length} polpa(s) conferida(s) com sucesso`,
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

  const handleNoStock = async () => {
    if (!user) return;

    setSubmitting(true);

    try {
      // Insert a single record indicating no stock
      const { error } = await supabase
        .from('conferencias_polpas')
        .insert([{
          polpa_id: polpas[0]?.id,
          usuario_id: user.id,
          quantidade_conferida: 0,
          observacao: 'SEM ESTOQUE',
        }]);

      if (error) throw error;

      // Clear localStorage
      localStorage.removeItem(STORAGE_KEY);

      toast({
        title: 'Registrado!',
        description: 'Conferência sem estoque registrada',
      });

      // Reset the form
      initializeConferencias(polpas);
    } catch (error) {
      console.error('Error submitting no stock:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao registrar',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: 'Erro',
        description: 'Não foi possível abrir a janela de impressão. Verifique se pop-ups estão permitidos.',
        variant: 'destructive',
      });
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pedido de Polpas</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: 'Courier New', Courier, monospace;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .receipt {
              width: 80mm;
              padding: 5mm;
              box-sizing: border-box;
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            ${printContent.innerHTML}
          </div>
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
        scale: 2,
      });
      
      const link = document.createElement('a');
      link.download = `pedido-polpas-${String(receiptNumber).padStart(6, '0')}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
      
      toast({ title: 'Imagem salva!', description: 'Agora você pode compartilhar no WhatsApp' });
    } catch (error) {
      console.error('Error saving image:', error);
      toast({ title: 'Erro', description: 'Não foi possível salvar a imagem', variant: 'destructive' });
    }
  };

  // Generate text for copying (like Coca-Cola)
  const generateTextReport = (): string => {
    const dataFormatada = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    
    let text = `🍓 *CONFERÊNCIA DE POLPAS*\n`;
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
        text += `• ${item.nome.toUpperCase()} - ${item.quantidade} un\n`;
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

  const handleShareWhatsApp = async () => {
    if (!receiptRef.current) return;

    try {
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95);
      });

      const file = new File([blob], `pedido-polpas-${String(receiptNumber).padStart(6, '0')}.jpg`, { type: 'image/jpeg' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Pedido de Polpas',
          text: 'Comprovante de conferência de polpas',
        });
      } else {
        const link = document.createElement('a');
        link.download = `pedido-polpas-${String(receiptNumber).padStart(6, '0')}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.95);
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

  const handleNewConferencia = () => {
    setSubmitted(false);
    setReceiptItems([]);
    setReceiptNumber(0);
    localStorage.removeItem(STORAGE_KEY);
    initializeConferencias(polpas);
  };

  const savedItemsCount = Object.values(conferencias).filter(c => c.saved && (c.quantidade > 0 || c.semEstoque)).length;
  const semEstoqueCount = Object.values(conferencias).filter(c => c.saved && c.semEstoque).length;

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

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
              <p className="text-muted-foreground text-sm mt-1">
                Imprima o comprovante abaixo
              </p>
            </div>
          </div>

          {/* Receipt Preview */}
          <div className="flex justify-center">
            <div className="shadow-lg rounded-lg overflow-hidden border border-border">
              <ThermalReceipt
                ref={receiptRef}
                items={receiptItems}
                numero={receiptNumber}
                operador={userName || undefined}
              />
            </div>
          </div>

          {/* Actions */}
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

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
            <Cherry className="w-8 h-8" />
            Conferência de Polpas
          </h1>
          <p className="text-muted-foreground mt-1">
            Informe a quantidade de cada polpa em estoque
          </p>
        </div>

        {polpas.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Cherry className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma polpa cadastrada ainda</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary of saved items */}
            {savedItemsCount > 0 && (
              <Card className="bg-primary/10 border-primary/20">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-primary">
                        {savedItemsCount} polpa(s) conferida(s)
                      </span>
                      {semEstoqueCount > 0 && (
                        <span className="text-sm text-destructive ml-2">
                          ({semEstoqueCount} sem estoque)
                        </span>
                      )}
                    </div>
                    <Check className="w-5 h-5 text-primary" />
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {polpas.map((polpa) => {
                const item = conferencias[polpa.id];
                const isSaved = item?.saved && (item?.quantidade > 0 || item?.semEstoque);
                const isEditing = editingId === polpa.id;
                const hasZeroStock = polpa.estoque_atual === 0;

                return (
                  <Card key={polpa.id} className={`${isSaved && !isEditing ? 'border-primary/50 bg-primary/5' : ''} ${item?.semEstoque ? 'border-destructive/50 bg-destructive/5' : ''}`}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Cherry className="w-5 h-5 text-primary" />
                          {polpa.nome}
                        </span>
                        {item?.semEstoque && !isEditing ? (
                          <span className="text-sm font-normal text-destructive flex items-center gap-1">
                            <PackageX className="w-4 h-4" />
                            SEM ESTOQUE
                          </span>
                        ) : isSaved && !isEditing && (
                          <span className="text-sm font-normal text-primary flex items-center gap-1">
                            <Check className="w-4 h-4" />
                            {item.quantidade}
                          </span>
                        )}
                      </CardTitle>
                      {hasZeroStock && !item?.semEstoque && !isSaved && (
                        <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
                          <PackageX className="w-3 h-3" />
                          Estoque registrado: 0
                        </span>
                      )}
                    </CardHeader>
                    <CardContent>
                      {item?.semEstoque && !isEditing ? (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveItem(polpa.id)}
                            className="flex-1 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Remover
                          </Button>
                        </div>
                      ) : isSaved && !isEditing ? (
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEdit(polpa.id)}
                            className="flex-1"
                          >
                            <Pencil className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleRemoveItem(polpa.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <Label>Quantidade em Estoque</Label>
                            <Input
                              type="number"
                              min="0"
                              value={inputValues[polpa.id] || ''}
                              onChange={(e) => updateInputValue(polpa.id, e.target.value)}
                              placeholder="0"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              onClick={() => handleAddItem(polpa.id)}
                              size="sm"
                              className="flex-1"
                              disabled={!inputValues[polpa.id] || Number(inputValues[polpa.id]) <= 0}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Adicionar
                            </Button>
                            <Button
                              onClick={() => handleMarkNoStock(polpa.id)}
                              variant="destructive"
                              size="sm"
                              title="Marcar como sem estoque"
                            >
                              <PackageX className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="sticky bottom-4 space-y-3">
              <Button 
                onClick={handleSubmit} 
                disabled={submitting || savedItemsCount === 0}
                size="lg"
                className="w-full shadow-lg"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Send className="w-5 h-5 mr-2" />
                )}
                Enviar Conferência ({savedItemsCount})
              </Button>
              
              <Button 
                onClick={handleNoStock} 
                disabled={submitting}
                variant="outline"
                size="lg"
                className="w-full"
              >
                <PackageX className="w-5 h-5 mr-2" />
                SEM ESTOQUE
              </Button>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default ConferenciaPolpas;
