import { useState, useRef, useCallback, useEffect } from 'react';
import { Stage, Layer, Rect, Text, Image, Line, Transformer } from 'react-konva';
import Konva from 'konva';
import useImage from 'use-image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Type, 
  Trash2, 
  Copy, 
  RotateCcw,
  Download,
  Grid3X3,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Move,
  Save,
  Undo2,
  Redo2,
  Clipboard
} from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';

// Tipos de elementos da etiqueta
export interface LabelElement {
  id: string;
  type: 'product-name' | 'price-integer' | 'price-cents' | 'currency' | 'qrcode' | 'promo-badge' | 'text';
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fill?: string;
  rotation?: number;
  visible?: boolean;
  locked?: boolean;
  opacity?: number;
  // Para QR Code
  qrSize?: number;
  qrValue?: string;
}

// Guias inteligentes
interface SmartGuide {
  type: 'vertical' | 'horizontal';
  position: number;
  color?: string;
}

// Tamanhos de etiqueta
const LABEL_SIZES = [
  { id: '40x25', name: '40×25mm', width: 40, height: 25 },
  { id: '50x30', name: '50×30mm', width: 50, height: 30 },
  { id: '60x40', name: '60×40mm', width: 60, height: 40 },
  { id: '80x30', name: '80×30mm', width: 80, height: 30 },
  { id: '80x40', name: '80×40mm', width: 80, height: 40 },
  { id: '80x50', name: '80×50mm', width: 80, height: 50 },
];

// Escala para visualização (mm para pixels)
const MM_TO_PX = 4;
const SNAP_THRESHOLD = 5; // pixels

// Elementos padrão para uma etiqueta de preço
const getDefaultElements = (labelWidth: number, labelHeight: number): LabelElement[] => [
  {
    id: 'product-name',
    type: 'product-name',
    x: labelWidth / 2,
    y: 8,
    text: 'NOME DO PRODUTO',
    fontSize: 12,
    fontFamily: 'Arial',
    fontWeight: 'bold',
    fill: '#000000',
  },
  {
    id: 'currency',
    type: 'currency',
    x: 8,
    y: labelHeight * 0.6,
    text: 'R$',
    fontSize: 10,
    fontFamily: 'Arial',
    fontWeight: 'bold',
    fill: '#000000',
  },
  {
    id: 'price-integer',
    type: 'price-integer',
    x: labelWidth * 0.35,
    y: labelHeight * 0.55,
    text: '99',
    fontSize: 32,
    fontFamily: 'Arial',
    fontWeight: 'bold',
    fill: '#000000',
  },
  {
    id: 'price-cents',
    type: 'price-cents',
    x: labelWidth * 0.7,
    y: labelHeight * 0.48,
    text: ',99',
    fontSize: 16,
    fontFamily: 'Arial',
    fontWeight: 'bold',
    fill: '#000000',
  },
  {
    id: 'qrcode',
    type: 'qrcode',
    x: labelWidth - 14,
    y: labelHeight - 14,
    qrSize: 12,
    qrValue: 'https://example.com',
    visible: true,
  },
];

interface LabelCanvasEditorProps {
  onSave?: (elements: LabelElement[], labelSize: string) => void;
  onClose?: () => void;
  initialElements?: LabelElement[];
  initialLabelSize?: string;
}

// Componente de QR Code como imagem
function QRCodeElement({ 
  element, 
  commonProps 
}: { 
  element: LabelElement; 
  commonProps: any;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    const generateQR = async () => {
      try {
        const url = await QRCode.toDataURL(element.qrValue || 'https://example.com', {
          width: 200,
          margin: 1,
          color: { dark: '#000000', light: '#FFFFFF' },
        });
        setQrDataUrl(url);
      } catch (e) {
        console.error('Erro ao gerar QR:', e);
      }
    };
    generateQR();
  }, [element.qrValue]);

  const [image] = useImage(qrDataUrl);
  const size = (element.qrSize || 12) * MM_TO_PX;

  if (!image) return null;

  return (
    <Image
      {...commonProps}
      image={image}
      width={size}
      height={size}
      offsetX={size / 2}
      offsetY={size / 2}
    />
  );
}

export function LabelCanvasEditor({ 
  onSave, 
  onClose,
  initialElements,
  initialLabelSize = '80x40'
}: LabelCanvasEditorProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textEditRef = useRef<HTMLInputElement>(null);

  // Estado
  const [labelSize, setLabelSize] = useState(initialLabelSize);
  const [elements, setElements] = useState<LabelElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [history, setHistory] = useState<LabelElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [clipboard, setClipboard] = useState<LabelElement | null>(null);
  const [smartGuides, setSmartGuides] = useState<SmartGuide[]>([]);
  
  // Estado para edição inline
  const [editingElement, setEditingElement] = useState<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    fontSize: number;
  } | null>(null);

  // Dimensões do canvas
  const currentSize = LABEL_SIZES.find(s => s.id === labelSize) || LABEL_SIZES[4];
  const canvasWidth = currentSize.width * MM_TO_PX;
  const canvasHeight = currentSize.height * MM_TO_PX;

  // Inicializar elementos
  useEffect(() => {
    if (initialElements && initialElements.length > 0) {
      setElements(initialElements);
      saveHistory(initialElements);
    } else {
      const defaultEls = getDefaultElements(currentSize.width, currentSize.height);
      setElements(defaultEls);
      saveHistory(defaultEls);
    }
  }, []);

  // Atualizar elementos quando mudar tamanho da etiqueta
  useEffect(() => {
    if (!initialElements) {
      const defaultEls = getDefaultElements(currentSize.width, currentSize.height);
      setElements(defaultEls);
    }
  }, [labelSize]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar se estiver editando texto
      if (editingElement) return;
      
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          e.preventDefault();
          deleteElement(selectedId);
        }
      }
      
      // Ctrl+C - Copy
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (selectedId) {
          e.preventDefault();
          const el = elements.find(el => el.id === selectedId);
          if (el) {
            setClipboard(JSON.parse(JSON.stringify(el)));
            toast.success('Elemento copiado!');
          }
        }
      }
      
      // Ctrl+V - Paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (clipboard) {
          e.preventDefault();
          const newElement: LabelElement = {
            ...clipboard,
            id: `${clipboard.type}-${Date.now()}`,
            x: clipboard.x + 3,
            y: clipboard.y + 3,
          };
          setElements(prev => {
            const newElements = [...prev, newElement];
            saveHistory(newElements);
            return newElements;
          });
          setSelectedId(newElement.id);
          toast.success('Elemento colado!');
        }
      }
      
      // Ctrl+D - Duplicate
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        if (selectedId) {
          e.preventDefault();
          duplicateElement(selectedId);
        }
      }
      
      // Ctrl+Z - Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      
      // Ctrl+Shift+Z ou Ctrl+Y - Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }

      // Arrow keys for fine positioning
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedId) {
        e.preventDefault();
        const delta = e.shiftKey ? 5 : 1;
        const updates: Partial<LabelElement> = {};
        
        switch (e.key) {
          case 'ArrowUp': updates.y = (elements.find(el => el.id === selectedId)?.y || 0) - delta / MM_TO_PX; break;
          case 'ArrowDown': updates.y = (elements.find(el => el.id === selectedId)?.y || 0) + delta / MM_TO_PX; break;
          case 'ArrowLeft': updates.x = (elements.find(el => el.id === selectedId)?.x || 0) - delta / MM_TO_PX; break;
          case 'ArrowRight': updates.x = (elements.find(el => el.id === selectedId)?.x || 0) + delta / MM_TO_PX; break;
        }
        
        updateElementWithHistory(selectedId, updates);
      }

      // Escape - Deselect
      if (e.key === 'Escape') {
        setSelectedId(null);
        setEditingElement(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, elements, clipboard, editingElement]);

  // Salvar histórico
  const saveHistory = useCallback((newElements: LabelElement[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(newElements)));
      return newHistory.slice(-50);
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  // Undo/Redo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setElements(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setElements(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  }, [history, historyIndex]);

  // Atualizar transformer quando seleção muda
  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;
    if (!transformer || !stage) return;

    if (selectedId && !editingElement) {
      const node = stage.findOne(`#${selectedId}`);
      if (node) {
        transformer.nodes([node]);
        transformer.getLayer()?.batchDraw();
      }
    } else {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
    }
  }, [selectedId, editingElement]);

  // Elemento selecionado
  const selectedElement = elements.find(el => el.id === selectedId);

  // Atualizar elemento
  const updateElement = useCallback((id: string, updates: Partial<LabelElement>) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  }, []);

  const updateElementWithHistory = useCallback((id: string, updates: Partial<LabelElement>) => {
    setElements(prev => {
      const newElements = prev.map(el => el.id === id ? { ...el, ...updates } : el);
      saveHistory(newElements);
      return newElements;
    });
  }, [saveHistory]);

  // Calcular guias inteligentes durante o arrasto
  const calculateSmartGuides = useCallback((movingId: string, x: number, y: number, width: number, height: number) => {
    const guides: SmartGuide[] = [];
    const movingCenterX = x + width / 2;
    const movingCenterY = y + height / 2;
    const movingRight = x + width;
    const movingBottom = y + height;

    // Guias do canvas (centro e bordas)
    const canvasCenterX = canvasWidth / 2;
    const canvasCenterY = canvasHeight / 2;

    // Centro horizontal do canvas
    if (Math.abs(movingCenterX - canvasCenterX) < SNAP_THRESHOLD) {
      guides.push({ type: 'vertical', position: canvasCenterX, color: '#a855f7' });
    }
    // Centro vertical do canvas
    if (Math.abs(movingCenterY - canvasCenterY) < SNAP_THRESHOLD) {
      guides.push({ type: 'horizontal', position: canvasCenterY, color: '#a855f7' });
    }

    // Bordas do canvas
    if (Math.abs(x) < SNAP_THRESHOLD) {
      guides.push({ type: 'vertical', position: 0, color: '#3b82f6' });
    }
    if (Math.abs(movingRight - canvasWidth) < SNAP_THRESHOLD) {
      guides.push({ type: 'vertical', position: canvasWidth, color: '#3b82f6' });
    }
    if (Math.abs(y) < SNAP_THRESHOLD) {
      guides.push({ type: 'horizontal', position: 0, color: '#3b82f6' });
    }
    if (Math.abs(movingBottom - canvasHeight) < SNAP_THRESHOLD) {
      guides.push({ type: 'horizontal', position: canvasHeight, color: '#3b82f6' });
    }

    // Guias de alinhamento com outros elementos
    elements.forEach(other => {
      if (other.id === movingId) return;
      if (other.visible === false) return;

      const otherX = other.x * MM_TO_PX;
      const otherY = other.y * MM_TO_PX;
      const otherWidth = other.type === 'qrcode' ? (other.qrSize || 12) * MM_TO_PX : 50;
      const otherHeight = other.type === 'qrcode' ? (other.qrSize || 12) * MM_TO_PX : 20;
      const otherCenterX = otherX;
      const otherCenterY = otherY;

      // Alinhamento de centro X
      if (Math.abs(movingCenterX - otherCenterX) < SNAP_THRESHOLD) {
        guides.push({ type: 'vertical', position: otherCenterX, color: '#22c55e' });
      }
      // Alinhamento de centro Y
      if (Math.abs(movingCenterY - otherCenterY) < SNAP_THRESHOLD) {
        guides.push({ type: 'horizontal', position: otherCenterY, color: '#22c55e' });
      }
      // Alinhamento de topo
      if (Math.abs(y - otherY) < SNAP_THRESHOLD) {
        guides.push({ type: 'horizontal', position: otherY, color: '#f59e0b' });
      }
      // Alinhamento de base
      if (Math.abs(y - otherY) < SNAP_THRESHOLD) {
        guides.push({ type: 'horizontal', position: otherY, color: '#f59e0b' });
      }
    });

    setSmartGuides(guides);
    return guides;
  }, [elements, canvasWidth, canvasHeight]);

  // Handlers
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === e.target.getStage()) {
      setSelectedId(null);
      setEditingElement(null);
    }
  }, []);

  const handleSelect = useCallback((id: string) => {
    const element = elements.find(el => el.id === id);
    if (element?.locked) return;
    setSelectedId(id);
  }, [elements]);

  // Double click para editar texto inline
  const handleDoubleClick = useCallback((element: LabelElement, e: Konva.KonvaEventObject<MouseEvent>) => {
    if (element.locked || element.type === 'qrcode' || element.type === 'promo-badge') return;

    const textNode = e.target;
    const stage = stageRef.current;
    if (!stage) return;

    // Esconder o texto do Konva
    textNode.hide();
    transformerRef.current?.hide();

    const textPosition = textNode.absolutePosition();
    const stageBox = stage.container().getBoundingClientRect();

    setEditingElement({
      id: element.id,
      x: stageBox.left + textPosition.x * zoom,
      y: stageBox.top + textPosition.y * zoom,
      width: Math.max(textNode.width() * zoom, 100),
      height: textNode.height() * zoom + 10,
      text: element.text || '',
      fontSize: (element.fontSize || 12) * MM_TO_PX * 0.35 * zoom,
    });

    setTimeout(() => textEditRef.current?.focus(), 10);
  }, [zoom]);

  // Finalizar edição inline
  const finishEditing = useCallback(() => {
    if (!editingElement) return;

    const stage = stageRef.current;
    const textNode = stage?.findOne(`#${editingElement.id}`);
    textNode?.show();
    transformerRef.current?.show();

    updateElementWithHistory(editingElement.id, { text: editingElement.text });
    setEditingElement(null);
  }, [editingElement, updateElementWithHistory]);

  const handleDragMove = useCallback((element: LabelElement, e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const x = node.x();
    const y = node.y();
    const width = node.width() || 50;
    const height = node.height() || 20;

    const guides = calculateSmartGuides(element.id, x, y, width, height);

    // Aplicar snap
    guides.forEach(guide => {
      if (guide.type === 'vertical') {
        const centerX = x + width / 2;
        if (Math.abs(centerX - guide.position) < SNAP_THRESHOLD) {
          node.x(guide.position - width / 2);
        } else if (Math.abs(x - guide.position) < SNAP_THRESHOLD) {
          node.x(guide.position);
        }
      } else {
        const centerY = y + height / 2;
        if (Math.abs(centerY - guide.position) < SNAP_THRESHOLD) {
          node.y(guide.position - height / 2);
        } else if (Math.abs(y - guide.position) < SNAP_THRESHOLD) {
          node.y(guide.position);
        }
      }
    });
  }, [calculateSmartGuides]);

  const handleDragEnd = useCallback((element: LabelElement, e: Konva.KonvaEventObject<DragEvent>) => {
    setSmartGuides([]);
    updateElementWithHistory(element.id, {
      x: e.target.x() / MM_TO_PX,
      y: e.target.y() / MM_TO_PX,
    });
  }, [updateElementWithHistory]);

  const handleTransformEnd = useCallback((element: LabelElement, e: Konva.KonvaEventObject<Event>) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    
    node.scaleX(1);
    node.scaleY(1);

    const updates: Partial<LabelElement> = {
      x: node.x() / MM_TO_PX,
      y: node.y() / MM_TO_PX,
      rotation: node.rotation(),
    };

    if (element.type === 'qrcode') {
      updates.qrSize = (element.qrSize || 12) * Math.max(scaleX, scaleY);
    } else if (element.fontSize) {
      updates.fontSize = Math.max(6, element.fontSize * Math.max(scaleX, scaleY));
    }

    updateElementWithHistory(element.id, updates);
  }, [updateElementWithHistory]);

  // Duplicar elemento
  const duplicateElement = useCallback((id: string) => {
    const el = elements.find(e => e.id === id);
    if (!el) return;

    const newElement: LabelElement = {
      ...JSON.parse(JSON.stringify(el)),
      id: `${el.type}-${Date.now()}`,
      x: el.x + 5,
      y: el.y + 5,
    };

    setElements(prev => {
      const newElements = [...prev, newElement];
      saveHistory(newElements);
      return newElements;
    });
    setSelectedId(newElement.id);
    toast.success('Elemento duplicado!');
  }, [elements, saveHistory]);

  // Deletar elemento
  const deleteElement = useCallback((id: string) => {
    setElements(prev => {
      const newElements = prev.filter(el => el.id !== id);
      saveHistory(newElements);
      return newElements;
    });
    setSelectedId(null);
    toast.success('Elemento removido!');
  }, [saveHistory]);

  // Adicionar texto customizado
  const addCustomText = useCallback(() => {
    const newElement: LabelElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      x: currentSize.width / 2,
      y: currentSize.height / 2,
      text: 'Novo texto',
      fontSize: 12,
      fontFamily: 'Arial',
      fontWeight: 'normal',
      fill: '#000000',
    };

    setElements(prev => {
      const newElements = [...prev, newElement];
      saveHistory(newElements);
      return newElements;
    });
    setSelectedId(newElement.id);
  }, [currentSize, saveHistory]);

  // Resetar para padrão
  const resetToDefault = useCallback(() => {
    const defaultEls = getDefaultElements(currentSize.width, currentSize.height);
    setElements(defaultEls);
    saveHistory(defaultEls);
    setSelectedId(null);
    toast.success('Layout resetado!');
  }, [currentSize, saveHistory]);

  // Gerar PDF
  const generatePDF = useCallback(async () => {
    toast.loading('Gerando PDF...');
    
    try {
      const pdf = new jsPDF({
        orientation: currentSize.width > currentSize.height ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [currentSize.width, currentSize.height],
      });

      // Offset para converter Y do editor (topo) para PDF (baseline)
      const getBaselineOffset = (fontSize: number) => fontSize * 0.353 * 0.75;

      // Renderizar cada elemento
      for (const el of elements) {
        if (el.visible === false) continue;

        const x = el.x;
        const fontSize = el.fontSize || 12;
        const baselineOffset = getBaselineOffset(fontSize);
        const y = el.y + baselineOffset;

        if (el.type === 'qrcode') {
          const qrDataUrl = await QRCode.toDataURL(el.qrValue || 'https://example.com', {
            width: 200,
            margin: 1,
          });
          const size = el.qrSize || 12;
          pdf.addImage(qrDataUrl, 'PNG', x - size/2, el.y - size/2, size, size);
        } else if (el.text) {
          pdf.setFont('helvetica', el.fontWeight === 'bold' ? 'bold' : 'normal');
          pdf.setFontSize(fontSize);
          pdf.setTextColor(el.fill || '#000000');
          
          if (el.type === 'product-name') {
            pdf.text(el.text, currentSize.width / 2, y, { align: 'center' });
          } else {
            pdf.text(el.text, x, y);
          }
        }
      }

      pdf.save(`etiqueta-${currentSize.id}.pdf`);
      toast.dismiss();
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      toast.dismiss();
      toast.error('Erro ao gerar PDF');
      console.error(error);
    }
  }, [elements, currentSize]);

  // Salvar configuração
  const handleSave = useCallback(() => {
    onSave?.(elements, labelSize);
    toast.success('Layout salvo!');
  }, [elements, labelSize, onSave]);

  // Renderizar elemento
  const renderElement = useCallback((element: LabelElement) => {
    if (element.visible === false) return null;

    const isLocked = element.locked === true;
    const x = element.x * MM_TO_PX;
    const y = element.y * MM_TO_PX;

    const commonProps = {
      id: element.id,
      x,
      y,
      rotation: element.rotation || 0,
      opacity: element.opacity ?? 1,
      draggable: !isLocked,
      onClick: () => handleSelect(element.id),
      onTap: () => handleSelect(element.id),
      onDblClick: (e: Konva.KonvaEventObject<MouseEvent>) => handleDoubleClick(element, e),
      onDblTap: (e: Konva.KonvaEventObject<MouseEvent>) => handleDoubleClick(element, e),
      onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => handleDragMove(element, e),
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => handleDragEnd(element, e),
      onTransformEnd: (e: Konva.KonvaEventObject<Event>) => handleTransformEnd(element, e),
    };

    if (element.type === 'qrcode') {
      return <QRCodeElement key={element.id} element={element} commonProps={commonProps} />;
    }

    // Elementos de texto
    const fontSize = (element.fontSize || 12) * MM_TO_PX * 0.35;
    const isCenter = element.type === 'product-name';

    return (
      <Text
        key={element.id}
        {...commonProps}
        text={element.text || ''}
        fontSize={fontSize}
        fontFamily={element.fontFamily || 'Arial'}
        fontStyle={element.fontWeight === 'bold' ? 'bold' : 'normal'}
        fill={element.fill || '#000000'}
        align={isCenter ? 'center' : 'left'}
        offsetX={isCenter ? 0 : 0}
      />
    );
  }, [handleSelect, handleDoubleClick, handleDragMove, handleDragEnd, handleTransformEnd]);

  // Grid lines
  const gridSize = 5 * MM_TO_PX;

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 p-4 bg-muted/30">
      {/* Sidebar de propriedades */}
      <Card className="w-full lg:w-72 p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-8rem)]">
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground">TAMANHO DA ETIQUETA</Label>
          <Select value={labelSize} onValueChange={setLabelSize}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LABEL_SIZES.map(size => (
                <SelectItem key={size.id} value={size.id}>{size.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground">ZOOM</Label>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-mono w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
            <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.min(3, z + 0.25))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-xs">Mostrar grade</Label>
          <Switch checked={showGrid} onCheckedChange={setShowGrid} />
        </div>

        <Separator />

        {/* Propriedades do elemento selecionado */}
        {selectedElement ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="capitalize">
                {selectedElement.type.replace('-', ' ')}
              </Badge>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateElement(selectedElement.id)} title="Duplicar (Ctrl+D)">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteElement(selectedElement.id)} title="Deletar (Del)">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {selectedElement.text !== undefined && (
              <div className="space-y-2">
                <Label className="text-xs">Texto (duplo clique para editar)</Label>
                <Input
                  value={selectedElement.text}
                  onChange={(e) => updateElementWithHistory(selectedElement.id, { text: e.target.value })}
                  className="h-8"
                />
              </div>
            )}

            {selectedElement.fontSize !== undefined && (
              <div className="space-y-2">
                <Label className="text-xs">Tamanho da fonte ({selectedElement.fontSize.toFixed(1)}pt)</Label>
                <Slider
                  value={[selectedElement.fontSize]}
                  onValueChange={([v]) => updateElementWithHistory(selectedElement.id, { fontSize: v })}
                  min={6}
                  max={72}
                  step={0.5}
                />
              </div>
            )}

            {selectedElement.type === 'qrcode' && (
              <div className="space-y-2">
                <Label className="text-xs">Tamanho QR ({(selectedElement.qrSize || 12).toFixed(1)}mm)</Label>
                <Slider
                  value={[selectedElement.qrSize || 12]}
                  onValueChange={([v]) => updateElementWithHistory(selectedElement.id, { qrSize: v })}
                  min={6}
                  max={30}
                  step={0.5}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs">Cor</Label>
              <div className="flex gap-1">
                {['#000000', '#ef4444', '#22c55e', '#3b82f6', '#f59e0b'].map(color => (
                  <button
                    key={color}
                    className={`w-6 h-6 rounded border-2 ${selectedElement.fill === color ? 'border-primary' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                    onClick={() => updateElementWithHistory(selectedElement.id, { fill: color })}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Posição (mm)</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">X</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={selectedElement.x.toFixed(1)}
                    onChange={(e) => updateElementWithHistory(selectedElement.id, { x: parseFloat(e.target.value) || 0 })}
                    className="h-7 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Y</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={selectedElement.y.toFixed(1)}
                    onChange={(e) => updateElementWithHistory(selectedElement.id, { y: parseFloat(e.target.value) || 0 })}
                    className="h-7 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => updateElementWithHistory(selectedElement.id, { locked: !selectedElement.locked })}
              >
                {selectedElement.locked ? <Lock className="h-3.5 w-3.5 mr-1" /> : <Unlock className="h-3.5 w-3.5 mr-1" />}
                {selectedElement.locked ? 'Travado' : 'Travar'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => updateElementWithHistory(selectedElement.id, { visible: selectedElement.visible === false ? true : false })}
              >
                {selectedElement.visible === false ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                {selectedElement.visible === false ? 'Oculto' : 'Visível'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground text-sm py-4">
            <Move className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Clique em um elemento para editar
          </div>
        )}

        <Separator />

        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground">ADICIONAR</Label>
          <Button variant="outline" size="sm" className="w-full justify-start" onClick={addCustomText}>
            <Type className="h-4 w-4 mr-2" />
            Texto personalizado
          </Button>
        </div>

        <Separator />

        <div className="space-y-2">
          <Button variant="outline" size="sm" className="w-full" onClick={resetToDefault}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Resetar layout
          </Button>
        </div>

        <Separator />

        {/* Atalhos de teclado */}
        <div className="space-y-1 text-[10px] text-muted-foreground">
          <p className="font-semibold text-xs mb-2">ATALHOS</p>
          <p><kbd className="px-1 bg-muted rounded">Del</kbd> Deletar</p>
          <p><kbd className="px-1 bg-muted rounded">Ctrl+C</kbd> Copiar</p>
          <p><kbd className="px-1 bg-muted rounded">Ctrl+V</kbd> Colar</p>
          <p><kbd className="px-1 bg-muted rounded">Ctrl+D</kbd> Duplicar</p>
          <p><kbd className="px-1 bg-muted rounded">Ctrl+Z</kbd> Desfazer</p>
          <p><kbd className="px-1 bg-muted rounded">Ctrl+Y</kbd> Refazer</p>
          <p><kbd className="px-1 bg-muted rounded">←↑↓→</kbd> Mover</p>
          <p><kbd className="px-1 bg-muted rounded">Dbl-Click</kbd> Editar texto</p>
        </div>
      </Card>

      {/* Área do canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar superior */}
        <Card className="p-2 mb-4 flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={undo} disabled={historyIndex <= 0} title="Desfazer (Ctrl+Z)">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={redo} disabled={historyIndex >= history.length - 1} title="Refazer (Ctrl+Y)">
            <Redo2 className="h-4 w-4" />
          </Button>
          
          <Separator orientation="vertical" className="h-6" />
          
          <Button variant="ghost" size="sm" onClick={() => setShowGrid(!showGrid)} title="Mostrar/ocultar grade">
            <Grid3X3 className={`h-4 w-4 ${showGrid ? 'text-primary' : ''}`} />
          </Button>

          {clipboard && (
            <>
              <Separator orientation="vertical" className="h-6" />
              <Badge variant="outline" className="text-xs gap-1">
                <Clipboard className="h-3 w-3" />
                Copiado
              </Badge>
            </>
          )}

          <div className="flex-1" />

          <div className="text-xs text-muted-foreground">
            {currentSize.width}×{currentSize.height}mm
          </div>

          {onSave && (
            <Button size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          )}
          
          <Button size="sm" variant="outline" onClick={generatePDF}>
            <Download className="h-4 w-4 mr-2" />
            Baixar PDF
          </Button>
        </Card>

        {/* Canvas */}
        <div className="flex-1 flex items-center justify-center bg-muted/50 rounded-xl overflow-auto p-8 relative">
          {/* Input para edição inline */}
          {editingElement && (
            <input
              ref={textEditRef}
              type="text"
              value={editingElement.text}
              onChange={(e) => setEditingElement(prev => prev ? { ...prev, text: e.target.value } : null)}
              onBlur={finishEditing}
              onKeyDown={(e) => {
                if (e.key === 'Enter') finishEditing();
                if (e.key === 'Escape') {
                  const stage = stageRef.current;
                  const textNode = stage?.findOne(`#${editingElement.id}`);
                  textNode?.show();
                  transformerRef.current?.show();
                  setEditingElement(null);
                }
              }}
              style={{
                position: 'fixed',
                left: editingElement.x,
                top: editingElement.y,
                width: editingElement.width,
                minWidth: '100px',
                fontSize: editingElement.fontSize,
                fontFamily: 'Arial',
                fontWeight: 'bold',
                padding: '2px 4px',
                border: '2px solid #a855f7',
                borderRadius: '4px',
                outline: 'none',
                background: 'white',
                zIndex: 1000,
              }}
            />
          )}

          <div
            ref={containerRef}
            className="shadow-2xl rounded-lg overflow-hidden bg-white relative"
            style={{
              width: canvasWidth * zoom,
              height: canvasHeight * zoom,
            }}
          >
            <Stage
              ref={stageRef}
              width={canvasWidth * zoom}
              height={canvasHeight * zoom}
              scaleX={zoom}
              scaleY={zoom}
              onClick={handleStageClick}
              onTap={handleStageClick}
              style={{ background: '#ffffff' }}
            >
              <Layer>
                {/* Background */}
                <Rect
                  x={0}
                  y={0}
                  width={canvasWidth}
                  height={canvasHeight}
                  fill="#ffffff"
                  listening={false}
                />

                {/* Grid */}
                {showGrid && (
                  <>
                    {Array.from({ length: Math.ceil(canvasWidth / gridSize) + 1 }).map((_, i) => (
                      <Line
                        key={`v-${i}`}
                        points={[i * gridSize, 0, i * gridSize, canvasHeight]}
                        stroke="rgba(0, 0, 0, 0.08)"
                        strokeWidth={0.5}
                        listening={false}
                      />
                    ))}
                    {Array.from({ length: Math.ceil(canvasHeight / gridSize) + 1 }).map((_, i) => (
                      <Line
                        key={`h-${i}`}
                        points={[0, i * gridSize, canvasWidth, i * gridSize]}
                        stroke="rgba(0, 0, 0, 0.08)"
                        strokeWidth={0.5}
                        listening={false}
                      />
                    ))}
                    {/* Center guides */}
                    <Line
                      points={[canvasWidth / 2, 0, canvasWidth / 2, canvasHeight]}
                      stroke="rgba(168, 85, 247, 0.2)"
                      strokeWidth={1}
                      dash={[4, 4]}
                      listening={false}
                    />
                    <Line
                      points={[0, canvasHeight / 2, canvasWidth, canvasHeight / 2]}
                      stroke="rgba(168, 85, 247, 0.2)"
                      strokeWidth={1}
                      dash={[4, 4]}
                      listening={false}
                    />
                  </>
                )}

                {/* Smart Guides */}
                {smartGuides.map((guide, i) => (
                  <Line
                    key={`guide-${i}`}
                    points={
                      guide.type === 'vertical'
                        ? [guide.position, 0, guide.position, canvasHeight]
                        : [0, guide.position, canvasWidth, guide.position]
                    }
                    stroke={guide.color || '#a855f7'}
                    strokeWidth={1}
                    listening={false}
                  />
                ))}

                {/* Elementos */}
                {elements.map(renderElement)}

                {/* Transformer */}
                <Transformer
                  ref={transformerRef}
                  boundBoxFunc={(oldBox, newBox) => {
                    if (newBox.width < 10 || newBox.height < 10) return oldBox;
                    return newBox;
                  }}
                  anchorFill="#a855f7"
                  anchorStroke="#ffffff"
                  anchorSize={8}
                  anchorCornerRadius={2}
                  borderStroke="#a855f7"
                  borderStrokeWidth={1.5}
                  rotateAnchorOffset={20}
                  enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
                />
              </Layer>
            </Stage>
          </div>
        </div>

        {/* Info */}
        <div className="text-center text-xs text-muted-foreground mt-2">
          Arraste para mover • Duplo clique para editar texto • Use as setas do teclado para ajuste fino
        </div>
      </div>
    </div>
  );
}
