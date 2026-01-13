import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { Search, ArrowLeft, FileText, Paintbrush, LayoutGrid } from "lucide-react";
import { TemplateCard } from "@/components/precos/encartes/TemplateCard";
import { EncarteEditor } from "@/components/precos/encartes/EncarteEditor";
import { CanvasEditor } from "@/components/precos/CanvasEditorKonva";
import { EditorElement } from "@/components/precos/editor/types";
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

const EncartesPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"templates" | "editor">("templates");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("todos");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  
  // Editor state
  const [tamanho, setTamanho] = useState<"full" | "half">("full");
  const [initialElements, setInitialElements] = useState<EditorElement[] | null>(null);

  // Check for template to load from sessionStorage
  useEffect(() => {
    const duplicateData = sessionStorage.getItem('duplicateTemplate');
    if (duplicateData) {
      try {
        const template = JSON.parse(duplicateData);
        setTamanho(template.tamanho as "full" | "half");
        setInitialElements(template.elementos);
        sessionStorage.removeItem('duplicateTemplate');
        setActiveTab("editor");
        toast.info(`Template "${template.nome}" carregado para edição`);
      } catch (e) {
        console.error('Error parsing duplicate template:', e);
      }
    }
  }, []);

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

  const categories = ['todos', ...new Set(templates?.map(t => t.categoria || 'geral').filter(Boolean))];

  const filteredTemplates = templates?.filter(t => {
    const matchesSearch = t.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.descricao?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = activeCategory === 'todos' || t.categoria === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleEdit = (template: Template) => {
    setTamanho(template.tamanho as "full" | "half");
    setInitialElements(template.elementos);
    setActiveTab("editor");
    toast.success("Template carregado para edição!");
  };

  const handleDuplicate = (template: Template) => {
    setTamanho(template.tamanho as "full" | "half");
    setInitialElements(template.elementos);
    setActiveTab("editor");
    toast.success(`Template "${template.nome}" duplicado!`);
  };

  const handleDeleteClick = (template: Template) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (templateToDelete) {
      deleteMutation.mutate(templateToDelete.id);
    }
  };

  const handleCreateNew = () => {
    setInitialElements(null);
    setActiveTab("editor");
  };

  // When viewing/editing a selected template in quick mode
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
    <div className="h-screen flex flex-col bg-background">
      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "templates" | "editor")} className="flex flex-col h-full">
        {/* Header with Tabs */}
        <div className="bg-background border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="font-semibold text-lg">Encartes</h1>
                <p className="text-sm text-muted-foreground">Crie e gerencie seus encartes de preços</p>
              </div>
            </div>
            <TabsList>
              <TabsTrigger value="templates" className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="editor" className="flex items-center gap-2">
                <Paintbrush className="h-4 w-4" />
                Editor
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Templates Tab */}
        <TabsContent value="templates" className="flex-1 overflow-auto m-0">
          <div className="p-6">
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
                    : "Crie seu primeiro template no Editor"}
                </p>
                <Button onClick={handleCreateNew}>Criar Template</Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Editor Tab */}
        <TabsContent value="editor" className="flex-1 overflow-hidden m-0">
          <CanvasEditor 
            tamanho={tamanho} 
            onTamanhoChange={setTamanho}
            initialElements={initialElements}
          />
        </TabsContent>
      </Tabs>

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
};

export default EncartesPage;
