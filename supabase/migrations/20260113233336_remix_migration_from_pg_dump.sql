CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_module; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_module AS ENUM (
    'legumes',
    'polpas',
    'coca',
    'perdas',
    'produtos',
    'usuarios',
    'relatorios',
    'dashboard'
);


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'administrador',
    'operador',
    'visualizador'
);


--
-- Name: categoria_produto; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.categoria_produto AS ENUM (
    'verdura',
    'legume',
    'fruta',
    'outros'
);


--
-- Name: convite_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.convite_status AS ENUM (
    'pendente',
    'visualizado',
    'respondido',
    'expirado'
);


--
-- Name: cotacao_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cotacao_status AS ENUM (
    'pendente',
    'aprovada',
    'rejeitada',
    'cancelada',
    'em_analise',
    'finalizada'
);


--
-- Name: motivo_perda; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.motivo_perda AS ENUM (
    'murcha',
    'vencimento',
    'avaria',
    'transporte',
    'outros'
);


--
-- Name: motivo_perda_geral; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.motivo_perda_geral AS ENUM (
    'vencido',
    'danificado',
    'quebrado',
    'avaria',
    'outros'
);


--
-- Name: ordem_compra_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ordem_compra_status AS ENUM (
    'rascunho',
    'enviada',
    'confirmada',
    'entregue',
    'cancelada'
);


--
-- Name: status_lancamento; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.status_lancamento AS ENUM (
    'normal',
    'cancelado'
);


--
-- Name: tipo_resolucao_geral; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_resolucao_geral AS ENUM (
    'sem_resolucao',
    'troca',
    'bonificacao',
    'desconto'
);


--
-- Name: unidade_medida; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.unidade_medida AS ENUM (
    'kg',
    'unidade'
);


--
-- Name: calcular_total_proposta(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calcular_total_proposta() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.respostas_fornecedor
  SET total_proposta = (
    SELECT COALESCE(SUM(irf.preco_unitario * ic.quantidade), 0)
    FROM public.itens_resposta_fornecedor irf
    JOIN public.itens_cotacao ic ON irf.item_cotacao_id = ic.id
    WHERE irf.resposta_id = NEW.resposta_id
  )
  WHERE id = NEW.resposta_id;
  RETURN NEW;
END;
$$;


--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role(_user_id uuid) RETURNS public.app_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.email),
    NEW.email
  );
  
  -- Assign default role (operador) - first user gets admin
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'administrador');
  ELSE
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'operador'));
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: has_module_access(uuid, public.app_module); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_module_access(_user_id uuid, _module public.app_module) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT 
    has_role(_user_id, 'administrador'::app_role) OR
    EXISTS (
      SELECT 1
      FROM public.user_module_permissions
      WHERE user_id = _user_id AND module = _module
    )
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: is_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin(_user_id uuid) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'administrador'
  );
$$;


--
-- Name: restore_stock(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.restore_stock(p_produto_id uuid, p_quantidade numeric) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.produtos 
  SET quantidade_estoque = quantidade_estoque + p_quantidade
  WHERE id = p_produto_id;
END;
$$;


--
-- Name: set_conferencia_coca_numero(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_conferencia_coca_numero() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.numero_conferencia IS NULL THEN
    NEW.numero_conferencia := nextval('conferencias_coca_numero_seq');
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: set_recebimento_legumes_numero(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_recebimento_legumes_numero() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.numero_recebimento IS NULL THEN
    NEW.numero_recebimento := nextval('recebimentos_legumes_numero_seq');
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: set_sessao_conferencia_coca_numero(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_sessao_conferencia_coca_numero() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.numero IS NULL THEN
    NEW.numero := nextval('sessoes_conferencia_coca_numero_seq');
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_atualizado_em(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_atualizado_em() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_estoque_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_estoque_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_stock_on_loss(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_stock_on_loss() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  loss_amount NUMERIC;
BEGIN
  loss_amount := COALESCE(NEW.peso_perdido, 0) + COALESCE(NEW.quantidade_perdida, 0);
  
  -- Allow negative stock - just update without validation
  UPDATE public.produtos 
  SET quantidade_estoque = quantidade_estoque - loss_amount
  WHERE id = NEW.produto_id;
  
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: ai_categorization_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_categorization_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    product_name text NOT NULL,
    suggested_category text NOT NULL,
    final_category text NOT NULL,
    was_accepted boolean NOT NULL,
    confidence numeric(3,2),
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    messages jsonb DEFAULT '[]'::jsonb NOT NULL,
    context_type text DEFAULT 'general'::text NOT NULL,
    title text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid,
    message_index integer NOT NULL,
    was_helpful boolean NOT NULL,
    feedback_text text,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_insights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_insights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    insight_type text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    data jsonb,
    priority text DEFAULT 'medium'::text NOT NULL,
    is_read boolean DEFAULT false,
    is_dismissed boolean DEFAULT false,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone
);


--
-- Name: conferencias_coca; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conferencias_coca (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    produto_coca_id uuid NOT NULL,
    usuario_id uuid NOT NULL,
    quantidade_conferida numeric NOT NULL,
    data_conferencia date DEFAULT CURRENT_DATE NOT NULL,
    criado_em timestamp with time zone DEFAULT now(),
    numero_conferencia integer,
    tipo_unidade text DEFAULT 'unidade'::text NOT NULL,
    sessao_id uuid
);


--
-- Name: conferencias_coca_numero_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.conferencias_coca_numero_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: conferencias_polpas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conferencias_polpas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    polpa_id uuid NOT NULL,
    usuario_id uuid NOT NULL,
    quantidade_conferida numeric NOT NULL,
    observacao text,
    data_conferencia date DEFAULT CURRENT_DATE NOT NULL,
    criado_em timestamp with time zone DEFAULT now()
);


--
-- Name: configuracoes_email; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.configuracoes_email (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tipo_email text NOT NULL,
    assunto_padrao text NOT NULL,
    mensagem_cabecalho text,
    mensagem_rodape text,
    cor_primaria text DEFAULT '#3b82f6'::text,
    nome_empresa text DEFAULT 'Comercial Costa'::text,
    telefone_empresa text,
    email_empresa text,
    endereco_empresa text,
    logo_url text,
    ativo boolean DEFAULT true,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now()
);


--
-- Name: configuracoes_fracionamento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.configuracoes_fracionamento (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    produto_id uuid,
    nome_produto text NOT NULL,
    peso_caixa_kg numeric(10,3) DEFAULT 0 NOT NULL,
    unidades_por_caixa integer DEFAULT 1 NOT NULL,
    preco_caixa numeric(10,2) DEFAULT 0 NOT NULL,
    preco_por_kg numeric(10,2) GENERATED ALWAYS AS (
CASE
    WHEN (peso_caixa_kg > (0)::numeric) THEN (preco_caixa / peso_caixa_kg)
    ELSE (0)::numeric
END) STORED,
    preco_por_unidade numeric(10,2) GENERATED ALWAYS AS (
CASE
    WHEN (unidades_por_caixa > 0) THEN (preco_caixa / (unidades_por_caixa)::numeric)
    ELSE (0)::numeric
END) STORED,
    peso_medio_unidade_kg numeric(10,3),
    tipo_venda text DEFAULT 'kg'::text NOT NULL,
    observacao text,
    ativo boolean DEFAULT true,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    atualizado_em timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT configuracoes_fracionamento_tipo_venda_check CHECK ((tipo_venda = ANY (ARRAY['kg'::text, 'unidade'::text, 'ambos'::text])))
);


--
-- Name: configuracoes_sistema; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.configuracoes_sistema (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chave text NOT NULL,
    valor jsonb NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    atualizado_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: convites_fornecedor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.convites_fornecedor (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cotacao_id uuid NOT NULL,
    fornecedor_id uuid NOT NULL,
    status public.convite_status DEFAULT 'pendente'::public.convite_status NOT NULL,
    enviado_em timestamp with time zone DEFAULT now(),
    visualizado_em timestamp with time zone,
    respondido_em timestamp with time zone,
    criado_em timestamp with time zone DEFAULT now()
);


--
-- Name: cotacoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cotacoes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero integer NOT NULL,
    fornecedor_id uuid,
    data_cotacao date DEFAULT CURRENT_DATE NOT NULL,
    data_validade date,
    status public.cotacao_status DEFAULT 'pendente'::public.cotacao_status,
    total numeric DEFAULT 0,
    observacao text,
    usuario_id uuid NOT NULL,
    criado_em timestamp with time zone DEFAULT now(),
    titulo text,
    data_limite_resposta timestamp with time zone,
    justificativa_escolha text,
    aprovado_por uuid,
    aprovado_em timestamp with time zone,
    data_abertura_automatica timestamp with time zone,
    data_fechamento_automatico timestamp with time zone,
    modo_abertura character varying(20) DEFAULT 'manual'::character varying,
    modo_fechamento character varying(20) DEFAULT 'manual'::character varying,
    CONSTRAINT cotacoes_modo_abertura_check CHECK (((modo_abertura)::text = ANY (ARRAY[('manual'::character varying)::text, ('automatico'::character varying)::text]))),
    CONSTRAINT cotacoes_modo_fechamento_check CHECK (((modo_fechamento)::text = ANY (ARRAY[('manual'::character varying)::text, ('automatico'::character varying)::text])))
);


--
-- Name: cotacoes_numero_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cotacoes_numero_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cotacoes_numero_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cotacoes_numero_seq OWNED BY public.cotacoes.numero;


--
-- Name: estoque; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estoque (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo text NOT NULL,
    nome text NOT NULL,
    grupo text,
    subgrupo text,
    referencia text,
    marca text,
    preco_custo numeric DEFAULT 0 NOT NULL,
    preco_venda numeric DEFAULT 0 NOT NULL,
    estoque_atual numeric DEFAULT 0 NOT NULL,
    estoque_minimo numeric DEFAULT 0 NOT NULL,
    ativo boolean DEFAULT true,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    codigo_barras text,
    ncm text,
    unidade text DEFAULT 'UN'::text,
    peso_bruto numeric(10,3),
    peso_liquido numeric(10,3),
    preco_promocao numeric(10,2),
    estoque_maximo numeric(10,2) DEFAULT 0,
    localizacao text,
    saldo numeric(10,2) DEFAULT 0
);


--
-- Name: fornecedores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fornecedores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    cnpj text,
    contato text,
    email text,
    telefone text,
    endereco text,
    observacao text,
    ativo boolean DEFAULT true,
    criado_em timestamp with time zone DEFAULT now()
);


--
-- Name: historico_precos_compra; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.historico_precos_compra (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    estoque_id uuid,
    fornecedor_id uuid,
    preco_compra numeric NOT NULL,
    data_compra date DEFAULT CURRENT_DATE NOT NULL,
    ordem_compra_id uuid,
    criado_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: itens_cotacao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.itens_cotacao (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cotacao_id uuid NOT NULL,
    produto_id uuid,
    codigo_barras text,
    nome_produto text NOT NULL,
    quantidade numeric DEFAULT 1 NOT NULL,
    preco_unitario numeric DEFAULT 0,
    preco_total numeric GENERATED ALWAYS AS ((quantidade * preco_unitario)) STORED,
    observacao text,
    criado_em timestamp with time zone DEFAULT now()
);


--
-- Name: itens_oferta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.itens_oferta (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    oferta_id uuid,
    item_id uuid,
    nome_item text NOT NULL,
    preco_custo numeric DEFAULT 0 NOT NULL,
    preco_venda_normal numeric DEFAULT 0 NOT NULL,
    preco_oferta numeric DEFAULT 0 NOT NULL,
    margem_lucro numeric GENERATED ALWAYS AS (
CASE
    WHEN (preco_custo > (0)::numeric) THEN round((((preco_oferta - preco_custo) / preco_custo) * (100)::numeric), 2)
    ELSE (0)::numeric
END) STORED,
    lucro_real numeric GENERATED ALWAYS AS ((preco_oferta - preco_custo)) STORED,
    economia_percentual numeric GENERATED ALWAYS AS (
CASE
    WHEN (preco_venda_normal > (0)::numeric) THEN round((((preco_venda_normal - preco_oferta) / preco_venda_normal) * (100)::numeric), 2)
    ELSE (0)::numeric
END) STORED,
    destaque boolean DEFAULT false,
    quantidade_limite integer,
    observacao text,
    criado_em timestamp with time zone DEFAULT now()
);


--
-- Name: itens_ordem_compra; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.itens_ordem_compra (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ordem_compra_id uuid NOT NULL,
    item_cotacao_id uuid,
    codigo_barras text,
    nome_produto text NOT NULL,
    quantidade numeric DEFAULT 1 NOT NULL,
    preco_unitario numeric DEFAULT 0 NOT NULL,
    preco_total numeric GENERATED ALWAYS AS ((quantidade * preco_unitario)) STORED,
    observacao text,
    criado_em timestamp with time zone DEFAULT now(),
    estoque_id uuid
);


--
-- Name: itens_pedido_coca; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.itens_pedido_coca (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pedido_id uuid NOT NULL,
    produto_coca_id uuid NOT NULL,
    quantidade integer NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: itens_pedido_polpas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.itens_pedido_polpas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pedido_id uuid NOT NULL,
    polpa_id uuid NOT NULL,
    quantidade integer NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: itens_perdas_geral; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.itens_perdas_geral (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo_barras text,
    nome_item text NOT NULL,
    marca text,
    categoria text,
    imagem_url text,
    preco_custo numeric DEFAULT 0 NOT NULL,
    ativo boolean DEFAULT true,
    criado_em timestamp with time zone DEFAULT now(),
    preco_venda numeric DEFAULT 0 NOT NULL
);


--
-- Name: itens_perdas_polpas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.itens_perdas_polpas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome_item text NOT NULL,
    preco_custo numeric DEFAULT 0 NOT NULL,
    categoria text DEFAULT 'geral'::text,
    ativo boolean DEFAULT true,
    criado_em timestamp with time zone DEFAULT now()
);


--
-- Name: itens_resposta_fornecedor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.itens_resposta_fornecedor (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resposta_id uuid NOT NULL,
    item_cotacao_id uuid NOT NULL,
    preco_unitario numeric DEFAULT 0 NOT NULL,
    disponivel boolean DEFAULT true,
    prazo_entrega_dias integer,
    observacao text,
    criado_em timestamp with time zone DEFAULT now()
);


--
-- Name: lancamentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lancamentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero integer NOT NULL,
    usuario_id uuid NOT NULL,
    data_lancamento date DEFAULT CURRENT_DATE NOT NULL,
    status public.status_lancamento DEFAULT 'normal'::public.status_lancamento NOT NULL,
    observacao text,
    criado_em timestamp with time zone DEFAULT now()
);


--
-- Name: lancamentos_numero_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lancamentos_numero_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lancamentos_numero_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lancamentos_numero_seq OWNED BY public.lancamentos.numero;


--
-- Name: lancamentos_perdas_geral; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lancamentos_perdas_geral (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero integer DEFAULT nextval('public.lancamentos_numero_seq'::regclass) NOT NULL,
    data_lancamento date DEFAULT CURRENT_DATE NOT NULL,
    usuario_id uuid NOT NULL,
    status text DEFAULT 'normal'::text NOT NULL,
    observacao text,
    criado_em timestamp with time zone DEFAULT now()
);


--
-- Name: lancamentos_perdas_polpas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lancamentos_perdas_polpas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero integer DEFAULT nextval('public.lancamentos_numero_seq'::regclass) NOT NULL,
    usuario_id uuid NOT NULL,
    data_lancamento date DEFAULT CURRENT_DATE NOT NULL,
    observacao text,
    status text DEFAULT 'normal'::text NOT NULL,
    criado_em timestamp with time zone DEFAULT now()
);


--
-- Name: legumes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legumes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome_legume text NOT NULL,
    quantidade_estoque numeric DEFAULT 0 NOT NULL,
    estoque_minimo numeric DEFAULT 0 NOT NULL,
    preco_unitario numeric DEFAULT 0 NOT NULL,
    unidade_medida text DEFAULT 'kg'::text NOT NULL,
    criado_em timestamp with time zone DEFAULT now()
);


--
-- Name: logs_atividade; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.logs_atividade (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid,
    acao text NOT NULL,
    detalhes jsonb,
    criado_em timestamp with time zone DEFAULT now()
);


--
-- Name: ofertas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ofertas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome_campanha text NOT NULL,
    data_inicio date NOT NULL,
    data_fim date NOT NULL,
    tipo text DEFAULT 'fim_de_semana'::text NOT NULL,
    setor text DEFAULT 'geral'::text,
    status text DEFAULT 'rascunho'::text,
    usuario_id uuid NOT NULL,
    observacao text,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now()
);


--
-- Name: ordens_compra; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ordens_compra (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero integer NOT NULL,
    cotacao_id uuid,
    fornecedor_id uuid NOT NULL,
    resposta_id uuid,
    status public.ordem_compra_status DEFAULT 'rascunho'::public.ordem_compra_status NOT NULL,
    data_ordem date DEFAULT CURRENT_DATE,
    data_entrega_prevista date,
    data_entrega_real date,
    total numeric DEFAULT 0,
    condicao_pagamento text,
    observacao text,
    usuario_id uuid NOT NULL,
    aprovado_por uuid,
    aprovado_em timestamp with time zone,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now()
);


--
-- Name: ordens_compra_numero_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ordens_compra_numero_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ordens_compra_numero_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ordens_compra_numero_seq OWNED BY public.ordens_compra.numero;


--
-- Name: pedidos_polpas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pedidos_polpas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero integer NOT NULL,
    usuario_id uuid NOT NULL,
    data_pedido timestamp with time zone DEFAULT now() NOT NULL,
    total_itens integer DEFAULT 0 NOT NULL,
    total_unidades integer DEFAULT 0 NOT NULL,
    observacao text,
    criado_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pedidos_polpas_numero_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pedidos_polpas_numero_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pedidos_polpas_numero_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pedidos_polpas_numero_seq OWNED BY public.pedidos_polpas.numero;


--
-- Name: pedidos_coca; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pedidos_coca (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero integer DEFAULT nextval('public.pedidos_polpas_numero_seq'::regclass) NOT NULL,
    data_pedido timestamp with time zone DEFAULT now() NOT NULL,
    total_itens integer DEFAULT 0 NOT NULL,
    total_unidades integer DEFAULT 0 NOT NULL,
    usuario_id uuid NOT NULL,
    sessao_id uuid,
    observacao text,
    criado_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: perdas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.perdas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    produto_id uuid NOT NULL,
    usuario_id uuid NOT NULL,
    peso_perdido numeric(10,2) DEFAULT 0,
    quantidade_perdida numeric(10,2) DEFAULT 0,
    motivo_perda public.motivo_perda NOT NULL,
    observacao text,
    data_perda date DEFAULT CURRENT_DATE NOT NULL,
    valor_perda numeric(10,2) GENERATED ALWAYS AS (((peso_perdido * (0)::numeric) + (quantidade_perdida * (0)::numeric))) STORED,
    criado_em timestamp with time zone DEFAULT now(),
    lancamento_id uuid
);


--
-- Name: perdas_geral; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.perdas_geral (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lancamento_id uuid,
    item_id uuid NOT NULL,
    usuario_id uuid NOT NULL,
    quantidade_perdida numeric DEFAULT 0 NOT NULL,
    preco_unitario numeric DEFAULT 0 NOT NULL,
    valor_perda numeric GENERATED ALWAYS AS ((quantidade_perdida * preco_unitario)) STORED,
    motivo_perda public.motivo_perda_geral NOT NULL,
    tipo_resolucao public.tipo_resolucao_geral DEFAULT 'sem_resolucao'::public.tipo_resolucao_geral NOT NULL,
    data_perda date DEFAULT CURRENT_DATE NOT NULL,
    observacao text,
    criado_em timestamp with time zone DEFAULT now(),
    data_vencimento date
);


--
-- Name: perdas_polpas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.perdas_polpas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lancamento_id uuid,
    item_id uuid NOT NULL,
    usuario_id uuid NOT NULL,
    quantidade_perdida numeric DEFAULT 0 NOT NULL,
    motivo_perda text NOT NULL,
    tipo_resolucao text DEFAULT 'sem_resolucao'::text NOT NULL,
    observacao text,
    data_perda date DEFAULT CURRENT_DATE NOT NULL,
    criado_em timestamp with time zone DEFAULT now()
);


--
-- Name: polpas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.polpas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome_polpa text NOT NULL,
    quantidade_estoque numeric DEFAULT 0 NOT NULL,
    estoque_minimo numeric DEFAULT 0 NOT NULL,
    preco_unitario numeric DEFAULT 0 NOT NULL,
    criado_em timestamp with time zone DEFAULT now()
);


--
-- Name: produtos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.produtos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome_produto text NOT NULL,
    categoria public.categoria_produto NOT NULL,
    unidade_medida public.unidade_medida DEFAULT 'kg'::public.unidade_medida NOT NULL,
    quantidade_estoque numeric(10,2) DEFAULT 0 NOT NULL,
    preco_unitario numeric(10,2) DEFAULT 0 NOT NULL,
    estoque_minimo numeric(10,2) DEFAULT 0 NOT NULL,
    criado_em timestamp with time zone DEFAULT now(),
    preco_venda numeric DEFAULT 0,
    quantidade_por_caixa numeric DEFAULT 1,
    unidade_fracionamento text DEFAULT 'kg'::text,
    oculto_ofertas boolean DEFAULT false
);


--
-- Name: produtos_coca; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.produtos_coca (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome_produto text NOT NULL,
    quantidade_estoque numeric DEFAULT 0 NOT NULL,
    estoque_minimo numeric DEFAULT 0 NOT NULL,
    preco_unitario numeric DEFAULT 0 NOT NULL,
    criado_em timestamp with time zone DEFAULT now(),
    unidades_por_fardo integer DEFAULT 6 NOT NULL
);


--
-- Name: produtos_cotacao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.produtos_cotacao (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo_barras text,
    nome text NOT NULL,
    marca text,
    categoria text,
    descricao text,
    imagem_url text,
    preco_medio numeric DEFAULT 0,
    unidade_medida text DEFAULT 'unidade'::text,
    criado_em timestamp with time zone DEFAULT now()
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    nome text NOT NULL,
    email text NOT NULL,
    ativo boolean DEFAULT true,
    criado_em timestamp with time zone DEFAULT now()
);


--
-- Name: recebimentos_legumes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recebimentos_legumes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    legume_id uuid NOT NULL,
    usuario_id uuid NOT NULL,
    quantidade_recebida numeric NOT NULL,
    data_recebimento date DEFAULT CURRENT_DATE NOT NULL,
    observacao text,
    criado_em timestamp with time zone DEFAULT now(),
    numero_recebimento integer
);


--
-- Name: recebimentos_legumes_numero_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.recebimentos_legumes_numero_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: respostas_fornecedor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.respostas_fornecedor (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cotacao_id uuid NOT NULL,
    fornecedor_id uuid NOT NULL,
    convite_id uuid,
    prazo_entrega_dias integer,
    condicao_pagamento text,
    validade_proposta date,
    observacao text,
    total_proposta numeric DEFAULT 0,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now()
);


--
-- Name: sessoes_conferencia_coca_numero_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sessoes_conferencia_coca_numero_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sessoes_conferencia_coca; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessoes_conferencia_coca (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero integer DEFAULT nextval('public.sessoes_conferencia_coca_numero_seq'::regclass) NOT NULL,
    data_conferencia date DEFAULT CURRENT_DATE NOT NULL,
    usuario_id uuid NOT NULL,
    observacao text,
    criado_em timestamp with time zone DEFAULT now()
);


--
-- Name: templates_etiquetas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.templates_etiquetas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    descricao text,
    categoria text DEFAULT 'geral'::text,
    elementos jsonb NOT NULL,
    tamanho text DEFAULT 'half'::text NOT NULL,
    thumbnail_url text,
    ativo boolean DEFAULT true,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    atualizado_em timestamp with time zone DEFAULT now() NOT NULL,
    criado_por uuid
);


--
-- Name: user_module_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_module_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    module public.app_module NOT NULL,
    criado_em timestamp with time zone DEFAULT now()
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'operador'::public.app_role NOT NULL
);


--
-- Name: cotacoes numero; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotacoes ALTER COLUMN numero SET DEFAULT nextval('public.cotacoes_numero_seq'::regclass);


--
-- Name: lancamentos numero; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lancamentos ALTER COLUMN numero SET DEFAULT nextval('public.lancamentos_numero_seq'::regclass);


--
-- Name: ordens_compra numero; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordens_compra ALTER COLUMN numero SET DEFAULT nextval('public.ordens_compra_numero_seq'::regclass);


--
-- Name: pedidos_polpas numero; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos_polpas ALTER COLUMN numero SET DEFAULT nextval('public.pedidos_polpas_numero_seq'::regclass);


--
-- Name: ai_categorization_feedback ai_categorization_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_categorization_feedback
    ADD CONSTRAINT ai_categorization_feedback_pkey PRIMARY KEY (id);


--
-- Name: ai_conversations ai_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_pkey PRIMARY KEY (id);


--
-- Name: ai_feedback ai_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_feedback
    ADD CONSTRAINT ai_feedback_pkey PRIMARY KEY (id);


--
-- Name: ai_insights ai_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_insights
    ADD CONSTRAINT ai_insights_pkey PRIMARY KEY (id);


--
-- Name: conferencias_coca conferencias_coca_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conferencias_coca
    ADD CONSTRAINT conferencias_coca_pkey PRIMARY KEY (id);


--
-- Name: conferencias_polpas conferencias_polpas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conferencias_polpas
    ADD CONSTRAINT conferencias_polpas_pkey PRIMARY KEY (id);


--
-- Name: configuracoes_email configuracoes_email_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracoes_email
    ADD CONSTRAINT configuracoes_email_pkey PRIMARY KEY (id);


--
-- Name: configuracoes_email configuracoes_email_tipo_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracoes_email
    ADD CONSTRAINT configuracoes_email_tipo_email_key UNIQUE (tipo_email);


--
-- Name: configuracoes_fracionamento configuracoes_fracionamento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracoes_fracionamento
    ADD CONSTRAINT configuracoes_fracionamento_pkey PRIMARY KEY (id);


--
-- Name: configuracoes_sistema configuracoes_sistema_chave_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracoes_sistema
    ADD CONSTRAINT configuracoes_sistema_chave_key UNIQUE (chave);


--
-- Name: configuracoes_sistema configuracoes_sistema_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracoes_sistema
    ADD CONSTRAINT configuracoes_sistema_pkey PRIMARY KEY (id);


--
-- Name: convites_fornecedor convites_fornecedor_cotacao_id_fornecedor_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.convites_fornecedor
    ADD CONSTRAINT convites_fornecedor_cotacao_id_fornecedor_id_key UNIQUE (cotacao_id, fornecedor_id);


--
-- Name: convites_fornecedor convites_fornecedor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.convites_fornecedor
    ADD CONSTRAINT convites_fornecedor_pkey PRIMARY KEY (id);


--
-- Name: cotacoes cotacoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotacoes
    ADD CONSTRAINT cotacoes_pkey PRIMARY KEY (id);


--
-- Name: estoque estoque_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estoque
    ADD CONSTRAINT estoque_codigo_key UNIQUE (codigo);


--
-- Name: estoque estoque_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estoque
    ADD CONSTRAINT estoque_pkey PRIMARY KEY (id);


--
-- Name: fornecedores fornecedores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fornecedores
    ADD CONSTRAINT fornecedores_pkey PRIMARY KEY (id);


--
-- Name: historico_precos_compra historico_precos_compra_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historico_precos_compra
    ADD CONSTRAINT historico_precos_compra_pkey PRIMARY KEY (id);


--
-- Name: itens_cotacao itens_cotacao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_cotacao
    ADD CONSTRAINT itens_cotacao_pkey PRIMARY KEY (id);


--
-- Name: itens_oferta itens_oferta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_oferta
    ADD CONSTRAINT itens_oferta_pkey PRIMARY KEY (id);


--
-- Name: itens_ordem_compra itens_ordem_compra_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_ordem_compra
    ADD CONSTRAINT itens_ordem_compra_pkey PRIMARY KEY (id);


--
-- Name: itens_pedido_coca itens_pedido_coca_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_pedido_coca
    ADD CONSTRAINT itens_pedido_coca_pkey PRIMARY KEY (id);


--
-- Name: itens_pedido_polpas itens_pedido_polpas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_pedido_polpas
    ADD CONSTRAINT itens_pedido_polpas_pkey PRIMARY KEY (id);


--
-- Name: itens_perdas_geral itens_perdas_geral_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_perdas_geral
    ADD CONSTRAINT itens_perdas_geral_pkey PRIMARY KEY (id);


--
-- Name: itens_perdas_polpas itens_perdas_polpas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_perdas_polpas
    ADD CONSTRAINT itens_perdas_polpas_pkey PRIMARY KEY (id);


--
-- Name: itens_resposta_fornecedor itens_resposta_fornecedor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_resposta_fornecedor
    ADD CONSTRAINT itens_resposta_fornecedor_pkey PRIMARY KEY (id);


--
-- Name: lancamentos lancamentos_numero_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lancamentos
    ADD CONSTRAINT lancamentos_numero_key UNIQUE (numero);


--
-- Name: lancamentos_perdas_geral lancamentos_perdas_geral_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lancamentos_perdas_geral
    ADD CONSTRAINT lancamentos_perdas_geral_pkey PRIMARY KEY (id);


--
-- Name: lancamentos_perdas_polpas lancamentos_perdas_polpas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lancamentos_perdas_polpas
    ADD CONSTRAINT lancamentos_perdas_polpas_pkey PRIMARY KEY (id);


--
-- Name: lancamentos lancamentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lancamentos
    ADD CONSTRAINT lancamentos_pkey PRIMARY KEY (id);


--
-- Name: legumes legumes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legumes
    ADD CONSTRAINT legumes_pkey PRIMARY KEY (id);


--
-- Name: logs_atividade logs_atividade_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs_atividade
    ADD CONSTRAINT logs_atividade_pkey PRIMARY KEY (id);


--
-- Name: ofertas ofertas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ofertas
    ADD CONSTRAINT ofertas_pkey PRIMARY KEY (id);


--
-- Name: ordens_compra ordens_compra_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordens_compra
    ADD CONSTRAINT ordens_compra_pkey PRIMARY KEY (id);


--
-- Name: pedidos_coca pedidos_coca_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos_coca
    ADD CONSTRAINT pedidos_coca_pkey PRIMARY KEY (id);


--
-- Name: pedidos_polpas pedidos_polpas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos_polpas
    ADD CONSTRAINT pedidos_polpas_pkey PRIMARY KEY (id);


--
-- Name: perdas_geral perdas_geral_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perdas_geral
    ADD CONSTRAINT perdas_geral_pkey PRIMARY KEY (id);


--
-- Name: perdas perdas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perdas
    ADD CONSTRAINT perdas_pkey PRIMARY KEY (id);


--
-- Name: perdas_polpas perdas_polpas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perdas_polpas
    ADD CONSTRAINT perdas_polpas_pkey PRIMARY KEY (id);


--
-- Name: polpas polpas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.polpas
    ADD CONSTRAINT polpas_pkey PRIMARY KEY (id);


--
-- Name: produtos_coca produtos_coca_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produtos_coca
    ADD CONSTRAINT produtos_coca_pkey PRIMARY KEY (id);


--
-- Name: produtos_cotacao produtos_cotacao_codigo_barras_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produtos_cotacao
    ADD CONSTRAINT produtos_cotacao_codigo_barras_key UNIQUE (codigo_barras);


--
-- Name: produtos_cotacao produtos_cotacao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produtos_cotacao
    ADD CONSTRAINT produtos_cotacao_pkey PRIMARY KEY (id);


--
-- Name: produtos produtos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produtos
    ADD CONSTRAINT produtos_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: recebimentos_legumes recebimentos_legumes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recebimentos_legumes
    ADD CONSTRAINT recebimentos_legumes_pkey PRIMARY KEY (id);


--
-- Name: respostas_fornecedor respostas_fornecedor_cotacao_id_fornecedor_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.respostas_fornecedor
    ADD CONSTRAINT respostas_fornecedor_cotacao_id_fornecedor_id_key UNIQUE (cotacao_id, fornecedor_id);


--
-- Name: respostas_fornecedor respostas_fornecedor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.respostas_fornecedor
    ADD CONSTRAINT respostas_fornecedor_pkey PRIMARY KEY (id);


--
-- Name: sessoes_conferencia_coca sessoes_conferencia_coca_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessoes_conferencia_coca
    ADD CONSTRAINT sessoes_conferencia_coca_pkey PRIMARY KEY (id);


--
-- Name: templates_etiquetas templates_etiquetas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates_etiquetas
    ADD CONSTRAINT templates_etiquetas_pkey PRIMARY KEY (id);


--
-- Name: user_module_permissions user_module_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_module_permissions
    ADD CONSTRAINT user_module_permissions_pkey PRIMARY KEY (id);


--
-- Name: user_module_permissions user_module_permissions_user_id_module_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_module_permissions
    ADD CONSTRAINT user_module_permissions_user_id_module_key UNIQUE (user_id, module);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_estoque_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estoque_codigo ON public.estoque USING btree (codigo);


--
-- Name: idx_estoque_codigo_barras; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estoque_codigo_barras ON public.estoque USING btree (codigo_barras);


--
-- Name: idx_estoque_codigo_barras_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_estoque_codigo_barras_unique ON public.estoque USING btree (codigo_barras) WHERE (codigo_barras IS NOT NULL);


--
-- Name: idx_estoque_grupo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estoque_grupo ON public.estoque USING btree (grupo);


--
-- Name: idx_estoque_marca; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estoque_marca ON public.estoque USING btree (marca);


--
-- Name: idx_estoque_ncm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estoque_ncm ON public.estoque USING btree (ncm);


--
-- Name: idx_estoque_nome; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estoque_nome ON public.estoque USING btree (nome);


--
-- Name: idx_estoque_subgrupo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estoque_subgrupo ON public.estoque USING btree (subgrupo);


--
-- Name: idx_fracionamento_ativo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fracionamento_ativo ON public.configuracoes_fracionamento USING btree (ativo);


--
-- Name: idx_fracionamento_produto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fracionamento_produto ON public.configuracoes_fracionamento USING btree (produto_id);


--
-- Name: idx_historico_precos_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historico_precos_data ON public.historico_precos_compra USING btree (data_compra DESC);


--
-- Name: idx_historico_precos_estoque; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historico_precos_estoque ON public.historico_precos_compra USING btree (estoque_id);


--
-- Name: idx_historico_precos_fornecedor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historico_precos_fornecedor ON public.historico_precos_compra USING btree (fornecedor_id);


--
-- Name: idx_lancamentos_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lancamentos_data ON public.lancamentos USING btree (data_lancamento);


--
-- Name: idx_lancamentos_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lancamentos_status ON public.lancamentos USING btree (status);


--
-- Name: idx_perdas_lancamento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_perdas_lancamento ON public.perdas USING btree (lancamento_id);


--
-- Name: perdas on_loss_created; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_loss_created BEFORE INSERT ON public.perdas FOR EACH ROW EXECUTE FUNCTION public.update_stock_on_loss();


--
-- Name: conferencias_coca set_conferencia_coca_numero_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_conferencia_coca_numero_trigger BEFORE INSERT ON public.conferencias_coca FOR EACH ROW EXECUTE FUNCTION public.set_conferencia_coca_numero();


--
-- Name: recebimentos_legumes set_recebimento_legumes_numero_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_recebimento_legumes_numero_trigger BEFORE INSERT ON public.recebimentos_legumes FOR EACH ROW EXECUTE FUNCTION public.set_recebimento_legumes_numero();


--
-- Name: sessoes_conferencia_coca set_sessao_conferencia_coca_numero_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_sessao_conferencia_coca_numero_trigger BEFORE INSERT ON public.sessoes_conferencia_coca FOR EACH ROW EXECUTE FUNCTION public.set_sessao_conferencia_coca_numero();


--
-- Name: itens_resposta_fornecedor trigger_calcular_total_proposta; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_calcular_total_proposta AFTER INSERT OR DELETE OR UPDATE ON public.itens_resposta_fornecedor FOR EACH ROW EXECUTE FUNCTION public.calcular_total_proposta();


--
-- Name: ai_conversations update_ai_conversations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ai_conversations_updated_at BEFORE UPDATE ON public.ai_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: configuracoes_email update_configuracoes_email_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_configuracoes_email_updated_at BEFORE UPDATE ON public.configuracoes_email FOR EACH ROW EXECUTE FUNCTION public.update_atualizado_em();


--
-- Name: configuracoes_sistema update_configuracoes_sistema_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_configuracoes_sistema_updated_at BEFORE UPDATE ON public.configuracoes_sistema FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: estoque update_estoque_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_estoque_updated_at BEFORE UPDATE ON public.estoque FOR EACH ROW EXECUTE FUNCTION public.update_estoque_updated_at();


--
-- Name: configuracoes_fracionamento update_fracionamento_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_fracionamento_updated_at BEFORE UPDATE ON public.configuracoes_fracionamento FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ordens_compra update_ordens_compra_atualizado_em; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ordens_compra_atualizado_em BEFORE UPDATE ON public.ordens_compra FOR EACH ROW EXECUTE FUNCTION public.update_atualizado_em();


--
-- Name: respostas_fornecedor update_respostas_fornecedor_atualizado_em; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_respostas_fornecedor_atualizado_em BEFORE UPDATE ON public.respostas_fornecedor FOR EACH ROW EXECUTE FUNCTION public.update_atualizado_em();


--
-- Name: ai_feedback ai_feedback_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_feedback
    ADD CONSTRAINT ai_feedback_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.ai_conversations(id) ON DELETE CASCADE;


--
-- Name: conferencias_coca conferencias_coca_produto_coca_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conferencias_coca
    ADD CONSTRAINT conferencias_coca_produto_coca_id_fkey FOREIGN KEY (produto_coca_id) REFERENCES public.produtos_coca(id) ON DELETE CASCADE;


--
-- Name: conferencias_coca conferencias_coca_sessao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conferencias_coca
    ADD CONSTRAINT conferencias_coca_sessao_id_fkey FOREIGN KEY (sessao_id) REFERENCES public.sessoes_conferencia_coca(id);


--
-- Name: conferencias_polpas conferencias_polpas_polpa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conferencias_polpas
    ADD CONSTRAINT conferencias_polpas_polpa_id_fkey FOREIGN KEY (polpa_id) REFERENCES public.polpas(id) ON DELETE CASCADE;


--
-- Name: configuracoes_fracionamento configuracoes_fracionamento_produto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracoes_fracionamento
    ADD CONSTRAINT configuracoes_fracionamento_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES public.estoque(id) ON DELETE CASCADE;


--
-- Name: convites_fornecedor convites_fornecedor_cotacao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.convites_fornecedor
    ADD CONSTRAINT convites_fornecedor_cotacao_id_fkey FOREIGN KEY (cotacao_id) REFERENCES public.cotacoes(id) ON DELETE CASCADE;


--
-- Name: convites_fornecedor convites_fornecedor_fornecedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.convites_fornecedor
    ADD CONSTRAINT convites_fornecedor_fornecedor_id_fkey FOREIGN KEY (fornecedor_id) REFERENCES public.fornecedores(id) ON DELETE CASCADE;


--
-- Name: cotacoes cotacoes_fornecedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotacoes
    ADD CONSTRAINT cotacoes_fornecedor_id_fkey FOREIGN KEY (fornecedor_id) REFERENCES public.fornecedores(id);


--
-- Name: perdas_geral fk_item; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perdas_geral
    ADD CONSTRAINT fk_item FOREIGN KEY (item_id) REFERENCES public.itens_perdas_geral(id);


--
-- Name: perdas_geral fk_lancamento; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perdas_geral
    ADD CONSTRAINT fk_lancamento FOREIGN KEY (lancamento_id) REFERENCES public.lancamentos_perdas_geral(id) ON DELETE CASCADE;


--
-- Name: historico_precos_compra historico_precos_compra_estoque_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historico_precos_compra
    ADD CONSTRAINT historico_precos_compra_estoque_id_fkey FOREIGN KEY (estoque_id) REFERENCES public.estoque(id) ON DELETE CASCADE;


--
-- Name: historico_precos_compra historico_precos_compra_fornecedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historico_precos_compra
    ADD CONSTRAINT historico_precos_compra_fornecedor_id_fkey FOREIGN KEY (fornecedor_id) REFERENCES public.fornecedores(id) ON DELETE SET NULL;


--
-- Name: historico_precos_compra historico_precos_compra_ordem_compra_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historico_precos_compra
    ADD CONSTRAINT historico_precos_compra_ordem_compra_id_fkey FOREIGN KEY (ordem_compra_id) REFERENCES public.ordens_compra(id) ON DELETE SET NULL;


--
-- Name: itens_cotacao itens_cotacao_cotacao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_cotacao
    ADD CONSTRAINT itens_cotacao_cotacao_id_fkey FOREIGN KEY (cotacao_id) REFERENCES public.cotacoes(id) ON DELETE CASCADE;


--
-- Name: itens_cotacao itens_cotacao_produto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_cotacao
    ADD CONSTRAINT itens_cotacao_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES public.produtos_cotacao(id);


--
-- Name: itens_oferta itens_oferta_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_oferta
    ADD CONSTRAINT itens_oferta_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.itens_perdas_geral(id);


--
-- Name: itens_oferta itens_oferta_oferta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_oferta
    ADD CONSTRAINT itens_oferta_oferta_id_fkey FOREIGN KEY (oferta_id) REFERENCES public.ofertas(id) ON DELETE CASCADE;


--
-- Name: itens_ordem_compra itens_ordem_compra_estoque_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_ordem_compra
    ADD CONSTRAINT itens_ordem_compra_estoque_id_fkey FOREIGN KEY (estoque_id) REFERENCES public.estoque(id) ON DELETE SET NULL;


--
-- Name: itens_ordem_compra itens_ordem_compra_item_cotacao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_ordem_compra
    ADD CONSTRAINT itens_ordem_compra_item_cotacao_id_fkey FOREIGN KEY (item_cotacao_id) REFERENCES public.itens_cotacao(id) ON DELETE SET NULL;


--
-- Name: itens_ordem_compra itens_ordem_compra_ordem_compra_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_ordem_compra
    ADD CONSTRAINT itens_ordem_compra_ordem_compra_id_fkey FOREIGN KEY (ordem_compra_id) REFERENCES public.ordens_compra(id) ON DELETE CASCADE;


--
-- Name: itens_pedido_coca itens_pedido_coca_pedido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_pedido_coca
    ADD CONSTRAINT itens_pedido_coca_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos_coca(id) ON DELETE CASCADE;


--
-- Name: itens_pedido_coca itens_pedido_coca_produto_coca_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_pedido_coca
    ADD CONSTRAINT itens_pedido_coca_produto_coca_id_fkey FOREIGN KEY (produto_coca_id) REFERENCES public.produtos_coca(id) ON DELETE CASCADE;


--
-- Name: itens_pedido_polpas itens_pedido_polpas_pedido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_pedido_polpas
    ADD CONSTRAINT itens_pedido_polpas_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos_polpas(id) ON DELETE CASCADE;


--
-- Name: itens_pedido_polpas itens_pedido_polpas_polpa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_pedido_polpas
    ADD CONSTRAINT itens_pedido_polpas_polpa_id_fkey FOREIGN KEY (polpa_id) REFERENCES public.polpas(id);


--
-- Name: itens_resposta_fornecedor itens_resposta_fornecedor_item_cotacao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_resposta_fornecedor
    ADD CONSTRAINT itens_resposta_fornecedor_item_cotacao_id_fkey FOREIGN KEY (item_cotacao_id) REFERENCES public.itens_cotacao(id) ON DELETE CASCADE;


--
-- Name: itens_resposta_fornecedor itens_resposta_fornecedor_resposta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_resposta_fornecedor
    ADD CONSTRAINT itens_resposta_fornecedor_resposta_id_fkey FOREIGN KEY (resposta_id) REFERENCES public.respostas_fornecedor(id) ON DELETE CASCADE;


--
-- Name: logs_atividade logs_atividade_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs_atividade
    ADD CONSTRAINT logs_atividade_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id);


--
-- Name: ordens_compra ordens_compra_cotacao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordens_compra
    ADD CONSTRAINT ordens_compra_cotacao_id_fkey FOREIGN KEY (cotacao_id) REFERENCES public.cotacoes(id) ON DELETE SET NULL;


--
-- Name: ordens_compra ordens_compra_fornecedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordens_compra
    ADD CONSTRAINT ordens_compra_fornecedor_id_fkey FOREIGN KEY (fornecedor_id) REFERENCES public.fornecedores(id) ON DELETE RESTRICT;


--
-- Name: ordens_compra ordens_compra_resposta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordens_compra
    ADD CONSTRAINT ordens_compra_resposta_id_fkey FOREIGN KEY (resposta_id) REFERENCES public.respostas_fornecedor(id) ON DELETE SET NULL;


--
-- Name: pedidos_coca pedidos_coca_sessao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos_coca
    ADD CONSTRAINT pedidos_coca_sessao_id_fkey FOREIGN KEY (sessao_id) REFERENCES public.sessoes_conferencia_coca(id) ON DELETE SET NULL;


--
-- Name: perdas perdas_lancamento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perdas
    ADD CONSTRAINT perdas_lancamento_id_fkey FOREIGN KEY (lancamento_id) REFERENCES public.lancamentos(id);


--
-- Name: perdas_polpas perdas_polpas_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perdas_polpas
    ADD CONSTRAINT perdas_polpas_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.itens_perdas_polpas(id);


--
-- Name: perdas_polpas perdas_polpas_lancamento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perdas_polpas
    ADD CONSTRAINT perdas_polpas_lancamento_id_fkey FOREIGN KEY (lancamento_id) REFERENCES public.lancamentos_perdas_polpas(id) ON DELETE CASCADE;


--
-- Name: perdas perdas_produto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perdas
    ADD CONSTRAINT perdas_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES public.produtos(id) ON DELETE CASCADE;


--
-- Name: recebimentos_legumes recebimentos_legumes_legume_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recebimentos_legumes
    ADD CONSTRAINT recebimentos_legumes_legume_id_fkey FOREIGN KEY (legume_id) REFERENCES public.legumes(id) ON DELETE CASCADE;


--
-- Name: respostas_fornecedor respostas_fornecedor_convite_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.respostas_fornecedor
    ADD CONSTRAINT respostas_fornecedor_convite_id_fkey FOREIGN KEY (convite_id) REFERENCES public.convites_fornecedor(id) ON DELETE SET NULL;


--
-- Name: respostas_fornecedor respostas_fornecedor_cotacao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.respostas_fornecedor
    ADD CONSTRAINT respostas_fornecedor_cotacao_id_fkey FOREIGN KEY (cotacao_id) REFERENCES public.cotacoes(id) ON DELETE CASCADE;


--
-- Name: respostas_fornecedor respostas_fornecedor_fornecedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.respostas_fornecedor
    ADD CONSTRAINT respostas_fornecedor_fornecedor_id_fkey FOREIGN KEY (fornecedor_id) REFERENCES public.fornecedores(id) ON DELETE CASCADE;


--
-- Name: configuracoes_sistema Administradores podem atualizar configurações; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Administradores podem atualizar configurações" ON public.configuracoes_sistema FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'administrador'::public.app_role)))));


--
-- Name: configuracoes_sistema Administradores podem inserir configurações; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Administradores podem inserir configurações" ON public.configuracoes_sistema FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'administrador'::public.app_role)))));


--
-- Name: configuracoes_sistema Administradores podem ver configurações; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Administradores podem ver configurações" ON public.configuracoes_sistema FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'administrador'::public.app_role)))));


--
-- Name: cotacoes Admins and operators can insert cotacoes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and operators can insert cotacoes" ON public.cotacoes FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'administrador'::public.app_role) OR public.has_role(auth.uid(), 'operador'::public.app_role)));


--
-- Name: itens_cotacao Admins and operators can insert itens_cotacao; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and operators can insert itens_cotacao" ON public.itens_cotacao FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'administrador'::public.app_role) OR public.has_role(auth.uid(), 'operador'::public.app_role)));


--
-- Name: itens_ordem_compra Admins and operators can insert itens_ordem_compra; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and operators can insert itens_ordem_compra" ON public.itens_ordem_compra FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'administrador'::public.app_role) OR public.has_role(auth.uid(), 'operador'::public.app_role)));


--
-- Name: itens_resposta_fornecedor Admins and operators can insert itens_resposta; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and operators can insert itens_resposta" ON public.itens_resposta_fornecedor FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'administrador'::public.app_role) OR public.has_role(auth.uid(), 'operador'::public.app_role)));


--
-- Name: ordens_compra Admins and operators can insert ordens_compra; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and operators can insert ordens_compra" ON public.ordens_compra FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'administrador'::public.app_role) OR public.has_role(auth.uid(), 'operador'::public.app_role)));


--
-- Name: respostas_fornecedor Admins and operators can insert respostas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and operators can insert respostas" ON public.respostas_fornecedor FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'administrador'::public.app_role) OR public.has_role(auth.uid(), 'operador'::public.app_role)));


--
-- Name: templates_etiquetas Admins and operators can insert templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and operators can insert templates" ON public.templates_etiquetas FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'administrador'::public.app_role) OR public.has_role(auth.uid(), 'operador'::public.app_role)));


--
-- Name: convites_fornecedor Admins and operators can manage convites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and operators can manage convites" ON public.convites_fornecedor USING ((public.has_role(auth.uid(), 'administrador'::public.app_role) OR public.has_role(auth.uid(), 'operador'::public.app_role)));


--
-- Name: fornecedores Admins and operators can manage fornecedores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and operators can manage fornecedores" ON public.fornecedores USING ((public.has_role(auth.uid(), 'administrador'::public.app_role) OR public.has_role(auth.uid(), 'operador'::public.app_role)));


--
-- Name: conferencias_coca Admins can delete conferencias_coca; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete conferencias_coca" ON public.conferencias_coca FOR DELETE USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: configuracoes_fracionamento Admins can delete fracionamento configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete fracionamento configs" ON public.configuracoes_fracionamento FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'administrador'::public.app_role)))));


--
-- Name: lancamentos Admins can delete launches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete launches" ON public.lancamentos FOR DELETE USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: perdas Admins can delete losses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete losses" ON public.perdas FOR DELETE USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: sessoes_conferencia_coca Admins can delete sessoes_conferencia_coca; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete sessoes_conferencia_coca" ON public.sessoes_conferencia_coca FOR DELETE USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: configuracoes_fracionamento Admins can insert fracionamento configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert fracionamento configs" ON public.configuracoes_fracionamento FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'administrador'::public.app_role)))));


--
-- Name: profiles Admins can insert profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: user_roles Admins can manage all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all roles" ON public.user_roles USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: templates_etiquetas Admins can manage all templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all templates" ON public.templates_etiquetas USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: conferencias_polpas Admins can manage conferencias; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage conferencias" ON public.conferencias_polpas USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: conferencias_coca Admins can manage conferencias_coca; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage conferencias_coca" ON public.conferencias_coca USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: configuracoes_email Admins can manage configuracoes_email; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage configuracoes_email" ON public.configuracoes_email USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: cotacoes Admins can manage cotacoes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage cotacoes" ON public.cotacoes USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: estoque Admins can manage estoque; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage estoque" ON public.estoque USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: itens_cotacao Admins can manage itens_cotacao; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage itens_cotacao" ON public.itens_cotacao USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: itens_oferta Admins can manage itens_oferta; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage itens_oferta" ON public.itens_oferta USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: itens_ordem_compra Admins can manage itens_ordem_compra; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage itens_ordem_compra" ON public.itens_ordem_compra USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: itens_perdas_geral Admins can manage itens_perdas_geral; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage itens_perdas_geral" ON public.itens_perdas_geral USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: itens_perdas_polpas Admins can manage itens_perdas_polpas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage itens_perdas_polpas" ON public.itens_perdas_polpas USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: itens_resposta_fornecedor Admins can manage itens_resposta; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage itens_resposta" ON public.itens_resposta_fornecedor USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: lancamentos_perdas_geral Admins can manage lancamentos_perdas_geral; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage lancamentos_perdas_geral" ON public.lancamentos_perdas_geral USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: lancamentos_perdas_polpas Admins can manage lancamentos_perdas_polpas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage lancamentos_perdas_polpas" ON public.lancamentos_perdas_polpas USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: legumes Admins can manage legumes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage legumes" ON public.legumes USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: perdas Admins can manage losses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage losses" ON public.perdas USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: ofertas Admins can manage ofertas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage ofertas" ON public.ofertas USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: ordens_compra Admins can manage ordens_compra; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage ordens_compra" ON public.ordens_compra USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: perdas_geral Admins can manage perdas_geral; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage perdas_geral" ON public.perdas_geral USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: perdas_polpas Admins can manage perdas_polpas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage perdas_polpas" ON public.perdas_polpas USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: user_module_permissions Admins can manage permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage permissions" ON public.user_module_permissions USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: polpas Admins can manage polpas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage polpas" ON public.polpas USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: produtos Admins can manage products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage products" ON public.produtos USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: produtos_coca Admins can manage produtos_coca; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage produtos_coca" ON public.produtos_coca USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: produtos_cotacao Admins can manage produtos_cotacao; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage produtos_cotacao" ON public.produtos_cotacao USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: recebimentos_legumes Admins can manage recebimentos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage recebimentos" ON public.recebimentos_legumes USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: respostas_fornecedor Admins can manage respostas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage respostas" ON public.respostas_fornecedor USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: sessoes_conferencia_coca Admins can manage sessoes_conferencia_coca; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage sessoes_conferencia_coca" ON public.sessoes_conferencia_coca USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: configuracoes_fracionamento Admins can update fracionamento configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update fracionamento configs" ON public.configuracoes_fracionamento FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'administrador'::public.app_role)))));


--
-- Name: lancamentos Admins can update launches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update launches" ON public.lancamentos FOR UPDATE USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: profiles Admins can update profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: logs_atividade Admins can view logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view logs" ON public.logs_atividade FOR SELECT USING (public.has_role(auth.uid(), 'administrador'::public.app_role));


--
-- Name: ai_categorization_feedback Authenticated users can create categorization feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create categorization feedback" ON public.ai_categorization_feedback FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: ai_insights Authenticated users can create insights; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create insights" ON public.ai_insights FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: itens_pedido_coca Authenticated users can delete Coca order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can delete Coca order items" ON public.itens_pedido_coca FOR DELETE USING (true);


--
-- Name: pedidos_coca Authenticated users can delete Coca orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can delete Coca orders" ON public.pedidos_coca FOR DELETE USING (true);


--
-- Name: itens_pedido_polpas Authenticated users can delete order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can delete order items" ON public.itens_pedido_polpas FOR DELETE TO authenticated USING (true);


--
-- Name: pedidos_polpas Authenticated users can delete orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can delete orders" ON public.pedidos_polpas FOR DELETE TO authenticated USING (true);


--
-- Name: itens_pedido_coca Authenticated users can insert Coca order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert Coca order items" ON public.itens_pedido_coca FOR INSERT WITH CHECK (true);


--
-- Name: pedidos_coca Authenticated users can insert Coca orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert Coca orders" ON public.pedidos_coca FOR INSERT WITH CHECK (true);


--
-- Name: itens_pedido_polpas Authenticated users can insert order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert order items" ON public.itens_pedido_polpas FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: pedidos_polpas Authenticated users can insert orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert orders" ON public.pedidos_polpas FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: historico_precos_compra Authenticated users can insert price history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert price history" ON public.historico_precos_compra FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: produtos_cotacao Authenticated users can insert produtos_cotacao; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert produtos_cotacao" ON public.produtos_cotacao FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: itens_pedido_coca Authenticated users can view all Coca order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view all Coca order items" ON public.itens_pedido_coca FOR SELECT USING (true);


--
-- Name: pedidos_coca Authenticated users can view all Coca orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view all Coca orders" ON public.pedidos_coca FOR SELECT USING (true);


--
-- Name: itens_pedido_polpas Authenticated users can view all order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view all order items" ON public.itens_pedido_polpas FOR SELECT TO authenticated USING (true);


--
-- Name: pedidos_polpas Authenticated users can view all orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view all orders" ON public.pedidos_polpas FOR SELECT TO authenticated USING (true);


--
-- Name: ai_categorization_feedback Authenticated users can view categorization feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view categorization feedback" ON public.ai_categorization_feedback FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: configuracoes_email Authenticated users can view configuracoes_email; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view configuracoes_email" ON public.configuracoes_email FOR SELECT USING (true);


--
-- Name: cotacoes Authenticated users can view cotacoes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view cotacoes" ON public.cotacoes FOR SELECT USING (true);


--
-- Name: fornecedores Authenticated users can view fornecedores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view fornecedores" ON public.fornecedores FOR SELECT USING (true);


--
-- Name: configuracoes_fracionamento Authenticated users can view fracionamento configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view fracionamento configs" ON public.configuracoes_fracionamento FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: itens_cotacao Authenticated users can view itens_cotacao; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view itens_cotacao" ON public.itens_cotacao FOR SELECT USING (true);


--
-- Name: legumes Authenticated users can view legumes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view legumes" ON public.legumes FOR SELECT USING (true);


--
-- Name: polpas Authenticated users can view polpas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view polpas" ON public.polpas FOR SELECT USING (true);


--
-- Name: historico_precos_compra Authenticated users can view price history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view price history" ON public.historico_precos_compra FOR SELECT TO authenticated USING (true);


--
-- Name: produtos Authenticated users can view products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view products" ON public.produtos FOR SELECT TO authenticated USING (true);


--
-- Name: produtos_coca Authenticated users can view produtos_coca; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view produtos_coca" ON public.produtos_coca FOR SELECT USING (true);


--
-- Name: produtos_cotacao Authenticated users can view produtos_cotacao; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view produtos_cotacao" ON public.produtos_cotacao FOR SELECT USING (true);


--
-- Name: templates_etiquetas Everyone can view active templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view active templates" ON public.templates_etiquetas FOR SELECT USING ((ativo = true));


--
-- Name: lancamentos Operators and admins can insert launches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Operators and admins can insert launches" ON public.lancamentos FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'administrador'::public.app_role) OR public.has_role(auth.uid(), 'operador'::public.app_role)));


--
-- Name: sessoes_conferencia_coca Operators and admins can insert sessoes_conferencia_coca; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Operators and admins can insert sessoes_conferencia_coca" ON public.sessoes_conferencia_coca FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'administrador'::public.app_role) OR public.has_role(auth.uid(), 'operador'::public.app_role)));


--
-- Name: conferencias_polpas Operators can insert conferencias; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Operators can insert conferencias" ON public.conferencias_polpas FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'administrador'::public.app_role) OR public.has_role(auth.uid(), 'operador'::public.app_role)));


--
-- Name: estoque Operators can insert estoque; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Operators can insert estoque" ON public.estoque FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'administrador'::public.app_role) OR public.has_role(auth.uid(), 'operador'::public.app_role)));


--
-- Name: itens_oferta Operators can insert itens_oferta; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Operators can insert itens_oferta" ON public.itens_oferta FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'administrador'::public.app_role) OR public.has_role(auth.uid(), 'operador'::public.app_role)));


--
-- Name: itens_perdas_geral Operators can insert itens_perdas_geral; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Operators can insert itens_perdas_geral" ON public.itens_perdas_geral FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'administrador'::public.app_role) OR public.has_role(auth.uid(), 'operador'::public.app_role)));


--
-- Name: lancamentos_perdas_geral Operators can insert lancamentos_perdas_geral; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Operators can insert lancamentos_perdas_geral" ON public.lancamentos_perdas_geral FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'administrador'::public.app_role) OR public.has_role(auth.uid(), 'operador'::public.app_role)));


--
-- Name: lancamentos_perdas_polpas Operators can insert lancamentos_perdas_polpas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Operators can insert lancamentos_perdas_polpas" ON public.lancamentos_perdas_polpas FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'administrador'::public.app_role) OR public.has_role(auth.uid(), 'operador'::public.app_role)));


--
-- Name: perdas Operators can insert losses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Operators can insert losses" ON public.perdas FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'administrador'::public.app_role) OR public.has_role(auth.uid(), 'operador'::public.app_role)));


--
-- Name: ofertas Operators can insert ofertas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Operators can insert ofertas" ON public.ofertas FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'administrador'::public.app_role) OR public.has_role(auth.uid(), 'operador'::public.app_role)));


--
-- Name: perdas_geral Operators can insert perdas_geral; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Operators can insert perdas_geral" ON public.perdas_geral FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'administrador'::public.app_role) OR public.has_role(auth.uid(), 'operador'::public.app_role)));


--
-- Name: perdas_polpas Operators can insert perdas_polpas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Operators can insert perdas_polpas" ON public.perdas_polpas FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'administrador'::public.app_role) OR public.has_role(auth.uid(), 'operador'::public.app_role)));


--
-- Name: recebimentos_legumes Operators can insert recebimentos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Operators can insert recebimentos" ON public.recebimentos_legumes FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'administrador'::public.app_role) OR public.has_role(auth.uid(), 'operador'::public.app_role)));


--
-- Name: logs_atividade System can insert logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert logs" ON public.logs_atividade FOR INSERT WITH CHECK (true);


--
-- Name: ai_feedback Users can create feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create feedback" ON public.ai_feedback FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: ai_conversations Users can create their own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own conversations" ON public.ai_conversations FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: ai_conversations Users can delete their own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own conversations" ON public.ai_conversations FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: ai_conversations Users can update their own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own conversations" ON public.ai_conversations FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: ai_insights Users can update their own insights; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own insights" ON public.ai_insights FOR UPDATE USING (((auth.uid() = user_id) OR (user_id IS NULL)));


--
-- Name: lancamentos Users can view all launches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view all launches" ON public.lancamentos FOR SELECT USING (true);


--
-- Name: conferencias_coca Users can view conferencias_coca; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view conferencias_coca" ON public.conferencias_coca FOR SELECT USING (true);


--
-- Name: conferencias_polpas Users can view conferencias_polpas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view conferencias_polpas" ON public.conferencias_polpas FOR SELECT USING ((public.has_role(auth.uid(), 'administrador'::public.app_role) OR (auth.uid() = usuario_id)));


--
-- Name: convites_fornecedor Users can view convites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view convites" ON public.convites_fornecedor FOR SELECT USING (true);


--
-- Name: estoque Users can view estoque; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view estoque" ON public.estoque FOR SELECT USING (true);


--
-- Name: ai_insights Users can view insights; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view insights" ON public.ai_insights FOR SELECT USING (((auth.uid() = user_id) OR (user_id IS NULL)));


--
-- Name: itens_oferta Users can view itens_oferta; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view itens_oferta" ON public.itens_oferta FOR SELECT USING (true);


--
-- Name: itens_ordem_compra Users can view itens_ordem_compra; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view itens_ordem_compra" ON public.itens_ordem_compra FOR SELECT USING (true);


--
-- Name: itens_perdas_geral Users can view itens_perdas_geral; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view itens_perdas_geral" ON public.itens_perdas_geral FOR SELECT USING (true);


--
-- Name: itens_perdas_polpas Users can view itens_perdas_polpas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view itens_perdas_polpas" ON public.itens_perdas_polpas FOR SELECT USING (true);


--
-- Name: itens_resposta_fornecedor Users can view itens_resposta; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view itens_resposta" ON public.itens_resposta_fornecedor FOR SELECT USING (true);


--
-- Name: lancamentos_perdas_geral Users can view lancamentos_perdas_geral; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view lancamentos_perdas_geral" ON public.lancamentos_perdas_geral FOR SELECT USING (true);


--
-- Name: lancamentos_perdas_polpas Users can view lancamentos_perdas_polpas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view lancamentos_perdas_polpas" ON public.lancamentos_perdas_polpas FOR SELECT USING (true);


--
-- Name: perdas Users can view losses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view losses" ON public.perdas FOR SELECT TO authenticated USING (true);


--
-- Name: ofertas Users can view ofertas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view ofertas" ON public.ofertas FOR SELECT USING (true);


--
-- Name: ordens_compra Users can view ordens_compra; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view ordens_compra" ON public.ordens_compra FOR SELECT USING (true);


--
-- Name: user_module_permissions Users can view own permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own permissions" ON public.user_module_permissions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: perdas_geral Users can view perdas_geral; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view perdas_geral" ON public.perdas_geral FOR SELECT USING (true);


--
-- Name: perdas_polpas Users can view perdas_polpas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view perdas_polpas" ON public.perdas_polpas FOR SELECT USING (true);


--
-- Name: recebimentos_legumes Users can view recebimentos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view recebimentos" ON public.recebimentos_legumes FOR SELECT USING (true);


--
-- Name: respostas_fornecedor Users can view respostas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view respostas" ON public.respostas_fornecedor FOR SELECT USING (true);


--
-- Name: sessoes_conferencia_coca Users can view sessoes_conferencia_coca; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view sessoes_conferencia_coca" ON public.sessoes_conferencia_coca FOR SELECT USING (true);


--
-- Name: ai_conversations Users can view their own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own conversations" ON public.ai_conversations FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: ai_feedback Users can view their own feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own feedback" ON public.ai_feedback FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view their own role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: conferencias_coca Users with module access can insert conferencias_coca; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users with module access can insert conferencias_coca" ON public.conferencias_coca FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'administrador'::public.app_role) OR public.has_role(auth.uid(), 'operador'::public.app_role)));


--
-- Name: ai_categorization_feedback; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_categorization_feedback ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_feedback; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_insights; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

--
-- Name: conferencias_coca; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conferencias_coca ENABLE ROW LEVEL SECURITY;

--
-- Name: conferencias_polpas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conferencias_polpas ENABLE ROW LEVEL SECURITY;

--
-- Name: configuracoes_email; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.configuracoes_email ENABLE ROW LEVEL SECURITY;

--
-- Name: configuracoes_fracionamento; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.configuracoes_fracionamento ENABLE ROW LEVEL SECURITY;

--
-- Name: configuracoes_sistema; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.configuracoes_sistema ENABLE ROW LEVEL SECURITY;

--
-- Name: convites_fornecedor; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.convites_fornecedor ENABLE ROW LEVEL SECURITY;

--
-- Name: cotacoes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cotacoes ENABLE ROW LEVEL SECURITY;

--
-- Name: estoque; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.estoque ENABLE ROW LEVEL SECURITY;

--
-- Name: fornecedores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

--
-- Name: historico_precos_compra; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.historico_precos_compra ENABLE ROW LEVEL SECURITY;

--
-- Name: itens_cotacao; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.itens_cotacao ENABLE ROW LEVEL SECURITY;

--
-- Name: itens_oferta; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.itens_oferta ENABLE ROW LEVEL SECURITY;

--
-- Name: itens_ordem_compra; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.itens_ordem_compra ENABLE ROW LEVEL SECURITY;

--
-- Name: itens_pedido_coca; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.itens_pedido_coca ENABLE ROW LEVEL SECURITY;

--
-- Name: itens_pedido_polpas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.itens_pedido_polpas ENABLE ROW LEVEL SECURITY;

--
-- Name: itens_perdas_geral; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.itens_perdas_geral ENABLE ROW LEVEL SECURITY;

--
-- Name: itens_perdas_polpas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.itens_perdas_polpas ENABLE ROW LEVEL SECURITY;

--
-- Name: itens_resposta_fornecedor; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.itens_resposta_fornecedor ENABLE ROW LEVEL SECURITY;

--
-- Name: lancamentos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;

--
-- Name: lancamentos_perdas_geral; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lancamentos_perdas_geral ENABLE ROW LEVEL SECURITY;

--
-- Name: lancamentos_perdas_polpas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lancamentos_perdas_polpas ENABLE ROW LEVEL SECURITY;

--
-- Name: legumes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.legumes ENABLE ROW LEVEL SECURITY;

--
-- Name: logs_atividade; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.logs_atividade ENABLE ROW LEVEL SECURITY;

--
-- Name: ofertas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ofertas ENABLE ROW LEVEL SECURITY;

--
-- Name: ordens_compra; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ordens_compra ENABLE ROW LEVEL SECURITY;

--
-- Name: pedidos_coca; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pedidos_coca ENABLE ROW LEVEL SECURITY;

--
-- Name: pedidos_polpas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pedidos_polpas ENABLE ROW LEVEL SECURITY;

--
-- Name: perdas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.perdas ENABLE ROW LEVEL SECURITY;

--
-- Name: perdas_geral; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.perdas_geral ENABLE ROW LEVEL SECURITY;

--
-- Name: perdas_polpas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.perdas_polpas ENABLE ROW LEVEL SECURITY;

--
-- Name: polpas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.polpas ENABLE ROW LEVEL SECURITY;

--
-- Name: produtos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

--
-- Name: produtos_coca; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.produtos_coca ENABLE ROW LEVEL SECURITY;

--
-- Name: produtos_cotacao; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.produtos_cotacao ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: recebimentos_legumes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recebimentos_legumes ENABLE ROW LEVEL SECURITY;

--
-- Name: respostas_fornecedor; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.respostas_fornecedor ENABLE ROW LEVEL SECURITY;

--
-- Name: sessoes_conferencia_coca; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sessoes_conferencia_coca ENABLE ROW LEVEL SECURITY;

--
-- Name: templates_etiquetas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.templates_etiquetas ENABLE ROW LEVEL SECURITY;

--
-- Name: user_module_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_module_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;