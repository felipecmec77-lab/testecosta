import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { EditorElement } from "./editor/types";
import { Loader2 } from "lucide-react";

interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  elements: EditorElement[];
  canvasSize: 'full' | 'half';
}

const CATEGORIAS = [
  { value: 'hortifruti', label: 'Hortifruti' },
  { value: 'promocao', label: 'Promoção' },
  { value: 'oferta', label: 'Oferta' },
  { value: 'especial', label: 'Especial' },
  { value: 'geral', label: 'Geral' },
];

export function SaveTemplateDialog({ 
  open, 
  onOpenChange, 
  elements, 
  canvasSize 
}: SaveTemplateDialogProps) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("geral");
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('templates_etiquetas')
        .insert({
          nome,
          descricao: descricao || null,
          categoria,
          elementos: elements as any,
          tamanho: canvasSize,
          criado_por: user?.id || null,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template salvo com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['templates-etiquetas'] });
      onOpenChange(false);
      setNome("");
      setDescricao("");
      setCategoria("geral");
    },
    onError: (error: any) => {
      console.error("Error saving template:", error);
      toast.error("Erro ao salvar template. Verifique se você tem permissão.");
    }
  });

  const handleSave = () => {
    if (!nome.trim()) {
      toast.error("Digite um nome para o template");
      return;
    }
    if (elements.length === 0) {
      toast.error("Adicione pelo menos um elemento ao template");
      return;
    }
    saveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Salvar Template</DialogTitle>
          <DialogDescription>
            Salve este design como template para reutilizar depois.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Template *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Oferta Hortifruti"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição opcional do template"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoria">Categoria</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
            <p><strong>Tamanho:</strong> {canvasSize === 'full' ? 'A4 Paisagem' : 'A4 Retrato'}</p>
            <p><strong>Elementos:</strong> {elements.length}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
