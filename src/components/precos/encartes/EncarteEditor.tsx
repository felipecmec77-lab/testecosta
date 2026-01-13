import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Stage, Layer, Rect, Circle, Text, Line, Star, Image, Transformer } from "react-konva";
import useImage from "use-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Download, Eye, AlertCircle, CheckCircle2, Palette, Loader2 } from "lucide-react";
import { EditorElement, CANVAS_SIZES, CanvasDimensions } from "../editor/types";
import { generateEncartePdfFromStage } from "./generateEncartePdf";
import { preloadAllAssets } from "./exportAssets";
import { toast } from "sonner";

interface EncarteEditorProps {
  template: {
    id: string;
    nome: string;
    elementos: EditorElement[];
    tamanho: 'full' | 'half';
  };
  onBack: () => void;
}

function ImageElement({ element }: { element: EditorElement }) {
  const [image] = useImage(element.src || '', 'anonymous');
  return (
    <Image
      image={image}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      rotation={element.rotation}
      opacity={element.opacity}
    />
  );
}

// Validate price format (e.g., 4,99 or 11,99)
function validatePrice(value: string): { isValid: boolean; message: string } {
  if (!value || value.trim() === '') {
    return { isValid: false, message: 'Digite um valor' };
  }
  
  // Check for valid format: digits, optional comma/period, up to 2 decimal places
  const priceRegex = /^\d{1,4}([,\.]\d{0,2})?$/;
  
  if (!priceRegex.test(value)) {
    return { isValid: false, message: 'Formato inválido (ex: 4,99)' };
  }
  
  // Check if value is reasonable (not zero)
  const numericValue = parseFloat(value.replace(',', '.'));
  if (numericValue <= 0) {
    return { isValid: false, message: 'Valor deve ser maior que zero' };
  }
  
  if (numericValue > 9999) {
    return { isValid: false, message: 'Valor muito alto' };
  }
  
  return { isValid: true, message: 'Valor válido' };
}

// Format price input - only allow valid characters
function formatPriceInput(value: string): string {
  // Remove any character that isn't digit, comma, or period
  let cleaned = value.replace(/[^\d,\.]/g, '');
  
  // Replace period with comma for consistency
  cleaned = cleaned.replace('.', ',');
  
  // Only allow one comma
  const parts = cleaned.split(',');
  if (parts.length > 2) {
    cleaned = parts[0] + ',' + parts.slice(1).join('');
  }
  
  // Limit decimal places to 2
  if (parts.length === 2 && parts[1].length > 2) {
    cleaned = parts[0] + ',' + parts[1].substring(0, 2);
  }
  
  // Limit total length
  if (cleaned.length > 7) {
    cleaned = cleaned.substring(0, 7);
  }
  
  return cleaned;
}

// Calculate optimal font size to fit text in a given width
function calculateFontSize(text: string, maxWidth: number, maxFontSize: number, minFontSize: number = 16): number {
  const charWidthRatio = 0.6;
  const textLength = text.length;
  const estimatedWidth = textLength * maxFontSize * charWidthRatio;
  
  if (estimatedWidth <= maxWidth) {
    return maxFontSize;
  }
  
  const optimalSize = maxWidth / (textLength * charWidthRatio);
  return Math.max(minFontSize, Math.min(maxFontSize, optimalSize));
}

// Format price for display - WITHOUT R$ prefix (R$ is a separate element now)
function formatPriceDisplay(value: string): string {
  if (!value || value.trim() === '') return '0,00';
  return value;
}

// Color presets for quick selection
const COLOR_PRESETS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6",
  "#8b5cf6", "#ec4899", "#000000", "#ffffff", "#6b7280"
];

export function EncarteEditor({ template, onBack }: EncarteEditorProps) {
  const [elements, setElements] = useState<EditorElement[]>(template.elementos);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [priceValue, setPriceValue] = useState("");
  const [productUnit, setProductUnit] = useState<"QUILO" | "CADA">("QUILO");
  const [isGenerating, setIsGenerating] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const [priceColor, setPriceColor] = useState("#ef4444");
  const [bgColor, setBgColor] = useState("#ffff00");
  const stageRef = useRef<any>(null);
  const exportStageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  
  const dimensions: CanvasDimensions = CANVAS_SIZES[template.tamanho];
  const isLandscape = template.tamanho === 'full';
  // Adjust scale based on orientation for better fit
  const scale = isLandscape ? 0.6 : 0.7;
  
  // Preload fonts and images on mount and when elements change
  useEffect(() => {
    let cancelled = false;
    setAssetsReady(false);
    
    preloadAllAssets(elements).then(() => {
      if (!cancelled) {
        setAssetsReady(true);
      }
    });
    
    return () => { cancelled = true; };
  }, [elements]);

  // Price validation
  const priceValidation = useMemo(() => validatePrice(priceValue), [priceValue]);

  // Find specific element types by ID patterns or content
  const findProductNameElement = () => {
    return elements.find(el => {
      if (el.type !== 'text') return false;
      const id = (el.id || '').toLowerCase();
      const text = (el.text || '').toLowerCase();
      return id.includes('product') || id.includes('prod-') || 
             text.includes('nome') || text.includes('produto') || 
             text.includes('tomate') || text.includes('saladete');
    });
  };

  const findPriceElement = () => {
    return elements.find(el => {
      if (el.type !== 'text') return false;
      const id = (el.id || '').toLowerCase();
      // Only match price-1, price-2, etc. - NOT rs-label
      return id.includes('price') && !id.includes('rs') && !id.includes('label');
    });
  };

  const findUnitElement = () => {
    return elements.find(el => {
      if (el.type !== 'text') return false;
      const id = (el.id || '').toLowerCase();
      const text = (el.text || '').toUpperCase();
      return id.includes('unit') || 
             text === 'KG' || text === 'QUILO' || text === 'CADA' || 
             text === 'UN' || text === 'UNIDADE';
    });
  };

  // Find background element (usually the first/largest rect)
  const findBackgroundElement = () => {
    return elements.find(el => {
      if (el.type !== 'rect') return false;
      const id = (el.id || '').toLowerCase();
      return id.includes('bg') || id.includes('background') || 
             (el.width && el.height && el.width > 400 && el.height > 300);
    });
  };

  useEffect(() => {
    const nameEl = findProductNameElement();
    const priceEl = findPriceElement();
    const unitEl = findUnitElement();
    const bgEl = findBackgroundElement();

    if (nameEl) setProductName(nameEl.text || '');
    if (priceEl) {
      // Price element now contains only the numeric value (no R$ prefix)
      const numericPart = (priceEl.text || '').trim();
      setPriceValue(numericPart === '0,00' ? '' : numericPart);
      if (priceEl.fill) setPriceColor(priceEl.fill);
    }
    if (unitEl) {
      const unitText = (unitEl.text || '').toUpperCase();
      setProductUnit(unitText === 'CADA' || unitText === 'UN' ? 'CADA' : 'QUILO');
    }
    if (bgEl && bgEl.fill) {
      setBgColor(bgEl.fill);
    }
  }, []);

  useEffect(() => {
    if (transformerRef.current && stageRef.current) {
      const stage = stageRef.current;
      if (selectedId) {
        const node = stage.findOne(`#${selectedId}`);
        if (node) {
          transformerRef.current.nodes([node]);
          transformerRef.current.getLayer()?.batchDraw();
        }
      } else {
        transformerRef.current.nodes([]);
      }
    }
  }, [selectedId]);

  // Update product name with auto-sizing
  const handleNameChange = (value: string) => {
    // Limit name length
    if (value.length > 50) return;
    
    setProductName(value);
    const nameEl = findProductNameElement();
    if (nameEl) {
      const maxWidth = nameEl.width || 400;
      const baseFontSize = nameEl.fontSize || 48;
      const newFontSize = calculateFontSize(value, maxWidth, baseFontSize, 24);
      
      setElements(prev => prev.map(el => 
        el.id === nameEl.id ? { ...el, text: value, fontSize: newFontSize } : el
      ));
    }
  };

  // Update price value with validation
  const handlePriceChange = (value: string) => {
    const formatted = formatPriceInput(value);
    setPriceValue(formatted);
    
    const priceEl = findPriceElement();
    if (priceEl) {
      const displayPrice = formatPriceDisplay(formatted);
      const maxWidth = priceEl.width || 300;
      const baseFontSize = priceEl.fontSize || 84;
      const newFontSize = calculateFontSize(displayPrice, maxWidth, baseFontSize, 36);
      
      setElements(prev => prev.map(el => 
        el.id === priceEl.id ? { ...el, text: displayPrice, fontSize: newFontSize } : el
      ));
    }
  };

  // Update unit - always uppercase
  const handleUnitChange = (value: "QUILO" | "CADA") => {
    setProductUnit(value);
    const unitEl = findUnitElement();
    if (unitEl) {
      setElements(prev => prev.map(el => 
        el.id === unitEl.id ? { ...el, text: value } : el
      ));
    }
  };

  // Update price color
  const handlePriceColorChange = (color: string) => {
    setPriceColor(color);
    const priceEl = findPriceElement();
    // Also update R$ label if it exists
    const rsLabel = elements.find(el => el.id?.toLowerCase().includes('rs-label'));
    
    setElements(prev => prev.map(el => {
      if (el.id === priceEl?.id || el.id === rsLabel?.id) {
        return { ...el, fill: color };
      }
      return el;
    }));
  };

  // Update background color
  const handleBgColorChange = (color: string) => {
    setBgColor(color);
    const bgEl = findBackgroundElement();
    if (bgEl) {
      setElements(prev => prev.map(el => 
        el.id === bgEl.id ? { ...el, fill: color } : el
      ));
    }
  };

  const handleDownload = async () => {
    if (!priceValidation.isValid) {
      toast.error("Corrija o valor do preço antes de baixar");
      return;
    }
    
    if (!productName.trim()) {
      toast.error("Digite o nome do produto");
      return;
    }

    setIsGenerating(true);
    try {
      // Evita exportar bordas de seleção/Transformer no PDF
      setSelectedId(null);
      transformerRef.current?.nodes([]);
      transformerRef.current?.getLayer()?.batchDraw();

      toast.loading("Preparando assets e gerando PDF...");
      
      // Ensure all fonts and images are loaded
      await preloadAllAssets(elements);
      
      // Wait for offscreen stage to render
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });
      
      // Export from the offscreen stage (1:1 scale, no preview scaling)
      await generateEncartePdfFromStage(exportStageRef.current, dimensions, isLandscape);
      toast.dismiss();
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      toast.dismiss();
      toast.error("Erro ao gerar PDF");
      console.error(error);
    }
    setIsGenerating(false);
  };

  const renderElement = (element: EditorElement) => {
    const nameEl = findProductNameElement();
    const priceEl = findPriceElement();
    const unitEl = findUnitElement();
    const isEditable = element.id === nameEl?.id || element.id === priceEl?.id || element.id === unitEl?.id;
    
    const commonProps = {
      id: element.id,
      key: element.id,
      x: element.x,
      y: element.y,
      rotation: element.rotation || 0,
      scaleX: element.scaleX || 1,
      scaleY: element.scaleY || 1,
      opacity: element.opacity ?? 1,
      onClick: isEditable ? () => setSelectedId(element.id) : undefined,
      onTap: isEditable ? () => setSelectedId(element.id) : undefined,
    };

    switch (element.type) {
      case 'rect':
        return (
          <Rect
            {...commonProps}
            width={element.width}
            height={element.height}
            fill={element.fill}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth}
            cornerRadius={element.cornerRadius}
          />
        );
      case 'circle':
        return (
          <Circle
            {...commonProps}
            radius={element.radius}
            fill={element.fill}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth}
          />
        );
      case 'text':
        return (
          <Text
            {...commonProps}
            text={element.text}
            fontSize={element.fontSize}
            fontFamily={element.fontFamily}
            fontStyle={element.fontStyle}
            textDecoration={element.textDecoration}
            fill={element.fill}
            align={element.align}
            width={element.width}
            wrap="word"
          />
        );
      case 'line':
        return (
          <Line
            {...commonProps}
            points={element.points}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth}
          />
        );
      case 'triangle':
        const triHeight = element.height || 100;
        const triWidth = element.width || 100;
        return (
          <Line
            {...commonProps}
            points={[triWidth / 2, 0, triWidth, triHeight, 0, triHeight]}
            closed
            fill={element.fill}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth}
          />
        );
      case 'star':
        return (
          <Star
            {...commonProps}
            numPoints={element.numPoints || 5}
            innerRadius={element.innerRadius || 20}
            outerRadius={element.outerRadius || 40}
            fill={element.fill}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth}
          />
        );
      case 'image':
        return <ImageElement key={element.id} element={element} />;
      default:
        return null;
    }
  };

  const nameEl = findProductNameElement();
  const priceEl = findPriceElement();
  const unitEl = findUnitElement();

  // Check if form is valid
  const isFormValid = priceValidation.isValid && productName.trim().length > 0;

  return (
    <div className="h-screen flex flex-col bg-muted/30">
      {/* Header */}
      <div className="bg-background border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold">{template.nome}</h1>
            <p className="text-xs text-muted-foreground">Edite o nome, preço e unidade do produto</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={isFormValid ? "default" : "secondary"} className="gap-1">
            <Eye className="h-3 w-3" />
            Preview ao vivo
          </Badge>
          <Button 
            onClick={handleDownload} 
            className="gap-2"
            disabled={!isFormValid || isGenerating}
          >
            <Download className="h-4 w-4" />
            Baixar PDF
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Area - Real-time Preview */}
        <div className="flex-1 flex flex-col">
          <div className="bg-muted/50 border-b px-4 py-2 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Preview em tempo real
            </span>
            <span className="text-xs text-muted-foreground">
              Tamanho: {template.tamanho === 'full' ? 'A4 Paisagem' : 'A4 Retrato'}
            </span>
          </div>
          <div className="flex-1 flex items-center justify-center p-8 overflow-auto bg-gray-100">
            <div 
              className="bg-white shadow-xl rounded-lg overflow-hidden ring-2 ring-primary/20"
              style={{ 
                width: dimensions.width * scale, 
                height: dimensions.height * scale 
              }}
            >
              <Stage
                ref={stageRef}
                width={dimensions.width * scale}
                height={dimensions.height * scale}
                scaleX={scale}
                scaleY={scale}
                onClick={(e) => {
                  if (e.target === e.target.getStage()) {
                    setSelectedId(null);
                  }
                }}
              >
                <Layer>
                  <Rect x={0} y={0} width={dimensions.width} height={dimensions.height} fill="#ffffff" />
                  {elements.map(renderElement)}
                  <Transformer
                    ref={transformerRef}
                    rotateEnabled={false}
                    resizeEnabled={false}
                    borderStroke="#3b82f6"
                    borderStrokeWidth={2}
                  />
                </Layer>
              </Stage>
            </div>
          </div>
          
          {/* Offscreen Stage for PDF Export (1:1 scale, no Transformer) */}
          <div style={{ position: 'fixed', left: '-10000px', top: '-10000px', pointerEvents: 'none' }}>
            <Stage
              ref={exportStageRef}
              width={dimensions.width}
              height={dimensions.height}
            >
              <Layer>
                <Rect x={0} y={0} width={dimensions.width} height={dimensions.height} fill="#ffffff" />
                {elements.map((element) => {
                  // Render without click handlers for export
                  const commonProps = {
                    id: element.id,
                    key: `export-${element.id}`,
                    x: element.x,
                    y: element.y,
                    rotation: element.rotation || 0,
                    scaleX: element.scaleX || 1,
                    scaleY: element.scaleY || 1,
                    opacity: element.opacity ?? 1,
                  };

                  switch (element.type) {
                    case 'rect':
                      return (
                        <Rect
                          {...commonProps}
                          width={element.width}
                          height={element.height}
                          fill={element.fill}
                          stroke={element.stroke}
                          strokeWidth={element.strokeWidth}
                          cornerRadius={element.cornerRadius}
                        />
                      );
                    case 'circle':
                      return (
                        <Circle
                          {...commonProps}
                          radius={element.radius}
                          fill={element.fill}
                          stroke={element.stroke}
                          strokeWidth={element.strokeWidth}
                        />
                      );
                    case 'text':
                      return (
                        <Text
                          {...commonProps}
                          text={element.text}
                          fontSize={element.fontSize}
                          fontFamily={element.fontFamily}
                          fontStyle={element.fontStyle}
                          textDecoration={element.textDecoration}
                          fill={element.fill}
                          align={element.align}
                          width={element.width}
                          wrap="word"
                        />
                      );
                    case 'line':
                      return (
                        <Line
                          {...commonProps}
                          points={element.points}
                          stroke={element.stroke}
                          strokeWidth={element.strokeWidth}
                        />
                      );
                    case 'triangle':
                      const triHeight = element.height || 100;
                      const triWidth = element.width || 100;
                      return (
                        <Line
                          {...commonProps}
                          points={[triWidth / 2, 0, triWidth, triHeight, 0, triHeight]}
                          closed
                          fill={element.fill}
                          stroke={element.stroke}
                          strokeWidth={element.strokeWidth}
                        />
                      );
                    case 'star':
                      return (
                        <Star
                          {...commonProps}
                          numPoints={element.numPoints || 5}
                          innerRadius={element.innerRadius || 20}
                          outerRadius={element.outerRadius || 40}
                          fill={element.fill}
                          stroke={element.stroke}
                          strokeWidth={element.strokeWidth}
                        />
                      );
                    case 'image':
                      return <ImageElement key={`export-${element.id}`} element={element} />;
                    default:
                      return null;
                  }
                })}
              </Layer>
            </Stage>
          </div>
        </div>

        {/* Edit Panel */}
        <div className="w-80 bg-background border-l p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Editar Conteúdo</h2>
            {isFormValid ? (
              <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
                <CheckCircle2 className="h-3 w-3" />
                Pronto
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200 bg-amber-50">
                <AlertCircle className="h-3 w-3" />
                Pendente
              </Badge>
            )}
          </div>
          
          <div className="space-y-5">
            {/* Product Name */}
            <Card className={`p-4 transition-all ${selectedId === nameEl?.id ? 'ring-2 ring-primary shadow-md' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Nome do Produto</Label>
                <span className="text-xs text-muted-foreground">{productName.length}/50</span>
              </div>
              <Input
                value={productName}
                onChange={(e) => handleNameChange(e.target.value)}
                onFocus={() => nameEl && setSelectedId(nameEl.id)}
                placeholder="Ex: Tomate Saladete"
                className={!productName.trim() ? 'border-amber-300' : 'border-green-300'}
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tamanho ajusta automaticamente
              </p>
            </Card>

            {/* Price */}
            <Card className={`p-4 transition-all ${selectedId === priceEl?.id ? 'ring-2 ring-primary shadow-md' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Valor</Label>
                {priceValidation.isValid ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-muted-foreground shrink-0">R$</span>
                <Input
                  value={priceValue}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  onFocus={() => priceEl && setSelectedId(priceEl.id)}
                  placeholder="4,99"
                  className={`flex-1 font-mono text-lg ${
                    priceValidation.isValid ? 'border-green-300' : 'border-amber-300'
                  }`}
                  maxLength={7}
                />
              </div>
              <p className={`text-xs mt-1 ${priceValidation.isValid ? 'text-green-600' : 'text-amber-600'}`}>
                {priceValidation.message}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Formato: 4,99 ou 11,99
              </p>
            </Card>

            {/* Unit Selection */}
            <Card className={`p-4 transition-all ${selectedId === unitEl?.id ? 'ring-2 ring-primary shadow-md' : ''}`}>
              <Label className="text-sm font-medium mb-3 block">Unidade de Venda</Label>
              <RadioGroup
                value={productUnit}
                onValueChange={(value) => handleUnitChange(value as "QUILO" | "CADA")}
                className="grid grid-cols-2 gap-3"
              >
                <div 
                  className={`flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    productUnit === 'QUILO' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted hover:border-muted-foreground/30'
                  }`}
                  onClick={() => handleUnitChange('QUILO')}
                >
                  <RadioGroupItem value="QUILO" id="quilo" className="sr-only" />
                  <Label htmlFor="quilo" className="cursor-pointer font-bold text-lg">
                    QUILO
                  </Label>
                </div>
                <div 
                  className={`flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    productUnit === 'CADA' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted hover:border-muted-foreground/30'
                  }`}
                  onClick={() => handleUnitChange('CADA')}
                >
                  <RadioGroupItem value="CADA" id="cada" className="sr-only" />
                  <Label htmlFor="cada" className="cursor-pointer font-bold text-lg">
                    CADA
                  </Label>
                </div>
              </RadioGroup>
            </Card>

            {/* Color Customization */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Cores</Label>
              </div>
              
              <div className="space-y-4">
                {/* Price Color */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Cor do Preço</Label>
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="w-10 h-10 rounded-lg border-2 border-muted shadow-sm cursor-pointer hover:scale-105 transition-transform"
                          style={{ backgroundColor: priceColor }}
                        />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-3" align="start">
                        <div className="space-y-3">
                          <div className="grid grid-cols-5 gap-2">
                            {COLOR_PRESETS.map((color) => (
                              <button
                                key={color}
                                className={`w-8 h-8 rounded-md border-2 ${
                                  priceColor === color ? 'border-primary ring-2 ring-primary/20' : 'border-muted'
                                }`}
                                style={{ backgroundColor: color }}
                                onClick={() => handlePriceColorChange(color)}
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              value={priceColor}
                              onChange={(e) => handlePriceColorChange(e.target.value)}
                              placeholder="#ef4444"
                              className="font-mono text-sm"
                            />
                            <input
                              type="color"
                              value={priceColor}
                              onChange={(e) => handlePriceColorChange(e.target.value)}
                              className="w-10 h-10 rounded cursor-pointer border-0"
                            />
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Input
                      value={priceColor}
                      onChange={(e) => handlePriceColorChange(e.target.value)}
                      placeholder="#ef4444"
                      className="font-mono text-sm flex-1"
                    />
                  </div>
                </div>

                {/* Background Color */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Cor de Fundo</Label>
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="w-10 h-10 rounded-lg border-2 border-muted shadow-sm cursor-pointer hover:scale-105 transition-transform"
                          style={{ backgroundColor: bgColor }}
                        />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-3" align="start">
                        <div className="space-y-3">
                          <div className="grid grid-cols-5 gap-2">
                            {COLOR_PRESETS.map((color) => (
                              <button
                                key={color}
                                className={`w-8 h-8 rounded-md border-2 ${
                                  bgColor === color ? 'border-primary ring-2 ring-primary/20' : 'border-muted'
                                }`}
                                style={{ backgroundColor: color }}
                                onClick={() => handleBgColorChange(color)}
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              value={bgColor}
                              onChange={(e) => handleBgColorChange(e.target.value)}
                              placeholder="#ffff00"
                              className="font-mono text-sm"
                            />
                            <input
                              type="color"
                              value={bgColor}
                              onChange={(e) => handleBgColorChange(e.target.value)}
                              className="w-10 h-10 rounded cursor-pointer border-0"
                            />
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Input
                      value={bgColor}
                      onChange={(e) => handleBgColorChange(e.target.value)}
                      placeholder="#ffff00"
                      className="font-mono text-sm flex-1"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>
          
          <div className="mt-6 pt-4 border-t space-y-2">
            <p className="text-xs text-muted-foreground">
              💡 As alterações são exibidas em tempo real no preview.
            </p>
            <p className="text-xs text-muted-foreground">
              📄 O PDF gerado terá exatamente a aparência do preview.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
