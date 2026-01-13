import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Printer, Search, Tag, Plus, Minus, Trash2, Eye, QrCode, Palette } from 'lucide-react';
import { LabelCanvasEditor, LabelElement } from './LabelCanvasEditor';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

interface EstoqueItem {
  id: string;
  codigo: string;
  nome: string;
  preco_venda: number;
  preco_promocao: number | null;
  unidade: string | null;
  preco_custo?: number;
  estoque_atual?: number;
  atualizado_em?: string | null;
}

interface LabelItem extends EstoqueItem {
  quantity: number;
  usePromo: boolean;
}

interface ThermalLabelGeneratorProps {
  items: EstoqueItem[];
}

// Tamanhos de etiqueta disponíveis para Tanca TP650 (largura máxima 80mm)
const LABEL_SIZES = [
  { id: '40x25', name: '40mm × 25mm', width: 40, height: 25, nameFontSize: 8, priceFontSize: 18 },
  { id: '50x30', name: '50mm × 30mm', width: 50, height: 30, nameFontSize: 10, priceFontSize: 22 },
  { id: '60x40', name: '60mm × 40mm', width: 60, height: 40, nameFontSize: 12, priceFontSize: 28 },
  { id: '80x30', name: '80mm × 30mm', width: 80, height: 30, nameFontSize: 12, priceFontSize: 28 },
  { id: '80x40', name: '80mm × 40mm', width: 80, height: 40, nameFontSize: 14, priceFontSize: 32 },
  { id: '80x50', name: '80mm × 50mm', width: 80, height: 50, nameFontSize: 16, priceFontSize: 38 },
];

const ThermalLabelGenerator = ({ items }: ThermalLabelGeneratorProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<LabelItem[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showVisualEditor, setShowVisualEditor] = useState(false);
  const [labelSize, setLabelSize] = useState<string>('80x40');
  const [labelElements, setLabelElements] = useState<LabelElement[]>([]);
  const { toast } = useToast();

  const currentLabelSize = LABEL_SIZES.find(s => s.id === labelSize) || LABEL_SIZES[4];

  // Carregar layout salvo
  useEffect(() => {
    const loadLayout = async () => {
      try {
        const { data } = await supabase
          .from('configuracoes_sistema')
          .select('valor')
          .eq('chave', 'layout_etiqueta')
          .single();

        if (data?.valor && typeof data.valor === 'object' && !Array.isArray(data.valor)) {
          const layout = data.valor as unknown as { elements?: LabelElement[]; labelSize?: string };
          if (layout.elements) setLabelElements(layout.elements);
          if (layout.labelSize) setLabelSize(layout.labelSize);
        }
      } catch (error) {
        // Layout não existe ainda
      }
    };

    loadLayout();
  }, []);

  // Salvar layout
  const saveLayout = async (elements: LabelElement[], size: string) => {
    try {
      const layout = { elements, labelSize: size };
      
      const { data: existing } = await supabase
        .from('configuracoes_sistema')
        .select('id')
        .eq('chave', 'layout_etiqueta')
        .single();

      if (existing) {
        await supabase
          .from('configuracoes_sistema')
          .update({
            valor: JSON.parse(JSON.stringify(layout)) as Json,
            atualizado_em: new Date().toISOString(),
          })
          .eq('chave', 'layout_etiqueta');
      } else {
        await supabase
          .from('configuracoes_sistema')
          .insert([{
            chave: 'layout_etiqueta',
            valor: JSON.parse(JSON.stringify(layout)) as Json,
          }]);
      }

      setLabelElements(elements);
      setLabelSize(size);
      toast({
        title: 'Layout salvo!',
        description: 'O design da etiqueta foi salvo com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao salvar layout:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o layout.',
        variant: 'destructive',
      });
    }
  };

  // Gera a URL base para a página de informações do produto
  const getProductInfoUrl = (productId: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/produto-info?id=${productId}`;
  };

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items.slice(0, 50);
    
    const query = searchQuery.toLowerCase();
    return items.filter(item => 
      item.codigo.toLowerCase().includes(query) ||
      item.nome.toLowerCase().includes(query)
    ).slice(0, 100);
  }, [items, searchQuery]);

  const formatPrice = (value: number): string => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const addItem = (item: EstoqueItem) => {
    const existing = selectedItems.find(s => s.id === item.id);
    if (existing) {
      setSelectedItems(prev =>
        prev.map(s => s.id === item.id ? { ...s, quantity: s.quantity + 1 } : s)
      );
    } else {
      setSelectedItems(prev => [...prev, { ...item, quantity: 1, usePromo: false }]);
    }
    toast({ title: 'Item adicionado', description: item.nome });
  };

  const removeItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(s => s.id !== itemId));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setSelectedItems(prev =>
      prev.map(s => {
        if (s.id === itemId) {
          const newQty = Math.max(1, s.quantity + delta);
          return { ...s, quantity: newQty };
        }
        return s;
      })
    );
  };

  const togglePromoPrice = (itemId: string) => {
    setSelectedItems(prev =>
      prev.map(s => s.id === itemId ? { ...s, usePromo: !s.usePromo } : s)
    );
  };

  const getTotalLabels = () => selectedItems.reduce((acc, item) => acc + item.quantity, 0);

  // Função para gerar QR Code como Data URL
  const generateQRCodeDataUrl = async (url: string): Promise<string> => {
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 200,
        margin: 1,
        color: { dark: '#000000', light: '#FFFFFF' },
        errorCorrectionLevel: 'M',
      });
      return dataUrl;
    } catch (error) {
      console.error('Erro ao gerar QR code:', error);
      return '';
    }
  };

  // Imprimir etiquetas usando o layout do editor visual
  const printDirect = async () => {
    if (selectedItems.length === 0) {
      toast({ title: 'Nenhum item', description: 'Adicione itens para imprimir', variant: 'destructive' });
      return;
    }

    // Se não há elementos do layout, usar defaults
    const elementsToUse = labelElements.length > 0 ? labelElements : [
      { id: 'product-name', type: 'product-name' as const, x: currentLabelSize.width / 2, y: 6, fontSize: 10, fontWeight: 'bold' as const, fill: '#000000', visible: true },
      { id: 'currency', type: 'currency' as const, x: 4, y: currentLabelSize.height * 0.65, fontSize: 8, fontWeight: 'bold' as const, fill: '#000000', visible: true },
      { id: 'price-integer', type: 'price-integer' as const, x: 12, y: currentLabelSize.height * 0.55, fontSize: 28, fontWeight: 'bold' as const, fill: '#000000', visible: true },
      { id: 'price-cents', type: 'price-cents' as const, x: currentLabelSize.width * 0.55, y: currentLabelSize.height * 0.45, fontSize: 14, fontWeight: 'bold' as const, fill: '#000000', visible: true },
      { id: 'qrcode', type: 'qrcode' as const, x: currentLabelSize.width - 10, y: currentLabelSize.height - 10, qrSize: 10, visible: true },
    ];

    console.log('Elementos para impressão:', elementsToUse);

    toast({
      title: 'Gerando etiquetas...',
      description: 'Aguarde enquanto as etiquetas são preparadas.',
    });

    const { width, height } = currentLabelSize;
    
    // Gerar QR codes para todos os itens
    const qrCodes: Record<string, string> = {};
    const hasQrElement = elementsToUse.some(el => el.type === 'qrcode' && el.visible !== false);
    
    if (hasQrElement) {
      for (const item of selectedItems) {
        const url = getProductInfoUrl(item.id);
        const dataUrl = await generateQRCodeDataUrl(url);
        qrCodes[item.id] = dataUrl;
      }
    }

    // Usar exatamente as dimensões da etiqueta selecionada
    const labelWidthMM = width;
    const labelHeightMM = height;
    
    // Calcular altura total necessária para todas as etiquetas
    const totalLabels = selectedItems.reduce((acc, item) => acc + item.quantity, 0);
    const totalHeight = totalLabels * labelHeightMM;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [labelWidthMM, Math.max(totalHeight, labelHeightMM)],
      putOnlyUsedFonts: true,
      compress: true,
    });

    // No editor visual:
    // - fontSize está em "pt" que é exibido como: fontSize * MM_TO_PX * 0.35 pixels
    // - MM_TO_PX = 4, então fontSize 32pt = 32 * 4 * 0.35 = 44.8 pixels de altura
    // - Para converter para mm: 44.8 pixels / (4 px/mm) = 11.2mm de altura visual
    // 
    // No jsPDF:
    // - fontSize em pt, onde 1pt ≈ 0.353mm
    // - Para ter 11.2mm de altura, precisamos fontSize = 11.2 / 0.353 ≈ 32pt
    //
    // Conclusão: fontSize do editor pode ser usado diretamente no jsPDF!
    // Mas o Y no editor é o TOPO do texto, e no jsPDF é a BASELINE
    // Offset baseline ≈ fontSize * 0.353mm * 0.8 (80% da altura da fonte)
    
    const getBaselineOffset = (fontSize: number) => fontSize * 0.353 * 0.75;

    let currentY = 0;

    // Para cada item selecionado
    for (const item of selectedItems) {
      const price = item.usePromo && item.preco_promocao ? item.preco_promocao : item.preco_venda;
      const priceFormatted = price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const [priceInteger, priceCents] = priceFormatted.split(',');

      for (let i = 0; i < item.quantity; i++) {
        // Borda pontilhada para guia de corte
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.1);
        pdf.setLineDashPattern([1, 1], 0);
        pdf.rect(0.3, currentY + 0.3, labelWidthMM - 0.6, labelHeightMM - 0.6, 'S');
        pdf.setLineDashPattern([], 0);

        // Renderizar cada elemento do layout na posição exata do editor
        for (const element of elementsToUse) {
          // Verificar se o elemento é visível (undefined = visível por padrão)
          if (element.visible === false) continue;

          const fontSize = element.fontSize || 12;
          
          // Posição X em mm (direta do editor)
          const x = element.x;
          // Posição Y: editor usa topo, PDF usa baseline
          const baselineOffset = getBaselineOffset(fontSize);
          const y = currentY + element.y + baselineOffset;

          pdf.setFont('helvetica', element.fontWeight === 'bold' ? 'bold' : 'normal');
          
          // Converter cor hex para RGB
          const hexColor = element.fill || '#000000';
          const r = parseInt(hexColor.slice(1, 3), 16);
          const g = parseInt(hexColor.slice(3, 5), 16);
          const b = parseInt(hexColor.slice(5, 7), 16);
          pdf.setTextColor(r, g, b);

          switch (element.type) {
            case 'product-name': {
              pdf.setFontSize(fontSize);
              const name = item.nome.toUpperCase();
              const maxWidth = labelWidthMM - 4;
              let lines = pdf.splitTextToSize(name, maxWidth);
              if (lines.length > 2) {
                lines = lines.slice(0, 2);
                if (lines[1] && lines[1].length > 3) {
                  lines[1] = lines[1].slice(0, -3) + '...';
                }
              }
              // Centralizar horizontalmente, usar posição Y do elemento
              lines.forEach((line: string, idx: number) => {
                const lineSpacing = fontSize * 0.4;
                pdf.text(line, labelWidthMM / 2, y + (idx * lineSpacing), { align: 'center' });
              });
              break;
            }

            case 'currency': {
              pdf.setFontSize(fontSize);
              pdf.text('R$', x, y);
              break;
            }

            case 'price-integer': {
              pdf.setFontSize(fontSize);
              pdf.text(priceInteger, x, y);
              break;
            }

            case 'price-cents': {
              pdf.setFontSize(fontSize);
              pdf.text(',' + priceCents, x, y);
              break;
            }

            case 'qrcode': {
              if (qrCodes[item.id]) {
                const qrSize = element.qrSize || 10;
                try {
                  // QR usa centro como referência no editor
                  pdf.addImage(qrCodes[item.id], 'PNG', x - qrSize / 2, currentY + element.y - qrSize / 2, qrSize, qrSize);
                } catch (e) {
                  console.error('Erro ao adicionar QR code:', e);
                }
              }
              break;
            }

            case 'promo-badge': {
              if (item.usePromo && item.preco_promocao) {
                pdf.setFillColor(0, 0, 0);
                pdf.rect(x - 6, y - 3, 12, 4, 'F');
                pdf.setTextColor(255, 255, 255);
                pdf.setFontSize(7);
                pdf.text('OFERTA', x, y, { align: 'center' });
                pdf.setTextColor(0, 0, 0);
              }
              break;
            }

            case 'text': {
              pdf.setFontSize(fontSize);
              pdf.text(element.text || '', x, y);
              break;
            }
          }
        }

        currentY += labelHeightMM;
      }
    }

    pdf.save(`etiquetas-${new Date().toISOString().slice(0, 10)}.pdf`);

    toast({
      title: 'Etiquetas geradas!',
      description: `${getTotalLabels()} etiqueta(s) geradas. Abra o PDF para imprimir.`,
      duration: 8000,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              Gerador de Etiquetas
            </h2>
            <p className="text-muted-foreground text-sm">
              Otimizado para Tanca TP650
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedItems.length > 0 && (
              <Badge variant="secondary" className="text-sm px-3 py-1">
                {getTotalLabels()} etiqueta(s)
              </Badge>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowVisualEditor(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Palette className="h-4 w-4 mr-1" />
              Editor Visual
            </Button>
            <Select value={labelSize} onValueChange={setLabelSize}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LABEL_SIZES.map(size => (
                  <SelectItem key={size.id} value={size.id}>
                    {size.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Product Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" />
              Selecionar Produtos
            </CardTitle>
            <CardDescription>
              Busque e adicione produtos para gerar etiquetas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Buscar por código ou nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />

            <div className="max-h-[400px] overflow-y-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nenhum produto encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => (
                      <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{item.nome}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatPrice(item.preco_venda)}
                          {item.preco_promocao && (
                            <span className="text-xs text-green-600 ml-1">
                              ({formatPrice(item.preco_promocao)})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => addItem(item)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Right: Selected Items */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              Etiquetas para Imprimir
            </CardTitle>
            <CardDescription>
              Configure a quantidade e tipo de preço
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Tag className="h-12 w-12 mb-4 opacity-50" />
                <p>Nenhum item selecionado</p>
                <p className="text-sm">Adicione produtos para gerar etiquetas</p>
              </div>
            ) : (
              <>
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {selectedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 p-3 border rounded-lg bg-card"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.nome}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{formatPrice(item.usePromo && item.preco_promocao ? item.preco_promocao : item.preco_venda)}</span>
                          {item.preco_promocao && (
                            <div className="flex items-center gap-1">
                              <Checkbox
                                id={`promo-${item.id}`}
                                checked={item.usePromo}
                                onCheckedChange={() => togglePromoPrice(item.id)}
                              />
                              <Label htmlFor={`promo-${item.id}`} className="text-xs cursor-pointer">
                                Usar promoção
                              </Label>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setShowPreview(true)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    onClick={printDirect}
                    className="flex-1"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Gerar PDF
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview das Etiquetas
            </DialogTitle>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto space-y-4 py-4">
            {selectedItems.map((item) => {
              const price = item.usePromo && item.preco_promocao ? item.preco_promocao : item.preco_venda;
              const priceFormatted = price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              const [priceInteger, priceCents] = priceFormatted.split(',');

              return (
                <div key={item.id} className="space-y-2">
                  <p className="text-sm font-medium">{item.nome} × {item.quantity}</p>
                  <div
                    className="border-2 border-dashed border-gray-300 bg-white p-4 relative"
                    style={{
                      width: `${currentLabelSize.width * 2.5}px`,
                      height: `${currentLabelSize.height * 2.5}px`,
                    }}
                  >
                    <div className="text-center font-bold text-black uppercase text-xs mb-2">
                      {item.nome}
                    </div>
                    <div className="flex items-start justify-center text-black font-bold">
                      <span className="text-sm mt-2">R$</span>
                      <span className="text-3xl leading-none">{priceInteger}</span>
                      <span className="text-lg leading-none">,{priceCents}</span>
                    </div>
                    {item.usePromo && item.preco_promocao && (
                      <div className="absolute top-1 left-1 bg-black text-white text-xs px-2 py-0.5 rounded">
                        OFERTA
                      </div>
                    )}
                    <div className="absolute bottom-1 right-1">
                      <QRCodeCanvas value={getProductInfoUrl(item.id)} size={30} />
                    </div>
                  </div>
                </div>
              );
            })}
            
            {selectedItems.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma etiqueta para visualizar</p>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Fechar
            </Button>
            <Button onClick={() => { setShowPreview(false); printDirect(); }}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editor Visual Canvas */}
      <Dialog open={showVisualEditor} onOpenChange={setShowVisualEditor}>
        <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-purple-500" />
              Editor Visual de Etiquetas
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden h-[calc(90vh-80px)]">
            <LabelCanvasEditor
              initialLabelSize={labelSize}
              initialElements={labelElements.length > 0 ? labelElements : undefined}
              onSave={(elements, size) => {
                saveLayout(elements, size);
                setShowVisualEditor(false);
              }}
              onClose={() => setShowVisualEditor(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ThermalLabelGenerator;
