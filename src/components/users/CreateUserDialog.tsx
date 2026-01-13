import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Loader2, ShieldCheck, Shield, Eye } from 'lucide-react';

type UserRole = 'administrador' | 'operador' | 'visualizador';

interface CreateUserDialogProps {
  onUserCreated: () => void;
}

const CreateUserDialog = ({ onUserCreated }: CreateUserDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    role: 'operador' as UserRole,
  });

  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.email || !formData.password) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }

    if (formData.password.length < 6) {
      toast({ title: 'A senha deve ter pelo menos 6 caracteres', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      const response = await supabase.functions.invoke('create-user', {
        body: {
          email: formData.email,
          password: formData.password,
          nome: formData.nome,
          role: formData.role,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        // Translate common errors to Portuguese
        let errorMessage = response.data.error;
        if (errorMessage.includes('already been registered') || errorMessage.includes('email_exists')) {
          errorMessage = 'Este email já está cadastrado no sistema';
        }
        throw new Error(errorMessage);
      }

      toast({ title: 'Usuário criado com sucesso!' });
      setFormData({ nome: '', email: '', password: '', role: 'operador' });
      setOpen(false);
      onUserCreated();
    } catch (error: any) {
      let errorMessage = error.message || 'Erro desconhecido';
      if (errorMessage.includes('already been registered') || errorMessage.includes('email_exists')) {
        errorMessage = 'Este email já está cadastrado no sistema';
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

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@exemplo.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              placeholder="Mínimo 6 caracteres"
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
