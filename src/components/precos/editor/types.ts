// Editor Types for Konva-based Canvas Editor

export interface EditorElement {
  id: string;
  type: 'text' | 'rect' | 'circle' | 'image' | 'line' | 'triangle' | 'star';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  opacity?: number;
  visible?: boolean;
  locked?: boolean;
  draggable?: boolean;
  // Text specific
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: 'normal' | 'bold' | 'italic' | 'bold italic';
  textDecoration?: string;
  align?: 'left' | 'center' | 'right';
  // Image specific
  src?: string;
  // Shape specific
  cornerRadius?: number;
  // Star specific
  numPoints?: number;
  innerRadius?: number;
  outerRadius?: number;
  // Line specific
  points?: number[];
}

export interface EditorState {
  elements: EditorElement[];
  selectedId: string | null;
  zoom: number;
  history: EditorElement[][];
  historyIndex: number;
  showGrid: boolean;
  snapToGrid: boolean;
  canvasSize: 'full' | 'half'; // full = A4 landscape, half = A4 portrait
}

export interface Guide {
  type: 'horizontal' | 'vertical';
  position: number;
}

export interface CanvasDimensions {
  width: number;
  height: number;
}

export const CANVAS_SIZES: Record<'full' | 'half', CanvasDimensions> = {
  full: { width: 842, height: 595 }, // A4 landscape
  half: { width: 595, height: 842 }, // A4 portrait
};

export const GRID_SIZE = 20;
export const SNAP_THRESHOLD = 5;

// Google Fonts
export const FONT_CATEGORIES = {
  "Display": ["Abril Fatface", "Anton", "Bebas Neue", "Lobster", "Pacifico", "Permanent Marker", "Righteous"],
  "Handwriting": ["Caveat", "Dancing Script", "Great Vibes", "Indie Flower", "Patrick Hand", "Sacramento"],
  "Sans Serif": ["Inter", "Lato", "Montserrat", "Open Sans", "Poppins", "Raleway", "Roboto", "Ubuntu"],
  "Serif": ["EB Garamond", "Lora", "Merriweather", "Playfair Display", "Roboto Slab", "Source Serif Pro"],
  "Monospace": ["Fira Code", "JetBrains Mono", "Roboto Mono", "Source Code Pro", "Ubuntu Mono"],
};

export const ALL_FONTS = [...new Set(Object.values(FONT_CATEGORIES).flat())].sort();

export const COLOR_PRESETS = [
  "#000000", "#ffffff", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280"
];
