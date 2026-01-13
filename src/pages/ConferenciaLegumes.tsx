import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Leaf, Check, Send, Printer, RotateCcw, Plus, Pencil, Trash2, Image, Share2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Legume {
  id: string;
  nome_legume: string;
  quantidade_estoque: number;
  estoque_minimo: number;
  unidade_medida: string;
}

interface ConferenciaItem {
  legume_id: string;
  quantidade: number;
  saved: boolean;
}

interface ReceiptItem {
  nome: string;
  quantidade: number;
  unidade: string;
}

const STORAGE_KEY = 'conferencia_legumes_draft';

const ConferenciaLegumes = () => {
  const [legumes, setLegumes] = useState<Legume[]>([]);
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
    fetchLegumes();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && legumes.length > 0) {
      try {
        const parsed = JSON.parse(saved);
        setConferencias(parsed);
        const inputs: Record<string, string> = {};
        legumes.forEach(l => {
          const qty = parsed[l.id]?.quantidade;
          inputs[l.id] = qty && qty > 0 ? qty.toString() : '';
        });
        setInputValues(inputs);
      } catch (e) {
        initializeConferencias(legumes);
      }
    }
  }, [legumes]);

  useEffect(() => {
    if (Object.keys(conferencias).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conferencias));
    }
  }, [conferencias]);

  const fetchLegumes = async () => {
    try {
      const { data } = await supabase
        .from('legumes')
        .select('*')
        .order('nome_legume');

      if (data) {
        setLegumes(data);
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setConferencias(parsed);
            const inputs: Record<string, string> = {};
            data.forEach(l => {
              const qty = parsed[l.id]?.quantidade;
              inputs[l.id] = qty && qty > 0 ? qty.toString() : '';
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
      console.error('Error fetching legumes:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeConferencias = (data: Legume[]) => {
    const initial: Record<string, ConferenciaItem> = {};
    const inputs: Record<string, string> = {};
    data.forEach(l => {
      initial[l.id] = { legume_id: l.id, quantidade: 0, saved: false };
      inputs[l.id] = '';
    });
    setConferencias(initial);
    setInputValues(inputs);
  };

  const updateInputValue = (legumeId: string, value: string) => {
    setInputValues(prev => ({ ...prev, [legumeId]: value }));
  };

  const handleAddItem = (legumeId: string) => {
    const value = Number(inputValues[legumeId] || 0);
    setConferencias(prev => ({
      ...prev,
      [legumeId]: { legume_id: legumeId, quantidade: value, saved: true },
    }));
    setEditingId(null);
    toast({ title: 'Salvo!', description: 'Quantidade adicionada' });
  };

  const handleEdit = (legumeId: string) => {
    setEditingId(legumeId);
  };

  const handleRemoveItem = (legumeId: string) => {
    setConferencias(prev => ({
      ...prev,
      [legumeId]: { legume_id: legumeId, quantidade: 0, saved: false },
    }));
    setInputValues(prev => ({ ...prev, [legumeId]: '' }));
    toast({ title: 'Removido', description: 'Item removido' });
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);

    try {
      const recebimentosList = Object.values(conferencias)
        .filter(c => c.quantidade > 0 && c.saved)
        .map(c => ({
          legume_id: c.legume_id,
          usuario_id: user.id,
          quantidade_recebida: c.quantidade,
        }));

      if (recebimentosList.length === 0) {
        toast({ title: 'Atenção', description: 'Adicione pelo menos um legume', variant: 'destructive' });
        setSubmitting(false);
        return;
      }

      const { data, error } = await supabase
        .from('recebimentos_legumes')
        .insert(recebimentosList)
        .select('numero_recebimento')
        .limit(1);

      if (error) throw error;

      // Update stock for each legume
      for (const item of recebimentosList) {
        const legume = legumes.find(l => l.id === item.legume_id);
        if (legume) {
          await supabase
            .from('legumes')
            .update({ quantidade_estoque: legume.quantidade_estoque + item.quantidade_recebida })
            .eq('id', item.legume_id);
        }
      }

      localStorage.removeItem(STORAGE_KEY);

      const items: ReceiptItem[] = recebimentosList
        .filter(c => c.quantidade_recebida > 0)
        .map(c => {
          const legume = legumes.find(l => l.id === c.legume_id);
          return {
            nome: legume?.nome_legume || 'Legume',
            quantidade: c.quantidade_recebida,
            unidade: 'unidades',
          };
        });

      const receiptNum = data?.[0]?.numero_recebimento || 1;
      setReceiptItems(items);
      setReceiptNumber(receiptNum);
      toast({ title: 'Recebimento Enviado!', description: `${recebimentosList.length} legume(s) registrado(s)` });
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting recebimento:', error);
      toast({ title: 'Erro', description: 'Erro ao enviar recebimento', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const generateReceiptHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Recebimento Legumes</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { margin: 0; padding: 0; font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; }
            .receipt { padding: 5mm; }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
            .header h1 { font-size: 16px; font-weight: bold; margin: 0; }
            .header p { margin: 2px 0; }
            .info { text-align: center; margin-bottom: 8px; font-size: 10px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { text-align: left; padding: 4px 2px; border-bottom: 1px dotted #ccc; }
            th { font-weight: bold; border-bottom: 1px solid #000; }
            .footer { text-align: center; margin-top: 16px; font-size: 10px; border-top: 1px dashed #000; padding-top: 8px; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h1>RECEBIMENTO LEGUMES</h1>
              <p>Comercial Costa</p>
              <p>Nº ${String(receiptNumber).padStart(6, '0')}</p>
            </div>
            <div class="info">
              <p>${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              ${userName ? `<p>Operador: ${userName}</p>` : ''}
            </div>
            <table>
              <thead><tr><th>Legume</th><th>Qtd</th></tr></thead>
              <tbody>
                ${receiptItems.filter(item => item.quantidade > 0).map(item => `<tr><td>${item.nome}</td><td>${item.quantidade} ${item.unidade}</td></tr>`).join('')}
              </tbody>
            </table>
            <div class="footer">
              <p>Total: ${receiptItems.length} itens</p>
              <p style="font-style: italic; margin-top: 8px;">"PREÇO BAIXO DO JEITO QUE VOCÊ GOSTA"</p>
              <p>*** FIM DO COMPROVANTE ***</p>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: 'Erro', description: 'Não foi possível abrir a janela de impressão.', variant: 'destructive' });
      return;
    }
    printWindow.document.write(generateReceiptHTML());
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
      link.download = `recebimento-legumes-${String(receiptNumber).padStart(6, '0')}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
      
      toast({ title: 'Imagem salva!', description: 'Agora você pode compartilhar no WhatsApp' });
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
        scale: 2,
      });

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95);
      });

      const file = new File([blob], `recebimento-legumes-${String(receiptNumber).padStart(6, '0')}.jpg`, { type: 'image/jpeg' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Recebimento de Legumes',
          text: 'Comprovante de recebimento de legumes',
        });
      } else {
        const link = document.createElement('a');
        link.download = `recebimento-legumes-${String(receiptNumber).padStart(6, '0')}.jpg`;
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
    initializeConferencias(legumes);
  };

  const savedItemsCount = Object.values(conferencias).filter(c => c.saved && c.quantidade > 0).length;

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
              <h2 className="text-xl font-bold text-foreground">Recebimento Enviado!</h2>
              <p className="text-muted-foreground text-sm mt-1">Nº {String(receiptNumber).padStart(6, '0')}</p>
            </div>
          </div>

          <div className="flex justify-center">
            <div ref={receiptRef} className="bg-white text-black p-4 shadow-lg rounded-lg border border-border min-w-[280px]">
              <div className="text-center border-b border-dashed border-gray-400 pb-2 mb-2">
                <h1 className="font-bold text-lg">RECEBIMENTO LEGUMES</h1>
                <p className="text-sm">Comercial Costa</p>
                <p className="text-xs">Nº {String(receiptNumber).padStart(6, '0')}</p>
              </div>
              <p className="text-center text-xs mb-2">{format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              {userName && <p className="text-xs mb-2">Operador: {userName}</p>}
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-400">
                    <th className="text-left py-1">Legume</th>
                    <th className="text-right py-1">Qtd</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptItems.filter(item => item.quantidade > 0).map((item, i) => (
                    <tr key={i} className="border-b border-dotted border-gray-300">
                      <td className="py-1">{item.nome}</td>
                      <td className="text-right py-1">{item.quantidade} {item.unidade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-center mt-4 pt-2 border-t border-dashed border-gray-400">
                <p className="text-xs">Total: {receiptItems.length} itens</p>
                <p className="text-xs italic mt-2">"PREÇO BAIXO DO JEITO QUE VOCÊ GOSTA"</p>
                <p className="text-xs mt-1">*** FIM DO COMPROVANTE ***</p>
              </div>
            </div>
          </div>

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
          <div className="flex justify-center">
            <Button onClick={handleNewConferencia} variant="outline" size="lg">
              <RotateCcw className="w-5 h-5 mr-2" />
              Novo Recebimento
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
            <Leaf className="w-8 h-8" />
            Conferência de Legumes
          </h1>
          <p className="text-muted-foreground mt-1">Informe a quantidade recebida de cada legume</p>
        </div>

        {legumes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Leaf className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum legume cadastrado ainda</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {savedItemsCount > 0 && (
              <Card className="bg-primary/10 border-primary/20">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-primary">{savedItemsCount} legume(s) adicionado(s)</span>
                    <Check className="w-5 h-5 text-primary" />
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {legumes.map((legume) => {
                const item = conferencias[legume.id];
                const isSaved = item?.saved && item?.quantidade > 0;
                const isEditing = editingId === legume.id;

                return (
                  <Card key={legume.id} className={isSaved && !isEditing ? 'border-primary/50 bg-primary/5' : ''}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Leaf className="w-5 h-5 text-green-600" />
                          {legume.nome_legume}
                        </span>
                        {isSaved && !isEditing && (
                          <span className="text-sm font-normal text-primary flex items-center gap-1">
                            <Check className="w-4 h-4" />
                            {item.quantidade} {legume.unidade_medida}
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isSaved && !isEditing ? (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(legume.id)} className="flex-1">
                            <Pencil className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleRemoveItem(legume.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <Label>Quantidade ({legume.unidade_medida})</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.1"
                              value={inputValues[legume.id] || ''}
                              onChange={(e) => updateInputValue(legume.id, e.target.value)}
                              placeholder=""
                            />
                          </div>
                          <Button
                            onClick={() => handleAddItem(legume.id)}
                            size="sm"
                            className="w-full"
                            disabled={!inputValues[legume.id] || Number(inputValues[legume.id]) <= 0}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Adicionar
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="sticky bottom-4">
              <Button onClick={handleSubmit} disabled={submitting || savedItemsCount === 0} size="lg" className="w-full shadow-lg">
                {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />}
                Enviar Recebimento
              </Button>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default ConferenciaLegumes;