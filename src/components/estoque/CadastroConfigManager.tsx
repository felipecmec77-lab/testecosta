import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Settings,
  Layers,
  FolderTree,
  Tag,
  MapPin,
  Ruler,
  FileText,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Loader2,
  Save,
  Package,
  AlertTriangle,
} from "lucide-react";

interface EstoqueItem {
  id: string;
  codigo: string;
  nome: string;
  grupo: string | null;
  subgrupo: string | null;
  marca: string | null;
  ncm: string | null;
  unidade: string | null;
  localizacao: string | null;
  preco_custo: number;
  preco_venda: number;
  estoque_atual: number;
}

interface CadastroConfigManagerProps {
  items: EstoqueItem[];
  isAdmin: boolean;
  onRefresh: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ConfigType = "grupo" | "subgrupo" | "marca" | "ncm" | "unidade" | "localizacao";

interface ConfigItem {
  value: string;
  count: number;
  totalCusto: number;
  totalVenda: number;
}

const CadastroConfigManager = ({ items, isAdmin, onRefresh, open, onOpenChange }: CadastroConfigManagerProps) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ConfigType>("grupo");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [editingItem, setEditingItem] = useState<{ oldValue: string; newValue: string } | null>(null);
  const [deletingItem, setDeletingItem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Extract unique values for each config type
  const getConfigItems = (type: ConfigType): ConfigItem[] => {
    const field = type as keyof EstoqueItem;
    const valuesMap = new Map<string, ConfigItem>();

    items.forEach((item) => {
      const value = item[field] as string | null;
      if (value && value.trim()) {
        const trimmedValue = value.trim();
        if (!valuesMap.has(trimmedValue)) {
          valuesMap.set(trimmedValue, {
            value: trimmedValue,
            count: 0,
            totalCusto: 0,
            totalVenda: 0,
          });
        }
        const config = valuesMap.get(trimmedValue)!;
        config.count += 1;
        config.totalCusto += item.preco_custo * Math.max(0, item.estoque_atual);
        config.totalVenda += item.preco_venda * Math.max(0, item.estoque_atual);
      }
    });

    return Array.from(valuesMap.values()).sort((a, b) => a.value.localeCompare(b.value, "pt-BR"));
  };

  const configItems = useMemo(() => getConfigItems(activeTab), [items, activeTab]);
  
  const filteredConfigItems = useMemo(() => {
    if (!searchQuery.trim()) return configItems;
    return configItems.filter(item => 
      item.value.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [configItems, searchQuery]);

  // Stats for current tab
  const stats = useMemo(() => {
    const total = configItems.length;
    const totalItems = configItems.reduce((acc, c) => acc + c.count, 0);
    const withoutValue = items.filter(item => !item[activeTab as keyof EstoqueItem]).length;
    return { total, totalItems, withoutValue };
  }, [configItems, items, activeTab]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getTabLabel = (type: ConfigType) => {
    const labels: Record<ConfigType, string> = {
      grupo: "Grupos",
      subgrupo: "Subgrupos",
      marca: "Marcas",
      ncm: "NCM",
      unidade: "Unidades",
      localizacao: "Localizações",
    };
    return labels[type];
  };

  const getTabIcon = (type: ConfigType) => {
    const icons: Record<ConfigType, typeof Layers> = {
      grupo: Layers,
      subgrupo: FolderTree,
      marca: Tag,
      ncm: FileText,
      unidade: Ruler,
      localizacao: MapPin,
    };
    return icons[type];
  };

  const handleAdd = async () => {
    if (!newValue.trim()) {
      toast({
        title: "Valor obrigatório",
        description: "Informe um valor válido",
        variant: "destructive",
      });
      return;
    }

    // Check if already exists
    if (configItems.some(c => c.value.toLowerCase() === newValue.trim().toLowerCase())) {
      toast({
        title: "Valor já existe",
        description: `Este ${getTabLabel(activeTab).slice(0, -1).toLowerCase()} já está cadastrado`,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Valor disponível",
      description: `O ${getTabLabel(activeTab).slice(0, -1).toLowerCase()} "${newValue}" estará disponível ao adicionar ou editar produtos.`,
    });
    setShowAddDialog(false);
    setNewValue("");
  };

  const handleEdit = async () => {
    if (!editingItem || !editingItem.newValue.trim()) {
      toast({
        title: "Valor obrigatório",
        description: "Informe um valor válido",
        variant: "destructive",
      });
      return;
    }

    if (editingItem.oldValue === editingItem.newValue.trim()) {
      setShowEditDialog(false);
      setEditingItem(null);
      return;
    }

    setSaving(true);
    try {
      const updateData: Record<string, string> = {};
      updateData[activeTab] = editingItem.newValue.trim();

      const { error } = await supabase
        .from("estoque")
        .update(updateData)
        .eq(activeTab, editingItem.oldValue);

      if (error) throw error;

      toast({
        title: "Atualizado com sucesso!",
        description: `Todos os produtos com ${getTabLabel(activeTab).slice(0, -1).toLowerCase()} "${editingItem.oldValue}" foram atualizados para "${editingItem.newValue}"`,
      });

      setShowEditDialog(false);
      setEditingItem(null);
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;

    setSaving(true);
    try {
      const updateData: Record<string, null> = {};
      updateData[activeTab] = null;

      const { error } = await supabase
        .from("estoque")
        .update(updateData)
        .eq(activeTab, deletingItem);

      if (error) throw error;

      toast({
        title: "Removido com sucesso!",
        description: `O ${getTabLabel(activeTab).slice(0, -1).toLowerCase()} "${deletingItem}" foi removido de todos os produtos`,
      });

      setShowDeleteDialog(false);
      setDeletingItem(null);
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (item: ConfigItem) => {
    setEditingItem({ oldValue: item.value, newValue: item.value });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (value: string) => {
    setDeletingItem(value);
    setShowDeleteDialog(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Settings className="h-5 w-5 text-primary" />
            Configurações de Cadastro
            <Badge variant="outline" className="ml-2">F1</Badge>
          </DialogTitle>
          <DialogDescription>
            Gerencie grupos, subgrupos, marcas, NCM, unidades e localizações do estoque
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ConfigType)} className="flex-1">
          <div className="px-6 pt-4">
            <TabsList className="grid grid-cols-6 w-full">
              {(["grupo", "subgrupo", "marca", "ncm", "unidade", "localizacao"] as ConfigType[]).map((type) => {
                const Icon = getTabIcon(type);
                return (
                  <TabsTrigger key={type} value={type} className="flex items-center gap-1.5 text-xs">
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{getTabLabel(type)}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <div className="p-6 pt-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.total}</p>
                      <p className="text-xs opacity-90">Total de {getTabLabel(activeTab)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Package className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.totalItems.toLocaleString("pt-BR")}</p>
                      <p className="text-xs opacity-90">Produtos Associados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.withoutValue.toLocaleString("pt-BR")}</p>
                      <p className="text-xs opacity-90">Sem {getTabLabel(activeTab).slice(0, -1)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search and Add */}
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Buscar ${getTabLabel(activeTab).toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {isAdmin && (
                <Button onClick={() => setShowAddDialog(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar
                </Button>
              )}
            </div>

            {/* Table */}
            <ScrollArea className="h-[400px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">{getTabLabel(activeTab).slice(0, -1)}</TableHead>
                    <TableHead className="text-center">Produtos</TableHead>
                    <TableHead className="text-right">Custo Total</TableHead>
                    <TableHead className="text-right">Venda Total</TableHead>
                    {isAdmin && <TableHead className="text-center w-[100px]">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConfigItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 5 : 4} className="text-center py-8 text-muted-foreground">
                        {searchQuery ? "Nenhum resultado encontrado" : `Nenhum ${getTabLabel(activeTab).slice(0, -1).toLowerCase()} cadastrado`}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredConfigItems.map((item) => (
                      <TableRow key={item.value}>
                        <TableCell className="font-medium">{item.value}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{item.count}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(item.totalCusto)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.totalVenda)}</TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(item)}
                                className="h-8 w-8 p-0"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDeleteDialog(item.value)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>
                Mostrando {filteredConfigItems.length} de {configItems.length} {getTabLabel(activeTab).toLowerCase()}
              </span>
              <span>
                Pressione ESC para fechar
              </span>
            </div>
          </div>
        </Tabs>

        {/* Add Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar {getTabLabel(activeTab).slice(0, -1)}</DialogTitle>
              <DialogDescription>
                Adicione um novo valor para {getTabLabel(activeTab).toLowerCase()}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newValue">Nome</Label>
                <Input
                  id="newValue"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder={`Ex: ${activeTab === "grupo" ? "BEBIDAS" : activeTab === "subgrupo" ? "REFRIGERANTES" : "..."}`}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAdd}>
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar {getTabLabel(activeTab).slice(0, -1)}</DialogTitle>
              <DialogDescription>
                Altere o nome. Todos os produtos com este valor serão atualizados.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Valor Atual</Label>
                <Input value={editingItem?.oldValue || ""} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editValue">Novo Valor</Label>
                <Input
                  id="editValue"
                  value={editingItem?.newValue || ""}
                  onChange={(e) => setEditingItem(prev => prev ? { ...prev, newValue: e.target.value } : null)}
                  onKeyDown={(e) => e.key === "Enter" && handleEdit()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleEdit} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover {getTabLabel(activeTab).slice(0, -1)}?</AlertDialogTitle>
              <AlertDialogDescription>
                O {getTabLabel(activeTab).slice(0, -1).toLowerCase()} "{deletingItem}" será removido de todos os produtos associados. 
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={saving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};

export default CadastroConfigManager;
