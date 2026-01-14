import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import CreateUserDialog from '@/components/users/CreateUserDialog';
import UserPermissionsDialog from '@/components/users/UserPermissionsDialog';
import UserProfileCard from '@/components/users/UserProfileCard';
import UserPhotoUpload from '@/components/users/UserPhotoUpload';
import EditUserDialog from '@/components/users/EditUserDialog';
import { Users as UsersIcon, Loader2, Shield, ShieldCheck, Eye, Trash2, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type UserRole = 'administrador' | 'operador' | 'visualizador';

interface UserData {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  criado_em: string;
  role?: UserRole;
  foto_url?: string | null;
  username?: string | null;
}

const Users = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { user: currentUser, userRole, loading: authLoading } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('nome');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const usersWithRoles = profiles?.map(profile => ({
        ...profile,
        role: roles?.find(r => r.user_id === profile.id)?.role as UserRole || 'operador',
      })) || [];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({ title: 'Erro ao carregar usuários', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdatingId(userId);
    
    try {
      await supabase.from('user_roles').delete().eq('user_id', userId);
      
      const { error } = await supabase.from('user_roles').insert({
        user_id: userId,
        role: newRole,
      });

      if (error) throw error;

      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast({ title: 'Perfil atualizado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar perfil', description: error.message, variant: 'destructive' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleActiveToggle = async (userId: string, ativo: boolean) => {
    setUpdatingId(userId);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ativo })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => u.id === userId ? { ...u, ativo } : u));
      toast({ title: `Usuário ${ativo ? 'ativado' : 'desativado'} com sucesso!` });
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar usuário', description: error.message, variant: 'destructive' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setDeletingId(userId);
    
    try {
      const response = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      toast({ title: 'Usuário excluído com sucesso!' });
      fetchUsers();
    } catch (error: any) {
      toast({ title: 'Erro ao excluir usuário', description: error.message, variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    const icons = {
      administrador: <ShieldCheck className="w-4 h-4" />,
      operador: <Shield className="w-4 h-4" />,
      visualizador: <Eye className="w-4 h-4" />,
    };
    return icons[role];
  };

  const getRoleBadge = (role: UserRole) => {
    const colors = {
      administrador: 'bg-primary/10 text-primary',
      operador: 'bg-secondary/10 text-secondary',
      visualizador: 'bg-info/10 text-info',
    };
    return colors[role];
  };

  const getRoleDescription = (role: UserRole) => {
    const descriptions = {
      administrador: 'Acesso total',
      operador: 'Conferências e Perdas',
      visualizador: 'Dashboard e Relatórios',
    };
    return descriptions[role];
  };

  if (loading || authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Usuários</h1>
            <p className="text-muted-foreground mt-1">Gerencie os usuários do sistema</p>
          </div>
          {userRole === 'administrador' && <CreateUserDialog onUserCreated={fetchUsers} />}
        </div>

        {/* Current User Profile Card */}
        <UserProfileCard />

        {/* Admin Only Section */}
        {userRole !== 'administrador' ? (
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Acesso Restrito</h3>
              <p className="text-muted-foreground max-w-md">
                Apenas administradores podem visualizar e gerenciar todos os usuários do sistema.
              </p>
            </div>
          </Card>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Administradores</p>
                    <p className="text-xl font-bold">{users.filter(u => u.role === 'administrador').length}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Operadores</p>
                    <p className="text-xl font-bold">{users.filter(u => u.role === 'operador').length}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-info" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Visualizadores</p>
                    <p className="text-xl font-bold">{users.filter(u => u.role === 'visualizador').length}</p>
                  </div>
                </div>
              </Card>
            </div>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead className="text-center">Ativo</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <UsersIcon className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
                        <p className="text-muted-foreground">Nenhum usuário encontrado</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map(user => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="relative group">
                              {user.foto_url ? (
                                <img 
                                  src={user.foto_url} 
                                  alt={user.nome}
                                  className="w-9 h-9 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-sm font-semibold text-primary">
                                    {user.nome.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              {userRole === 'administrador' && (
                                <div className="absolute -bottom-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <UserPhotoUpload
                                    userId={user.id}
                                    currentPhotoUrl={user.foto_url || null}
                                    userName={user.nome}
                                    onPhotoUpdated={fetchUsers}
                                  />
                                </div>
                              )}
                            </div>
                            <div>
                              <span className="font-medium">{user.nome}</span>
                              {user.username && (
                                <p className="text-xs text-muted-foreground">@{user.username}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                          {user.id === currentUser?.id ? (
                            <div>
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium capitalize ${getRoleBadge(user.role || 'operador')}`}>
                                {getRoleIcon(user.role || 'operador')}
                                {user.role}
                              </span>
                              <p className="text-xs text-muted-foreground mt-1">{getRoleDescription(user.role || 'operador')}</p>
                            </div>
                          ) : (
                            <div>
                              <Select
                                value={user.role}
                                onValueChange={(value: UserRole) => handleRoleChange(user.id, value)}
                                disabled={updatingId === user.id}
                              >
                                <SelectTrigger className="w-40">
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
                              <p className="text-xs text-muted-foreground mt-1">{getRoleDescription(user.role || 'operador')}</p>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(user.criado_em), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={user.ativo}
                            onCheckedChange={(checked) => handleActiveToggle(user.id, checked)}
                            disabled={user.id === currentUser?.id || updatingId === user.id}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {user.id !== currentUser?.id && (
                              <EditUserDialog
                                userId={user.id}
                                currentName={user.nome}
                                currentUsername={user.username || null}
                                currentEmail={user.email}
                                onUserUpdated={fetchUsers}
                              />
                            )}
                            {user.id !== currentUser?.id && (
                              <UserPermissionsDialog
                                userId={user.id}
                                userName={user.nome}
                                userRole={user.role || 'operador'}
                              />
                            )}
                            {user.id !== currentUser?.id && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    disabled={deletingId === user.id}
                                    title="Excluir usuário"
                                  >
                                    {deletingId === user.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação irá excluir permanentemente o usuário "{user.nome}". Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDeleteUser(user.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Users;