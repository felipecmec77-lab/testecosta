import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Pipette, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdvancedColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
}

// Expanded color presets organized by category
const COLOR_CATEGORIES = {
  "Básicas": [
    "#000000", "#ffffff", "#808080", "#c0c0c0", "#404040",
    "#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff"
  ],
  "Quentes": [
    "#ef4444", "#f97316", "#f59e0b", "#eab308", "#dc2626",
    "#ea580c", "#d97706", "#ca8a04", "#b91c1c", "#c2410c"
  ],
  "Frias": [
    "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#2563eb",
    "#4f46e5", "#7c3aed", "#9333ea", "#1d4ed8", "#4338ca"
  ],
  "Naturais": [
    "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#16a34a",
    "#059669", "#0d9488", "#0891b2", "#15803d", "#047857"
  ],
  "Pastéis": [
    "#fecaca", "#fed7aa", "#fef08a", "#bbf7d0", "#bfdbfe",
    "#ddd6fe", "#fbcfe8", "#fce7f3", "#e0e7ff", "#d1fae5"
  ],
  "Escuras": [
    "#1f2937", "#111827", "#0f172a", "#18181b", "#27272a",
    "#292524", "#1c1917", "#171717", "#262626", "#374151"
  ]
};

// Convert hex to HSL
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

// Convert HSL to hex
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Recent colors storage
const RECENT_COLORS_KEY = 'editor-recent-colors';
const MAX_RECENT_COLORS = 10;

function getRecentColors(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_COLORS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addRecentColor(color: string) {
  try {
    let colors = getRecentColors();
    colors = [color, ...colors.filter(c => c !== color)].slice(0, MAX_RECENT_COLORS);
    localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(colors));
  } catch {}
}

export function AdvancedColorPicker({ color, onChange, label }: AdvancedColorPickerProps) {
  const [hsl, setHsl] = useState(() => hexToHsl(color || "#000000"));
  const [hexInput, setHexInput] = useState(color || "#000000");
  const [recentColors, setRecentColors] = useState<string[]>(getRecentColors);
  const [activeTab, setActiveTab] = useState("picker");
  const gradientRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Update internal state when external color changes
  useEffect(() => {
    const newHsl = hexToHsl(color || "#000000");
    setHsl(newHsl);
    setHexInput(color || "#000000");
  }, [color]);

  const updateColor = useCallback((newHsl: { h: number; s: number; l: number }) => {
    const newHex = hslToHex(newHsl.h, newHsl.s, newHsl.l);
    setHsl(newHsl);
    setHexInput(newHex);
    onChange(newHex);
  }, [onChange]);

  const handleGradientClick = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!gradientRef.current) return;
    const rect = gradientRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    
    // X = saturation (0-100), Y = lightness (100-0)
    const newS = x * 100;
    const newL = 100 - y * 100;
    updateColor({ ...hsl, s: newS, l: newL });
  }, [hsl, updateColor]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    handleGradientClick(e);
  }, [handleGradientClick]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleGradientClick(e);
      }
    };
    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        addRecentColor(hexInput);
        setRecentColors(getRecentColors());
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleGradientClick, hexInput]);

  const handleHueChange = (value: number[]) => {
    updateColor({ ...hsl, h: value[0] });
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHexInput(value);
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      onChange(value);
      setHsl(hexToHsl(value));
    }
  };

  const handlePresetClick = (preset: string) => {
    onChange(preset);
    setHsl(hexToHsl(preset));
    setHexInput(preset);
    addRecentColor(preset);
    setRecentColors(getRecentColors());
  };

  // Calculate picker position
  const pickerX = (hsl.s / 100) * 100;
  const pickerY = (1 - hsl.l / 100) * 100;

  return (
    <div className="w-72 space-y-3">
      {label && (
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-2 h-8">
          <TabsTrigger value="picker" className="text-xs">Seletor</TabsTrigger>
          <TabsTrigger value="palettes" className="text-xs">Paletas</TabsTrigger>
        </TabsList>

        <TabsContent value="picker" className="space-y-4 mt-3">
          {/* Gradient Color Picker */}
          <div 
            ref={gradientRef}
            className="relative w-full h-40 rounded-lg cursor-crosshair overflow-hidden shadow-inner border"
            style={{
              background: `
                linear-gradient(to bottom, transparent, black),
                linear-gradient(to right, white, hsl(${hsl.h}, 100%, 50%))
              `
            }}
            onMouseDown={handleMouseDown}
          >
            {/* Picker indicator */}
            <div
              className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-lg pointer-events-none"
              style={{
                left: `${pickerX}%`,
                top: `${pickerY}%`,
                backgroundColor: hexInput
              }}
            />
          </div>

          {/* Hue Slider */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground font-medium">Matiz</div>
            <div 
              className="h-4 rounded-lg"
              style={{
                background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
              }}
            >
              <Slider
                value={[hsl.h]}
                max={360}
                step={1}
                onValueChange={handleHueChange}
                className="[&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-2 [&_[role=slider]]:border-white [&_[role=slider]]:shadow-lg"
              />
            </div>
          </div>

          {/* Color preview and hex input */}
          <div className="flex gap-2 items-center">
            <div 
              className="w-12 h-10 rounded-lg border-2 border-gray-200 shadow-inner"
              style={{ backgroundColor: hexInput }}
            />
            <Input
              value={hexInput}
              onChange={handleHexChange}
              placeholder="#000000"
              className="flex-1 h-10 font-mono text-sm uppercase"
              maxLength={7}
            />
          </div>

          {/* RGB/HSL values */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="text-muted-foreground mb-1">H</div>
              <Input
                type="number"
                value={Math.round(hsl.h)}
                onChange={(e) => updateColor({ ...hsl, h: Number(e.target.value) })}
                className="h-7 text-center text-xs"
                min={0}
                max={360}
              />
            </div>
            <div className="text-center">
              <div className="text-muted-foreground mb-1">S</div>
              <Input
                type="number"
                value={Math.round(hsl.s)}
                onChange={(e) => updateColor({ ...hsl, s: Number(e.target.value) })}
                className="h-7 text-center text-xs"
                min={0}
                max={100}
              />
            </div>
            <div className="text-center">
              <div className="text-muted-foreground mb-1">L</div>
              <Input
                type="number"
                value={Math.round(hsl.l)}
                onChange={(e) => updateColor({ ...hsl, l: Number(e.target.value) })}
                className="h-7 text-center text-xs"
                min={0}
                max={100}
              />
            </div>
          </div>

          {/* Recent colors */}
          {recentColors.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground font-medium">Cores recentes</div>
              <div className="flex flex-wrap gap-1.5">
                {recentColors.map((recentColor, i) => (
                  <button
                    key={`${recentColor}-${i}`}
                    className={cn(
                      "w-7 h-7 rounded-md border-2 transition-all hover:scale-110 relative",
                      hexInput.toLowerCase() === recentColor.toLowerCase() 
                        ? "border-blue-500 ring-2 ring-blue-200" 
                        : "border-gray-200"
                    )}
                    style={{ backgroundColor: recentColor }}
                    onClick={() => handlePresetClick(recentColor)}
                  >
                    {hexInput.toLowerCase() === recentColor.toLowerCase() && (
                      <Check className="w-3 h-3 absolute inset-0 m-auto text-white drop-shadow-md" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="palettes" className="space-y-3 mt-3 max-h-64 overflow-y-auto">
          {Object.entries(COLOR_CATEGORIES).map(([category, colors]) => (
            <div key={category} className="space-y-2">
              <div className="text-xs text-muted-foreground font-medium">{category}</div>
              <div className="flex flex-wrap gap-1.5">
                {colors.map((preset) => (
                  <button
                    key={preset}
                    className={cn(
                      "w-7 h-7 rounded-md border-2 transition-all hover:scale-110 relative",
                      hexInput.toLowerCase() === preset.toLowerCase() 
                        ? "border-blue-500 ring-2 ring-blue-200" 
                        : "border-gray-200"
                    )}
                    style={{ backgroundColor: preset }}
                    onClick={() => handlePresetClick(preset)}
                  >
                    {hexInput.toLowerCase() === preset.toLowerCase() && (
                      <Check className="w-3 h-3 absolute inset-0 m-auto text-white drop-shadow-md" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
