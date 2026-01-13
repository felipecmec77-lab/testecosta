import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, ArrowLeft, FileText } from "lucide-react";
import { TemplateCard } from "./TemplateCard";
import { EncarteEditor } from "./EncarteEditor";
import { EditorElement } from "../editor/types";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface Template {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  elementos: EditorElement[];
  tamanho: string;
  thumbnail_url: string | null;
}

export function GerarEncartes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("todos");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates-etiquetas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('templates_etiquetas')
        .select('*')
        .eq('ativo', true)
        .order('criado_em', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        elementos: item.elementos as unknown as EditorElement[]
      })) as Template[];
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('templates_etiquetas')
        .update({ ativo: false })
        .eq('id', templateId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['templates-etiquetas'] });
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    },
    onError: (error: any) => {
      console.error("Error deleting template:", error);
      toast.error("Erro ao excluir template. Verifique suas permissões.");
    }
  });

  // Get unique categories
  const categories = ['todos', ...new Set(templates?.map(t => t.categoria || 'geral').filter(Boolean))];

  // Filter templates
  const filteredTemplates = templates?.filter(t => {
    const matchesSearch = t.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.descricao?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = activeCategory === 'todos' || t.categoria === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Handle edit - navigate to full editor with template data
  const handleEdit = (template: Template) => {
    sessionStorage.setItem('duplicateTemplate', JSON.stringify({
      elementos: template.elementos,
      tamanho: template.tamanho,
      nome: template.nome
    }));
    toast.success("Template carregado para edição completa!");
    navigate('/gerador-precos');
  };

  // Handle duplicate
  const handleDuplicate = (template: Template) => {
    sessionStorage.setItem('duplicateTemplate', JSON.stringify({
      elementos: template.elementos,
      tamanho: template.tamanho,
      nome: `${template.nome} (Cópia)`
    }));
    toast.success("Template duplicado! Redirecionando para o editor...");
    navigate('/gerador-precos');
  };

  // Handle delete
  const handleDeleteClick = (template: Template) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (templateToDelete) {
      deleteMutation.mutate(templateToDelete.id);
    }
  };

  if (selectedTemplate) {
    return (
      <EncarteEditor
        template={{
          id: selectedTemplate.id,
          nome: selectedTemplate.nome,
          elementos: selectedTemplate.elementos,
          tamanho: selectedTemplate.tamanho as 'full' | 'half'
        }}
        onBack={() => setSelectedTemplate(null)}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-muted/30">
      {/* Header */}
      <div className="bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-semibold text-lg">Gerar Encartes</h1>
              <p className="text-sm text-muted-foreground">Selecione um template para personalizar</p>
            </div>
          </div>
          <Link to="/gerador-precos">
            <Button variant="outline" size="sm">
              Criar Template
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Search */}
        <div className="max-w-md mx-auto mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Categories */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-6">
          <TabsList className="mx-auto flex w-fit">
            {categories.map(cat => (
              <TabsTrigger key={cat} value={cat} className="capitalize">
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Templates Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
            ))}
          </div>
        ) : filteredTemplates && filteredTemplates.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onClick={() => setSelectedTemplate(template)}
                onEdit={() => handleEdit(template)}
                onDuplicate={() => handleDuplicate(template)}
                onDelete={() => handleDeleteClick(template)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum template encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm 
                ? "Tente buscar com outros termos" 
                : "Crie seu primeiro template no Editor de Preços"}
            </p>
            <Link to="/gerador-precos">
              <Button>Criar Template</Button>
            </Link>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Template</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o template "{templateToDelete?.nome}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
