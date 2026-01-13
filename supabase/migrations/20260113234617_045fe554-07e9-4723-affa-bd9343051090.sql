
-- Criar tabela sessoes_fracionamento
CREATE TABLE public.sessoes_fracionamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_sessao DATE NOT NULL DEFAULT CURRENT_DATE,
  usuario_id UUID NOT NULL,
  status TEXT DEFAULT 'em_andamento',
  observacao TEXT,
  criado_em TIMESTAMPTZ DEFAULT now(),
  finalizado_em TIMESTAMPTZ
);

-- Criar tabela itens_fracionamento
CREATE TABLE public.itens_fracionamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id UUID REFERENCES public.sessoes_fracionamento(id) ON DELETE CASCADE,
  config_id UUID REFERENCES public.configuracoes_fracionamento(id),
  preco_caixa NUMERIC NOT NULL,
  preco_custo_kg NUMERIC,
  preco_custo_un NUMERIC,
  preco_venda_kg NUMERIC,
  preco_venda_un NUMERIC,
  margem_aplicada NUMERIC DEFAULT 1.00,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.sessoes_fracionamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_fracionamento ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para sessoes_fracionamento
CREATE POLICY "Authenticated users can view sessoes_fracionamento"
ON public.sessoes_fracionamento FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Operators and admins can insert sessoes_fracionamento"
ON public.sessoes_fracionamento FOR INSERT
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

CREATE POLICY "Operators and admins can update sessoes_fracionamento"
ON public.sessoes_fracionamento FOR UPDATE
USING (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

CREATE POLICY "Admins can delete sessoes_fracionamento"
ON public.sessoes_fracionamento FOR DELETE
USING (has_role(auth.uid(), 'administrador'::app_role));

-- Políticas RLS para itens_fracionamento
CREATE POLICY "Authenticated users can view itens_fracionamento"
ON public.itens_fracionamento FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Operators and admins can insert itens_fracionamento"
ON public.itens_fracionamento FOR INSERT
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

CREATE POLICY "Operators and admins can update itens_fracionamento"
ON public.itens_fracionamento FOR UPDATE
USING (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

CREATE POLICY "Admins can delete itens_fracionamento"
ON public.itens_fracionamento FOR DELETE
USING (has_role(auth.uid(), 'administrador'::app_role));
