import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Bell, BellRing, Package, Volume2, VolumeX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { toast } from '@/hooks/use-toast';

interface LowStockProduct {
  id: string;
  nome_produto: string;
  quantidade_estoque: number;
  estoque_minimo: number;
  unidade_medida: string;
}

const DISMISSED_ALERTS_KEY = 'stock-alerts-dismissed';
const SOUND_ENABLED_KEY = 'stock-alerts-sound-enabled';

// Lovable-style notification sound (simple chime)
const playNotificationSound = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // Create a pleasant chime sound
  const playTone = (frequency: number, startTime: number, duration: number) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  };
  
  const now = audioContext.currentTime;
  // Pleasant two-tone chime (like Lovable completion sound)
  playTone(880, now, 0.15); // A5
  playTone(1318.5, now + 0.1, 0.2); // E6
};

const StockAlerts = () => {
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    const stored = localStorage.getItem(DISMISSED_ALERTS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const [isOpen, setIsOpen] = useState(false);
  const [hasViewed, setHasViewed] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem(SOUND_ENABLED_KEY);
    return stored ? JSON.parse(stored) : true;
  });
  const prevCountRef = useRef(0);

  useEffect(() => {
    fetchLowStockProducts();
  }, []);

  // Play sound when new alerts appear
  useEffect(() => {
    const visibleCount = lowStockProducts.filter(p => !dismissedIds.has(p.id)).length;
    if (visibleCount > prevCountRef.current && soundEnabled && prevCountRef.current !== 0) {
      playNotificationSound();
    }
    prevCountRef.current = visibleCount;
  }, [lowStockProducts, dismissedIds, soundEnabled]);

  // When sheet opens, mark as viewed (badge disappears)
  useEffect(() => {
    if (isOpen) {
      setHasViewed(true);
    }
  }, [isOpen]);

  // Persist dismissed ids to localStorage
  useEffect(() => {
    localStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify([...dismissedIds]));
  }, [dismissedIds]);

  // Persist sound preference
  useEffect(() => {
    localStorage.setItem(SOUND_ENABLED_KEY, JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  const fetchLowStockProducts = async () => {
    const { data } = await supabase
      .from('produtos')
      .select('id, nome_produto, quantidade_estoque, estoque_minimo, unidade_medida');

    if (data) {
      const lowStock = data.filter(p => p.quantidade_estoque <= p.estoque_minimo);
      setLowStockProducts(lowStock);
    }
  };

  const handleDismiss = useCallback((id: string) => {
    setDismissedIds(prev => {
      const newSet = new Set([...prev, id]);
      // Immediately persist to localStorage
      localStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify([...newSet]));
      return newSet;
    });
    toast({
      title: "Alerta removido",
      description: "Este alerta não aparecerá novamente.",
    });
  }, []);

  const handleClearAll = useCallback(() => {
    const allIds = lowStockProducts.map(p => p.id);
    setDismissedIds(prev => {
      const newSet = new Set([...prev, ...allIds]);
      localStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify([...newSet]));
      return newSet;
    });
    toast({
      title: "Todos os alertas removidos",
      description: "Os alertas não aparecerão novamente.",
    });
  }, [lowStockProducts]);

  const handleTestSound = () => {
    playNotificationSound();
  };

  // Filter out dismissed products - they should never appear again
  const visibleProducts = lowStockProducts.filter(p => !dismissedIds.has(p.id));
  const unviewedCount = hasViewed ? 0 : visibleProducts.length;

  if (lowStockProducts.length === 0) {
    return null;
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {visibleProducts.length > 0 ? (
            <BellRing className="w-5 h-5 text-amber-500 animate-pulse" />
          ) : (
            <Bell className="w-5 h-5 text-muted-foreground" />
          )}
          {unviewedCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs animate-bounce"
            >
              {unviewedCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BellRing className="w-5 h-5 text-amber-500" />
            Alertas de Estoque Baixo
          </SheetTitle>
        </SheetHeader>
        
        {/* Sound toggle */}
        <div className="flex items-center justify-between mt-4 p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-primary" />
            ) : (
              <VolumeX className="w-4 h-4 text-muted-foreground" />
            )}
            <Label htmlFor="sound-toggle" className="text-sm">Som de notificação</Label>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleTestSound}
              className="text-xs h-7"
            >
              Testar
            </Button>
            <Switch
              id="sound-toggle"
              checked={soundEnabled}
              onCheckedChange={setSoundEnabled}
            />
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-4">Arraste para o lado para limpar</p>
        
        {visibleProducts.length > 0 && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleClearAll}
            className="w-full mt-2"
          >
            <X className="w-4 h-4 mr-2" />
            Limpar todos os alertas
          </Button>
        )}
        
        <div className="mt-4 space-y-3">
          {visibleProducts.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum alerta pendente</p>
            </div>
          ) : (
            visibleProducts.map((product) => (
              <SwipeableAlert 
                key={product.id} 
                product={product} 
                onDismiss={() => handleDismiss(product.id)} 
              />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

interface SwipeableAlertProps {
  product: LowStockProduct;
  onDismiss: () => void;
}

const SwipeableAlert = ({ product, onDismiss }: SwipeableAlertProps) => {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    setTranslateX(diff);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (Math.abs(translateX) > 100) {
      onDismiss();
    } else {
      setTranslateX(0);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const diff = e.clientX - startX.current;
    setTranslateX(diff);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (Math.abs(translateX) > 100) {
      onDismiss();
    } else {
      setTranslateX(0);
    }
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      setTranslateX(0);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-lg"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="p-4 rounded-lg border bg-amber-500/10 border-amber-500/30 cursor-grab active:cursor-grabbing transition-transform"
        style={{ 
          transform: `translateX(${translateX}px)`,
          opacity: 1 - Math.abs(translateX) / 200,
          transition: isDragging ? 'none' : 'transform 0.2s, opacity 0.2s'
        }}
      >
        <div className="flex items-start gap-3">
          <Package className="w-5 h-5 text-amber-500 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-foreground">{product.nome_produto}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Estoque: <span className="font-semibold text-destructive">
                {product.quantidade_estoque} {product.unidade_medida === 'kg' ? 'kg' : 'un'}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              Mínimo: {product.estoque_minimo} {product.unidade_medida === 'kg' ? 'kg' : 'un'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StockAlerts;