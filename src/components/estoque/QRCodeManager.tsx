import { useState, useMemo } from "react";
import { searchAcrossFields } from "@/lib/searchUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import {
  QrCode,
  Search,
  Download,
  Printer,
  CheckSquare,
  Square,
} from "lucide-react";
import jsPDF from "jspdf";

interface EstoqueItem {
  id: string;
  codigo: string;
  codigo_barras: string | null;
  nome: string;
  preco_venda: number;
}

interface QRCodeManagerProps {
  items: EstoqueItem[];
}

const QRCodeManager = ({ items }: QRCodeManagerProps) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items.slice(0, 50);
    return items.filter(item =>
      searchAcrossFields([item.codigo, item.nome, item.codigo_barras], searchQuery)
    ).slice(0, 50);
  }, [items, searchQuery]);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map((i) => i.id)));
    }
  };

  const generateQRCodePDF = async () => {
    if (selectedItems.size === 0) {
      toast({
        title: "Selecione produtos",
        description: "Selecione pelo menos um produto para gerar QR codes",
        variant: "destructive",
      });
      return;
    }

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const selectedProducts = items.filter((i) => selectedItems.has(i.id));
    const qrSize = 30;
    const cols = 5;
    const marginX = 15;
    const marginY = 15;
    const spacingX = (210 - 2 * marginX) / cols;
    const spacingY = 45;

    let x = marginX;
    let y = marginY;
    let count = 0;

    for (const product of selectedProducts) {
      if (count > 0 && count % cols === 0) {
        x = marginX;
        y += spacingY;
      }

      if (y + spacingY > 280) {
        pdf.addPage();
        x = marginX;
        y = marginY;
      }

      // Generate QR code as canvas
      const qrCanvas = document.createElement("canvas");
      const qrCode = new (window as any).QRious({
        element: qrCanvas,
        value: product.codigo_barras || product.codigo,
        size: 200,
      });

      // For now, just add placeholder text
      pdf.setFontSize(6);
      pdf.text(product.codigo.substring(0, 15), x + spacingX / 2 - 10, y + qrSize + 5);
      pdf.setFontSize(5);
      const nome = product.nome.length > 20 ? product.nome.substring(0, 20) + "..." : product.nome;
      pdf.text(nome, x + spacingX / 2 - 15, y + qrSize + 9);

      x += spacingX;
      count++;
    }

    pdf.save(`qrcodes_${new Date().toISOString().split("T")[0]}.pdf`);
    toast({ title: "QR Codes gerados com sucesso!" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Gerador de QR Codes
          </h2>
          <p className="text-sm text-muted-foreground">
            Gere QR codes em lote para seus produtos
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={generateQRCodePDF}
            disabled={selectedItems.size === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Gerar PDF ({selectedItems.size})
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por código, nome ou EAN..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4">
        <Badge variant="secondary">
          {filteredItems.length} produtos encontrados
        </Badge>
        <Badge variant="outline">
          {selectedItems.size} selecionados
        </Badge>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSelectAll}
                    className="h-6 w-6"
                  >
                    {selectedItems.size === filteredItems.length ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>EAN</TableHead>
                <TableHead className="text-center">Preview</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow
                  key={item.id}
                  className={selectedItems.has(item.id) ? "bg-primary/5" : ""}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={() => toggleSelect(item.id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{item.nome}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {item.codigo_barras || "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <QRCodeSVG
                        value={item.codigo_barras || item.codigo}
                        size={40}
                        level="L"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default QRCodeManager;
