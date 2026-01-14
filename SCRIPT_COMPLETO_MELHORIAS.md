# 📋 SCRIPT COMPLETO DE MELHORIAS DO SISTEMA

> Este arquivo contém todas as melhorias implementadas, organizadas por categoria.
> Copie e adapte conforme necessário para seu projeto.

---

## 📊 1. MIGRATIONS SQL (Supabase)

### 1.1 Adicionar campos ao profiles
```sql
-- Adicionar username e foto_url à tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- Criar índice único para username
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique 
ON public.profiles(username) WHERE username IS NOT NULL;
```

### 1.2 Criar tabela de configurações de login
```sql
-- Tabela para personalização da tela de login
CREATE TABLE public.configuracoes_login (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL DEFAULT 'Sistema de Gestão',
  subtitulo TEXT NOT NULL DEFAULT 'Acesse sua conta para continuar',
  logo_url TEXT,
  cor_fundo TEXT DEFAULT '#1a1a2e',
  mostrar_icones BOOLEAN DEFAULT true,
  permitir_cadastro BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.configuracoes_login ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Configurações visíveis para todos" 
ON public.configuracoes_login FOR SELECT USING (true);

CREATE POLICY "Apenas admins podem modificar" 
ON public.configuracoes_login FOR ALL 
USING (public.is_admin(auth.uid()));

-- Inserir configuração padrão
INSERT INTO public.configuracoes_login (titulo, subtitulo) 
VALUES ('Sistema de Gestão', 'Acesse sua conta para continuar');
```

### 1.3 Criar bucket para fotos de usuários
```sql
-- Criar bucket de armazenamento
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-photos', 'user-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Política: visualização pública
CREATE POLICY "Fotos públicas" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'user-photos');

-- Política: upload apenas autenticados
CREATE POLICY "Upload autenticado" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'user-photos' AND auth.role() = 'authenticated');

-- Política: atualização própria
CREATE POLICY "Atualizar próprias fotos" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'user-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Política: deletar próprias fotos
CREATE POLICY "Deletar próprias fotos" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'user-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## 🔧 2. UTILITÁRIOS DE BUSCA

### 2.1 src/lib/searchUtils.ts
```typescript
/**
 * Função de busca por múltiplas palavras
 * Divide a query em palavras e verifica se TODAS estão presentes no texto,
 * independente da ordem.
 * 
 * @param text - O texto onde buscar
 * @param query - A query de busca (pode conter múltiplas palavras)
 * @returns true se todas as palavras da query estão presentes no texto
 */
export function searchMultiWord(text: string | null | undefined, query: string): boolean {
  if (!text || !query) return !query; // se não há query, retorna true
  
  const normalizedText = text.toLowerCase().trim();
  const searchWords = query.toLowerCase().trim().split(/\s+/).filter(word => word.length > 0);
  
  // Se não há palavras na busca, retorna true
  if (searchWords.length === 0) return true;
  
  // Verifica se TODAS as palavras estão presentes no texto
  return searchWords.every(word => normalizedText.includes(word));
}

/**
 * Busca em múltiplos campos de um objeto
 * Retorna true se a query bate em qualquer um dos campos
 * 
 * @param fields - Array de valores dos campos para buscar
 * @param query - A query de busca
 * @returns true se a query bate em pelo menos um campo
 */
export function searchInFields(fields: (string | null | undefined)[], query: string): boolean {
  if (!query || query.trim().length === 0) return true;
  
  // Para cada campo, verifica se todas as palavras da query estão presentes
  // Retorna true se pelo menos um campo contém todas as palavras
  return fields.some(field => searchMultiWord(field, query));
}

/**
 * Busca combinada em múltiplos campos de um objeto
 * Todas as palavras da query devem estar presentes em pelo menos um campo
 * 
 * @param fields - Array de valores dos campos para buscar
 * @param query - A query de busca
 * @returns true se todas as palavras estão presentes (podem estar em campos diferentes)
 */
export function searchAcrossFields(fields: (string | null | undefined)[], query: string): boolean {
  if (!query || query.trim().length === 0) return true;
  
  const searchWords = query.toLowerCase().trim().split(/\s+/).filter(word => word.length > 0);
  
  if (searchWords.length === 0) return true;
  
  // Combina todos os campos em um único texto para busca
  const combinedText = fields
    .filter(Boolean)
    .map(f => f!.toLowerCase())
    .join(' ');
  
  // Verifica se TODAS as palavras estão presentes no texto combinado
  return searchWords.every(word => combinedText.includes(word));
}
```

### 2.2 Como usar a busca em componentes
```typescript
import { searchAcrossFields } from '@/lib/searchUtils';

// Exemplo de uso em filtro de produtos
const filteredProducts = products.filter(product => 
  searchAcrossFields([
    product.nome,
    product.codigo,
    product.marca,
    product.grupo
  ], searchQuery)
);

// Exemplo com estoque
const filteredEstoque = estoque.filter(item =>
  searchAcrossFields([
    item.nome,
    item.codigo,
    item.codigo_barras,
    item.marca,
    item.grupo,
    item.subgrupo
  ], searchTerm)
);
```

---

## 📸 3. UPLOAD DE FOTO DE USUÁRIO

### 3.1 src/components/users/UserPhotoUpload.tsx
```typescript
import { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserPhotoUploadProps {
  userId: string;
  currentPhotoUrl?: string | null;
  userName: string;
  onPhotoUpdated: (url: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

export function UserPhotoUpload({ 
  userId, 
  currentPhotoUrl, 
  userName, 
  onPhotoUpdated,
  size = 'md' 
}: UserPhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'h-16 w-16',
    md: 'h-24 w-24',
    lg: 'h-32 w-32'
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    // Mostrar preview
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target?.result as string);
    reader.readAsDataURL(file);

    // Fazer upload
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('user-photos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user-photos')
        .getPublicUrl(fileName);

      // Atualizar profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ foto_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      onPhotoUpdated(publicUrl);
      toast.success('Foto atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload da foto');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    setIsUploading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ foto_url: null })
        .eq('id', userId);

      if (error) throw error;

      setPreviewUrl(null);
      onPhotoUpdated('');
      toast.success('Foto removida com sucesso!');
    } catch (error) {
      console.error('Erro ao remover foto:', error);
      toast.error('Erro ao remover foto');
    } finally {
      setIsUploading(false);
    }
  };

  const displayUrl = previewUrl || currentPhotoUrl;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        <Avatar className={`${sizeClasses[size]} border-2 border-border`}>
          <AvatarImage src={displayUrl || undefined} alt={userName} />
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>
        
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors"
        >
          <Camera className="h-4 w-4" />
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Upload className="h-4 w-4 mr-1" />
          {displayUrl ? 'Trocar' : 'Enviar'}
        </Button>
        
        {displayUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemovePhoto}
            disabled={isUploading}
          >
            <X className="h-4 w-4 mr-1" />
            Remover
          </Button>
        )}
      </div>
    </div>
  );
}
```

---

## ⚙️ 4. CONFIGURAÇÕES DA TELA DE LOGIN

### 4.1 src/components/sistema/LoginConfigManager.tsx
```typescript
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Upload, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LoginConfig {
  id: string;
  titulo: string;
  subtitulo: string;
  logo_url: string | null;
  cor_fundo: string | null;
  mostrar_icones: boolean | null;
  permitir_cadastro: boolean | null;
}

export function LoginConfigManager() {
  const [config, setConfig] = useState<LoginConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes_login')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setConfig(data);
      } else {
        // Criar configuração padrão se não existir
        const { data: newConfig, error: insertError } = await supabase
          .from('configuracoes_login')
          .insert({
            titulo: 'Sistema de Gestão',
            subtitulo: 'Acesse sua conta para continuar'
          })
          .select()
          .single();
        
        if (insertError) throw insertError;
        setConfig(newConfig);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('configuracoes_login')
        .update({
          titulo: config.titulo,
          subtitulo: config.subtitulo,
          logo_url: config.logo_url,
          cor_fundo: config.cor_fundo,
          mostrar_icones: config.mostrar_icones,
          permitir_cadastro: config.permitir_cadastro
        })
        .eq('id', config.id);

      if (error) throw error;
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !config) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `login-logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      setConfig({ ...config, logo_url: publicUrl });
      toast.success('Logo enviado com sucesso!');
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao enviar logo');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!config) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Configurações da Tela de Login
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              value={config.titulo}
              onChange={(e) => setConfig({ ...config, titulo: e.target.value })}
              placeholder="Título da página de login"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Subtítulo</Label>
            <Input
              value={config.subtitulo}
              onChange={(e) => setConfig({ ...config, subtitulo: e.target.value })}
              placeholder="Mensagem de boas-vindas"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Cor de Fundo</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={config.cor_fundo || '#1a1a2e'}
                onChange={(e) => setConfig({ ...config, cor_fundo: e.target.value })}
                className="w-16 h-10 p-1 cursor-pointer"
              />
              <Input
                value={config.cor_fundo || '#1a1a2e'}
                onChange={(e) => setConfig({ ...config, cor_fundo: e.target.value })}
                placeholder="#1a1a2e"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploading}
                className="flex-1"
              />
              {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            {config.logo_url && (
              <img 
                src={config.logo_url} 
                alt="Logo" 
                className="h-12 mt-2 object-contain"
              />
            )}
          </div>
        </div>

        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <Switch
              checked={config.mostrar_icones ?? true}
              onCheckedChange={(checked) => setConfig({ ...config, mostrar_icones: checked })}
            />
            <Label>Mostrar ícones decorativos</Label>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              checked={config.permitir_cadastro ?? true}
              onCheckedChange={(checked) => setConfig({ ...config, permitir_cadastro: checked })}
            />
            <Label>Permitir auto-cadastro</Label>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Configurações
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

## 🔐 5. LOGIN COM EMAIL OU USERNAME NUMÉRICO

### 5.1 Trecho para Auth.tsx (adicionar no formulário de login)
```typescript
// Estado para o campo de login (email ou username)
const [loginField, setLoginField] = useState('');
const [password, setPassword] = useState('');

// Função para detectar se é username numérico
const isNumericUsername = (value: string) => /^\d+$/.test(value);

// Função de login adaptada
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    let emailToUse = loginField;

    // Se for username numérico, buscar o email correspondente
    if (isNumericUsername(loginField)) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', loginField)
        .single();

      if (profileError || !profile) {
        toast.error('Usuário não encontrado');
        setLoading(false);
        return;
      }
      emailToUse = profile.email;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password: password
    });

    if (error) throw error;
    toast.success('Login realizado com sucesso!');
  } catch (error: any) {
    toast.error(error.message || 'Erro ao fazer login');
  } finally {
    setLoading(false);
  }
};
```

### 5.2 Input de login no formulário
```tsx
<div className="space-y-2">
  <Label htmlFor="login">Email ou Código de Acesso</Label>
  <div className="relative">
    <Input
      id="login"
      type="text"
      placeholder="email@exemplo.com ou 12345"
      value={loginField}
      onChange={(e) => setLoginField(e.target.value)}
      className="pl-10"
      required
    />
    {isNumericUsername(loginField) ? (
      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    ) : (
      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    )}
  </div>
  {isNumericUsername(loginField) && (
    <p className="text-xs text-muted-foreground">
      Código numérico detectado
    </p>
  )}
</div>
```

---

## 👤 6. CRIAR USUÁRIO COM USERNAME

### 6.1 Edge Function: supabase/functions/create-user/index.ts
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verificar se o usuário que faz a requisição é admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !requestingUser) {
      throw new Error('Invalid token')
    }

    // Verificar se é admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .single()

    if (roleError || roleData?.role !== 'administrador') {
      throw new Error('Apenas administradores podem criar usuários')
    }

    const { email, password, nome, role, username } = await req.json()

    if (!email || !password || !nome || !role) {
      throw new Error('Email, senha, nome e perfil são obrigatórios')
    }

    // Criar o usuário
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome, role }
    })

    if (createError) {
      throw new Error(createError.message)
    }

    // Se tiver username, atualizar o profile
    if (username && userData.user) {
      await supabaseAdmin
        .from('profiles')
        .update({ username })
        .eq('id', userData.user.id)
    }

    return new Response(
      JSON.stringify({ success: true, user: userData.user }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### 6.2 Trecho para CreateUserDialog.tsx
```typescript
// Adicionar campo de username no formulário
const [username, setUsername] = useState('');

// No submit, incluir username
const handleSubmit = async () => {
  const { data: sessionData } = await supabase.auth.getSession();
  
  const response = await supabase.functions.invoke('create-user', {
    body: { 
      email, 
      password, 
      nome, 
      role,
      username: username || undefined // username numérico opcional
    },
    headers: {
      Authorization: `Bearer ${sessionData.session?.access_token}`
    }
  });

  if (response.error) throw response.error;
  toast.success('Usuário criado com sucesso!');
};

// Campo no formulário
<div className="space-y-2">
  <Label>Código de Acesso (opcional)</Label>
  <Input
    type="text"
    placeholder="Ex: 12345"
    value={username}
    onChange={(e) => {
      // Permitir apenas números
      const value = e.target.value.replace(/\D/g, '');
      setUsername(value);
    }}
    maxLength={10}
  />
  <p className="text-xs text-muted-foreground">
    Código numérico para login rápido (opcional)
  </p>
</div>
```

---

## 📄 7. PDF OTIMIZADO (CABEÇALHO COMPACTO)

### 7.1 Função de cabeçalho compacto para jsPDF
```typescript
import jsPDF from 'jspdf';

const drawCompactHeader = (doc: jsPDF, title: string, dateRange: string) => {
  const pageWidth = doc.internal.pageSize.width;
  
  // Fundo do cabeçalho
  doc.setFillColor(34, 139, 34); // Verde
  doc.rect(0, 0, pageWidth, 20, 'F');
  
  // Título
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 10, 13);
  
  // Data
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(dateRange, pageWidth - 10, 13, { align: 'right' });
  
  return 25; // Retorna posição Y para começar o conteúdo
};
```

### 7.2 Exemplo de PDF com itens
```typescript
const generatePDF = (items: any[], title: string) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  let yPos = drawCompactHeader(doc, title, 'Janeiro 2025');
  
  // Configuração de fonte para itens
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  
  items.forEach((item, index) => {
    // Verificar se precisa nova página
    if (yPos > pageHeight - 20) {
      doc.addPage();
      yPos = drawCompactHeader(doc, title, 'Janeiro 2025');
    }
    
    // Desenhar item
    doc.setFont('helvetica', 'bold');
    doc.text(item.nome, 10, yPos);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`R$ ${item.preco.toFixed(2)}`, pageWidth - 10, yPos, { align: 'right' });
    
    yPos += 8;
  });
  
  return doc;
};
```

---

## 🏷️ 8. RENOMEAR "HORTI" PARA "HORTIFRUTI"

### 8.1 Buscar e substituir em todo o projeto
```
Buscar: "HORTI"
Substituir: "HORTIFRUTI"

Buscar: "Horti"  
Substituir: "Hortifruti"

Buscar: "horti"
Substituir: "hortifruti"
```

### 8.2 Arquivos típicos a verificar
- Componentes de menu/navegação
- Títulos de páginas
- Labels de botões
- Textos em PDFs
- Nomes de rotas

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Executar migrations SQL no Supabase
- [ ] Criar arquivo `src/lib/searchUtils.ts`
- [ ] Implementar `UserPhotoUpload` component
- [ ] Implementar `LoginConfigManager` component
- [ ] Adaptar página de Auth para login dual
- [ ] Criar edge function `create-user`
- [ ] Adaptar `CreateUserDialog` para username
- [ ] Atualizar PDFs com cabeçalho compacto
- [ ] Renomear "HORTI" para "HORTIFRUTI"
- [ ] Aplicar busca multi-palavra nos filtros

---

## 📝 NOTAS IMPORTANTES

1. **RLS Policies**: Todas as tabelas devem ter Row Level Security habilitado
2. **Storage Buckets**: Criar buckets como públicos apenas se necessário
3. **Edge Functions**: Sempre validar autenticação e permissões
4. **Busca**: A função `searchAcrossFields` é a mais versátil
5. **PDFs**: Usar fonte 11px para itens e 14-18px para títulos

---

*Script gerado em: Janeiro 2025*
*Compatível com: React + Supabase + Tailwind*
