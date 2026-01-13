import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ScanLine,
  Search,
  Package,
  DollarSign,
  Barcode,
  Camera,
  AlertCircle,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useRef } from "react";

interface EstoqueItem {
  id: string;
  codigo: string;
  codigo_barras: string | null;
  nome: string;
  preco_custo: number;
  preco_venda: number;
  preco_promocao: number | null;
  estoque_atual: number;
  grupo: string | null;
  marca: string | null;
  unidade: string | null;
}

interface ScannerTabProps {
  items: EstoqueItem[];
}

const ScannerTab = ({ items }: ScannerTabProps) => {
  const { toast } = useToast();
  const [manualCode, setManualCode] = useState("");
  const [foundProduct, setFoundProduct] = useState<EstoqueItem | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

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
    } else {
      setFoundProduct(null);
      setNotFound(true);
    }
  };

  const handleManualSearch = () => {
    searchProduct(manualCode);
  };

  const startScanning = async () => {
    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
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
          html5QrCode.stop();
          setIsScanning(false);
        },
        (errorMessage) => {
          // Ignore scan errors
        }
      );
      setIsScanning(true);
    } catch (error) {
      toast({
        title: "Erro ao iniciar câmera",
        description: "Verifique as permissões de câmera",
        variant: "destructive",
      });
    }
  };

  const stopScanning = () => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current.stop();
      setIsScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <ScanLine className="h-5 w-5 text-primary" />
          Scanner de Produtos
        </h2>
        <p className="text-sm text-muted-foreground">
          Escaneie ou digite o código de barras para consultar produtos
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanner Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Scanner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div id="qr-reader" className="w-full aspect-video bg-muted rounded-lg overflow-hidden">
              {!isScanning && (
                <div className="h-full flex items-center justify-center flex-col gap-4">
                  <Barcode className="h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">
                    Clique para iniciar o scanner
                  </p>
                </div>
              )}
            </div>
            <Button
              onClick={isScanning ? stopScanning : startScanning}
              className="w-full"
              variant={isScanning ? "destructive" : "default"}
            >
              {isScanning ? "Parar Scanner" : "Iniciar Scanner"}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  ou digite manualmente
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Digite o código ou EAN..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleManualSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Result Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Resultado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {foundProduct ? (
              <div className="space-y-4">
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <h3 className="font-bold text-lg mb-1">{foundProduct.nome}</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="outline">{foundProduct.codigo}</Badge>
                    {foundProduct.codigo_barras && (
                      <Badge variant="secondary">{foundProduct.codigo_barras}</Badge>
                    )}
                    {foundProduct.grupo && (
                      <Badge>{foundProduct.grupo}</Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-background rounded-lg">
                      <p className="text-xs text-muted-foreground">Preço Custo</p>
                      <p className="text-lg font-bold">{formatCurrency(foundProduct.preco_custo)}</p>
                    </div>
                    <div className="p-3 bg-background rounded-lg">
                      <p className="text-xs text-muted-foreground">Preço Venda</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(foundProduct.preco_venda)}
                      </p>
                    </div>
                    {foundProduct.preco_promocao && (
                      <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg col-span-2">
                        <p className="text-xs text-orange-600">Preço Promoção</p>
                        <p className="text-lg font-bold text-orange-600">
                          {formatCurrency(foundProduct.preco_promocao)}
                        </p>
                      </div>
                    )}
                    <div className="p-3 bg-background rounded-lg">
                      <p className="text-xs text-muted-foreground">Estoque</p>
                      <p className="text-lg font-bold">{foundProduct.estoque_atual}</p>
                    </div>
                    <div className="p-3 bg-background rounded-lg">
                      <p className="text-xs text-muted-foreground">Unidade</p>
                      <p className="text-lg font-bold">{foundProduct.unidade || "UN"}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : notFound ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="font-bold text-lg text-destructive">Produto não encontrado</h3>
                <p className="text-muted-foreground mt-1">
                  O código "{manualCode}" não foi encontrado no estoque
                </p>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Escaneie ou digite um código para ver as informações do produto</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ScannerTab;
