import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Settings, Loader2, Leaf, Package, Droplets, AlertTriangle, BarChart3, LayoutDashboard } from 'lucide-react';

type AppModule = 'legumes' | 'polpas' | 'coca' | 'perdas' | 'produtos' | 'relatorios' | 'dashboard';

interface UserPermissionsDialogProps {
  userId: string;
  userName: string;
  userRole: 'administrador' | 'operador' | 'visualizador';
  onPermissionsUpdated?: () => void;
}

const ALL_MODULES: { id: AppModule; label: string; description: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', description: 'Visão geral do sistema', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'legumes', label: 'Legumes', description: 'Conferência de legumes', icon: <Leaf className="w-4 h-4" /> },
  { id: 'polpas', label: 'Polpas', description: 'Conferência de polpas', icon: <Droplets className="w-4 h-4" /> },
  { id: 'coca', label: 'Coca-Cola', description: 'Conferência Coca-Cola', icon: <Package className="w-4 h-4" /> },
  { id: 'perdas', label: 'Perdas', description: 'Lançamento de perdas', icon: <AlertTriangle className="w-4 h-4" /> },
  { id: 'produtos', label: 'Produtos', description: 'Cadastro de produtos', icon: <Package className="w-4 h-4" /> },
  { id: 'relatorios', label: 'Relatórios', description: 'Relatórios do sistema', icon: <BarChart3 className="w-4 h-4" /> },
];

const UserPermissionsDialog = ({ userId, userName, userRole, onPermissionsUpdated }: UserPermissionsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedModules, setSelectedModules] = useState<AppModule[]>([]);
  const { toast } = useToast();

  // Administradores têm acesso total
  const isAdmin = userRole === 'administrador';

  useEffect(() => {
    if (open && !isAdmin) {
      fetchPermissions();
    }
  }, [open, userId, isAdmin]);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_module_permissions')
        .select('module')
        .eq('user_id', userId);

      if (error) throw error;

      setSelectedModules((data?.map(p => p.module) as AppModule[]) || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast({ title: 'Erro ao carregar permissões', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleModule = (moduleId: AppModule) => {
    setSelectedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(m => m !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleSelectAll = () => {
    setSelectedModules(ALL_MODULES.map(m => m.id));
  };

  const handleDeselectAll = () => {
    setSelectedModules([]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Remove todas as permissões existentes
      const { error: deleteError } = await supabase
        .from('user_module_permissions')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Adiciona as novas permissões
      if (selectedModules.length > 0) {
        const { error: insertError } = await supabase
          .from('user_module_permissions')
          .insert(
            selectedModules.map(module => ({
              user_id: userId,
              module: module,
            }))
          );

        if (insertError) throw insertError;
      }

      toast({ title: 'Permissões atualizadas com sucesso!' });
      onPermissionsUpdated?.();
      setOpen(false);
    } catch (error: any) {
      console.error('Error saving permissions:', error);
      toast({ 
        title: 'Erro ao salvar permissões', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Permissões</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">
            Permissões de {userName}
          </DialogTitle>
        </DialogHeader>

        {isAdmin ? (
          <div className="py-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
              <Settings className="w-6 h-6 text-primary" />
            </div>
            <p className="text-muted-foreground">
              Administradores têm acesso total a todos os módulos do sistema.
            </p>
          </div>
        ) : loading ? (
          <div className="py-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {selectedModules.length} de {ALL_MODULES.length} módulos selecionados
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSelectAll}
                  className="text-xs h-7 px-2"
                >
                  Todos
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleDeselectAll}
                  className="text-xs h-7 px-2"
                >
                  Nenhum
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {ALL_MODULES.map(module => (
                <div
                  key={module.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    selectedModules.includes(module.id)
                      ? 'bg-primary/5 border-primary/30'
                      : 'bg-muted/30 border-border hover:bg-muted/50'
                  }`}
                  onClick={() => handleToggleModule(module.id)}
                >
                  <Checkbox
                    id={module.id}
                    checked={selectedModules.includes(module.id)}
                    onCheckedChange={() => handleToggleModule(module.id)}
                  />
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    selectedModules.includes(module.id) ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    {module.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Label htmlFor={module.id} className="font-medium cursor-pointer">
                      {module.label}
                    </Label>
                    <p className="text-xs text-muted-foreground truncate">
                      {module.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                className="flex-1 gap-2"
                onClick={handleSave}
                disabled={saving}
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserPermissionsDialog;
