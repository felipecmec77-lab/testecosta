import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Loader2, ShieldCheck, Shield, Eye } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type UserRole = 'administrador' | 'operador' | 'visualizador';

interface CreateUserDialogProps {
  onUserCreated: () => void;
}

const CreateUserDialog = ({ onUserCreated }: CreateUserDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authType, setAuthType] = useState<'email' | 'username'>('email');
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    username: '',
    password: '',
    role: 'operador' as UserRole,
  });

  const { toast } = useToast();

  // Gerar email interno para usuários com username
  const generateInternalEmail = (username: string) => {
    return `${username}@interno.local`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.password) {
      toast({ title: 'Preencha nome e senha', variant: 'destructive' });
      return;
    }

    if (authType === 'email' && !formData.email) {
      toast({ title: 'Preencha o email', variant: 'destructive' });
      return;
    }

    if (authType === 'username' && !formData.username) {
      toast({ title: 'Preencha o usuário', variant: 'destructive' });
      return;
    }

    if (formData.password.length < 4) {
      toast({ title: 'A senha deve ter pelo menos 4 caracteres', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      // Determinar email a usar
      const emailToUse = authType === 'email' 
        ? formData.email 
        : generateInternalEmail(formData.username);

      const response = await supabase.functions.invoke('create-user', {
        body: {
          email: emailToUse,
          password: formData.password,
          nome: formData.nome,
          role: formData.role,
          username: authType === 'username' ? formData.username : null,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        let errorMessage = response.data.error;
        if (errorMessage.includes('already been registered') || 
            errorMessage.includes('email_exists') ||
            errorMessage.includes('already registered')) {
          errorMessage = authType === 'email' 
            ? 'Este email já está cadastrado no sistema' 
            : `O usuário "${formData.username}" já está cadastrado no sistema`;
        }
        throw new Error(errorMessage);
      }

      // Se for username, atualizar o profile com o username
      if (authType === 'username' && response.data?.user?.id) {
        await supabase
          .from('profiles')
          .update({ username: formData.username })
          .eq('id', response.data.user.id);
      }

      toast({ title: 'Usuário criado com sucesso!' });
      setFormData({ nome: '', email: '', username: '', password: '', role: 'operador' });
      setOpen(false);
      onUserCreated();
    } catch (error: any) {
      let errorMessage = error.message || 'Erro desconhecido';
      if (errorMessage.includes('already been registered') || 
          errorMessage.includes('email_exists') ||
          errorMessage.includes('already registered')) {
        errorMessage = authType === 'email' 
          ? 'Este email já está cadastrado no sistema' 
          : `O usuário "${formData.username}" já está cadastrado no sistema`;
      }
      toast({ 
        title: 'Erro ao criar usuário', 
        description: errorMessage, 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="hero">
          <UserPlus className="w-4 h-4 mr-2" />
          Novo Usuário
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Criar Novo Usuário
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome Completo</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={e => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Nome do usuário"
            />
          </div>

          <Tabs value={authType} onValueChange={(v) => setAuthType(v as 'email' | 'username')}>
            <TabsList className="w-full">
              <TabsTrigger value="email" className="flex-1">Com Email</TabsTrigger>
              <TabsTrigger value="username" className="flex-1">Com Usuário</TabsTrigger>
            </TabsList>
            
            <TabsContent value="email" className="space-y-2 mt-3">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </TabsContent>
            
            <TabsContent value="username" className="space-y-2 mt-3">
              <Label htmlFor="username">Usuário (pode ser numérico)</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
                placeholder="Ex: 001 ou joao.silva"
              />
              <p className="text-xs text-muted-foreground">
                Usuário poderá fazer login usando este nome ao invés de email
              </p>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="password">Senha {authType === 'username' && '(pode ser numérica)'}</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              placeholder={authType === 'username' ? 'Ex: 1234' : 'Mínimo 4 caracteres'}
            />
          </div>

          <div className="space-y-2">
            <Label>Perfil de Acesso</Label>
            <Select
              value={formData.role}
              onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="administrador">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    Administrador
                  </span>
                </SelectItem>
                <SelectItem value="operador">
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Operador
                  </span>
                </SelectItem>
                <SelectItem value="visualizador">
                  <span className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Visualizador
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Criando...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Criar Usuário
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateUserDialog;