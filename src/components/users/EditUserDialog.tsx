import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Loader2 } from 'lucide-react';

interface EditUserDialogProps {
  userId: string;
  currentName: string;
  currentUsername: string | null;
  currentEmail: string;
  onUserUpdated: () => void;
}

const EditUserDialog = ({ userId, currentName, currentUsername, currentEmail, onUserUpdated }: EditUserDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: currentName,
    username: currentUsername || '',
  });

  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          nome: formData.nome.trim(),
          username: formData.username.trim() || null
        })
        .eq('id', userId);

      if (error) throw error;

      toast({ title: 'Usuário atualizado com sucesso!' });
      setOpen(false);
      onUserUpdated();
    } catch (error: any) {
      toast({ 
        title: 'Erro ao atualizar usuário', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (isOpen) {
        setFormData({
          nome: currentName,
          username: currentUsername || '',
        });
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Editar usuário">
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" />
            Editar Usuário
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-nome">Nome Completo</Label>
            <Input
              id="edit-nome"
              value={formData.nome}
              onChange={e => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Nome do usuário"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-username">Usuário (opcional)</Label>
            <Input
              id="edit-username"
              value={formData.username}
              onChange={e => setFormData({ ...formData, username: e.target.value })}
              placeholder="Ex: joao.silva ou 001"
            />
            <p className="text-xs text-muted-foreground">
              Usuário alternativo para login
            </p>
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={currentEmail}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              O email não pode ser alterado
            </p>
          </div>

          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              'Salvar Alterações'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditUserDialog;
