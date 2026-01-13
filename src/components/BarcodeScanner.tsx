import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, X, Keyboard, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (barcode: string) => void;
}

const SCAN_TIMEOUT = 15000; // 15 segundos de timeout

const BarcodeScanner = ({ open, onOpenChange, onScan }: BarcodeScannerProps) => {
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [timeoutWarning, setTimeoutWarning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!open || showManualInput) {
      // Limpar timeout se fechar
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    const startScanner = async () => {
      setIsStarting(true);
      setCameraError(null);
      setTimeoutWarning(false);

      try {
        // Limpar scanner anterior
        if (scannerRef.current) {
          try {
            await scannerRef.current.stop();
          } catch {
            // Ignorar erro se já parado
          }
          scannerRef.current = null;
        }

        const scanner = new Html5Qrcode('barcode-reader');
        scannerRef.current = scanner;

        const cameras = await Html5Qrcode.getCameras();
        
        if (!cameras || cameras.length === 0) {
          throw new Error('Nenhuma câmera encontrada');
        }

        // Preferir câmera traseira
        const backCamera = cameras.find(c => 
          c.label.toLowerCase().includes('back') || 
          c.label.toLowerCase().includes('traseira') ||
          c.label.toLowerCase().includes('environment')
        );
        const cameraId = backCamera?.id || cameras[cameras.length - 1].id;

        await scanner.start(
          cameraId,
          {
            fps: 15,
            qrbox: { width: 280, height: 120 },
            aspectRatio: 1.333,
          },
          (decodedText) => {
            // Limpar timeout ao detectar
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            toast.success(`Código detectado: ${decodedText}`);
            onScan(decodedText);
            handleClose();
          },
          () => {
            // Ignorar erros de leitura contínua
          }
        );

        setIsStarting(false);

        // Iniciar timeout para sugerir entrada manual
        timeoutRef.current = setTimeout(() => {
          setTimeoutWarning(true);
          toast.info('Dificuldade em ler? Tente digitar o código manualmente.', { duration: 5000 });
        }, SCAN_TIMEOUT);

      } catch (error) {
        console.error('Erro ao iniciar scanner:', error);
        setIsStarting(false);
        
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        
        if (errorMessage.includes('Permission') || errorMessage.includes('NotAllowed')) {
          setCameraError('Permissão de câmera negada. Por favor, permita o acesso à câmera.');
        } else if (errorMessage.includes('NotFound') || errorMessage.includes('Nenhuma câmera')) {
          setCameraError('Nenhuma câmera encontrada no dispositivo.');
        } else {
          setCameraError('Não foi possível acessar a câmera.');
        }
        
        setShowManualInput(true);
      }
    };

    // Pequeno delay para garantir que o DOM está pronto
    const timer = setTimeout(startScanner, 100);

    return () => {
      clearTimeout(timer);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [open, showManualInput, onScan]);

  const handleClose = async () => {
    // Limpar timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // Ignorar erro
      }
      scannerRef.current = null;
    }
    
    setShowManualInput(false);
    setManualBarcode('');
    setCameraError(null);
    setIsStarting(false);
    setTimeoutWarning(false);
    onOpenChange(false);
  };

  const handleManualSubmit = () => {
    const cleanBarcode = manualBarcode.replace(/\s/g, '').trim();
    if (cleanBarcode) {
      toast.success(`Código inserido: ${cleanBarcode}`);
      onScan(cleanBarcode);
      handleClose();
    } else {
      toast.error('Digite um código válido');
    }
  };

  const switchToCamera = async () => {
    setShowManualInput(false);
    setCameraError(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-[380px] mx-auto p-0 overflow-hidden rounded-xl">
        <DialogHeader className="p-3 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Camera className="w-5 h-5 text-primary" />
            Scanner de Código
          </DialogTitle>
          <DialogDescription className="text-xs">
            {showManualInput 
              ? 'Digite o código de barras manualmente'
              : 'Posicione o código de barras dentro do quadro'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 p-3 pt-0">
          {showManualInput ? (
            <div className="space-y-3 py-2">
              {cameraError && (
                <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                  <p className="text-xs text-destructive">{cameraError}</p>
                </div>
              )}
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Digite o código de barras..."
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                autoFocus
                className="text-center text-lg font-mono h-12"
              />
              <div className="flex gap-2">
                <Button 
                  onClick={switchToCamera}
                  variant="outline" 
                  className="flex-1 h-10"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Câmera
                </Button>
                <Button onClick={handleManualSubmit} className="flex-1 h-10">
                  Confirmar
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div 
                ref={containerRef}
                className="relative w-full bg-black rounded-lg overflow-hidden"
                style={{ minHeight: '280px' }}
              >
                {isStarting && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                    <div className="text-center text-white">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm">Iniciando câmera...</p>
                    </div>
                  </div>
                )}
                
                <div 
                  id="barcode-reader" 
                  className="w-full"
                  style={{ minHeight: '280px' }}
                />

                {/* Aviso de timeout */}
                {timeoutWarning && (
                  <div className="absolute bottom-2 left-2 right-2 p-2 bg-warning/90 rounded-lg text-warning-foreground text-xs text-center font-medium animate-pulse">
                    Dificuldade em ler? Tente digitar manualmente
                  </div>
                )}
              </div>
              
              <Button 
                onClick={() => setShowManualInput(true)} 
                variant={timeoutWarning ? 'default' : 'secondary'}
                className={`w-full h-10 ${timeoutWarning ? 'animate-pulse' : ''}`}
              >
                <Keyboard className="w-4 h-4 mr-2" />
                Digitar Código
              </Button>
            </>
          )}

          <Button onClick={handleClose} variant="outline" className="w-full h-10">
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeScanner;
