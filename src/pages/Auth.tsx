import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Leaf, Apple, Carrot, Mail, Lock, User, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/logo-costa.png';
import { useEffect } from 'react';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email ou usuário é obrigatório'),
  password: z.string().min(4, 'Senha deve ter pelo menos 4 caracteres'),
});

const signupSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
});

interface LoginConfig {
  titulo: string;
  subtitulo: string;
  logo_url: string | null;
  cor_fundo: string;
  permitir_cadastro: boolean;
  mostrar_icones: boolean;
}

const DEFAULT_CONFIG: LoginConfig = {
  titulo: 'Entrar',
  subtitulo: 'Acesse sua conta para continuar',
  logo_url: null,
  cor_fundo: '#16a34a',
  permitir_cadastro: false,
  mostrar_icones: true,
};

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<LoginConfig>(DEFAULT_CONFIG);
  const [formData, setFormData] = useState({
    identifier: '', // email ou username
    password: '',
    nome: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes_login')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setConfig({
          titulo: data.titulo,
          subtitulo: data.subtitulo,
          logo_url: data.logo_url,
          cor_fundo: data.cor_fundo || '#16a34a',
          permitir_cadastro: data.permitir_cadastro ?? false,
          mostrar_icones: data.mostrar_icones ?? true,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
  };

  // Verificar se é email ou username e resolver email real
  const resolveEmail = async (identifier: string): Promise<string | null> => {
    // Se parecer email, retornar direto
    if (identifier.includes('@')) {
      return identifier;
    }

    // Buscar por username
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('username', identifier)
      .maybeSingle();

    if (error || !data) {
      // Se não achar por username, tenta como email interno
      return `${identifier}@interno.local`;
    }

    return data.email;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      if (isLogin) {
        const validation = loginSchema.safeParse(formData);
        if (!validation.success) {
          const fieldErrors: Record<string, string> = {};
          validation.error.errors.forEach(err => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        // Resolver email a partir do identificador
        const email = await resolveEmail(formData.identifier);
        
        if (!email) {
          toast({
            title: 'Erro ao entrar',
            description: 'Usuário não encontrado',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        const { error } = await signIn(email, formData.password);
        if (error) {
          toast({
            title: 'Erro ao entrar',
            description: error.message === 'Invalid login credentials' 
              ? 'Email/usuário ou senha incorretos' 
              : error.message,
            variant: 'destructive',
          });
        } else {
          navigate('/');
        }
      } else {
        const validation = signupSchema.safeParse({
          email: formData.identifier,
          password: formData.password,
          nome: formData.nome,
          confirmPassword: formData.confirmPassword,
        });
        if (!validation.success) {
          const fieldErrors: Record<string, string> = {};
          validation.error.errors.forEach(err => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        const { error } = await signUp(formData.identifier, formData.password, formData.nome);
        if (error) {
          toast({
            title: 'Erro ao cadastrar',
            description: error.message.includes('already registered')
              ? 'Este email já está cadastrado'
              : error.message,
            variant: 'destructive',
          });
        } else {
          toast({ title: 'Conta criada!', description: 'Você já pode fazer login.' });
          navigate('/');
        }
      }
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const logoToUse = config.logo_url || logo;

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${config.cor_fundo}, ${config.cor_fundo}cc)` }}
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-center">
          <div className="flex items-center gap-3 mb-6 animate-fade-in">
            <img 
              src={logoToUse} 
              alt="Costa" 
              className="h-40 w-40 object-contain drop-shadow-2xl"
            />
          </div>
          
          <h1 className="text-4xl xl:text-5xl font-bold text-primary-foreground mb-4 animate-slide-up">
            Costa
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-md mb-12 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Sistema de gestão completo para seu negócio
          </p>
          
          {config.mostrar_icones && (
            <div className="flex gap-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-xl bg-primary-foreground/20 backdrop-blur flex items-center justify-center mb-2">
                  <Carrot className="w-7 h-7 text-primary-foreground" />
                </div>
                <span className="text-primary-foreground/70 text-sm">Legumes</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-xl bg-primary-foreground/20 backdrop-blur flex items-center justify-center mb-2">
                  <Leaf className="w-7 h-7 text-primary-foreground" />
                </div>
                <span className="text-primary-foreground/70 text-sm">Verduras</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-xl bg-primary-foreground/20 backdrop-blur flex items-center justify-center mb-2">
                  <Apple className="w-7 h-7 text-primary-foreground" />
                </div>
                <span className="text-primary-foreground/70 text-sm">Frutas</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md border-0 shadow-soft animate-scale-in">
          <CardHeader className="text-center pb-2">
            <div className="lg:hidden flex justify-center mb-4">
              <img 
                src={logoToUse} 
                alt="Costa" 
                className="h-20 w-auto rounded-full"
              />
            </div>
            <CardTitle className="text-2xl font-bold">
              {isLogin ? config.titulo : 'Criar Conta'}
            </CardTitle>
            <CardDescription>
              {isLogin 
                ? config.subtitulo 
                : 'Preencha os dados para se cadastrar'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="nome" className="text-sm font-medium">Nome</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="nome"
                      type="text"
                      placeholder="Seu nome completo"
                      value={formData.nome}
                      onChange={e => setFormData({ ...formData, nome: e.target.value })}
                      className="pl-10 h-12"
                    />
                  </div>
                  {errors.nome && <p className="text-xs text-destructive">{errors.nome}</p>}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-sm font-medium">
                  {isLogin ? 'Email ou Usuário' : 'Email'}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="identifier"
                    type={isLogin ? 'text' : 'email'}
                    placeholder={isLogin ? 'Email ou nome de usuário' : 'seu@email.com'}
                    value={formData.identifier}
                    onChange={e => setFormData({ ...formData, identifier: e.target.value })}
                    className="pl-10 h-12"
                  />
                </div>
                {errors.identifier && <p className="text-xs text-destructive">{errors.identifier}</p>}
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10 h-12"
                  />
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>
              
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirmar Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="pl-10 h-12"
                    />
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
                </div>
              )}
              
              <Button 
                type="submit" 
                size="lg" 
                className="w-full mt-6" 
                disabled={loading}
                style={{ backgroundColor: config.cor_fundo }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Aguarde...</span>
                  </>
                ) : (
                  isLogin ? 'Entrar' : 'Criar Conta'
                )}
              </Button>
            </form>
            
            {config.permitir_cadastro && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setErrors({});
                  }}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {isLogin 
                    ? 'Não tem conta? Cadastre-se' 
                    : 'Já tem conta? Faça login'}
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;