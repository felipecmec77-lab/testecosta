import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Type, Square, Circle, Image, Minus, Star, Triangle,
  Layers, LayoutTemplate, Plus, X, Eye, EyeOff, Lock,
  ArrowUp, ArrowDown, ChevronUp, ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EditorElement, CANVAS_SIZES } from "../types";
import { TemplateGallery } from "../../TemplateGallery";

interface ElementsSidebarProps {
  isOpen: boolean;
  activeTab: 'templates' | 'elements' | 'layers';
  onTabChange: (tab: 'templates' | 'elements' | 'layers') => void;
  onClose: () => void;
  elements: EditorElement[];
  selectedId: string | null;
  onSelectElement: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onMoveElement: (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;
  onToggleLock: (id: string) => void;
  onAddText: () => void;
  onAddRect: () => void;
  onAddCircle: () => void;
  onAddTriangle: () => void;
  onAddLine: () => void;
  onAddStar: () => void;
  onAddImage: () => void;
  onLoadTemplate: (data: any) => void;
  canvasSize: 'full' | 'half';
}

export function ElementsSidebar({
  isOpen,
  activeTab,
  onTabChange,
  onClose,
  elements,
  selectedId,
  onSelectElement,
  onToggleVisibility,
  onMoveElement,
  onToggleLock,
  onAddText,
  onAddRect,
  onAddCircle,
  onAddTriangle,
  onAddLine,
  onAddStar,
  onAddImage,
  onLoadTemplate,
  canvasSize,
}: ElementsSidebarProps) {
  const elementItems = [
    { icon: Type, label: "Texto", action: onAddText },
    { icon: Square, label: "Retângulo", action: onAddRect },
    { icon: Circle, label: "Círculo", action: onAddCircle },
    { icon: Triangle, label: "Triângulo", action: onAddTriangle },
    { icon: Minus, label: "Linha", action: onAddLine },
    { icon: Star, label: "Estrela", action: onAddStar },
    { icon: Image, label: "Imagem", action: onAddImage },
  ];

  const getElementName = (el: EditorElement) => {
    switch (el.type) {
      case 'text':
        const text = el.text || '';
        return `"${text.slice(0, 12)}${text.length > 12 ? '...' : ''}"`;
      case 'rect': return 'Retângulo';
      case 'circle': return 'Círculo';
      case 'triangle': return 'Triângulo';
      case 'line': return 'Linha';
      case 'star': return 'Estrela';
      case 'image': return 'Imagem';
      default: return el.type;
    }
  };

  const selectedElement = elements.find(el => el.id === selectedId);

  return (
    <aside className={cn(
      "bg-white border-r border-gray-200 flex shrink-0 transition-all duration-200",
      isOpen ? "w-[320px]" : "w-[72px]"
    )}>
      {/* Icon Navigation */}
      <nav className="w-[72px] border-r border-gray-100 py-4 flex flex-col items-center gap-1 shrink-0 bg-gray-50/50">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "h-14 w-14 rounded-xl flex flex-col gap-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100",
                activeTab === "templates" && isOpen && "bg-purple-50 text-purple-600 hover:bg-purple-50 hover:text-purple-600"
              )}
              onClick={() => onTabChange("templates")}
            >
              <LayoutTemplate className="h-5 w-5" />
              <span className="text-[10px] font-medium">Templates</span>
            </Button>
          </TooltipTrigger>
          {!isOpen && <TooltipContent side="right">Templates</TooltipContent>}
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "h-14 w-14 rounded-xl flex flex-col gap-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100",
                activeTab === "elements" && isOpen && "bg-purple-50 text-purple-600 hover:bg-purple-50 hover:text-purple-600"
              )}
              onClick={() => onTabChange("elements")}
            >
              <Plus className="h-5 w-5" />
              <span className="text-[10px] font-medium">Elementos</span>
            </Button>
          </TooltipTrigger>
          {!isOpen && <TooltipContent side="right">Elementos</TooltipContent>}
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "h-14 w-14 rounded-xl flex flex-col gap-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100",
                activeTab === "layers" && isOpen && "bg-purple-50 text-purple-600 hover:bg-purple-50 hover:text-purple-600"
              )}
              onClick={() => onTabChange("layers")}
            >
              <Layers className="h-5 w-5" />
              <span className="text-[10px] font-medium">Camadas</span>
            </Button>
          </TooltipTrigger>
          {!isOpen && <TooltipContent side="right">Camadas</TooltipContent>}
        </Tooltip>
      </nav>

      {/* Expanded Content Panel */}
      {isOpen && (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-14 px-4 flex items-center justify-between border-b border-gray-100 shrink-0">
            <h2 className="text-gray-900 font-semibold text-sm">
              {activeTab === "templates" ? "Templates" : activeTab === "elements" ? "Elementos" : "Camadas"}
            </h2>
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
            <div className="p-4">
              {activeTab === "templates" && (
                <TemplateGallery 
                  onSelectTemplate={onLoadTemplate} 
                  isLandscape={canvasSize === 'full'} 
                />
              )}

              {activeTab === "elements" && (
                <div className="grid grid-cols-2 gap-3">
                  {elementItems.map((item) => (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors border border-gray-100 hover:border-gray-200"
                    >
                      <item.icon className="h-7 w-7" />
                      <span className="text-xs font-medium">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {activeTab === "layers" && (
                <div className="space-y-2">
                  {/* Layer controls for selected element */}
                  {selectedElement && (
                    <div className="flex items-center justify-center gap-1 mb-4 p-2 bg-gray-50 rounded-lg">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-gray-200"
                            onClick={() => onMoveElement(selectedId!, 'top')}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Topo</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-gray-200"
                            onClick={() => onMoveElement(selectedId!, 'up')}
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
                            className="h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-gray-200"
                            onClick={() => onMoveElement(selectedId!, 'down')}
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
                            className="h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-gray-200"
                            onClick={() => onMoveElement(selectedId!, 'bottom')}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Fundo</TooltipContent>
                      </Tooltip>
                      <div className="w-px h-8 bg-gray-200" />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-gray-200"
                            onClick={() => onToggleLock(selectedId!)}
                          >
                            {selectedElement.locked ? (
                              <Lock className="h-4 w-4" />
                            ) : (
                              <Lock className="h-4 w-4 opacity-30" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{selectedElement.locked ? "Desbloquear" : "Bloquear"}</TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                  
                  {/* Layers list - reversed to show top layers first */}
                  {[...elements].reverse().map((el) => {
                    return (
                      <div
                        key={el.id}
                        className={cn(
                          "flex items-center gap-2 p-2.5 text-sm rounded-lg cursor-pointer transition-colors",
                          selectedId === el.id 
                            ? "bg-purple-50 text-purple-700 border border-purple-200" 
                            : "hover:bg-gray-100 text-gray-600 border border-transparent"
                        )}
                        onClick={() => onSelectElement(el.id)}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-gray-400 hover:text-gray-600 hover:bg-transparent"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleVisibility(el.id);
                          }}
                        >
                          {el.visible !== false ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </Button>
                        {el.locked && <Lock className="h-3 w-3 text-gray-400" />}
                        <span className={cn(
                          "flex-1 truncate text-xs",
                          el.visible === false && "opacity-50 line-through"
                        )}>
                          {getElementName(el)}
                        </span>
                      </div>
                    );
                  })}
                  
                  {elements.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Layers className="h-10 w-10 text-gray-300 mb-3" />
                      <p className="text-sm text-gray-400">Nenhum elemento</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </aside>
  );
}
