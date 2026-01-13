import { useState, useRef, useCallback, useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { 
  useEditorState, 
  useSmartGuides, 
  useFontLoader,
  useKeyboardShortcuts,
  useClipboard,
  generatePdfFromElements,
  EditorElement,
} from "./editor";
import { TopToolbar } from "./editor/components/TopToolbar";
import { ContextToolbar } from "./editor/components/ContextToolbar";
import { KonvaCanvas } from "./editor/components/KonvaCanvas";
import { SaveTemplateDialog } from "./SaveTemplateDialog";
import { Upload } from "lucide-react";

interface CanvasEditorProps {
  tamanho: "full" | "half";
  onTamanhoChange: (tamanho: "full" | "half") => void;
  initialElements?: EditorElement[] | null;
}

export function CanvasEditor({ tamanho, onTamanhoChange, initialElements }: CanvasEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState<{ x: number; y: number } | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Editor state
  const editor = useEditorState(tamanho);
  const { loadFont, loading: loadingFont } = useFontLoader();
  const { guides, calculateGuides, clearGuides } = useSmartGuides(
    editor.elements,
    editor.dimensions,
    editor.snapToGrid
  );

  // Load initial elements if provided (from template duplication)
  useEffect(() => {
    if (initialElements && initialElements.length > 0) {
      editor.setElements(initialElements);
    }
  }, [initialElements]);

  // Clipboard for copy/paste
  const { copy, paste, hasClipboard } = useClipboard(editor.addElement, editor.elements);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    selectedId: editor.selectedId,
    selectedElement: editor.selectedElement,
    onDuplicate: editor.duplicateElement,
    onDelete: editor.deleteElement,
    onUndo: editor.undo,
    onRedo: editor.redo,
    onCopy: () => {
      if (editor.selectedId) {
        copy(editor.selectedId);
        toast.success("Copiado!");
      }
    },
    onPaste: () => {
      if (hasClipboard) {
        paste();
        toast.success("Colado!");
      }
    },
    canUndo: editor.canUndo,
    canRedo: editor.canRedo,
  });

  // Sync canvas size with prop
  const handleCanvasSizeChange = (size: 'full' | 'half') => {
    editor.setCanvasSize(size);
    onTamanhoChange(size);
  };

  // Handle element position for context toolbar
  const handleElementPosition = useCallback((element: EditorElement, rect: DOMRect) => {
    setToolbarPosition({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  }, []);

  // Clear toolbar position when deselecting
  const handleSelectElement = useCallback((id: string | null) => {
    editor.setSelectedId(id);
    if (!id) {
      setToolbarPosition(null);
    }
  }, [editor.setSelectedId]);

  // Add elements
  const addText = async () => {
    await loadFont("Open Sans");
    editor.addElement({
      type: 'text',
      x: editor.dimensions.width / 2 - 100,
      y: editor.dimensions.height / 2 - 20,
      text: "Clique para editar",
      fontSize: 48,
      fontFamily: "Open Sans",
      fill: "#000000",
      fontStyle: 'bold',
      width: 300,
    });
  };

  const addRect = () => {
    editor.addElement({
      type: 'rect',
      x: editor.dimensions.width / 2 - 75,
      y: editor.dimensions.height / 2 - 50,
      width: 150,
      height: 100,
      fill: "#22c55e",
      cornerRadius: 10,
    });
  };

  const addCircle = () => {
    editor.addElement({
      type: 'circle',
      x: editor.dimensions.width / 2,
      y: editor.dimensions.height / 2,
      radius: 50,
      fill: "#3b82f6",
    });
  };

  const addTriangle = () => {
    editor.addElement({
      type: 'triangle',
      x: editor.dimensions.width / 2,
      y: editor.dimensions.height / 2,
      radius: 50,
      fill: "#f59e0b",
    });
  };

  const addLine = () => {
    editor.addElement({
      type: 'line',
      x: editor.dimensions.width / 2 - 50,
      y: editor.dimensions.height / 2,
      points: [0, 0, 100, 0],
      stroke: "#000000",
      strokeWidth: 4,
    });
  };

  const addStar = () => {
    editor.addElement({
      type: 'star',
      x: editor.dimensions.width / 2,
      y: editor.dimensions.height / 2,
      outerRadius: 50,
      innerRadius: 25,
      numPoints: 5,
      fill: "#fbbf24",
    });
  };

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const maxSize = 200;
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        editor.addElement({
          type: 'image',
          x: editor.dimensions.width / 2 - (img.width * scale) / 2,
          y: editor.dimensions.height / 2 - (img.height * scale) / 2,
          width: img.width * scale,
          height: img.height * scale,
          src: event.target?.result as string,
        });
      };
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle font change
  const handleFontChange = async (fontName: string) => {
    if (!editor.selectedId) return;
    const success = await loadFont(fontName);
    if (success) {
      editor.updateElementWithHistory(editor.selectedId, { fontFamily: fontName });
    } else {
      toast.error(`Erro ao carregar fonte: ${fontName}`);
    }
  };

  // Download PDF
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      toast.loading("Gerando PDF...");
      const isLandscape = tamanho === "full";
      await generatePdfFromElements(editor.elements, editor.dimensions, isLandscape);
      toast.dismiss();
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      toast.dismiss();
      toast.error("Erro ao gerar PDF");
      console.error(error);
    }
    setIsDownloading(false);
  };

  // Drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) {
      toast.error("Por favor, arraste apenas imagens");
      return;
    }
    files.forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const maxSize = 200;
          const scale = Math.min(maxSize / img.width, maxSize / img.height);
          editor.addElement({
            type: 'image',
            x: editor.dimensions.width / 2 - (img.width * scale) / 2 + i * 30,
            y: editor.dimensions.height / 2 - (img.height * scale) / 2 + i * 30,
            width: img.width * scale,
            height: img.height * scale,
            src: event.target?.result as string,
          });
        };
      };
      reader.readAsDataURL(file);
    });
    toast.success(`${files.length} imagem(ns) adicionada(s)!`);
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-gray-100">
        {/* Top Toolbar */}
        <TopToolbar
          canvasSize={tamanho}
          onCanvasSizeChange={handleCanvasSizeChange}
          zoom={editor.zoom}
          onZoomChange={editor.setZoom}
          showGrid={editor.showGrid}
          onShowGridChange={editor.setShowGrid}
          snapToGrid={editor.snapToGrid}
          onSnapToGridChange={editor.setSnapToGrid}
          canUndo={editor.canUndo}
          canRedo={editor.canRedo}
          onUndo={editor.undo}
          onRedo={editor.redo}
          onDownload={handleDownload}
          isDownloading={isDownloading}
          onSaveTemplate={() => setShowSaveDialog(true)}
          onAddText={addText}
          onAddRect={addRect}
          onAddCircle={addCircle}
          onAddTriangle={addTriangle}
          onAddLine={addLine}
          onAddStar={addStar}
          onAddImage={() => fileInputRef.current?.click()}
        />

        {/* Canvas Area */}
        <main 
          className="flex-1 overflow-auto flex items-center justify-center p-8 relative"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Drop zone overlay */}
          {isDragging && (
            <div className="absolute inset-4 border-2 border-dashed border-purple-400 bg-purple-50/50 rounded-xl flex items-center justify-center z-10 pointer-events-none">
              <div className="bg-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 text-purple-600">
                <Upload className="h-6 w-6" />
                <span className="font-medium">Solte as imagens aqui</span>
              </div>
            </div>
          )}

          <KonvaCanvas
            elements={editor.elements}
            selectedId={editor.selectedId}
            onSelectElement={handleSelectElement}
            onUpdateElement={editor.updateElement}
            onUpdateElementWithHistory={editor.updateElementWithHistory}
            dimensions={editor.dimensions}
            zoom={editor.zoom}
            showGrid={editor.showGrid}
            guides={guides}
            onDragMove={(el, node) => calculateGuides(el, node)}
            onDragEnd={clearGuides}
            onElementPosition={handleElementPosition}
          />
        </main>

        {/* Context Toolbar */}
        {editor.selectedElement && toolbarPosition && (
          <ContextToolbar
            element={editor.selectedElement}
            position={toolbarPosition}
            zoom={editor.zoom}
            onUpdateElement={editor.updateElementWithHistory}
            onDuplicateElement={editor.duplicateElement}
            onDeleteElement={editor.deleteElement}
            onFontChange={handleFontChange}
            loadingFont={loadingFont}
          />
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* Save Template Dialog */}
        <SaveTemplateDialog
          open={showSaveDialog}
          onOpenChange={setShowSaveDialog}
          elements={editor.elements}
          canvasSize={tamanho}
        />
      </div>
    </TooltipProvider>
  );
}
