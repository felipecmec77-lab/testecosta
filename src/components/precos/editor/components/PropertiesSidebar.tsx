import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Copy, Trash2, ChevronUp, ChevronDown, FlipHorizontal, FlipVertical,
  RotateCcw, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  X, Search, Loader2, MousePointer2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EditorElement, COLOR_PRESETS, FONT_CATEGORIES, ALL_FONTS } from "../types";
import { useState } from "react";

interface PropertiesSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedElement: EditorElement | null;
  onUpdateElement: (id: string, updates: Partial<EditorElement>) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  onMoveElement: (id: string, direction: 'up' | 'down') => void;
  loadingFont: boolean;
  onFontChange: (font: string) => void;
}

export function PropertiesSidebar({
  isOpen,
  onClose,
  selectedElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onMoveElement,
  loadingFont,
  onFontChange,
}: PropertiesSidebarProps) {
  const [fontSearch, setFontSearch] = useState("");
  const [fontCategory, setFontCategory] = useState<string>("all");

  if (!isOpen) return null;

  const isTextElement = selectedElement?.type === 'text';

  // Filter fonts
  const filteredFonts = (() => {
    let fonts = fontCategory === "all" 
      ? ALL_FONTS 
      : FONT_CATEGORIES[fontCategory as keyof typeof FONT_CATEGORIES] || ALL_FONTS;
    
    if (fontSearch.trim()) {
      fonts = fonts.filter(f => f.toLowerCase().includes(fontSearch.toLowerCase()));
    }
    
    return fonts.slice(0, 50);
  })();

  if (!selectedElement) {
    return (
      <aside className="w-[280px] bg-white border-l border-gray-200 flex flex-col shrink-0">
        <div className="h-14 px-4 flex items-center justify-between border-b border-gray-100 shrink-0">
          <h2 className="text-gray-900 font-semibold text-sm">Propriedades</h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <MousePointer2 className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-sm text-gray-400">Selecione um elemento<br/>para editar</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-[280px] bg-white border-l border-gray-200 flex flex-col shrink-0">
      <div className="h-14 px-4 flex items-center justify-between border-b border-gray-100 shrink-0">
        <h2 className="text-gray-900 font-semibold text-sm">Propriedades</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 text-gray-500 hover:text-gray-900 hover:bg-gray-100" 
                  onClick={() => onDuplicateElement(selectedElement.id)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Duplicar</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 text-gray-500 hover:text-gray-900 hover:bg-gray-100" 
                  onClick={() => onMoveElement(selectedElement.id, 'up')}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Subir</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 text-gray-500 hover:text-gray-900 hover:bg-gray-100" 
                  onClick={() => onMoveElement(selectedElement.id, 'down')}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Descer</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 text-gray-500 hover:text-gray-900 hover:bg-gray-100" 
                  onClick={() => onUpdateElement(selectedElement.id, { scaleX: -(selectedElement.scaleX || 1) })}
                >
                  <FlipHorizontal className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Espelhar H</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 text-gray-500 hover:text-gray-900 hover:bg-gray-100" 
                  onClick={() => onUpdateElement(selectedElement.id, { scaleY: -(selectedElement.scaleY || 1) })}
                >
                  <FlipVertical className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Espelhar V</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 text-gray-500 hover:text-gray-900 hover:bg-gray-100" 
                  onClick={() => onUpdateElement(selectedElement.id, { rotation: 0 })}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Resetar rotação</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50" 
                  onClick={() => onDeleteElement(selectedElement.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Excluir</TooltipContent>
            </Tooltip>
          </div>

          <Separator className="bg-gray-100" />

          {/* Position & Size */}
          <div className="space-y-3">
            <Label className="text-xs text-gray-500 uppercase tracking-wider font-medium">Posição</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-gray-500">X</Label>
                <Input
                  type="number"
                  value={Math.round(selectedElement.x)}
                  onChange={(e) => onUpdateElement(selectedElement.id, { x: Number(e.target.value) })}
                  className="h-8 bg-gray-50 border-gray-200 text-gray-700"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Y</Label>
                <Input
                  type="number"
                  value={Math.round(selectedElement.y)}
                  onChange={(e) => onUpdateElement(selectedElement.id, { y: Number(e.target.value) })}
                  className="h-8 bg-gray-50 border-gray-200 text-gray-700"
                />
              </div>
            </div>
            {selectedElement.width !== undefined && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-gray-500">Largura</Label>
                  <Input
                    type="number"
                    value={Math.round(selectedElement.width)}
                    onChange={(e) => onUpdateElement(selectedElement.id, { width: Number(e.target.value) })}
                    className="h-8 bg-gray-50 border-gray-200 text-gray-700"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Altura</Label>
                  <Input
                    type="number"
                    value={Math.round(selectedElement.height || 0)}
                    onChange={(e) => onUpdateElement(selectedElement.id, { height: Number(e.target.value) })}
                    className="h-8 bg-gray-50 border-gray-200 text-gray-700"
                  />
                </div>
              </div>
            )}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-xs text-gray-500">Rotação</Label>
                <span className="text-xs text-gray-400">{Math.round(selectedElement.rotation || 0)}°</span>
              </div>
              <Slider
                value={[selectedElement.rotation || 0]}
                onValueChange={([v]) => onUpdateElement(selectedElement.id, { rotation: v })}
                min={-180}
                max={180}
                step={1}
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-xs text-gray-500">Opacidade</Label>
                <span className="text-xs text-gray-400">{Math.round((selectedElement.opacity ?? 1) * 100)}%</span>
              </div>
              <Slider
                value={[(selectedElement.opacity ?? 1) * 100]}
                onValueChange={([v]) => onUpdateElement(selectedElement.id, { opacity: v / 100 })}
                min={0}
                max={100}
                step={1}
              />
            </div>
          </div>

          <Separator className="bg-gray-100" />

          {/* Text Properties */}
          {isTextElement && (
            <div className="space-y-3">
              <Label className="text-xs text-gray-500 uppercase tracking-wider font-medium">Texto</Label>
              
              {/* Font Family */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-between h-9 bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                  >
                    <span style={{ fontFamily: selectedElement.fontFamily || "Arial" }} className="truncate">
                      {selectedElement.fontFamily || "Arial"}
                    </span>
                    {loadingFont ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 text-gray-400" />}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0 bg-white border-gray-200" align="start">
                  <div className="p-2 border-b border-gray-100 space-y-2">
                    <Input
                      placeholder="Buscar fonte..."
                      value={fontSearch}
                      onChange={(e) => setFontSearch(e.target.value)}
                      className="h-8 bg-gray-50 border-gray-200 text-gray-700"
                    />
                    <Select value={fontCategory} onValueChange={setFontCategory}>
                      <SelectTrigger className="h-8 bg-gray-50 border-gray-200 text-gray-700 text-xs">
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas ({ALL_FONTS.length})</SelectItem>
                        {Object.entries(FONT_CATEGORIES).map(([cat, fonts]) => (
                          <SelectItem key={cat} value={cat}>{cat} ({fonts.length})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <ScrollArea className="h-56">
                    <div className="p-1">
                      {filteredFonts.length > 0 ? (
                        filteredFonts.map((font) => (
                          <Button
                            key={font}
                            variant="ghost"
                            className="w-full justify-start h-9 font-normal text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                            style={{ fontFamily: font }}
                            onClick={() => {
                              onFontChange(font);
                              setFontSearch("");
                            }}
                          >
                            {font}
                          </Button>
                        ))
                      ) : (
                        <p className="text-xs text-gray-400 text-center py-4">Nenhuma fonte encontrada</p>
                      )}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>

              {/* Font Size */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-xs text-gray-500">Tamanho</Label>
                  <Input
                    type="number"
                    value={selectedElement.fontSize || 40}
                    onChange={(e) => onUpdateElement(selectedElement.id, { fontSize: Number(e.target.value) })}
                    className="w-16 h-7 text-xs bg-gray-50 border-gray-200 text-gray-700"
                  />
                </div>
                <Slider
                  value={[selectedElement.fontSize || 40]}
                  onValueChange={([v]) => onUpdateElement(selectedElement.id, { fontSize: v })}
                  min={8}
                  max={200}
                  step={1}
                />
              </div>

              {/* Text Style Buttons */}
              <div className="flex flex-wrap gap-1">
                <Button
                  variant={selectedElement.fontStyle?.includes('bold') ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    const current = selectedElement.fontStyle || 'normal';
                    const isBold = current.includes('bold');
                    const isItalic = current.includes('italic');
                    let newStyle: 'normal' | 'bold' | 'italic' | 'bold italic' = 'normal';
                    if (!isBold && isItalic) newStyle = 'bold italic';
                    else if (!isBold) newStyle = 'bold';
                    else if (isItalic) newStyle = 'italic';
                    onUpdateElement(selectedElement.id, { fontStyle: newStyle });
                  }}
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  variant={selectedElement.fontStyle?.includes('italic') ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    const current = selectedElement.fontStyle || 'normal';
                    const isBold = current.includes('bold');
                    const isItalic = current.includes('italic');
                    let newStyle: 'normal' | 'bold' | 'italic' | 'bold italic' = 'normal';
                    if (isBold && !isItalic) newStyle = 'bold italic';
                    else if (!isItalic) newStyle = 'italic';
                    else if (isBold) newStyle = 'bold';
                    onUpdateElement(selectedElement.id, { fontStyle: newStyle });
                  }}
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  variant={selectedElement.textDecoration === 'underline' ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onUpdateElement(selectedElement.id, { 
                    textDecoration: selectedElement.textDecoration === 'underline' ? '' : 'underline' 
                  })}
                >
                  <Underline className="h-4 w-4" />
                </Button>
                <div className="w-px h-8 bg-gray-200 mx-1" />
                <Button
                  variant={selectedElement.align === 'left' ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onUpdateElement(selectedElement.id, { align: 'left' })}
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant={selectedElement.align === 'center' ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onUpdateElement(selectedElement.id, { align: 'center' })}
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                  variant={selectedElement.align === 'right' ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onUpdateElement(selectedElement.id, { align: 'right' })}
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Text Color */}
              <div>
                <Label className="text-xs text-gray-500">Cor do Texto</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    type="color"
                    value={selectedElement.fill || "#000000"}
                    onChange={(e) => onUpdateElement(selectedElement.id, { fill: e.target.value })}
                    className="w-10 h-8 p-1 cursor-pointer bg-gray-50 border-gray-200"
                  />
                  <Input
                    value={selectedElement.fill || "#000000"}
                    onChange={(e) => onUpdateElement(selectedElement.id, { fill: e.target.value })}
                    className="flex-1 h-8 bg-gray-50 border-gray-200 text-gray-700"
                  />
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      onClick={() => onUpdateElement(selectedElement.id, { fill: color })}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Shape Properties */}
          {!isTextElement && selectedElement.type !== 'image' && (
            <div className="space-y-3">
              <Label className="text-xs text-gray-500 uppercase tracking-wider font-medium">Preenchimento</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={selectedElement.fill || "#000000"}
                  onChange={(e) => onUpdateElement(selectedElement.id, { fill: e.target.value })}
                  className="w-10 h-8 p-1 cursor-pointer bg-gray-50 border-gray-200"
                />
                <Input
                  value={selectedElement.fill || "#000000"}
                  onChange={(e) => onUpdateElement(selectedElement.id, { fill: e.target.value })}
                  className="flex-1 h-8 bg-gray-50 border-gray-200 text-gray-700"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => onUpdateElement(selectedElement.id, { fill: color })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Border */}
          {selectedElement.type !== 'image' && (
            <div className="space-y-3">
              <Label className="text-xs text-gray-500 uppercase tracking-wider font-medium">Borda</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={selectedElement.stroke || "#000000"}
                  onChange={(e) => onUpdateElement(selectedElement.id, { stroke: e.target.value })}
                  className="w-10 h-8 p-1 cursor-pointer bg-gray-50 border-gray-200"
                />
                <Input
                  value={selectedElement.stroke || ""}
                  onChange={(e) => onUpdateElement(selectedElement.id, { stroke: e.target.value })}
                  placeholder="Nenhuma"
                  className="flex-1 h-8 bg-gray-50 border-gray-200 text-gray-700"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-xs text-gray-500">Espessura</Label>
                  <span className="text-xs text-gray-400">{selectedElement.strokeWidth || 0}px</span>
                </div>
                <Slider
                  value={[selectedElement.strokeWidth || 0]}
                  onValueChange={([v]) => onUpdateElement(selectedElement.id, { strokeWidth: v })}
                  min={0}
                  max={20}
                  step={1}
                />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
