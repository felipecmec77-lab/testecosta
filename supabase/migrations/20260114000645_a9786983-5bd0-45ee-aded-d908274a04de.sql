-- Adicionar campos para login com usuário e foto de perfil
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- Criar índice para busca por username
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Atualizar políticas de storage para fotos de usuário
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-photos', 'user-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para o bucket de fotos de usuário
CREATE POLICY "Fotos de usuário são públicas"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-photos');

CREATE POLICY "Usuários podem fazer upload de suas fotos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'user-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Usuários podem atualizar suas fotos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'user-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Usuários podem deletar suas fotos"
ON storage.objects FOR DELETE
USING (bucket_id = 'user-photos' AND auth.role() = 'authenticated');

-- Tabela para configurações de login
CREATE TABLE IF NOT EXISTS public.configuracoes_login (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL DEFAULT 'Entrar',
  subtitulo TEXT NOT NULL DEFAULT 'Acesse sua conta para continuar',
  logo_url TEXT,
  cor_fundo TEXT DEFAULT '#16a34a',
  permitir_cadastro BOOLEAN DEFAULT false,
  mostrar_icones BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inserir configuração padrão
INSERT INTO public.configuracoes_login (titulo, subtitulo) 
VALUES ('Entrar', 'Acesse sua conta para continuar')
ON CONFLICT DO NOTHING;

-- RLS para configurações de login (apenas admins podem editar)
ALTER TABLE public.configuracoes_login ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Configurações de login visíveis para todos autenticados"
ON public.configuracoes_login FOR SELECT
USING (true);

CREATE POLICY "Apenas admins podem modificar configurações de login"
ON public.configuracoes_login FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));