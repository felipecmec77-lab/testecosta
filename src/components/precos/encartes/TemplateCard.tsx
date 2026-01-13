import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Copy, Edit, Trash2 } from "lucide-react";
import { EditorElement } from "../editor/types";

interface TemplateCardProps {
  template: {
    id: string;
    nome: string;
    descricao?: string;
    categoria?: string;
    tamanho: string;
    thumbnail_url?: string | null;
    elementos?: EditorElement[];
  };
  onClick: () => void;
  onDuplicate?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  selected?: boolean;
}

export function TemplateCard({ template, onClick, onDuplicate, onEdit, onDelete, selected }: TemplateCardProps) {
  // Generate a simple preview from elements
  const renderPreview = () => {
    if (template.thumbnail_url) {
      return (
        <img 
          src={template.thumbnail_url} 
          alt={template.nome}
          className="w-full h-full object-cover"
        />
      );
    }

    const elementos = template.elementos || [];
    const hasText = elementos.some(e => e.type === 'text');
    const hasRect = elementos.some(e => e.type === 'rect');
    const hasCircle = elementos.some(e => e.type === 'circle');
    const hasImage = elementos.some(e => e.type === 'image');
    const hasStar = elementos.some(e => e.type === 'star');
    const isLandscape = template.tamanho === 'full';

    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-3">
        <div className={`w-full flex-1 bg-white rounded border relative overflow-hidden ${isLandscape ? 'aspect-video' : ''}`}>
          {hasRect && (
            <div className="absolute top-2 left-2 w-8 h-5 bg-green-500 rounded-sm" />
          )}
          {hasCircle && (
            <div className="absolute top-3 right-3 w-4 h-4 bg-blue-500 rounded-full" />
          )}
          {hasStar && (
            <div className="absolute bottom-3 right-3 text-yellow-500 text-xs">★</div>
          )}
          {hasImage && (
            <div className="absolute bottom-2 left-2 w-6 h-4 bg-gray-300 rounded-sm flex items-center justify-center">
              <FileText className="w-3 h-3 text-gray-500" />
            </div>
          )}
          {hasText && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-[8px] font-bold text-gray-700 text-center leading-tight">
                Texto<br/>Exemplo
              </div>
            </div>
          )}
          {elementos.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <FileText className="w-8 h-8 text-muted-foreground/50" />
            </div>
          )}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {elementos.length} elemento{elementos.length !== 1 ? 's' : ''}
        </div>
      </div>
    );
  };

  return (
    <Card
      className={`relative group overflow-hidden transition-all hover:shadow-lg ${
        selected ? 'ring-2 ring-primary shadow-lg' : ''
      }`}
    >
      {/* Preview area */}
      <div 
        onClick={onClick}
        className="aspect-[3/4] bg-muted cursor-pointer"
      >
        {renderPreview()}
      </div>

      {/* Info section */}
      <div className="p-3">
        <h3 className="font-medium text-sm truncate">{template.nome}</h3>
        {template.descricao && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {template.descricao}
          </p>
        )}
        <div className="flex justify-between items-center mt-2">
          <div className="flex gap-1">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {template.tamanho === 'full' ? 'Paisagem' : 'Retrato'}
            </Badge>
            {template.categoria && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {template.categoria}
              </Badge>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-3">
          {onEdit && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8 text-xs gap-1"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Edit className="h-3 w-3" />
              Editar
            </Button>
          )}
          {onDuplicate && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              title="Duplicar template"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Excluir template"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
