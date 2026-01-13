import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { User, Mail, Lock, Save, Loader2, KeyRound, Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const UserProfileCard = () => {
  const { user, userName, userRole, refreshUser } = useAuth();
  const [nome, setNome] = useState(userName || '');

  // Sincronizar estado local com userName do contexto
  useEffect(() => {
    setNome(userName || '');
  }, [userName]);
  const [saving, setSaving] = useState(false);
  
  // Password change dialog
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const handleSaveName = async () => {
    if (!nome.trim()) {
      toast.error('Nome não pode estar vazio');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ nome: nome.trim() })
        .eq('id', user?.id);

      if (error) throw error;

      toast.success('Nome atualizado com sucesso!');
      refreshUser?.();
    } catch (error: any) {
      toast.error('Erro ao atualizar nome: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Senha alterada com sucesso!');
      setShowPasswordDialog(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error('Erro ao alterar senha: ' + error.message);
    } finally {
      setChangingPassword(false);
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      administrador: 'Administrador',
      operador: 'Operador',
      visualizador: 'Visualizador'
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      administrador: 'bg-primary/10 text-primary',
      operador: 'bg-secondary/10 text-secondary',
      visualizador: 'bg-blue-500/10 text-blue-500'
    };
    return colors[role] || 'bg-muted text-muted-foreground';
  };

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Meu Perfil
        </CardTitle>
        <CardDescription>
          Gerencie suas informações de conta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar e Info Básica */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary-foreground">
              {userName?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-semibold">{userName}</h3>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(userRole || '')}`}>
              {getRoleLabel(userRole || '')}
            </span>
          </div>
        </div>

        {/* Formulário de Edição */}
        <div className="space-y-4 pt-4 border-t">
          <div className="space-y-2">
            <Label htmlFor="profile-nome" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Nome
            </Label>
            <div className="flex gap-2">
              <Input
                id="profile-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome"
              />
              <Button 
                onClick={handleSaveName} 
                disabled={saving || nome === userName}
                size="sm"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </Label>
            <Input
              value={user?.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              O email não pode ser alterado
            </p>
          </div>

          {/* Botão Alterar Senha */}
          <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <KeyRound className="w-4 h-4 mr-2" />
                Alterar Senha
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Alterar Senha
                </DialogTitle>
                <DialogDescription>
                  Digite sua nova senha abaixo
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Digite a nova senha"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirme a nova senha"
                  />
                </div>
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-sm text-destructive">As senhas não coincidem</p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleChangePassword} 
                  disabled={changingPassword || !newPassword || newPassword !== confirmPassword}
                >
                  {changingPassword ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserProfileCard;
