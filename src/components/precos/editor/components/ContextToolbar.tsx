import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Copy,
  Trash2,
  ChevronDown,
  Paintbrush,
  Palette,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EditorElement, ALL_FONTS, FONT_CATEGORIES } from "../types";
import { cn } from "@/lib/utils";
import { AdvancedColorPicker } from "./AdvancedColorPicker";

interface ContextToolbarProps {
  element: EditorElement;
  position: { x: number; y: number };
  zoom: number;
  onUpdateElement: (id: string, updates: Partial<EditorElement>) => void;
  onDuplicateElement: (id: string) => void;
  onDeleteElement: (id: string) => void;
  onFontChange: (fontName: string) => void;
  loadingFont: boolean;
}

export function ContextToolbar({
  element,
  position,
  zoom,
  onUpdateElement,
  onDuplicateElement,
  onDeleteElement,
  onFontChange,
  loadingFont,
}: ContextToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!toolbarRef.current) return;
    
    const toolbar = toolbarRef.current;
    const toolbarWidth = toolbar.offsetWidth;
    const toolbarHeight = toolbar.offsetHeight;
    
    // Calculate position above the element
    let x = position.x - toolbarWidth / 2;
    let y = position.y - toolbarHeight - 12;
    
    // Keep toolbar within viewport
    const padding = 8;
    x = Math.max(padding, Math.min(window.innerWidth - toolbarWidth - padding, x));
    y = Math.max(padding, y);
    
    setToolbarPos({ x, y });
  }, [position]);

  const isText = element.type === "text";
  const isShape = ["rect", "circle", "triangle", "star"].includes(element.type);
  const isLine = element.type === "line";
  const isImage = element.type === "image";

  const toggleFontStyle = (style: "bold" | "italic") => {
    if (!isText) return;
    const currentStyle = element.fontStyle || "normal";
    let newStyle: typeof element.fontStyle = "normal";
    
    if (style === "bold") {
      if (currentStyle === "bold" || currentStyle === "bold italic") {
        newStyle = currentStyle === "bold italic" ? "italic" : "normal";
      } else {
        newStyle = currentStyle === "italic" ? "bold italic" : "bold";
      }
    } else {
      if (currentStyle === "italic" || currentStyle === "bold italic") {
        newStyle = currentStyle === "bold italic" ? "bold" : "normal";
      } else {
        newStyle = currentStyle === "bold" ? "bold italic" : "italic";
      }
    }
    
    onUpdateElement(element.id, { fontStyle: newStyle });
  };

  const toggleUnderline = () => {
    if (!isText) return;
    const hasUnderline = element.textDecoration === "underline";
    onUpdateElement(element.id, { textDecoration: hasUnderline ? "" : "underline" });
  };

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-1.5 flex items-center gap-1 animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{
        left: toolbarPos.x,
        top: toolbarPos.y,
      }}
    >
      {/* Text-specific controls */}
      {isText && (
        <>
          {/* Font family */}
          <Select
            value={element.fontFamily || "Open Sans"}
            onValueChange={onFontChange}
            disabled={loadingFont}
          >
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {Object.entries(FONT_CATEGORIES).map(([category, fonts]) => (
                <div key={category}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    {category}
                  </div>
                  {fonts.map((font) => (
                    <SelectItem key={font} value={font} className="text-sm">
                      <span style={{ fontFamily: font }}>{font}</span>
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>

          {/* Font size */}
          <Input
            type="number"
            value={element.fontSize || 40}
            onChange={(e) => onUpdateElement(element.id, { fontSize: Number(e.target.value) })}
            className="w-16 h-8 text-xs text-center"
            min={8}
            max={200}
          />

          <div className="w-px h-6 bg-gray-200" />

          {/* Text styling */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8",
              (element.fontStyle === "bold" || element.fontStyle === "bold italic") && "bg-gray-100"
            )}
            onClick={() => toggleFontStyle("bold")}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8",
              (element.fontStyle === "italic" || element.fontStyle === "bold italic") && "bg-gray-100"
            )}
            onClick={() => toggleFontStyle("italic")}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", element.textDecoration === "underline" && "bg-gray-100")}
            onClick={toggleUnderline}
          >
            <Underline className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-gray-200" />

          {/* Text alignment */}
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", element.align === "left" && "bg-gray-100")}
            onClick={() => onUpdateElement(element.id, { align: "left" })}
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", element.align === "center" && "bg-gray-100")}
            onClick={() => onUpdateElement(element.id, { align: "center" })}
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", element.align === "right" && "bg-gray-100")}
            onClick={() => onUpdateElement(element.id, { align: "right" })}
          >
            <AlignRight className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-gray-200" />
        </>
      )}

      {/* Advanced Color picker for text and shapes */}
      {(isText || isShape) && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2" title={isText ? "Cor do texto" : "Cor de preenchimento"}>
              <Paintbrush className="h-4 w-4" />
              <div
                className="w-4 h-4 rounded border border-gray-300"
                style={{ backgroundColor: element.fill || "#000000" }}
              />
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="center" side="bottom">
            <AdvancedColorPicker
              color={element.fill || "#000000"}
              onChange={(color) => onUpdateElement(element.id, { fill: color })}
              label={isText ? "Cor do texto" : "Cor de preenchimento"}
            />
          </PopoverContent>
        </Popover>
      )}

      {/* Advanced Border color picker for shapes and lines */}
      {(isShape || isLine) && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2" title="Cor da borda">
              <Palette className="h-4 w-4" />
              <div
                className="w-4 h-4 rounded border-2"
                style={{ 
                  borderColor: element.stroke || "#000000",
                  backgroundColor: "transparent" 
                }}
              />
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="center" side="bottom">
            <AdvancedColorPicker
              color={element.stroke || "#000000"}
              onChange={(color) => onUpdateElement(element.id, { stroke: color })}
              label="Cor da borda"
            />
          </PopoverContent>
        </Popover>
      )}

      {/* Border width for shapes and lines */}
      {(isShape || isLine) && (
        <Input
          type="number"
          value={element.strokeWidth || 0}
          onChange={(e) => onUpdateElement(element.id, { strokeWidth: Number(e.target.value) })}
          className="w-14 h-8 text-xs text-center"
          min={0}
          max={20}
          placeholder="Borda"
        />
      )}

      <div className="w-px h-6 bg-gray-200" />

      {/* Common actions */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onDuplicateElement(element.id)}
      >
        <Copy className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
        onClick={() => onDeleteElement(element.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
