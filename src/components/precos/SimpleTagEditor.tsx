import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Plus, Trash2, Download, Eye } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface PriceTag {
  id: string;
  nome: string;
  preco: string;
}

interface TagStyle {
  headerFontSize: number;
  nameFontSize: number;
  priceFontSize: number;
  unitFontSize: number;
  headerColor: string;
  priceColor: string;
  borderRadius: number;
  borderWidth: number;
}

const defaultStyle: TagStyle = {
  headerFontSize: 24,
  nameFontSize: 32,
  priceFontSize: 80,
  unitFontSize: 20,
  headerColor: "#dc2626",
  priceColor: "#dc2626",
  borderRadius: 8,
  borderWidth: 3,
};

interface SimpleTagEditorProps {
  tamanho: "full" | "half";
  onTamanhoChange: (tamanho: "full" | "half") => void;
}

export function SimpleTagEditor({ tamanho, onTamanhoChange }: SimpleTagEditorProps) {
  const [tags, setTags] = useState<PriceTag[]>([
    { id: "1", nome: "BATATA MONALISA", preco: "6,49" },
  ]);
  const [style, setStyle] = useState<TagStyle>(defaultStyle);
  const [unidade, setUnidade] = useState("CADA");
  const previewRef = useRef<HTMLDivElement>(null);

  const addTag = () => {
    setTags([...tags, { id: Date.now().toString(), nome: "", preco: "" }]);
  };

  const removeTag = (id: string) => {
    if (tags.length > 1) {
      setTags(tags.filter((t) => t.id !== id));
    }
  };

  const updateTag = (id: string, field: "nome" | "preco", value: string) => {
    setTags(tags.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const generatePDF = async () => {
    if (!previewRef.current) return;

    try {
      toast.loading("Gerando PDF...");
      
      const isLandscape = tamanho === "full";
      const pdf = new jsPDF({
        orientation: isLandscape ? "landscape" : "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = isLandscape ? 297 : 210;
      const pageHeight = isLandscape ? 210 : 297;
      const margin = 5;

      if (tamanho === "full") {
        for (let i = 0; i < tags.length; i++) {
          if (i > 0) pdf.addPage("a4", "landscape");
          
          const tagElement = document.getElementById(`simple-tag-preview-${tags[i].id}`);
          if (tagElement) {
            const canvas = await html2canvas(tagElement, { scale: 3 });
            const imgData = canvas.toDataURL("image/png");
            pdf.addImage(imgData, "PNG", margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);
          }
        }
      } else {
        const tagsPerPage = 2;
        const tagHeight = (pageHeight - margin * 3) / 2;

        for (let i = 0; i < tags.length; i += tagsPerPage) {
          if (i > 0) pdf.addPage();

          for (let j = 0; j < tagsPerPage && i + j < tags.length; j++) {
            const tagElement = document.getElementById(`simple-tag-preview-${tags[i + j].id}`);
            if (tagElement) {
              const canvas = await html2canvas(tagElement, { scale: 3 });
              const imgData = canvas.toDataURL("image/png");
              const yPos = margin + j * (tagHeight + margin);
              pdf.addImage(imgData, "PNG", margin, yPos, pageWidth - margin * 2, tagHeight);
            }
          }
        }
      }

      pdf.save("etiquetas-precos.pdf");
      toast.dismiss();
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      toast.dismiss();
      toast.error("Erro ao gerar PDF");
      console.error(error);
    }
  };

  const printPreview = () => {
    window.print();
  };

  const TagPreview = ({ tag, isFullSize }: { tag: PriceTag; isFullSize: boolean }) => (
    <div
      id={`simple-tag-preview-${tag.id}`}
      className="bg-white flex flex-col items-center justify-center p-4"
      style={{
        aspectRatio: isFullSize ? "297/210" : "210/148.5",
        border: `${style.borderWidth}px solid #000`,
        borderRadius: `${style.borderRadius}px`,
        width: "100%",
      }}
    >
      <div
        className="w-full text-center text-white font-black py-2 px-4 mb-4"
        style={{
          backgroundColor: style.headerColor,
          fontSize: `${style.headerFontSize}px`,
          borderRadius: `${style.borderRadius}px`,
        }}
      >
        APROVEITE! 🔥
      </div>

      <div
        className="text-center font-bold text-black mb-4 px-4"
        style={{
          fontSize: `${style.nameFontSize}px`,
          lineHeight: 1.2,
        }}
      >
        {tag.nome || "NOME DO PRODUTO"}
      </div>

      <div className="flex items-baseline justify-center gap-2">
        <span
          className="font-bold"
          style={{
            fontSize: `${style.priceFontSize * 0.4}px`,
            color: style.priceColor,
          }}
        >
          R$
        </span>
        <span
          className="font-black"
          style={{
            fontSize: `${style.priceFontSize}px`,
            color: style.priceColor,
            lineHeight: 1,
          }}
        >
          {tag.preco || "0,00"}
        </span>
        <span
          className="font-bold text-black"
          style={{
            fontSize: `${style.unitFontSize}px`,
          }}
        >
          {unidade}
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Configurações de Estilo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🎨 Configurações de Estilo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tamanho da Etiqueta</Label>
              <Select value={tamanho} onValueChange={(v: "full" | "half") => onTamanhoChange(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Página Inteira (A4)</SelectItem>
                  <SelectItem value="half">Meia Página (2 por folha)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unidade</Label>
              <Select value={unidade} onValueChange={setUnidade}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CADA">CADA</SelectItem>
                  <SelectItem value="KG">KG</SelectItem>
                  <SelectItem value="UN">UN</SelectItem>
                  <SelectItem value="PCT">PCT</SelectItem>
                  <SelectItem value="CX">CX</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cor do Cabeçalho</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="color"
                  value={style.headerColor}
                  onChange={(e) => setStyle({ ...style, headerColor: e.target.value })}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={style.headerColor}
                  onChange={(e) => setStyle({ ...style, headerColor: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label>Cor do Preço</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="color"
                  value={style.priceColor}
                  onChange={(e) => setStyle({ ...style, priceColor: e.target.value })}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={style.priceColor}
                  onChange={(e) => setStyle({ ...style, priceColor: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Tamanho do Cabeçalho: {style.headerFontSize}px</Label>
              <Slider
                value={[style.headerFontSize]}
                onValueChange={([v]) => setStyle({ ...style, headerFontSize: v })}
                min={12}
                max={60}
                step={1}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Tamanho do Nome: {style.nameFontSize}px</Label>
              <Slider
                value={[style.nameFontSize]}
                onValueChange={([v]) => setStyle({ ...style, nameFontSize: v })}
                min={16}
                max={80}
                step={1}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Tamanho do Preço: {style.priceFontSize}px</Label>
              <Slider
                value={[style.priceFontSize]}
                onValueChange={([v]) => setStyle({ ...style, priceFontSize: v })}
                min={40}
                max={200}
                step={1}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Tamanho da Unidade: {style.unitFontSize}px</Label>
              <Slider
                value={[style.unitFontSize]}
                onValueChange={([v]) => setStyle({ ...style, unitFontSize: v })}
                min={12}
                max={40}
                step={1}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Borda Arredondada: {style.borderRadius}px</Label>
              <Slider
                value={[style.borderRadius]}
                onValueChange={([v]) => setStyle({ ...style, borderRadius: v })}
                min={0}
                max={30}
                step={1}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Espessura da Borda: {style.borderWidth}px</Label>
              <Slider
                value={[style.borderWidth]}
                onValueChange={([v]) => setStyle({ ...style, borderWidth: v })}
                min={1}
                max={10}
                step={1}
                className="mt-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Etiquetas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">🏷️ Etiquetas</CardTitle>
          <Button onClick={addTag} size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {tags.map((tag, index) => (
            <div key={tag.id} className="flex gap-3 items-center p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium text-muted-foreground w-6">
                {index + 1}
              </span>
              <Input
                placeholder="Nome do produto"
                value={tag.nome}
                onChange={(e) => updateTag(tag.id, "nome", e.target.value.toUpperCase())}
                className="flex-1"
              />
              <Input
                placeholder="Preço"
                value={tag.preco}
                onChange={(e) => updateTag(tag.id, "preco", e.target.value)}
                className="w-28"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeTag(tag.id)}
                disabled={tags.length === 1}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">📄 Prévia de Impressão</CardTitle>
          <div className="flex gap-2">
            <Button onClick={generatePDF} className="gap-2">
              <Download className="h-4 w-4" /> Baixar PDF
            </Button>
            <Button onClick={printPreview} variant="outline" className="gap-2">
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div
            ref={previewRef}
            className={`grid gap-4 ${tamanho === "full" ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}
          >
            {tags.map((tag) => (
              <div key={tag.id} className="shadow-lg">
                <TagPreview tag={tag} isFullSize={tamanho === "full"} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
