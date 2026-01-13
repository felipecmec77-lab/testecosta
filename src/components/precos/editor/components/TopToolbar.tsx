import { Button } from "@/components/ui/button";
import {
  Undo2,
  Redo2,
  Download,
  Grid3X3,
  Magnet,
  Type,
  Square,
  Circle,
  Triangle,
  Minus,
  Star,
  Image,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  ArrowLeft,
  Save,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface TopToolbarProps {
  canvasSize: "full" | "half";
  onCanvasSizeChange: (size: "full" | "half") => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  showGrid: boolean;
  onShowGridChange: (show: boolean) => void;
  snapToGrid: boolean;
  onSnapToGridChange: (snap: boolean) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDownload: () => void;
  isDownloading: boolean;
  onSaveTemplate: () => void;
  // Element actions
  onAddText: () => void;
  onAddRect: () => void;
  onAddCircle: () => void;
  onAddTriangle: () => void;
  onAddLine: () => void;
  onAddStar: () => void;
  onAddImage: () => void;
}

export function TopToolbar({
  canvasSize,
  onCanvasSizeChange,
  zoom,
  onZoomChange,
  showGrid,
  onShowGridChange,
  snapToGrid,
  onSnapToGridChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onDownload,
  isDownloading,
  onSaveTemplate,
  onAddText,
  onAddRect,
  onAddCircle,
  onAddTriangle,
  onAddLine,
  onAddStar,
  onAddImage,
}: TopToolbarProps) {
  const shapes = [
    { icon: Square, label: "Retângulo", action: onAddRect },
    { icon: Circle, label: "Círculo", action: onAddCircle },
    { icon: Triangle, label: "Triângulo", action: onAddTriangle },
    { icon: Minus, label: "Linha", action: onAddLine },
    { icon: Star, label: "Estrela", action: onAddStar },
  ];

  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-2 shrink-0">
      {/* Back button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Link to="/">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        </TooltipTrigger>
        <TooltipContent>Voltar</TooltipContent>
      </Tooltip>

      <Link to="/gerar-encartes">
        <Button variant="outline" size="sm" className="h-9 text-xs">
          Gerar Encartes
        </Button>
      </Link>

      <div className="w-px h-6 bg-gray-200" />

      {/* Element buttons */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onAddText}
              className="h-9 gap-2 px-3"
            >
              <Type className="h-4 w-4" />
              <span className="text-sm font-medium">Texto</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Adicionar texto</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 gap-2 px-3">
                  <Square className="h-4 w-4" />
                  <span className="text-sm font-medium">Formas</span>
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Adicionar formas</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="w-40">
            {shapes.map((shape) => (
              <DropdownMenuItem
                key={shape.label}
                onClick={shape.action}
                className="gap-2 cursor-pointer"
              >
                <shape.icon className="h-4 w-4" />
                {shape.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onAddImage}
              className="h-9 gap-2 px-3"
            >
              <Image className="h-4 w-4" />
              <span className="text-sm font-medium">Imagem</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Adicionar imagem</TooltipContent>
        </Tooltip>
      </div>

      <div className="w-px h-6 bg-gray-200" />

      {/* Canvas size */}
      <Select value={canvasSize} onValueChange={onCanvasSizeChange}>
        <SelectTrigger className="w-32 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="half">A4 Retrato</SelectItem>
          <SelectItem value="full">A4 Paisagem</SelectItem>
        </SelectContent>
      </Select>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Grid & Snap */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-9 w-9", showGrid && "bg-purple-100 text-purple-600")}
              onClick={() => onShowGridChange(!showGrid)}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Grade {showGrid ? "ativa" : "inativa"}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-9 w-9", snapToGrid && "bg-purple-100 text-purple-600")}
              onClick={() => onSnapToGridChange(!snapToGrid)}
            >
              <Magnet className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Snap {snapToGrid ? "ativo" : "inativo"}</TooltipContent>
        </Tooltip>
      </div>

      <div className="w-px h-6 bg-gray-200" />

      {/* Zoom */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => onZoomChange(Math.max(0.25, zoom - 0.1))}
              disabled={zoom <= 0.25}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Diminuir zoom</TooltipContent>
        </Tooltip>

        <span className="text-sm font-medium w-12 text-center">{Math.round(zoom * 100)}%</span>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => onZoomChange(Math.min(2, zoom + 0.1))}
              disabled={zoom >= 2}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Aumentar zoom</TooltipContent>
        </Tooltip>
      </div>

      <div className="w-px h-6 bg-gray-200" />

      {/* Undo/Redo */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={onUndo}
              disabled={!canUndo}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Desfazer (Ctrl+Z)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={onRedo}
              disabled={!canRedo}
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refazer (Ctrl+Y)</TooltipContent>
        </Tooltip>
      </div>

      <div className="w-px h-6 bg-gray-200" />

      {/* Save Template */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onSaveTemplate}
            variant="outline"
            size="sm"
            className="h-9 gap-2"
          >
            <Save className="h-4 w-4" />
            Salvar
          </Button>
        </TooltipTrigger>
        <TooltipContent>Salvar como template</TooltipContent>
      </Tooltip>

      {/* Download */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onDownload}
            disabled={isDownloading}
            size="sm"
            className="h-9 gap-2 bg-purple-600 hover:bg-purple-700"
          >
            <Download className="h-4 w-4" />
            Baixar PDF
          </Button>
        </TooltipTrigger>
        <TooltipContent>Baixar como PDF vetorial</TooltipContent>
      </Tooltip>
    </div>
  );
}
