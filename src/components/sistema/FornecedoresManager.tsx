import { useState, useEffect } from "react";
import { searchAcrossFields } from "@/lib/searchUtils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Search,
  Phone,
  Mail,
  MapPin,
  FileText,
  Loader2,
  Save,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Fornecedor {
  id: string;
  nome: string;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  contato: string | null;
  observacao: string | null;
  ativo: boolean | null;
  criado_em: string | null;
}

interface FornecedoresManagerProps {
  onFornecedorChange?: () => void;
}

export function FornecedoresManager({ onFornecedorChange }: FornecedoresManagerProps) {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);
  const [deletingFornecedor, setDeletingFornecedor] = useState<Fornecedor | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    nome: "",
    cnpj: "",
    email: "",
    telefone: "",
    endereco: "",
    contato: "",
    observacao: "",
    ativo: true,
  });

  useEffect(() => {
    fetchFornecedores();
  }, []);

  const fetchFornecedores = async () => {
    try {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("*")
        .order("nome");

      if (error) throw error;
      setFornecedores(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar fornecedores:", error);
      toast.error("Erro ao carregar fornecedores");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: "",
      cnpj: "",
      email: "",
      telefone: "",
      endereco: "",
      contato: "",
      observacao: "",
      ativo: true,
    });
    setEditingFornecedor(null);
  };

  const openDialog = (fornecedor?: Fornecedor) => {
    if (fornecedor) {
      setEditingFornecedor(fornecedor);
      setFormData({
        nome: fornecedor.nome,
        cnpj: fornecedor.cnpj || "",
        email: fornecedor.email || "",
        telefone: fornecedor.telefone || "",
        endereco: fornecedor.endereco || "",
        contato: fornecedor.contato || "",
        observacao: fornecedor.observacao || "",
        ativo: fornecedor.ativo !== false,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error("Nome do fornecedor é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        nome: formData.nome.trim(),
        cnpj: formData.cnpj.trim() || null,
        email: formData.email.trim() || null,
        telefone: formData.telefone.trim() || null,
        endereco: formData.endereco.trim() || null,
        contato: formData.contato.trim() || null,
        observacao: formData.observacao.trim() || null,
        ativo: formData.ativo,
      };

      if (editingFornecedor) {
        const { error } = await supabase
          .from("fornecedores")
          .update(dataToSave)
          .eq("id", editingFornecedor.id);

        if (error) throw error;
        toast.success("Fornecedor atualizado!");
      } else {
        const { error } = await supabase
          .from("fornecedores")
          .insert(dataToSave);

        if (error) throw error;
        toast.success("Fornecedor cadastrado!");
      }

      setDialogOpen(false);
      resetForm();
      fetchFornecedores();
      onFornecedorChange?.();
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar fornecedor: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingFornecedor) return;

    try {
      const { error } = await supabase
        .from("fornecedores")
        .delete()
        .eq("id", deletingFornecedor.id);

      if (error) throw error;

      toast.success("Fornecedor excluído!");
      setDeleteDialogOpen(false);
      setDeletingFornecedor(null);
      fetchFornecedores();
      onFornecedorChange?.();
    } catch (error: any) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  const toggleAtivo = async (fornecedor: Fornecedor) => {
    try {
      const { error } = await supabase
        .from("fornecedores")
        .update({ ativo: !fornecedor.ativo })
        .eq("id", fornecedor.id);

      if (error) throw error;

      toast.success(fornecedor.ativo ? "Fornecedor desativado" : "Fornecedor ativado");
      fetchFornecedores();
    } catch (error: any) {
      toast.error("Erro ao atualizar status");
    }
  };

  const filteredFornecedores = fornecedores.filter(
    (f) => searchAcrossFields([f.nome, f.cnpj, f.email, f.contato, f.telefone], searchTerm)
  );

  const stats = {
    total: fornecedores.length,
    ativos: fornecedores.filter((f) => f.ativo !== false).length,
    inativos: fornecedores.filter((f) => f.ativo === false).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Fornecedores Cadastrados
          </h3>
          <p className="text-sm text-muted-foreground">
            Gerencie os fornecedores para cotações e pedidos de compra
          </p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Fornecedor
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.ativos}</p>
                <p className="text-xs text-muted-foreground">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <XCircle className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inativos}</p>
                <p className="text-xs text-muted-foreground">Inativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, CNPJ ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFornecedores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      {searchTerm ? "Nenhum fornecedor encontrado" : "Nenhum fornecedor cadastrado"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFornecedores.map((fornecedor) => (
                    <TableRow key={fornecedor.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{fornecedor.nome}</p>
                          {fornecedor.email && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {fornecedor.email}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {fornecedor.cnpj || "-"}
                      </TableCell>
                      <TableCell>{fornecedor.contato || "-"}</TableCell>
                      <TableCell>
                        {fornecedor.telefone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {fornecedor.telefone}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={fornecedor.ativo !== false ? "default" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => toggleAtivo(fornecedor)}
                        >
                          {fornecedor.ativo !== false ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDialog(fornecedor)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => {
                              setDeletingFornecedor(fornecedor);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingFornecedor ? "Editar Fornecedor" : "Novo Fornecedor"}
            </DialogTitle>
            <DialogDescription>
              {editingFornecedor
                ? "Atualize as informações do fornecedor"
                : "Preencha os dados do novo fornecedor"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  placeholder="Nome do fornecedor"
                />
              </div>

              <div>
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) =>
                    setFormData({ ...formData, cnpj: e.target.value })
                  }
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) =>
                    setFormData({ ...formData, telefone: e.target.value })
                  }
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="email@fornecedor.com"
                />
              </div>

              <div>
                <Label htmlFor="contato">Pessoa de Contato</Label>
                <Input
                  id="contato"
                  value={formData.contato}
                  onChange={(e) =>
                    setFormData({ ...formData, contato: e.target.value })
                  }
                  placeholder="Nome do contato"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) =>
                    setFormData({ ...formData, endereco: e.target.value })
                  }
                  placeholder="Endereço completo"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="observacao">Observações</Label>
                <Textarea
                  id="observacao"
                  value={formData.observacao}
                  onChange={(e) =>
                    setFormData({ ...formData, observacao: e.target.value })
                  }
                  placeholder="Observações sobre o fornecedor..."
                  rows={2}
                />
              </div>

              <div className="col-span-2 flex items-center justify-between">
                <Label htmlFor="ativo">Fornecedor Ativo</Label>
                <Switch
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, ativo: checked })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              {editingFornecedor ? "Atualizar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fornecedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deletingFornecedor?.nome}"? Esta
              ação não pode ser desfeita e pode afetar pedidos e cotações
              relacionados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
