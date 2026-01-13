import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, Rect, IText, Circle, Image as FabricImage, Line, Triangle, Polygon } from "fabric";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Type, 
  Square, 
  Circle as CircleIcon, 
  Image, 
  Trash2, 
  Copy, 
  Undo, 
  Redo,
  Download,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Layers,
  ChevronUp,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  Search,
  Loader2,
  Eye,
  EyeOff,
  LayoutTemplate,
  Plus,
  Triangle as TriangleIcon,
  Minus,
  Star,
  ArrowUp,
  ArrowDown,
  Lock,
  Unlock,
  FlipHorizontal,
  FlipVertical,
  RotateCcw,
  Upload,
  MousePointer2,
  X,
  Grid3X3
} from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TemplateGallery } from "./TemplateGallery";
import { generateNativePdf } from "./nativePdfGenerator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface CanvasEditorProps {
  tamanho: "full" | "half";
  onTamanhoChange: (tamanho: "full" | "half") => void;
}

// Popular Google Fonts for initial list
const POPULAR_FONTS = [
  "Open Sans",
  "Roboto",
  "Montserrat",
  "Lato",
  "Oswald",
  "Poppins",
  "Raleway",
  "Inter",
  "Nunito",
  "Ubuntu",
  "Playfair Display",
  "Bebas Neue",
  "Anton",
  "Lobster",
  "Pacifico",
  "Dancing Script",
  "Permanent Marker",
  "Bangers",
  "Impact",
  "Arial",
];

// Extended Google Fonts list
const GOOGLE_FONTS_CATEGORIES = {
  "Display": ["Abril Fatface", "Alfa Slab One", "Anton", "Archivo Black", "Bebas Neue", "Bungee", "Cabin Sketch", "Changa One", "Concert One", "Fredoka One", "Fugaz One", "Lilita One", "Lobster", "Luckiest Guy", "Oleo Script", "Pacifico", "Passion One", "Patua One", "Permanent Marker", "Righteous", "Russo One", "Sigmar One", "Titan One", "Ultra"],
  "Handwriting": ["Amatic SC", "Caveat", "Dancing Script", "Gloria Hallelujah", "Great Vibes", "Homemade Apple", "Indie Flower", "Kaushan Script", "Lobster Two", "Pacifico", "Patrick Hand", "Rock Salt", "Sacramento", "Satisfy", "Shadows Into Light", "Tangerine"],
  "Sans Serif": ["Abel", "Arimo", "Barlow", "Cabin", "Catamaran", "DM Sans", "Exo 2", "Fira Sans", "Heebo", "Hind", "IBM Plex Sans", "Inter", "Josefin Sans", "Kanit", "Karla", "Lato", "Manrope", "Maven Pro", "Montserrat", "Mulish", "Noto Sans", "Nunito", "Nunito Sans", "Open Sans", "Outfit", "Oxygen", "Poppins", "Prompt", "Questrial", "Quicksand", "Rajdhani", "Raleway", "Roboto", "Rubik", "Source Sans Pro", "Space Grotesk", "Teko", "Titillium Web", "Ubuntu", "Varela Round", "Work Sans"],
  "Serif": ["Abril Fatface", "Bitter", "Bree Serif", "Cormorant Garamond", "Crimson Text", "DM Serif Display", "EB Garamond", "Frank Ruhl Libre", "IBM Plex Serif", "Josefin Slab", "Libre Baskerville", "Lora", "Merriweather", "Noto Serif", "Old Standard TT", "Playfair Display", "PT Serif", "Roboto Slab", "Rokkitt", "Source Serif Pro", "Spectral", "Tinos", "Vollkorn", "Zilla Slab"],
  "Monospace": ["Anonymous Pro", "Cousine", "Fira Code", "Fira Mono", "IBM Plex Mono", "Inconsolata", "JetBrains Mono", "Noto Sans Mono", "Overpass Mono", "Roboto Mono", "Source Code Pro", "Space Mono", "Ubuntu Mono"],
};

// Flatten all Google Fonts
const ALL_GOOGLE_FONTS = [...new Set([
  ...POPULAR_FONTS,
  ...Object.values(GOOGLE_FONTS_CATEGORIES).flat()
])].sort();

// Grid settings
const GRID_SIZE = 20; // pixels

// Load a Google Font dynamically
const loadGoogleFont = (fontName: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const formattedName = fontName.replace(/ /g, "+");
    const linkId = `google-font-${formattedName}`;
    
    if (document.getElementById(linkId)) {
      resolve();
      return;
    }
    
    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${formattedName}:wght@300;400;500;600;700;800&display=swap`;
    
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to load font: ${fontName}`));
    
    document.head.appendChild(link);
  });
};

// Color presets for quick selection
const colorPresets = [
  "#000000", "#ffffff", "#ef4444", "#f97316", "#eab308", 
  "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280"
];

// Snapping threshold in pixels
const SNAP_THRESHOLD = 5;

export function CanvasEditor({ tamanho, onTamanhoChange }: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const [canvas, setCanvas] = useState<FabricCanvas | null>(null);
  const [activeObject, setActiveObject] = useState<any>(null);
  const [zoom, setZoom] = useState(0.6);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Sidebar states
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [leftTab, setLeftTab] = useState<"templates" | "elements" | "layers">("elements");
  
  // Font search
  const [fontSearch, setFontSearch] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [loadingFont, setLoadingFont] = useState(false);
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set(POPULAR_FONTS));
  
  // Layers visibility
  const [layersForceUpdate, setLayersForceUpdate] = useState(0);

  // Smart guides state
  const [guides, setGuides] = useState<{ type: 'v' | 'h'; position: number }[]>([]);
  const [movingObjectPos, setMovingObjectPos] = useState<{ x: number; y: number } | null>(null);

  // Grid state
  const [showGrid, setShowGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const snapToGridRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    snapToGridRef.current = snapToGrid;
  }, [snapToGrid]);

  // Font category filter
  const [fontCategory, setFontCategory] = useState<string>("all");

  // Canvas dimensions - Higher resolution for sharper text
  const DPI_SCALE = 2;
  const isLandscape = tamanho === "full";
  const baseWidth = isLandscape ? 842 : 595;
  const baseHeight = isLandscape ? 595 : 842;
  const canvasWidth = baseWidth * DPI_SCALE;
  const canvasHeight = baseHeight * DPI_SCALE;

  // Ruler size
  const RULER_SIZE = 24;

  // Initialize canvas with high DPI
  useEffect(() => {
    if (!canvasRef.current) return;

    const fabricCanvas = new FabricCanvas(canvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: "#ffffff",
      selection: true,
    });

    fabricCanvas.setZoom(DPI_SCALE);

    fabricCanvas.on("selection:created", (e) => {
      setActiveObject(e.selected?.[0]);
      setLayersForceUpdate(prev => prev + 1);
    });
    fabricCanvas.on("selection:updated", (e) => {
      setActiveObject(e.selected?.[0]);
      setLayersForceUpdate(prev => prev + 1);
    });
    fabricCanvas.on("selection:cleared", () => {
      setActiveObject(null);
      setLayersForceUpdate(prev => prev + 1);
    });
    fabricCanvas.on("object:modified", () => {
      saveToHistory(fabricCanvas);
      setLayersForceUpdate(prev => prev + 1);
      setGuides([]);
      setMovingObjectPos(null);
    });
    fabricCanvas.on("object:added", () => {
      setLayersForceUpdate(prev => prev + 1);
    });
    fabricCanvas.on("object:removed", () => {
      setLayersForceUpdate(prev => prev + 1);
    });
    
    // Smart guides on object moving
    fabricCanvas.on("object:moving", (e) => {
      const obj = e.target;
      if (!obj) return;
      
      let objLeft = obj.left || 0;
      let objTop = obj.top || 0;
      
      // Snap to grid if enabled
      if (snapToGridRef.current) {
        objLeft = Math.round(objLeft / GRID_SIZE) * GRID_SIZE;
        objTop = Math.round(objTop / GRID_SIZE) * GRID_SIZE;
        obj.set({ left: objLeft, top: objTop });
      }
      
      const newGuides: { type: 'v' | 'h'; position: number }[] = [];
      const objBounds = obj.getBoundingRect();
      const objWidth = objBounds.width / DPI_SCALE;
      const objHeight = objBounds.height / DPI_SCALE;
      const objCenterX = objLeft + objWidth / 2;
      const objCenterY = objTop + objHeight / 2;
      const objRight = objLeft + objWidth;
      const objBottom = objTop + objHeight;
      
      // Update ruler position indicator
      setMovingObjectPos({ x: objLeft, y: objTop });
      
      // Canvas center guides
      const canvasCenterX = baseWidth / 2;
      const canvasCenterY = baseHeight / 2;
      
      // Check canvas center horizontal
      if (Math.abs(objCenterX - canvasCenterX) < SNAP_THRESHOLD) {
        newGuides.push({ type: 'v', position: canvasCenterX });
        obj.set('left', canvasCenterX - objWidth / 2);
      }
      
      // Check canvas center vertical
      if (Math.abs(objCenterY - canvasCenterY) < SNAP_THRESHOLD) {
        newGuides.push({ type: 'h', position: canvasCenterY });
        obj.set('top', canvasCenterY - objHeight / 2);
      }
      
      // Canvas edges
      if (Math.abs(objLeft) < SNAP_THRESHOLD) {
        newGuides.push({ type: 'v', position: 0 });
        obj.set('left', 0);
      }
      if (Math.abs(objTop) < SNAP_THRESHOLD) {
        newGuides.push({ type: 'h', position: 0 });
        obj.set('top', 0);
      }
      if (Math.abs(objRight - baseWidth) < SNAP_THRESHOLD) {
        newGuides.push({ type: 'v', position: baseWidth });
        obj.set('left', baseWidth - objWidth);
      }
      if (Math.abs(objBottom - baseHeight) < SNAP_THRESHOLD) {
        newGuides.push({ type: 'h', position: baseHeight });
        obj.set('top', baseHeight - objHeight);
      }
      
      // Check alignment with other objects
      fabricCanvas.getObjects().forEach((other) => {
        if (other === obj) return;
        
        const otherBounds = other.getBoundingRect();
        const otherLeft = other.left || 0;
        const otherTop = other.top || 0;
        const otherWidth = otherBounds.width / DPI_SCALE;
        const otherHeight = otherBounds.height / DPI_SCALE;
        const otherCenterX = otherLeft + otherWidth / 2;
        const otherCenterY = otherTop + otherHeight / 2;
        const otherRight = otherLeft + otherWidth;
        const otherBottom = otherTop + otherHeight;
        
        // Left edge alignment
        if (Math.abs(objLeft - otherLeft) < SNAP_THRESHOLD) {
          newGuides.push({ type: 'v', position: otherLeft });
          obj.set('left', otherLeft);
        }
        // Right edge alignment
        if (Math.abs(objRight - otherRight) < SNAP_THRESHOLD) {
          newGuides.push({ type: 'v', position: otherRight });
          obj.set('left', otherRight - objWidth);
        }
        // Center X alignment
        if (Math.abs(objCenterX - otherCenterX) < SNAP_THRESHOLD) {
          newGuides.push({ type: 'v', position: otherCenterX });
          obj.set('left', otherCenterX - objWidth / 2);
        }
        // Top edge alignment
        if (Math.abs(objTop - otherTop) < SNAP_THRESHOLD) {
          newGuides.push({ type: 'h', position: otherTop });
          obj.set('top', otherTop);
        }
        // Bottom edge alignment
        if (Math.abs(objBottom - otherBottom) < SNAP_THRESHOLD) {
          newGuides.push({ type: 'h', position: otherBottom });
          obj.set('top', otherBottom - objHeight);
        }
        // Center Y alignment
        if (Math.abs(objCenterY - otherCenterY) < SNAP_THRESHOLD) {
          newGuides.push({ type: 'h', position: otherCenterY });
          obj.set('top', otherCenterY - objHeight / 2);
        }
      });
      
      setGuides(newGuides);
    });
    
    fabricCanvas.on("mouse:up", () => {
      setGuides([]);
      setMovingObjectPos(null);
    });

    setCanvas(fabricCanvas);
    saveToHistory(fabricCanvas);

    POPULAR_FONTS.forEach(font => loadGoogleFont(font).catch(() => {}));

    return () => {
      fabricCanvas.dispose();
    };
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!canvas) return;
      
      const active = canvas.getActiveObject();
      if (!active) return;
      
      if (active.type === "i-text" && (active as any).isEditing) return;
      
      if (e.key === "Delete" || e.key === "Backspace") {
        if (e.key === "Backspace") {
          e.preventDefault();
        }
        canvas.remove(active);
        setActiveObject(null);
        canvas.renderAll();
        saveToHistory(canvas);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canvas]);

  // Update canvas size when tamanho changes
  useEffect(() => {
    if (!canvas) return;
    canvas.setDimensions({ width: canvasWidth, height: canvasHeight });
    canvas.setZoom(DPI_SCALE);
    canvas.renderAll();
  }, [tamanho, canvas, canvasWidth, canvasHeight]);

  // Font search with category filter
  useEffect(() => {
    let fontsToSearch = fontCategory === "all" 
      ? ALL_GOOGLE_FONTS 
      : GOOGLE_FONTS_CATEGORIES[fontCategory as keyof typeof GOOGLE_FONTS_CATEGORIES] || ALL_GOOGLE_FONTS;
    
    if (!fontSearch.trim()) {
      setSearchResults(fontsToSearch.slice(0, 50)); // Show first 50 fonts
      return;
    }
    
    const query = fontSearch.toLowerCase();
    const filtered = fontsToSearch.filter(f => 
      f.toLowerCase().includes(query)
    );
    setSearchResults(filtered.slice(0, 50)); // Limit results
  }, [fontSearch, fontCategory]);

  const saveToHistory = useCallback((c: FabricCanvas) => {
    const json = JSON.stringify(c.toJSON());
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(json);
      return newHistory.slice(-50);
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const undo = () => {
    if (!canvas || historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    canvas.loadFromJSON(JSON.parse(history[newIndex])).then(() => {
      canvas.setZoom(DPI_SCALE);
      canvas.renderAll();
      setHistoryIndex(newIndex);
    });
  };

  const redo = () => {
    if (!canvas || historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    canvas.loadFromJSON(JSON.parse(history[newIndex])).then(() => {
      canvas.setZoom(DPI_SCALE);
      canvas.renderAll();
      setHistoryIndex(newIndex);
    });
  };

  const addText = async () => {
    if (!canvas) return;
    await loadGoogleFont("Open Sans");
    const text = new IText("Clique para editar", {
      left: baseWidth / 2 - 100,
      top: baseHeight / 2 - 20,
      fontSize: 48,
      fontFamily: "Open Sans",
      fill: "#000000",
      fontWeight: "700",
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    saveToHistory(canvas);
  };

  const addRect = () => {
    if (!canvas) return;
    const rect = new Rect({
      left: baseWidth / 2 - 75,
      top: baseHeight / 2 - 50,
      width: 150,
      height: 100,
      fill: "#22c55e",
      rx: 10,
      ry: 10,
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
    saveToHistory(canvas);
  };

  const addCircle = () => {
    if (!canvas) return;
    const circle = new Circle({
      left: baseWidth / 2 - 50,
      top: baseHeight / 2 - 50,
      radius: 50,
      fill: "#3b82f6",
    });
    canvas.add(circle);
    canvas.setActiveObject(circle);
    canvas.renderAll();
    saveToHistory(canvas);
  };

  const addTriangle = () => {
    if (!canvas) return;
    const triangle = new Triangle({
      left: baseWidth / 2 - 50,
      top: baseHeight / 2 - 50,
      width: 100,
      height: 100,
      fill: "#f59e0b",
    });
    canvas.add(triangle);
    canvas.setActiveObject(triangle);
    canvas.renderAll();
    saveToHistory(canvas);
  };

  const addLine = () => {
    if (!canvas) return;
    const line = new Line([100, 100, 300, 100], {
      left: baseWidth / 2 - 100,
      top: baseHeight / 2,
      stroke: "#000000",
      strokeWidth: 4,
    });
    canvas.add(line);
    canvas.setActiveObject(line);
    canvas.renderAll();
    saveToHistory(canvas);
  };

  const addStar = () => {
    if (!canvas) return;
    const starPoints = [];
    const numPoints = 5;
    const outerRadius = 50;
    const innerRadius = 25;
    
    for (let i = 0; i < numPoints * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (Math.PI * i) / numPoints - Math.PI / 2;
      starPoints.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }
    
    const star = new Polygon(starPoints, {
      left: baseWidth / 2 - 50,
      top: baseHeight / 2 - 50,
      fill: "#fbbf24",
    });
    canvas.add(star);
    canvas.setActiveObject(star);
    canvas.renderAll();
    saveToHistory(canvas);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canvas || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const imgElement = document.createElement("img");
      imgElement.src = event.target?.result as string;
      imgElement.onload = () => {
        const maxSize = 200;
        const scale = Math.min(maxSize / imgElement.width, maxSize / imgElement.height);
        const img = new FabricImage(imgElement, {
          left: baseWidth / 2 - (imgElement.width * scale) / 2,
          top: baseHeight / 2 - (imgElement.height * scale) / 2,
          scaleX: scale,
          scaleY: scale,
        });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        saveToHistory(canvas);
      };
    };
    reader.readAsDataURL(file);
  };

  const deleteSelected = () => {
    if (!canvas || !activeObject) return;
    canvas.remove(activeObject);
    setActiveObject(null);
    canvas.renderAll();
    saveToHistory(canvas);
  };

  const duplicateSelected = () => {
    if (!canvas || !activeObject) return;
    activeObject.clone().then((cloned: any) => {
      cloned.set({
        left: (activeObject.left || 0) + 20,
        top: (activeObject.top || 0) + 20,
      });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.renderAll();
      saveToHistory(canvas);
    });
  };

  const bringForward = () => {
    if (!canvas || !activeObject) return;
    canvas.bringObjectForward(activeObject);
    canvas.renderAll();
    saveToHistory(canvas);
  };

  const sendBackward = () => {
    if (!canvas || !activeObject) return;
    canvas.sendObjectBackwards(activeObject);
    canvas.renderAll();
    saveToHistory(canvas);
  };

  const bringToFront = () => {
    if (!canvas || !activeObject) return;
    canvas.bringObjectToFront(activeObject);
    canvas.renderAll();
    saveToHistory(canvas);
    setLayersForceUpdate(prev => prev + 1);
  };

  const sendToBack = () => {
    if (!canvas || !activeObject) return;
    canvas.sendObjectToBack(activeObject);
    canvas.renderAll();
    saveToHistory(canvas);
    setLayersForceUpdate(prev => prev + 1);
  };

  const flipHorizontal = () => {
    if (!canvas || !activeObject) return;
    activeObject.set('flipX', !activeObject.flipX);
    canvas.renderAll();
    saveToHistory(canvas);
  };

  const flipVertical = () => {
    if (!canvas || !activeObject) return;
    activeObject.set('flipY', !activeObject.flipY);
    canvas.renderAll();
    saveToHistory(canvas);
  };

  const resetRotation = () => {
    if (!canvas || !activeObject) return;
    activeObject.set('angle', 0);
    canvas.renderAll();
    saveToHistory(canvas);
  };

  const toggleLock = () => {
    if (!canvas || !activeObject) return;
    const isLocked = activeObject.lockMovementX;
    activeObject.set({
      lockMovementX: !isLocked,
      lockMovementY: !isLocked,
      lockScalingX: !isLocked,
      lockScalingY: !isLocked,
      lockRotation: !isLocked,
      hasControls: isLocked,
      selectable: true,
    });
    canvas.renderAll();
    setLayersForceUpdate(prev => prev + 1);
  };

  const toggleObjectVisibility = (obj: any) => {
    obj.visible = !obj.visible;
    canvas?.renderAll();
    setLayersForceUpdate(prev => prev + 1);
  };

  const updateObjectProperty = (property: string, value: any) => {
    if (!canvas || !activeObject) return;
    activeObject.set(property, value);
    canvas.renderAll();
  };

  const handleFontChange = async (fontName: string) => {
    if (!canvas || !activeObject) return;
    setLoadingFont(true);
    try {
      await loadGoogleFont(fontName);
      setLoadedFonts(prev => new Set([...prev, fontName]));
      updateObjectProperty("fontFamily", fontName);
      canvas.renderAll();
    } catch (error) {
      toast.error(`Erro ao carregar fonte: ${fontName}`);
    }
    setLoadingFont(false);
  };

  const handleZoom = (delta: number) => {
    const newZoom = Math.max(0.2, Math.min(1.5, zoom + delta));
    setZoom(newZoom);
  };

  const downloadPDF = async () => {
    if (!canvas) return;
    try {
      toast.loading("Gerando PDF vetorial...");
      
      const currentZoom = canvas.getZoom();
      canvas.setZoom(1);
      await generateNativePdf(canvas, tamanho);
      canvas.setZoom(currentZoom);
      
      toast.dismiss();
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      toast.dismiss();
      toast.error("Erro ao gerar PDF");
      console.error(error);
    }
  };

  const loadTemplate = (templateData: any) => {
    if (!canvas) return;
    canvas.loadFromJSON(templateData).then(() => {
      canvas.setZoom(DPI_SCALE);
      canvas.renderAll();
      saveToHistory(canvas);
      toast.success("Template aplicado!");
    });
  };

  const isTextObject = activeObject?.type === "i-text" || activeObject?.type === "text";

  // Sidebar left items for elements
  const elementItems = [
    { icon: Type, label: "Texto", action: addText },
    { icon: Square, label: "Retângulo", action: addRect },
    { icon: CircleIcon, label: "Círculo", action: addCircle },
    { icon: TriangleIcon, label: "Triângulo", action: addTriangle },
    { icon: Minus, label: "Linha", action: addLine },
    { icon: Star, label: "Estrela", action: addStar },
    { icon: Image, label: "Imagem", action: () => fileInputRef.current?.click() },
  ];

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (!canvas) return;
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      toast.error("Por favor, arraste apenas imagens");
      return;
    }
    
    imageFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imgElement = document.createElement("img");
        imgElement.src = event.target?.result as string;
        imgElement.onload = () => {
          const maxSize = 200;
          const scale = Math.min(maxSize / imgElement.width, maxSize / imgElement.height);
          const img = new FabricImage(imgElement, {
            left: baseWidth / 2 - (imgElement.width * scale) / 2 + (index * 30),
            top: baseHeight / 2 - (imgElement.height * scale) / 2 + (index * 30),
            scaleX: scale,
            scaleY: scale,
          });
          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.renderAll();
          saveToHistory(canvas);
        };
      };
      reader.readAsDataURL(file);
    });
    
    toast.success(`${imageFiles.length} imagem(ns) adicionada(s)!`);
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-[#f0f0f0]">
        {/* Top Header Bar - Canva Style (Light) */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-2 shrink-0 shadow-sm">
          {/* Undo/Redo */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30" 
                  onClick={undo} 
                  disabled={historyIndex <= 0}
                >
                  <Undo className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Desfazer</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30" 
                  onClick={redo} 
                  disabled={historyIndex >= history.length - 1}
                >
                  <Redo className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refazer</TooltipContent>
            </Tooltip>
          </div>

          <div className="h-6 w-px bg-gray-200 mx-2" />

          {/* Document Title / Size Selector */}
          <Select value={tamanho} onValueChange={(v: "full" | "half") => onTamanhoChange(v)}>
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
                  <Switch checked={showGrid} onCheckedChange={setShowGrid} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-gray-700">Snap to grid</Label>
                  <Switch checked={snapToGrid} onCheckedChange={setSnapToGrid} />
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
            <span className="text-gray-700 text-sm w-12 text-center font-medium">{Math.round(zoom * 100)}%</span>
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

          <Button onClick={downloadPDF} size="sm" className="h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <Download className="h-4 w-4" /> Baixar PDF
          </Button>
        </header>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Canva Style (Light) */}
          <aside className={cn(
            "bg-white border-r border-gray-200 flex shrink-0 transition-all duration-200",
            leftSidebarOpen ? "w-[320px]" : "w-[72px]"
          )}>
            {/* Icon Navigation */}
            <nav className="w-[72px] border-r border-gray-100 py-4 flex flex-col items-center gap-1 shrink-0 bg-gray-50/50">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "h-14 w-14 rounded-xl flex flex-col gap-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100",
                      leftTab === "templates" && leftSidebarOpen && "bg-purple-50 text-purple-600 hover:bg-purple-50 hover:text-purple-600"
                    )}
                    onClick={() => { setLeftTab("templates"); setLeftSidebarOpen(true); }}
                  >
                    <LayoutTemplate className="h-5 w-5" />
                    <span className="text-[10px] font-medium">Templates</span>
                  </Button>
                </TooltipTrigger>
                {!leftSidebarOpen && <TooltipContent side="right">Templates</TooltipContent>}
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "h-14 w-14 rounded-xl flex flex-col gap-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100",
                      leftTab === "elements" && leftSidebarOpen && "bg-purple-50 text-purple-600 hover:bg-purple-50 hover:text-purple-600"
                    )}
                    onClick={() => { setLeftTab("elements"); setLeftSidebarOpen(true); }}
                  >
                    <Plus className="h-5 w-5" />
                    <span className="text-[10px] font-medium">Elementos</span>
                  </Button>
                </TooltipTrigger>
                {!leftSidebarOpen && <TooltipContent side="right">Elementos</TooltipContent>}
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "h-14 w-14 rounded-xl flex flex-col gap-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100",
                      leftTab === "layers" && leftSidebarOpen && "bg-purple-50 text-purple-600 hover:bg-purple-50 hover:text-purple-600"
                    )}
                    onClick={() => { setLeftTab("layers"); setLeftSidebarOpen(true); }}
                  >
                    <Layers className="h-5 w-5" />
                    <span className="text-[10px] font-medium">Camadas</span>
                  </Button>
                </TooltipTrigger>
                {!leftSidebarOpen && <TooltipContent side="right">Camadas</TooltipContent>}
              </Tooltip>
            </nav>

            {/* Expanded Content Panel */}
            {leftSidebarOpen && (
              <div className="flex-1 flex flex-col min-w-0">
                <div className="h-14 px-4 flex items-center justify-between border-b border-gray-100 shrink-0">
                  <h2 className="text-gray-900 font-semibold text-sm">
                    {leftTab === "templates" ? "Templates" : leftTab === "elements" ? "Elementos" : "Camadas"}
                  </h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    onClick={() => setLeftSidebarOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-4">
                    {leftTab === "templates" && (
                      <TemplateGallery onSelectTemplate={loadTemplate} isLandscape={isLandscape} />
                    )}

                    {leftTab === "elements" && (
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

                    {leftTab === "layers" && (
                      <div className="space-y-2" key={layersForceUpdate}>
                        {/* Layer controls */}
                        {activeObject && (
                          <div className="flex gap-1 p-2 bg-gray-100 rounded-lg mb-3">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-gray-200"
                                  onClick={bringToFront}
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
                                  onClick={bringForward}
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
                                  onClick={sendBackward}
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
                                  onClick={sendToBack}
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
                                  onClick={toggleLock}
                                >
                                  {activeObject.lockMovementX ? (
                                    <Lock className="h-4 w-4" />
                                  ) : (
                                    <Unlock className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{activeObject.lockMovementX ? "Desbloquear" : "Bloquear"}</TooltipContent>
                            </Tooltip>
                          </div>
                        )}
                        
                        {/* Layers list */}
                        {canvas?.getObjects().slice().reverse().map((obj, index) => {
                          const actualIndex = canvas.getObjects().length - 1 - index;
                          const isLocked = obj.lockMovementX;
                          return (
                            <div
                              key={actualIndex}
                              className={cn(
                                "flex items-center gap-2 p-2.5 text-sm rounded-lg cursor-pointer transition-colors",
                                activeObject === obj 
                                  ? "bg-purple-50 text-purple-700 border border-purple-200" 
                                  : "hover:bg-gray-100 text-gray-600 border border-transparent"
                              )}
                              onClick={() => {
                                canvas.setActiveObject(obj);
                                canvas.renderAll();
                              }}
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-gray-400 hover:text-gray-600 hover:bg-transparent"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleObjectVisibility(obj);
                                }}
                              >
                                {obj.visible !== false ? (
                                  <Eye className="h-4 w-4" />
                                ) : (
                                  <EyeOff className="h-4 w-4" />
                                )}
                              </Button>
                              {isLocked && <Lock className="h-3 w-3 text-gray-400" />}
                              <span className={cn(
                                "flex-1 truncate text-xs",
                                obj.visible === false && "opacity-50 line-through"
                              )}>
                                {obj.type === "i-text" 
                                  ? `"${(obj as any).text?.slice(0, 12)}${(obj as any).text?.length > 12 ? '...' : ''}"` 
                                  : obj.type === "rect" ? "Retângulo"
                                  : obj.type === "circle" ? "Círculo"
                                  : obj.type === "triangle" ? "Triângulo"
                                  : obj.type === "line" ? "Linha"
                                  : obj.type === "polygon" ? "Estrela"
                                  : obj.type === "image" ? "Imagem" 
                                  : obj.type}
                              </span>
                            </div>
                          );
                        })}
                        {(!canvas || canvas.getObjects().length === 0) && (
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

          {/* Canvas Area - Center with Drag & Drop, Rulers and Smart Guides */}
          <main 
            ref={containerRef}
            className="flex-1 overflow-auto flex items-center justify-center relative"
            style={{ backgroundColor: "#e5e5e5" }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Drop zone indicator */}
            {isDragging && (
              <div className="absolute inset-4 border-2 border-dashed border-purple-400 bg-purple-50/50 rounded-xl flex items-center justify-center z-10">
                <div className="bg-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 text-purple-600">
                  <Upload className="h-6 w-6" />
                  <span className="font-medium">Solte as imagens aqui</span>
                </div>
              </div>
            )}
            
            {/* Canvas with Rulers Container */}
            <div 
              ref={canvasWrapperRef}
              className="relative"
              style={{ 
                transform: `scale(${zoom / DPI_SCALE})`,
                transformOrigin: "center center",
              }}
            >
              {/* Horizontal Ruler (Top) */}
              <div 
                className="absolute bg-white border-b border-gray-300 flex items-end select-none overflow-hidden"
                style={{ 
                  top: -RULER_SIZE, 
                  left: RULER_SIZE, 
                  width: baseWidth * DPI_SCALE, 
                  height: RULER_SIZE,
                }}
              >
                {Array.from({ length: Math.ceil(baseWidth / 50) + 1 }).map((_, i) => {
                  const pos = i * 50;
                  return (
                    <div key={i} className="absolute flex flex-col items-center" style={{ left: pos * DPI_SCALE }}>
                      <span className="text-[8px] text-gray-500 mb-0.5">{pos}</span>
                      <div className="w-px h-2 bg-gray-400" />
                    </div>
                  );
                })}
                {/* Position indicator */}
                {movingObjectPos && (
                  <div 
                    className="absolute bottom-0 w-0.5 h-full bg-purple-500 z-10"
                    style={{ left: movingObjectPos.x * DPI_SCALE }}
                  />
                )}
              </div>
              
              {/* Vertical Ruler (Left) */}
              <div 
                className="absolute bg-white border-r border-gray-300 flex flex-col items-end select-none overflow-hidden"
                style={{ 
                  top: RULER_SIZE, 
                  left: -RULER_SIZE, 
                  width: RULER_SIZE, 
                  height: baseHeight * DPI_SCALE,
                }}
              >
                {Array.from({ length: Math.ceil(baseHeight / 50) + 1 }).map((_, i) => {
                  const pos = i * 50;
                  return (
                    <div key={i} className="absolute flex items-center" style={{ top: pos * DPI_SCALE }}>
                      <span className="text-[8px] text-gray-500 mr-0.5" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{pos}</span>
                      <div className="h-px w-2 bg-gray-400" />
                    </div>
                  );
                })}
                {/* Position indicator */}
                {movingObjectPos && (
                  <div 
                    className="absolute right-0 h-0.5 w-full bg-purple-500 z-10"
                    style={{ top: movingObjectPos.y * DPI_SCALE }}
                  />
                )}
              </div>
              
              {/* Corner Square */}
              <div 
                className="absolute bg-gray-100 border-r border-b border-gray-300"
                style={{ 
                  top: -RULER_SIZE, 
                  left: -RULER_SIZE, 
                  width: RULER_SIZE, 
                  height: RULER_SIZE,
                }}
              />
              
              {/* Canvas Container with Smart Guides and Grid */}
              <div className="relative shadow-2xl rounded-sm" style={{ marginTop: RULER_SIZE, marginLeft: RULER_SIZE }}>
                <canvas ref={canvasRef} style={{ display: "block" }} />
                
                {/* Grid Overlay */}
                {showGrid && (
                  <svg 
                    className="absolute inset-0 pointer-events-none z-10"
                    style={{ width: baseWidth * DPI_SCALE, height: baseHeight * DPI_SCALE }}
                  >
                    <defs>
                      <pattern 
                        id="grid" 
                        width={GRID_SIZE * DPI_SCALE} 
                        height={GRID_SIZE * DPI_SCALE} 
                        patternUnits="userSpaceOnUse"
                      >
                        <path 
                          d={`M ${GRID_SIZE * DPI_SCALE} 0 L 0 0 0 ${GRID_SIZE * DPI_SCALE}`} 
                          fill="none" 
                          stroke="rgba(168, 85, 247, 0.2)" 
                          strokeWidth="0.5"
                        />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                    {/* Center lines */}
                    <line 
                      x1={baseWidth * DPI_SCALE / 2} 
                      y1={0} 
                      x2={baseWidth * DPI_SCALE / 2} 
                      y2={baseHeight * DPI_SCALE} 
                      stroke="rgba(168, 85, 247, 0.4)" 
                      strokeWidth="1"
                      strokeDasharray="4,4"
                    />
                    <line 
                      x1={0} 
                      y1={baseHeight * DPI_SCALE / 2} 
                      x2={baseWidth * DPI_SCALE} 
                      y2={baseHeight * DPI_SCALE / 2} 
                      stroke="rgba(168, 85, 247, 0.4)" 
                      strokeWidth="1"
                      strokeDasharray="4,4"
                    />
                  </svg>
                )}
                
                {/* Smart Guide Lines Overlay */}
                <svg 
                  className="absolute inset-0 pointer-events-none z-20"
                  style={{ width: baseWidth * DPI_SCALE, height: baseHeight * DPI_SCALE }}
                >
                  {guides.map((guide, i) => (
                    guide.type === 'v' ? (
                      <line
                        key={`guide-${i}`}
                        x1={guide.position * DPI_SCALE}
                        y1={0}
                        x2={guide.position * DPI_SCALE}
                        y2={baseHeight * DPI_SCALE}
                        stroke="#a855f7"
                        strokeWidth="1"
                        strokeDasharray="4,4"
                      />
                    ) : (
                      <line
                        key={`guide-${i}`}
                        x1={0}
                        y1={guide.position * DPI_SCALE}
                        x2={baseWidth * DPI_SCALE}
                        y2={guide.position * DPI_SCALE}
                        stroke="#a855f7"
                        strokeWidth="1"
                        strokeDasharray="4,4"
                      />
                    )
                  ))}
                </svg>
              </div>
            </div>
          </main>

          {/* Right Sidebar - Properties (Light) */}
          {rightSidebarOpen && activeObject && (
            <aside className="w-[280px] bg-white border-l border-gray-200 flex flex-col shrink-0">
              <div className="h-14 px-4 flex items-center justify-between border-b border-gray-100 shrink-0">
                <h2 className="text-gray-900 font-semibold text-sm">Propriedades</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  onClick={() => setRightSidebarOpen(false)}
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
                          onClick={duplicateSelected}
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
                          onClick={bringForward}
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
                          onClick={sendBackward}
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
                          onClick={flipHorizontal}
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
                          onClick={flipVertical}
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
                          onClick={resetRotation}
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
                          className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50" 
                          onClick={deleteSelected}
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
                        <Label className="text-[10px] text-gray-400">X</Label>
                        <Input
                          type="number"
                          value={Math.round(activeObject.left || 0)}
                          onChange={(e) => updateObjectProperty("left", Number(e.target.value))}
                          className="h-8 bg-gray-50 border-gray-200 text-gray-700"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-gray-400">Y</Label>
                        <Input
                          type="number"
                          value={Math.round(activeObject.top || 0)}
                          onChange={(e) => updateObjectProperty("top", Number(e.target.value))}
                          className="h-8 bg-gray-50 border-gray-200 text-gray-700"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-gray-400">Largura</Label>
                        <Input
                          type="number"
                          value={Math.round((activeObject.width || 0) * (activeObject.scaleX || 1))}
                          onChange={(e) => {
                            const newWidth = Number(e.target.value);
                            updateObjectProperty("scaleX", newWidth / (activeObject.width || 1));
                          }}
                          className="h-8 bg-gray-50 border-gray-200 text-gray-700"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-gray-400">Altura</Label>
                        <Input
                          type="number"
                          value={Math.round((activeObject.height || 0) * (activeObject.scaleY || 1))}
                          onChange={(e) => {
                            const newHeight = Number(e.target.value);
                            updateObjectProperty("scaleY", newHeight / (activeObject.height || 1));
                          }}
                          className="h-8 bg-gray-50 border-gray-200 text-gray-700"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Rotation & Opacity */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label className="text-xs text-gray-500">Rotação</Label>
                        <span className="text-xs text-gray-400">{Math.round(activeObject.angle || 0)}°</span>
                      </div>
                      <Slider
                        value={[activeObject.angle || 0]}
                        onValueChange={([v]) => updateObjectProperty("angle", v)}
                        min={0}
                        max={360}
                        step={1}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label className="text-xs text-gray-500">Opacidade</Label>
                        <span className="text-xs text-gray-400">{Math.round((activeObject.opacity || 1) * 100)}%</span>
                      </div>
                      <Slider
                        value={[(activeObject.opacity || 1) * 100]}
                        onValueChange={([v]) => updateObjectProperty("opacity", v / 100)}
                        min={0}
                        max={100}
                        step={1}
                      />
                    </div>
                  </div>

                  <Separator className="bg-gray-100" />

                  {/* Text Properties */}
                  {isTextObject && (
                    <div className="space-y-3">
                      <Label className="text-xs text-gray-500 uppercase tracking-wider font-medium">Texto</Label>
                      
                      {/* Font Family */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="w-full justify-between h-9 bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                          >
                            <span style={{ fontFamily: activeObject.fontFamily || "Arial" }} className="truncate">
                              {activeObject.fontFamily || "Arial"}
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
                                <SelectItem value="all">Todas as fontes ({ALL_GOOGLE_FONTS.length})</SelectItem>
                                {Object.entries(GOOGLE_FONTS_CATEGORIES).map(([cat, fonts]) => (
                                  <SelectItem key={cat} value={cat}>{cat} ({fonts.length})</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <ScrollArea className="h-56">
                            <div className="p-1">
                              {searchResults.length > 0 ? (
                                searchResults.map((font) => (
                                  <Button
                                    key={font}
                                    variant="ghost"
                                    className="w-full justify-start h-9 font-normal text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                    style={{ fontFamily: font }}
                                    onClick={() => {
                                      handleFontChange(font);
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
                            value={activeObject.fontSize || 40}
                            onChange={(e) => updateObjectProperty("fontSize", Number(e.target.value))}
                            className="w-16 h-7 text-xs bg-gray-50 border-gray-200 text-gray-700"
                          />
                        </div>
                        <Slider
                          value={[activeObject.fontSize || 40]}
                          onValueChange={([v]) => updateObjectProperty("fontSize", v)}
                          min={8}
                          max={200}
                          step={1}
                        />
                      </div>

                      {/* Text Style Buttons */}
                      <div className="flex flex-wrap gap-1">
                        <Button
                          variant={activeObject.fontWeight === "bold" || activeObject.fontWeight === "700" ? "default" : "ghost"}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateObjectProperty("fontWeight", activeObject.fontWeight === "bold" || activeObject.fontWeight === "700" ? "400" : "700")}
                        >
                          <Bold className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={activeObject.fontStyle === "italic" ? "default" : "ghost"}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateObjectProperty("fontStyle", activeObject.fontStyle === "italic" ? "normal" : "italic")}
                        >
                          <Italic className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={activeObject.underline ? "default" : "ghost"}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateObjectProperty("underline", !activeObject.underline)}
                        >
                          <Underline className="h-4 w-4" />
                        </Button>
                        <div className="w-px h-8 bg-gray-200 mx-1" />
                        <Button
                          variant={activeObject.textAlign === "left" ? "default" : "ghost"}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateObjectProperty("textAlign", "left")}
                        >
                          <AlignLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={activeObject.textAlign === "center" ? "default" : "ghost"}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateObjectProperty("textAlign", "center")}
                        >
                          <AlignCenter className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={activeObject.textAlign === "right" ? "default" : "ghost"}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateObjectProperty("textAlign", "right")}
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
                            value={activeObject.fill || "#000000"}
                            onChange={(e) => updateObjectProperty("fill", e.target.value)}
                            className="w-10 h-8 p-1 cursor-pointer bg-gray-50 border-gray-200"
                          />
                          <Input
                            value={activeObject.fill || "#000000"}
                            onChange={(e) => updateObjectProperty("fill", e.target.value)}
                            className="flex-1 h-8 bg-gray-50 border-gray-200 text-gray-700"
                          />
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {colorPresets.map((color) => (
                            <button
                              key={color}
                              className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                              style={{ backgroundColor: color }}
                              onClick={() => updateObjectProperty("fill", color)}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Shape Properties */}
                  {!isTextObject && activeObject.type !== "image" && (
                    <div className="space-y-3">
                      <Label className="text-xs text-gray-500 uppercase tracking-wider font-medium">Preenchimento</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={activeObject.fill || "#000000"}
                          onChange={(e) => updateObjectProperty("fill", e.target.value)}
                          className="w-10 h-8 p-1 cursor-pointer bg-gray-50 border-gray-200"
                        />
                        <Input
                          value={activeObject.fill || "#000000"}
                          onChange={(e) => updateObjectProperty("fill", e.target.value)}
                          className="flex-1 h-8 bg-gray-50 border-gray-200 text-gray-700"
                        />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {colorPresets.map((color) => (
                          <button
                            key={color}
                            className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                            style={{ backgroundColor: color }}
                            onClick={() => updateObjectProperty("fill", color)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Border */}
                  {activeObject.type !== "image" && (
                    <div className="space-y-3">
                      <Label className="text-xs text-gray-500 uppercase tracking-wider font-medium">Borda</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={activeObject.stroke || "#000000"}
                          onChange={(e) => updateObjectProperty("stroke", e.target.value)}
                          className="w-10 h-8 p-1 cursor-pointer bg-gray-50 border-gray-200"
                        />
                        <Input
                          value={activeObject.stroke || ""}
                          onChange={(e) => updateObjectProperty("stroke", e.target.value)}
                          placeholder="Nenhuma"
                          className="flex-1 h-8 bg-gray-50 border-gray-200 text-gray-700"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <Label className="text-xs text-gray-500">Espessura</Label>
                          <span className="text-xs text-gray-400">{activeObject.strokeWidth || 0}px</span>
                        </div>
                        <Slider
                          value={[activeObject.strokeWidth || 0]}
                          onValueChange={([v]) => updateObjectProperty("strokeWidth", v)}
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
          )}

          {/* Message when no object is selected */}
          {rightSidebarOpen && !activeObject && (
            <aside className="w-[280px] bg-white border-l border-gray-200 flex flex-col shrink-0">
              <div className="h-14 px-4 flex items-center justify-between border-b border-gray-100 shrink-0">
                <h2 className="text-gray-900 font-semibold text-sm">Propriedades</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  onClick={() => setRightSidebarOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <MousePointer2 className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-sm text-gray-400">Selecione um elemento<br/>para editar</p>
              </div>
            </aside>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>
    </TooltipProvider>
  );
}
