import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Keyboard, Search, History, X, Package, Delete } from 'lucide-react';
import { toast } from 'sonner';
import { searchAcrossFields } from '@/lib/searchUtils';

interface ManualBarcodeInputProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (barcode: string) => void;
  onScannerOpen: () => void;
  catalogItems?: { id: string; nome_item: string; codigo_barras: string | null; preco_custo: number }[];
}

const HISTORY_KEY = 'barcode_history';
const MAX_HISTORY = 20;

const ManualBarcodeInput = ({ open, onOpenChange, onSubmit, onScannerOpen, catalogItems = [] }: ManualBarcodeInputProps) => {
  const [barcode, setBarcode] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [searchResults, setSearchResults] = useState<typeof catalogItems>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Carregar histórico do localStorage
  useEffect(() => {
    if (open) {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        try {
          setHistory(JSON.parse(stored));
        } catch {
          setHistory([]);
        }
      }
      // Focar no input
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Buscar produtos enquanto digita
  useEffect(() => {
    if (barcode.length >= 2) {
      const results = catalogItems.filter(item =>
        searchAcrossFields([item.nome_item, item.codigo_barras], barcode)
      ).slice(0, 6);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [barcode, catalogItems]);

  const saveToHistory = (code: string) => {
    const normalized = code.trim();
    if (!normalized) return;
    
    const newHistory = [normalized, ...history.filter(h => h !== normalized)].slice(0, MAX_HISTORY);
    setHistory(newHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  };

  const handleSubmit = () => {
    const cleaned = barcode.replace(/\s/g, '').trim();
    if (cleaned) {
      saveToHistory(cleaned);
      onSubmit(cleaned);
      setBarcode('');
      onOpenChange(false);
    } else {
      toast.error('Digite um código válido');
    }
  };

  const handleHistoryClick = (code: string) => {
    saveToHistory(code);
    onSubmit(code);
    setBarcode('');
    setShowHistory(false);
    onOpenChange(false);
  };

  const handleProductClick = (item: typeof catalogItems[0]) => {
    if (item.codigo_barras) {
      saveToHistory(item.codigo_barras);
      onSubmit(item.codigo_barras);
    }
    setBarcode('');
    onOpenChange(false);
  };

  const handleKeyPress = (key: string) => {
    if (key === 'delete') {
      setBarcode(prev => prev.slice(0, -1));
    } else if (key === 'clear') {
      setBarcode('');
    } else {
      setBarcode(prev => prev + key);
    }
  };

  const handleClose = () => {
    setBarcode('');
    setShowHistory(false);
    onOpenChange(false);
  };

  const handleOpenScanner = () => {
    handleClose();
    onScannerOpen();
  };

  const numpadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'delete'];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-xs mx-auto max-h-[85vh] overflow-y-auto p-3 rounded-xl">
        <DialogHeader className="pb-1">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Keyboard className="w-4 h-4 text-primary" />
            Entrada Manual
          </DialogTitle>
          <DialogDescription className="text-[10px]">
            Digite o código de barras ou busque por nome
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {/* Campo de entrada principal */}
          <div className="relative">
            <Input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              placeholder="Digite o código..."
              value={barcode}
              onChange={(e) => setBarcode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="text-center text-lg font-mono font-bold h-12 pr-10"
            />
            {barcode && (
              <button
                onClick={() => setBarcode('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Resultados de busca em tempo real */}
          {searchResults.length > 0 && (
            <div className="border rounded-lg overflow-hidden max-h-32 overflow-y-auto">
              <div className="p-1 bg-muted/50 text-[9px] text-muted-foreground font-medium flex items-center gap-1">
                <Search className="w-3 h-3" />
                {searchResults.length} PRODUTOS ENCONTRADOS
              </div>
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleProductClick(item)}
                  className="w-full flex items-center gap-2 p-1.5 hover:bg-primary/10 transition-colors text-left border-t"
                >
                  <Package className="w-3 h-3 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[10px] truncate">{item.nome_item}</p>
                    <p className="text-[9px] text-muted-foreground font-mono">{item.codigo_barras || '-'}</p>
                  </div>
                  <span className="text-[10px] font-semibold text-primary shrink-0">
                    R$ {item.preco_custo.toFixed(2).replace('.', ',')}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Teclado numérico compacto */}
          <div className="grid grid-cols-3 gap-1">
            {numpadKeys.map((key) => (
              <Button
                key={key}
                variant={key === 'delete' || key === 'clear' ? 'outline' : 'secondary'}
                className={`h-10 text-base font-bold ${key === 'delete' ? 'text-destructive' : ''}`}
                onClick={() => handleKeyPress(key)}
              >
                {key === 'delete' ? <Delete className="w-4 h-4" /> : key === 'clear' ? 'C' : key}
              </Button>
            ))}
          </div>

          {/* Botão de confirmar */}
          <Button 
            onClick={handleSubmit} 
            className="w-full h-10 text-sm font-bold"
            disabled={!barcode.trim()}
          >
            <Search className="w-4 h-4 mr-2" />
            BUSCAR PRODUTO
          </Button>

          {/* Histórico colapsado */}
          {history.length > 0 && (
            <div className="space-y-1">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="w-full flex items-center justify-between p-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-[10px] font-medium"
              >
                <span className="flex items-center gap-1.5">
                  <History className="w-3 h-3" />
                  CÓDIGOS RECENTES ({history.length})
                </span>
                <span className="text-muted-foreground">{showHistory ? '▲' : '▼'}</span>
              </button>
              
              {showHistory && (
                <div className="grid grid-cols-2 gap-1 max-h-24 overflow-y-auto">
                  {history.slice(0, 6).map((code, index) => (
                    <button
                      key={index}
                      onClick={() => handleHistoryClick(code)}
                      className="p-1.5 text-[10px] font-mono bg-background border rounded hover:border-primary hover:bg-primary/5 transition-colors truncate"
                    >
                      {code}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex gap-2 pt-1">
            <Button 
              variant="outline" 
              onClick={handleOpenScanner}
              className="flex-1 h-9 gap-1.5 text-xs"
            >
              <Camera className="w-3.5 h-3.5" />
              Escanear
            </Button>
            <Button 
              variant="ghost" 
              onClick={handleClose}
              className="h-9 px-3"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManualBarcodeInput;
