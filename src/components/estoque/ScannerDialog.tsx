import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ScanLine,
  Search,
  Package,
  Barcode,
  Camera,
  AlertCircle,
  QrCode,
  X,
  ArrowLeft,
  Info,
  Tag,
  DollarSign,
  Layers,
  MapPin,
  Weight,
  Hash,
  Pencil,
  TrendingUp,
  Box,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

interface EstoqueItem {
  id: string;
  codigo: string;
  codigo_barras: string | null;
  nome: string;
  grupo: string | null;
  subgrupo: string | null;
  referencia: string | null;
  marca: string | null;
  preco_custo: number;
  preco_venda: number;
  preco_promocao: number | null;
  estoque_atual: number;
  estoque_minimo: number;
  estoque_maximo: number | null;
  ncm: string | null;
  unidade: string | null;
  peso_bruto: number | null;
  peso_liquido: number | null;
  localizacao: string | null;
  saldo: number | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

interface ScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: EstoqueItem[];
  onEditProduct?: (product: EstoqueItem) => void;
}

const ScannerDialog = ({ open, onOpenChange, items, onEditProduct }: ScannerDialogProps) => {
  const { toast } = useToast();
  const [manualCode, setManualCode] = useState("");
  const [foundProduct, setFoundProduct] = useState<EstoqueItem | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showProductInfo, setShowProductInfo] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const searchProduct = (code: string) => {
    const trimmedCode = code.trim();
    if (!trimmedCode) return;

    const found = items.find(
      (item) =>
        item.codigo.toLowerCase() === trimmedCode.toLowerCase() ||
        item.codigo_barras?.toLowerCase() === trimmedCode.toLowerCase()
    );

    if (found) {
      setFoundProduct(found);
      setNotFound(false);
      setShowProductInfo(true);
      // Stop scanning when product is found
      stopScanning();
    } else {
      setFoundProduct(null);
      setNotFound(true);
      setShowProductInfo(false);
    }
  };

  const handleManualSearch = () => {
    searchProduct(manualCode);
  };

  const startScanning = async () => {
    try {
      // Wait for the container to be rendered
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Check if the element exists
      const element = document.getElementById("scanner-reader");
      if (!element) {
        console.warn("Scanner element not found");
        return;
      }

      // Stop any existing scanner first
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch {
          // Ignore stop errors
        }
      }
      
      const html5QrCode = new Html5Qrcode("scanner-reader");
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
        },
        (decodedText) => {
          searchProduct(decodedText);
          setManualCode(decodedText);
        },
        () => {
          // Ignore scan errors
        }
      );
      setIsScanning(true);
    } catch (error: any) {
      console.error("Camera error:", error);
      // Only show error if it's not a permission or camera not found error
      if (error?.message?.includes("Permission") || error?.message?.includes("Camera")) {
        toast({
          title: "Erro ao iniciar câmera",
          description: "Verifique as permissões de câmera",
          variant: "destructive",
        });
      }
    }
  };

  const stopScanning = () => {
    if (html5QrCodeRef.current && isScanning) {
      html5QrCodeRef.current.stop().catch(() => {});
      setIsScanning(false);
    }
  };

  const resetSearch = () => {
    setFoundProduct(null);
    setNotFound(false);
    setShowProductInfo(false);
    setManualCode("");
  };

  // Cleanup on unmount or dialog close
  useEffect(() => {
    if (!open) {
      stopScanning();
      resetSearch();
    }
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, [open]);

  // Auto-start scanning when dialog opens
  useEffect(() => {
    if (open && !showProductInfo) {
      const timer = setTimeout(() => {
        startScanning();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open, showProductInfo]);

  const handleBackToScanner = () => {
    resetSearch();
    setTimeout(() => startScanning(), 100);
  };

  const margem = foundProduct 
    ? ((foundProduct.preco_venda - foundProduct.preco_custo) / foundProduct.preco_venda * 100) 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            Scanner de Produtos
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 pt-2">
          {/* Show Product Info */}
          {showProductInfo && foundProduct ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleBackToScanner}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao Scanner
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onEditProduct?.(foundProduct)}
                  className="text-primary border-primary hover:bg-primary/10"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar Produto
                </Button>
              </div>

              <ScrollArea className="h-[60vh]">
                <div className="space-y-4 pr-4">
                  {/* Product Header */}
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4 border">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h2 className="text-xl font-bold">{foundProduct.nome}</h2>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline" className="font-mono">
                            <Hash className="h-3 w-3 mr-1" />
                            {foundProduct.codigo}
                          </Badge>
                          {foundProduct.codigo_barras && (
                            <Badge variant="secondary" className="font-mono">
                              <Barcode className="h-3 w-3 mr-1" />
                              {foundProduct.codigo_barras}
                            </Badge>
                          )}
                          <Badge variant={foundProduct.ativo ? "default" : "destructive"}>
                            {foundProduct.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Price Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
                      <CardContent className="p-3 text-center">
                        <DollarSign className="h-4 w-4 mx-auto mb-1 opacity-80" />
                        <p className="text-[10px] uppercase opacity-80">Custo</p>
                        <p className="text-lg font-bold">{formatCurrency(foundProduct.preco_custo)}</p>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
                      <CardContent className="p-3 text-center">
                        <Tag className="h-4 w-4 mx-auto mb-1 opacity-80" />
                        <p className="text-[10px] uppercase opacity-80">Venda</p>
                        <p className="text-lg font-bold">{formatCurrency(foundProduct.preco_venda)}</p>
                      </CardContent>
                    </Card>

                    {foundProduct.preco_promocao && (
                      <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
                        <CardContent className="p-3 text-center">
                          <TrendingUp className="h-4 w-4 mx-auto mb-1 opacity-80" />
                          <p className="text-[10px] uppercase opacity-80">Promoção</p>
                          <p className="text-lg font-bold">{formatCurrency(foundProduct.preco_promocao)}</p>
                        </CardContent>
                      </Card>
                    )}

                    <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
                      <CardContent className="p-3 text-center">
                        <TrendingUp className="h-4 w-4 mx-auto mb-1 opacity-80" />
                        <p className="text-[10px] uppercase opacity-80">Margem</p>
                        <p className="text-lg font-bold">{margem.toFixed(1)}%</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Stock Info */}
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <Box className="h-4 w-4 text-primary" />
                        Estoque
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-2xl font-bold text-primary">{foundProduct.estoque_atual}</p>
                          <p className="text-xs text-muted-foreground">Atual</p>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-2xl font-bold text-orange-500">{foundProduct.estoque_minimo}</p>
                          <p className="text-xs text-muted-foreground">Mínimo</p>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-2xl font-bold text-green-500">{foundProduct.estoque_maximo || "-"}</p>
                          <p className="text-xs text-muted-foreground">Máximo</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Details Grid */}
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <Info className="h-4 w-4 text-primary" />
                        Informações Gerais
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                          <Layers className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-[10px] text-muted-foreground">Grupo</p>
                            <p className="font-medium">{foundProduct.grupo || "-"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                          <Layers className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-[10px] text-muted-foreground">Subgrupo</p>
                            <p className="font-medium">{foundProduct.subgrupo || "-"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                          <Tag className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-[10px] text-muted-foreground">Marca</p>
                            <p className="font-medium">{foundProduct.marca || "-"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                          <Hash className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-[10px] text-muted-foreground">Referência</p>
                            <p className="font-medium">{foundProduct.referencia || "-"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-[10px] text-muted-foreground">Unidade</p>
                            <p className="font-medium">{foundProduct.unidade || "UN"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                          <Hash className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-[10px] text-muted-foreground">NCM</p>
                            <p className="font-medium font-mono text-xs">{foundProduct.ncm || "-"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-[10px] text-muted-foreground">Localização</p>
                            <p className="font-medium">{foundProduct.localizacao || "-"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                          <Weight className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-[10px] text-muted-foreground">Peso</p>
                            <p className="font-medium">
                              {foundProduct.peso_liquido ? `${foundProduct.peso_liquido} kg` : "-"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </div>
          ) : (
            /* Scanner View */
            <div className="space-y-4">
              {/* Manual Input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Digite o código ou código de barras..."
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                    className="pl-10"
                    autoFocus
                  />
                </div>
                <Button onClick={handleManualSearch} size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              {/* Not Found Message */}
              {notFound && (
                <div className="text-center py-4 bg-destructive/10 rounded-lg border border-destructive/20">
                  <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                  <p className="font-medium text-destructive">Produto não encontrado</p>
                  <p className="text-sm text-muted-foreground">
                    O código "{manualCode}" não existe no estoque
                  </p>
                </div>
              )}

              {/* Camera Scanner */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-sm flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Câmera
                    </h3>
                    <Badge variant={isScanning ? "default" : "secondary"}>
                      {isScanning ? "Escaneando..." : "Parado"}
                    </Badge>
                  </div>
                  
                  <div 
                    id="scanner-reader" 
                    ref={scannerContainerRef}
                    className="w-full aspect-video bg-muted rounded-lg overflow-hidden"
                  >
                    {!isScanning && (
                      <div className="h-full flex items-center justify-center flex-col gap-3">
                        <div className="p-4 bg-primary/10 rounded-full">
                          <QrCode className="h-10 w-10 text-primary" />
                        </div>
                        <p className="text-muted-foreground text-sm text-center">
                          Aponte a câmera para o<br />código de barras ou QR Code
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={isScanning ? stopScanning : startScanning}
                      variant={isScanning ? "destructive" : "default"}
                      className="flex-1"
                    >
                      {isScanning ? (
                        <>
                          <X className="h-4 w-4 mr-2" />
                          Parar
                        </>
                      ) : (
                        <>
                          <Camera className="h-4 w-4 mr-2" />
                          Iniciar Câmera
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Tips */}
              <div className="text-xs text-muted-foreground text-center">
                💡 Posicione o código de barras dentro da área de leitura
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ScannerDialog;
