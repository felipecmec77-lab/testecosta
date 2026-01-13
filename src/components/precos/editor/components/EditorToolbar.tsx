import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Undo, Redo, Download, ZoomIn, ZoomOut, Grid3X3 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GRID_SIZE } from "../types";

interface EditorToolbarProps {
  canvasSize: 'full' | 'half';
  onCanvasSizeChange: (size: 'full' | 'half') => void;
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
  isDownloading?: boolean;
}

export function EditorToolbar({
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
}: EditorToolbarProps) {
  const handleZoom = (delta: number) => {
    onZoomChange(Math.max(0.2, Math.min(1.5, zoom + delta)));
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-2 shrink-0 shadow-sm">
      {/* Undo/Redo */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30" 
              onClick={onUndo} 
              disabled={!canUndo}
            >
              <Undo className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Desfazer (Ctrl+Z)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30" 
              onClick={onRedo} 
              disabled={!canRedo}
            >
              <Redo className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refazer (Ctrl+Y)</TooltipContent>
        </Tooltip>
      </div>

      <div className="h-6 w-px bg-gray-200 mx-2" />

      {/* Size Selector */}
      <Select value={canvasSize} onValueChange={(v: 'full' | 'half') => onCanvasSizeChange(v)}>
        <SelectTrigger className="w-40 h-9 bg-white border-gray-200 text-gray-700 hover:bg-gray-50">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="full">A4 Paisagem</SelectItem>
          <SelectItem value="half">A4 Retrato</SelectItem>
        </SelectContent>
      </Select>

      {/* Grid Toggle */}
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "h-9 w-9",
              showGrid ? "text-purple-600 bg-purple-50" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            )}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="end">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">Mostrar grade</Label>
              <Switch checked={showGrid} onCheckedChange={onShowGridChange} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">Snap to grid</Label>
              <Switch checked={snapToGrid} onCheckedChange={onSnapToGridChange} />
            </div>
            <p className="text-xs text-gray-400">Grade de {GRID_SIZE}px</p>
          </div>
        </PopoverContent>
      </Popover>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Zoom Controls */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 text-gray-600 hover:text-gray-900 hover:bg-gray-200" 
          onClick={() => handleZoom(-0.1)}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-gray-700 text-sm w-12 text-center font-medium">
          {Math.round(zoom * 100)}%
        </span>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 text-gray-600 hover:text-gray-900 hover:bg-gray-200" 
          onClick={() => handleZoom(0.1)}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      <div className="h-6 w-px bg-gray-200 mx-2" />

      <Button 
        onClick={onDownload} 
        size="sm" 
        className="h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
        disabled={isDownloading}
      >
        <Download className="h-4 w-4" /> 
        {isDownloading ? 'Gerando...' : 'Baixar PDF'}
      </Button>
    </header>
  );
}
