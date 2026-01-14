export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_categorization_feedback: {
        Row: {
          confidence: number | null
          created_at: string
          final_category: string
          id: string
          product_id: string | null
          product_name: string
          suggested_category: string
          user_id: string
          was_accepted: boolean
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          final_category: string
          id?: string
          product_id?: string | null
          product_name: string
          suggested_category: string
          user_id: string
          was_accepted: boolean
        }
        Update: {
          confidence?: number | null
          created_at?: string
          final_category?: string
          id?: string
          product_id?: string | null
          product_name?: string
          suggested_category?: string
          user_id?: string
          was_accepted?: boolean
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          context_type: string
          created_at: string
          id: string
          messages: Json
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          context_type?: string
          created_at?: string
          id?: string
          messages?: Json
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          context_type?: string
          created_at?: string
          id?: string
          messages?: Json
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_feedback: {
        Row: {
          conversation_id: string | null
          created_at: string
          feedback_text: string | null
          id: string
          message_index: number
          user_id: string
          was_helpful: boolean
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          feedback_text?: string | null
          id?: string
          message_index: number
          user_id: string
          was_helpful: boolean
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          feedback_text?: string | null
          id?: string
          message_index?: number
          user_id?: string
          was_helpful?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ai_feedback_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insights: {
        Row: {
          created_at: string
          data: Json | null
          description: string
          expires_at: string | null
          id: string
          insight_type: string
          is_dismissed: boolean | null
          is_read: boolean | null
          priority: string
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          description: string
          expires_at?: string | null
          id?: string
          insight_type: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          priority?: string
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          description?: string
          expires_at?: string | null
          id?: string
          insight_type?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          priority?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      conferencias_coca: {
        Row: {
          criado_em: string | null
          data_conferencia: string
          id: string
          numero_conferencia: number | null
          produto_coca_id: string
          quantidade_conferida: number
          sessao_id: string | null
          tipo_unidade: string
          usuario_id: string
        }
        Insert: {
          criado_em?: string | null
          data_conferencia?: string
          id?: string
          numero_conferencia?: number | null
          produto_coca_id: string
          quantidade_conferida: number
          sessao_id?: string | null
          tipo_unidade?: string
          usuario_id: string
        }
        Update: {
          criado_em?: string | null
          data_conferencia?: string
          id?: string
          numero_conferencia?: number | null
          produto_coca_id?: string
          quantidade_conferida?: number
          sessao_id?: string | null
          tipo_unidade?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conferencias_coca_produto_coca_id_fkey"
            columns: ["produto_coca_id"]
            isOneToOne: false
            referencedRelation: "produtos_coca"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conferencias_coca_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "sessoes_conferencia_coca"
            referencedColumns: ["id"]
          },
        ]
      }
      conferencias_polpas: {
        Row: {
          criado_em: string | null
          data_conferencia: string
          id: string
          observacao: string | null
          polpa_id: string
          quantidade_conferida: number
          usuario_id: string
        }
        Insert: {
          criado_em?: string | null
          data_conferencia?: string
          id?: string
          observacao?: string | null
          polpa_id: string
          quantidade_conferida: number
          usuario_id: string
        }
        Update: {
          criado_em?: string | null
          data_conferencia?: string
          id?: string
          observacao?: string | null
          polpa_id?: string
          quantidade_conferida?: number
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conferencias_polpas_polpa_id_fkey"
            columns: ["polpa_id"]
            isOneToOne: false
            referencedRelation: "polpas"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_email: {
        Row: {
          assunto_padrao: string
          ativo: boolean | null
          atualizado_em: string | null
          cor_primaria: string | null
          criado_em: string | null
          email_empresa: string | null
          endereco_empresa: string | null
          id: string
          logo_url: string | null
          mensagem_cabecalho: string | null
          mensagem_rodape: string | null
          nome_empresa: string | null
          telefone_empresa: string | null
          tipo_email: string
        }
        Insert: {
          assunto_padrao: string
          ativo?: boolean | null
          atualizado_em?: string | null
          cor_primaria?: string | null
          criado_em?: string | null
          email_empresa?: string | null
          endereco_empresa?: string | null
          id?: string
          logo_url?: string | null
          mensagem_cabecalho?: string | null
          mensagem_rodape?: string | null
          nome_empresa?: string | null
          telefone_empresa?: string | null
          tipo_email: string
        }
        Update: {
          assunto_padrao?: string
          ativo?: boolean | null
          atualizado_em?: string | null
          cor_primaria?: string | null
          criado_em?: string | null
          email_empresa?: string | null
          endereco_empresa?: string | null
          id?: string
          logo_url?: string | null
          mensagem_cabecalho?: string | null
          mensagem_rodape?: string | null
          nome_empresa?: string | null
          telefone_empresa?: string | null
          tipo_email?: string
        }
        Relationships: []
      }
      configuracoes_fracionamento: {
        Row: {
          ativo: boolean | null
          atualizado_em: string
          criado_em: string
          id: string
          nome_produto: string
          observacao: string | null
          peso_caixa_kg: number
          peso_medio_unidade_kg: number | null
          preco_caixa: number
          preco_por_kg: number | null
          preco_por_unidade: number | null
          produto_id: string | null
          tipo_venda: string
          unidades_por_caixa: number
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string
          criado_em?: string
          id?: string
          nome_produto: string
          observacao?: string | null
          peso_caixa_kg?: number
          peso_medio_unidade_kg?: number | null
          preco_caixa?: number
          preco_por_kg?: number | null
          preco_por_unidade?: number | null
          produto_id?: string | null
          tipo_venda?: string
          unidades_por_caixa?: number
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string
          criado_em?: string
          id?: string
          nome_produto?: string
          observacao?: string | null
          peso_caixa_kg?: number
          peso_medio_unidade_kg?: number | null
          preco_caixa?: number
          preco_por_kg?: number | null
          preco_por_unidade?: number | null
          produto_id?: string | null
          tipo_venda?: string
          unidades_por_caixa?: number
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_fracionamento_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "estoque"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_login: {
        Row: {
          atualizado_em: string | null
          cor_fundo: string | null
          criado_em: string | null
          id: string
          logo_url: string | null
          mostrar_icones: boolean | null
          permitir_cadastro: boolean | null
          subtitulo: string
          titulo: string
        }
        Insert: {
          atualizado_em?: string | null
          cor_fundo?: string | null
          criado_em?: string | null
          id?: string
          logo_url?: string | null
          mostrar_icones?: boolean | null
          permitir_cadastro?: boolean | null
          subtitulo?: string
          titulo?: string
        }
        Update: {
          atualizado_em?: string | null
          cor_fundo?: string | null
          criado_em?: string | null
          id?: string
          logo_url?: string | null
          mostrar_icones?: boolean | null
          permitir_cadastro?: boolean | null
          subtitulo?: string
          titulo?: string
        }
        Relationships: []
      }
      configuracoes_sistema: {
        Row: {
          atualizado_em: string
          chave: string
          criado_em: string
          id: string
          valor: Json
        }
        Insert: {
          atualizado_em?: string
          chave: string
          criado_em?: string
          id?: string
          valor: Json
        }
        Update: {
          atualizado_em?: string
          chave?: string
          criado_em?: string
          id?: string
          valor?: Json
        }
        Relationships: []
      }
      convites_fornecedor: {
        Row: {
          cotacao_id: string
          criado_em: string | null
          enviado_em: string | null
          fornecedor_id: string
          id: string
          respondido_em: string | null
          status: Database["public"]["Enums"]["convite_status"]
          visualizado_em: string | null
        }
        Insert: {
          cotacao_id: string
          criado_em?: string | null
          enviado_em?: string | null
          fornecedor_id: string
          id?: string
          respondido_em?: string | null
          status?: Database["public"]["Enums"]["convite_status"]
          visualizado_em?: string | null
        }
        Update: {
          cotacao_id?: string
          criado_em?: string | null
          enviado_em?: string | null
          fornecedor_id?: string
          id?: string
          respondido_em?: string | null
          status?: Database["public"]["Enums"]["convite_status"]
          visualizado_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "convites_fornecedor_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "cotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convites_fornecedor_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacoes: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          criado_em: string | null
          data_abertura_automatica: string | null
          data_cotacao: string
          data_fechamento_automatico: string | null
          data_limite_resposta: string | null
          data_validade: string | null
          fornecedor_id: string | null
          id: string
          justificativa_escolha: string | null
          modo_abertura: string | null
          modo_fechamento: string | null
          numero: number
          observacao: string | null
          status: Database["public"]["Enums"]["cotacao_status"] | null
          titulo: string | null
          total: number | null
          usuario_id: string
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          criado_em?: string | null
          data_abertura_automatica?: string | null
          data_cotacao?: string
          data_fechamento_automatico?: string | null
          data_limite_resposta?: string | null
          data_validade?: string | null
          fornecedor_id?: string | null
          id?: string
          justificativa_escolha?: string | null
          modo_abertura?: string | null
          modo_fechamento?: string | null
          numero?: number
          observacao?: string | null
          status?: Database["public"]["Enums"]["cotacao_status"] | null
          titulo?: string | null
          total?: number | null
          usuario_id: string
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          criado_em?: string | null
          data_abertura_automatica?: string | null
          data_cotacao?: string
          data_fechamento_automatico?: string | null
          data_limite_resposta?: string | null
          data_validade?: string | null
          fornecedor_id?: string | null
          id?: string
          justificativa_escolha?: string | null
          modo_abertura?: string | null
          modo_fechamento?: string | null
          numero?: number
          observacao?: string | null
          status?: Database["public"]["Enums"]["cotacao_status"] | null
          titulo?: string | null
          total?: number | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotacoes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          codigo: string
          codigo_barras: string | null
          criado_em: string | null
          estoque_atual: number
          estoque_maximo: number | null
          estoque_minimo: number
          grupo: string | null
          id: string
          localizacao: string | null
          marca: string | null
          ncm: string | null
          nome: string
          peso_bruto: number | null
          peso_liquido: number | null
          preco_custo: number
          preco_promocao: number | null
          preco_venda: number
          referencia: string | null
          saldo: number | null
          subgrupo: string | null
          unidade: string | null
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          codigo: string
          codigo_barras?: string | null
          criado_em?: string | null
          estoque_atual?: number
          estoque_maximo?: number | null
          estoque_minimo?: number
          grupo?: string | null
          id?: string
          localizacao?: string | null
          marca?: string | null
          ncm?: string | null
          nome: string
          peso_bruto?: number | null
          peso_liquido?: number | null
          preco_custo?: number
          preco_promocao?: number | null
          preco_venda?: number
          referencia?: string | null
          saldo?: number | null
          subgrupo?: string | null
          unidade?: string | null
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          codigo?: string
          codigo_barras?: string | null
          criado_em?: string | null
          estoque_atual?: number
          estoque_maximo?: number | null
          estoque_minimo?: number
          grupo?: string | null
          id?: string
          localizacao?: string | null
          marca?: string | null
          ncm?: string | null
          nome?: string
          peso_bruto?: number | null
          peso_liquido?: number | null
          preco_custo?: number
          preco_promocao?: number | null
          preco_venda?: number
          referencia?: string | null
          saldo?: number | null
          subgrupo?: string | null
          unidade?: string | null
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          ativo: boolean | null
          cnpj: string | null
          contato: string | null
          criado_em: string | null
          email: string | null
          endereco: string | null
          id: string
          nome: string
          observacao: string | null
          telefone: string | null
        }
        Insert: {
          ativo?: boolean | null
          cnpj?: string | null
          contato?: string | null
          criado_em?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          observacao?: string | null
          telefone?: string | null
        }
        Update: {
          ativo?: boolean | null
          cnpj?: string | null
          contato?: string | null
          criado_em?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          observacao?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
      historico_precos_compra: {
        Row: {
          criado_em: string
          data_compra: string
          estoque_id: string | null
          fornecedor_id: string | null
          id: string
          ordem_compra_id: string | null
          preco_compra: number
        }
        Insert: {
          criado_em?: string
          data_compra?: string
          estoque_id?: string | null
          fornecedor_id?: string | null
          id?: string
          ordem_compra_id?: string | null
          preco_compra: number
        }
        Update: {
          criado_em?: string
          data_compra?: string
          estoque_id?: string | null
          fornecedor_id?: string | null
          id?: string
          ordem_compra_id?: string | null
          preco_compra?: number
        }
        Relationships: [
          {
            foreignKeyName: "historico_precos_compra_estoque_id_fkey"
            columns: ["estoque_id"]
            isOneToOne: false
            referencedRelation: "estoque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_precos_compra_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_precos_compra_ordem_compra_id_fkey"
            columns: ["ordem_compra_id"]
            isOneToOne: false
            referencedRelation: "ordens_compra"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_cotacao: {
        Row: {
          codigo_barras: string | null
          cotacao_id: string
          criado_em: string | null
          id: string
          nome_produto: string
          observacao: string | null
          preco_total: number | null
          preco_unitario: number | null
          produto_id: string | null
          quantidade: number
        }
        Insert: {
          codigo_barras?: string | null
          cotacao_id: string
          criado_em?: string | null
          id?: string
          nome_produto: string
          observacao?: string | null
          preco_total?: number | null
          preco_unitario?: number | null
          produto_id?: string | null
          quantidade?: number
        }
        Update: {
          codigo_barras?: string | null
          cotacao_id?: string
          criado_em?: string | null
          id?: string
          nome_produto?: string
          observacao?: string | null
          preco_total?: number | null
          preco_unitario?: number | null
          produto_id?: string | null
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_cotacao_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "cotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_cotacao_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos_cotacao"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_fracionamento: {
        Row: {
          config_id: string | null
          criado_em: string | null
          id: string
          margem_aplicada: number | null
          preco_caixa: number
          preco_custo_kg: number | null
          preco_custo_un: number | null
          preco_venda_kg: number | null
          preco_venda_un: number | null
          sessao_id: string | null
        }
        Insert: {
          config_id?: string | null
          criado_em?: string | null
          id?: string
          margem_aplicada?: number | null
          preco_caixa: number
          preco_custo_kg?: number | null
          preco_custo_un?: number | null
          preco_venda_kg?: number | null
          preco_venda_un?: number | null
          sessao_id?: string | null
        }
        Update: {
          config_id?: string | null
          criado_em?: string | null
          id?: string
          margem_aplicada?: number | null
          preco_caixa?: number
          preco_custo_kg?: number | null
          preco_custo_un?: number | null
          preco_venda_kg?: number | null
          preco_venda_un?: number | null
          sessao_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itens_fracionamento_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "configuracoes_fracionamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_fracionamento_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "sessoes_fracionamento"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_oferta: {
        Row: {
          criado_em: string | null
          destaque: boolean | null
          economia_percentual: number | null
          id: string
          item_id: string | null
          lucro_real: number | null
          margem_lucro: number | null
          nome_item: string
          observacao: string | null
          oferta_id: string | null
          preco_custo: number
          preco_oferta: number
          preco_venda_normal: number
          quantidade_limite: number | null
        }
        Insert: {
          criado_em?: string | null
          destaque?: boolean | null
          economia_percentual?: number | null
          id?: string
          item_id?: string | null
          lucro_real?: number | null
          margem_lucro?: number | null
          nome_item: string
          observacao?: string | null
          oferta_id?: string | null
          preco_custo?: number
          preco_oferta?: number
          preco_venda_normal?: number
          quantidade_limite?: number | null
        }
        Update: {
          criado_em?: string | null
          destaque?: boolean | null
          economia_percentual?: number | null
          id?: string
          item_id?: string | null
          lucro_real?: number | null
          margem_lucro?: number | null
          nome_item?: string
          observacao?: string | null
          oferta_id?: string | null
          preco_custo?: number
          preco_oferta?: number
          preco_venda_normal?: number
          quantidade_limite?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "itens_oferta_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "itens_perdas_geral"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_oferta_oferta_id_fkey"
            columns: ["oferta_id"]
            isOneToOne: false
            referencedRelation: "ofertas"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_ordem_compra: {
        Row: {
          codigo_barras: string | null
          criado_em: string | null
          estoque_id: string | null
          id: string
          item_cotacao_id: string | null
          nome_produto: string
          observacao: string | null
          ordem_compra_id: string
          preco_total: number | null
          preco_unitario: number
          quantidade: number
        }
        Insert: {
          codigo_barras?: string | null
          criado_em?: string | null
          estoque_id?: string | null
          id?: string
          item_cotacao_id?: string | null
          nome_produto: string
          observacao?: string | null
          ordem_compra_id: string
          preco_total?: number | null
          preco_unitario?: number
          quantidade?: number
        }
        Update: {
          codigo_barras?: string | null
          criado_em?: string | null
          estoque_id?: string | null
          id?: string
          item_cotacao_id?: string | null
          nome_produto?: string
          observacao?: string | null
          ordem_compra_id?: string
          preco_total?: number | null
          preco_unitario?: number
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_ordem_compra_estoque_id_fkey"
            columns: ["estoque_id"]
            isOneToOne: false
            referencedRelation: "estoque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_ordem_compra_item_cotacao_id_fkey"
            columns: ["item_cotacao_id"]
            isOneToOne: false
            referencedRelation: "itens_cotacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_ordem_compra_ordem_compra_id_fkey"
            columns: ["ordem_compra_id"]
            isOneToOne: false
            referencedRelation: "ordens_compra"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_pedido_coca: {
        Row: {
          criado_em: string
          id: string
          pedido_id: string
          produto_coca_id: string
          quantidade: number
        }
        Insert: {
          criado_em?: string
          id?: string
          pedido_id: string
          produto_coca_id: string
          quantidade: number
        }
        Update: {
          criado_em?: string
          id?: string
          pedido_id?: string
          produto_coca_id?: string
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_pedido_coca_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_coca"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_pedido_coca_produto_coca_id_fkey"
            columns: ["produto_coca_id"]
            isOneToOne: false
            referencedRelation: "produtos_coca"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_pedido_polpas: {
        Row: {
          criado_em: string
          id: string
          pedido_id: string
          polpa_id: string
          quantidade: number
        }
        Insert: {
          criado_em?: string
          id?: string
          pedido_id: string
          polpa_id: string
          quantidade: number
        }
        Update: {
          criado_em?: string
          id?: string
          pedido_id?: string
          polpa_id?: string
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_pedido_polpas_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_polpas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_pedido_polpas_polpa_id_fkey"
            columns: ["polpa_id"]
            isOneToOne: false
            referencedRelation: "polpas"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_perdas_geral: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          codigo_barras: string | null
          criado_em: string | null
          id: string
          imagem_url: string | null
          marca: string | null
          nome_item: string
          preco_custo: number
          preco_venda: number
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          codigo_barras?: string | null
          criado_em?: string | null
          id?: string
          imagem_url?: string | null
          marca?: string | null
          nome_item: string
          preco_custo?: number
          preco_venda?: number
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          codigo_barras?: string | null
          criado_em?: string | null
          id?: string
          imagem_url?: string | null
          marca?: string | null
          nome_item?: string
          preco_custo?: number
          preco_venda?: number
        }
        Relationships: []
      }
      itens_perdas_polpas: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          criado_em: string | null
          id: string
          nome_item: string
          preco_custo: number
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          criado_em?: string | null
          id?: string
          nome_item: string
          preco_custo?: number
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          criado_em?: string | null
          id?: string
          nome_item?: string
          preco_custo?: number
        }
        Relationships: []
      }
      itens_resposta_fornecedor: {
        Row: {
          criado_em: string | null
          disponivel: boolean | null
          id: string
          item_cotacao_id: string
          observacao: string | null
          prazo_entrega_dias: number | null
          preco_unitario: number
          resposta_id: string
        }
        Insert: {
          criado_em?: string | null
          disponivel?: boolean | null
          id?: string
          item_cotacao_id: string
          observacao?: string | null
          prazo_entrega_dias?: number | null
          preco_unitario?: number
          resposta_id: string
        }
        Update: {
          criado_em?: string | null
          disponivel?: boolean | null
          id?: string
          item_cotacao_id?: string
          observacao?: string | null
          prazo_entrega_dias?: number | null
          preco_unitario?: number
          resposta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itens_resposta_fornecedor_item_cotacao_id_fkey"
            columns: ["item_cotacao_id"]
            isOneToOne: false
            referencedRelation: "itens_cotacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_resposta_fornecedor_resposta_id_fkey"
            columns: ["resposta_id"]
            isOneToOne: false
            referencedRelation: "respostas_fornecedor"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos: {
        Row: {
          criado_em: string | null
          data_lancamento: string
          id: string
          numero: number
          observacao: string | null
          status: Database["public"]["Enums"]["status_lancamento"]
          usuario_id: string
        }
        Insert: {
          criado_em?: string | null
          data_lancamento?: string
          id?: string
          numero?: number
          observacao?: string | null
          status?: Database["public"]["Enums"]["status_lancamento"]
          usuario_id: string
        }
        Update: {
          criado_em?: string | null
          data_lancamento?: string
          id?: string
          numero?: number
          observacao?: string | null
          status?: Database["public"]["Enums"]["status_lancamento"]
          usuario_id?: string
        }
        Relationships: []
      }
      lancamentos_perdas_geral: {
        Row: {
          criado_em: string | null
          data_lancamento: string
          id: string
          numero: number
          observacao: string | null
          status: string
          usuario_id: string
        }
        Insert: {
          criado_em?: string | null
          data_lancamento?: string
          id?: string
          numero?: number
          observacao?: string | null
          status?: string
          usuario_id: string
        }
        Update: {
          criado_em?: string | null
          data_lancamento?: string
          id?: string
          numero?: number
          observacao?: string | null
          status?: string
          usuario_id?: string
        }
        Relationships: []
      }
      lancamentos_perdas_polpas: {
        Row: {
          criado_em: string | null
          data_lancamento: string
          id: string
          numero: number
          observacao: string | null
          status: string
          usuario_id: string
        }
        Insert: {
          criado_em?: string | null
          data_lancamento?: string
          id?: string
          numero?: number
          observacao?: string | null
          status?: string
          usuario_id: string
        }
        Update: {
          criado_em?: string | null
          data_lancamento?: string
          id?: string
          numero?: number
          observacao?: string | null
          status?: string
          usuario_id?: string
        }
        Relationships: []
      }
      legumes: {
        Row: {
          criado_em: string | null
          estoque_minimo: number
          id: string
          nome_legume: string
          preco_unitario: number
          quantidade_estoque: number
          unidade_medida: string
        }
        Insert: {
          criado_em?: string | null
          estoque_minimo?: number
          id?: string
          nome_legume: string
          preco_unitario?: number
          quantidade_estoque?: number
          unidade_medida?: string
        }
        Update: {
          criado_em?: string | null
          estoque_minimo?: number
          id?: string
          nome_legume?: string
          preco_unitario?: number
          quantidade_estoque?: number
          unidade_medida?: string
        }
        Relationships: []
      }
      logs_atividade: {
        Row: {
          acao: string
          criado_em: string | null
          detalhes: Json | null
          id: string
          usuario_id: string | null
        }
        Insert: {
          acao: string
          criado_em?: string | null
          detalhes?: Json | null
          id?: string
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          criado_em?: string | null
          detalhes?: Json | null
          id?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      ofertas: {
        Row: {
          atualizado_em: string | null
          criado_em: string | null
          data_fim: string
          data_inicio: string
          id: string
          nome_campanha: string
          observacao: string | null
          setor: string | null
          status: string | null
          tipo: string
          usuario_id: string
        }
        Insert: {
          atualizado_em?: string | null
          criado_em?: string | null
          data_fim: string
          data_inicio: string
          id?: string
          nome_campanha: string
          observacao?: string | null
          setor?: string | null
          status?: string | null
          tipo?: string
          usuario_id: string
        }
        Update: {
          atualizado_em?: string | null
          criado_em?: string | null
          data_fim?: string
          data_inicio?: string
          id?: string
          nome_campanha?: string
          observacao?: string | null
          setor?: string | null
          status?: string | null
          tipo?: string
          usuario_id?: string
        }
        Relationships: []
      }
      ordens_compra: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          atualizado_em: string | null
          condicao_pagamento: string | null
          cotacao_id: string | null
          criado_em: string | null
          data_entrega_prevista: string | null
          data_entrega_real: string | null
          data_ordem: string | null
          fornecedor_id: string
          id: string
          numero: number
          observacao: string | null
          resposta_id: string | null
          status: Database["public"]["Enums"]["ordem_compra_status"]
          total: number | null
          usuario_id: string
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          atualizado_em?: string | null
          condicao_pagamento?: string | null
          cotacao_id?: string | null
          criado_em?: string | null
          data_entrega_prevista?: string | null
          data_entrega_real?: string | null
          data_ordem?: string | null
          fornecedor_id: string
          id?: string
          numero?: number
          observacao?: string | null
          resposta_id?: string | null
          status?: Database["public"]["Enums"]["ordem_compra_status"]
          total?: number | null
          usuario_id: string
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          atualizado_em?: string | null
          condicao_pagamento?: string | null
          cotacao_id?: string | null
          criado_em?: string | null
          data_entrega_prevista?: string | null
          data_entrega_real?: string | null
          data_ordem?: string | null
          fornecedor_id?: string
          id?: string
          numero?: number
          observacao?: string | null
          resposta_id?: string | null
          status?: Database["public"]["Enums"]["ordem_compra_status"]
          total?: number | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordens_compra_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "cotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_compra_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_compra_resposta_id_fkey"
            columns: ["resposta_id"]
            isOneToOne: false
            referencedRelation: "respostas_fornecedor"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_coca: {
        Row: {
          criado_em: string
          data_pedido: string
          id: string
          numero: number
          observacao: string | null
          sessao_id: string | null
          total_itens: number
          total_unidades: number
          usuario_id: string
        }
        Insert: {
          criado_em?: string
          data_pedido?: string
          id?: string
          numero?: number
          observacao?: string | null
          sessao_id?: string | null
          total_itens?: number
          total_unidades?: number
          usuario_id: string
        }
        Update: {
          criado_em?: string
          data_pedido?: string
          id?: string
          numero?: number
          observacao?: string | null
          sessao_id?: string | null
          total_itens?: number
          total_unidades?: number
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_coca_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "sessoes_conferencia_coca"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_polpas: {
        Row: {
          criado_em: string
          data_pedido: string
          id: string
          numero: number
          observacao: string | null
          total_itens: number
          total_unidades: number
          usuario_id: string
        }
        Insert: {
          criado_em?: string
          data_pedido?: string
          id?: string
          numero?: number
          observacao?: string | null
          total_itens?: number
          total_unidades?: number
          usuario_id: string
        }
        Update: {
          criado_em?: string
          data_pedido?: string
          id?: string
          numero?: number
          observacao?: string | null
          total_itens?: number
          total_unidades?: number
          usuario_id?: string
        }
        Relationships: []
      }
      perdas: {
        Row: {
          criado_em: string | null
          data_perda: string
          id: string
          lancamento_id: string | null
          motivo_perda: Database["public"]["Enums"]["motivo_perda"]
          observacao: string | null
          peso_perdido: number | null
          produto_id: string
          quantidade_perdida: number | null
          usuario_id: string
          valor_perda: number | null
        }
        Insert: {
          criado_em?: string | null
          data_perda?: string
          id?: string
          lancamento_id?: string | null
          motivo_perda: Database["public"]["Enums"]["motivo_perda"]
          observacao?: string | null
          peso_perdido?: number | null
          produto_id: string
          quantidade_perdida?: number | null
          usuario_id: string
          valor_perda?: number | null
        }
        Update: {
          criado_em?: string | null
          data_perda?: string
          id?: string
          lancamento_id?: string | null
          motivo_perda?: Database["public"]["Enums"]["motivo_perda"]
          observacao?: string | null
          peso_perdido?: number | null
          produto_id?: string
          quantidade_perdida?: number | null
          usuario_id?: string
          valor_perda?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "perdas_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "lancamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perdas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      perdas_geral: {
        Row: {
          criado_em: string | null
          data_perda: string
          data_vencimento: string | null
          id: string
          item_id: string
          lancamento_id: string | null
          motivo_perda: Database["public"]["Enums"]["motivo_perda_geral"]
          observacao: string | null
          preco_unitario: number
          quantidade_perdida: number
          tipo_resolucao: Database["public"]["Enums"]["tipo_resolucao_geral"]
          usuario_id: string
          valor_perda: number | null
        }
        Insert: {
          criado_em?: string | null
          data_perda?: string
          data_vencimento?: string | null
          id?: string
          item_id: string
          lancamento_id?: string | null
          motivo_perda: Database["public"]["Enums"]["motivo_perda_geral"]
          observacao?: string | null
          preco_unitario?: number
          quantidade_perdida?: number
          tipo_resolucao?: Database["public"]["Enums"]["tipo_resolucao_geral"]
          usuario_id: string
          valor_perda?: number | null
        }
        Update: {
          criado_em?: string | null
          data_perda?: string
          data_vencimento?: string | null
          id?: string
          item_id?: string
          lancamento_id?: string | null
          motivo_perda?: Database["public"]["Enums"]["motivo_perda_geral"]
          observacao?: string | null
          preco_unitario?: number
          quantidade_perdida?: number
          tipo_resolucao?: Database["public"]["Enums"]["tipo_resolucao_geral"]
          usuario_id?: string
          valor_perda?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_item"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "itens_perdas_geral"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_lancamento"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "lancamentos_perdas_geral"
            referencedColumns: ["id"]
          },
        ]
      }
      perdas_polpas: {
        Row: {
          criado_em: string | null
          data_perda: string
          id: string
          item_id: string
          lancamento_id: string | null
          motivo_perda: string
          observacao: string | null
          quantidade_perdida: number
          tipo_resolucao: string
          usuario_id: string
        }
        Insert: {
          criado_em?: string | null
          data_perda?: string
          id?: string
          item_id: string
          lancamento_id?: string | null
          motivo_perda: string
          observacao?: string | null
          quantidade_perdida?: number
          tipo_resolucao?: string
          usuario_id: string
        }
        Update: {
          criado_em?: string | null
          data_perda?: string
          id?: string
          item_id?: string
          lancamento_id?: string | null
          motivo_perda?: string
          observacao?: string | null
          quantidade_perdida?: number
          tipo_resolucao?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perdas_polpas_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "itens_perdas_polpas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perdas_polpas_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "lancamentos_perdas_polpas"
            referencedColumns: ["id"]
          },
        ]
      }
      polpas: {
        Row: {
          criado_em: string | null
          estoque_minimo: number
          id: string
          nome_polpa: string
          preco_unitario: number
          quantidade_estoque: number
        }
        Insert: {
          criado_em?: string | null
          estoque_minimo?: number
          id?: string
          nome_polpa: string
          preco_unitario?: number
          quantidade_estoque?: number
        }
        Update: {
          criado_em?: string | null
          estoque_minimo?: number
          id?: string
          nome_polpa?: string
          preco_unitario?: number
          quantidade_estoque?: number
        }
        Relationships: []
      }
      produtos: {
        Row: {
          categoria: Database["public"]["Enums"]["categoria_produto"]
          criado_em: string | null
          estoque_minimo: number
          id: string
          nome_produto: string
          oculto_ofertas: boolean | null
          preco_unitario: number
          preco_venda: number | null
          quantidade_estoque: number
          quantidade_por_caixa: number | null
          unidade_fracionamento: string | null
          unidade_medida: Database["public"]["Enums"]["unidade_medida"]
        }
        Insert: {
          categoria: Database["public"]["Enums"]["categoria_produto"]
          criado_em?: string | null
          estoque_minimo?: number
          id?: string
          nome_produto: string
          oculto_ofertas?: boolean | null
          preco_unitario?: number
          preco_venda?: number | null
          quantidade_estoque?: number
          quantidade_por_caixa?: number | null
          unidade_fracionamento?: string | null
          unidade_medida?: Database["public"]["Enums"]["unidade_medida"]
        }
        Update: {
          categoria?: Database["public"]["Enums"]["categoria_produto"]
          criado_em?: string | null
          estoque_minimo?: number
          id?: string
          nome_produto?: string
          oculto_ofertas?: boolean | null
          preco_unitario?: number
          preco_venda?: number | null
          quantidade_estoque?: number
          quantidade_por_caixa?: number | null
          unidade_fracionamento?: string | null
          unidade_medida?: Database["public"]["Enums"]["unidade_medida"]
        }
        Relationships: []
      }
      produtos_coca: {
        Row: {
          criado_em: string | null
          estoque_minimo: number
          id: string
          nome_produto: string
          preco_unitario: number
          quantidade_estoque: number
          unidades_por_fardo: number
        }
        Insert: {
          criado_em?: string | null
          estoque_minimo?: number
          id?: string
          nome_produto: string
          preco_unitario?: number
          quantidade_estoque?: number
          unidades_por_fardo?: number
        }
        Update: {
          criado_em?: string | null
          estoque_minimo?: number
          id?: string
          nome_produto?: string
          preco_unitario?: number
          quantidade_estoque?: number
          unidades_por_fardo?: number
        }
        Relationships: []
      }
      produtos_cotacao: {
        Row: {
          categoria: string | null
          codigo_barras: string | null
          criado_em: string | null
          descricao: string | null
          id: string
          imagem_url: string | null
          marca: string | null
          nome: string
          preco_medio: number | null
          unidade_medida: string | null
        }
        Insert: {
          categoria?: string | null
          codigo_barras?: string | null
          criado_em?: string | null
          descricao?: string | null
          id?: string
          imagem_url?: string | null
          marca?: string | null
          nome: string
          preco_medio?: number | null
          unidade_medida?: string | null
        }
        Update: {
          categoria?: string | null
          codigo_barras?: string | null
          criado_em?: string | null
          descricao?: string | null
          id?: string
          imagem_url?: string | null
          marca?: string | null
          nome?: string
          preco_medio?: number | null
          unidade_medida?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean | null
          criado_em: string | null
          email: string
          foto_url: string | null
          id: string
          nome: string
          username: string | null
        }
        Insert: {
          ativo?: boolean | null
          criado_em?: string | null
          email: string
          foto_url?: string | null
          id: string
          nome: string
          username?: string | null
        }
        Update: {
          ativo?: boolean | null
          criado_em?: string | null
          email?: string
          foto_url?: string | null
          id?: string
          nome?: string
          username?: string | null
        }
        Relationships: []
      }
      recebimentos_legumes: {
        Row: {
          criado_em: string | null
          data_recebimento: string
          id: string
          legume_id: string
          numero_recebimento: number | null
          observacao: string | null
          quantidade_recebida: number
          usuario_id: string
        }
        Insert: {
          criado_em?: string | null
          data_recebimento?: string
          id?: string
          legume_id: string
          numero_recebimento?: number | null
          observacao?: string | null
          quantidade_recebida: number
          usuario_id: string
        }
        Update: {
          criado_em?: string | null
          data_recebimento?: string
          id?: string
          legume_id?: string
          numero_recebimento?: number | null
          observacao?: string | null
          quantidade_recebida?: number
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recebimentos_legumes_legume_id_fkey"
            columns: ["legume_id"]
            isOneToOne: false
            referencedRelation: "legumes"
            referencedColumns: ["id"]
          },
        ]
      }
      respostas_fornecedor: {
        Row: {
          atualizado_em: string | null
          condicao_pagamento: string | null
          convite_id: string | null
          cotacao_id: string
          criado_em: string | null
          fornecedor_id: string
          id: string
          observacao: string | null
          prazo_entrega_dias: number | null
          total_proposta: number | null
          validade_proposta: string | null
        }
        Insert: {
          atualizado_em?: string | null
          condicao_pagamento?: string | null
          convite_id?: string | null
          cotacao_id: string
          criado_em?: string | null
          fornecedor_id: string
          id?: string
          observacao?: string | null
          prazo_entrega_dias?: number | null
          total_proposta?: number | null
          validade_proposta?: string | null
        }
        Update: {
          atualizado_em?: string | null
          condicao_pagamento?: string | null
          convite_id?: string | null
          cotacao_id?: string
          criado_em?: string | null
          fornecedor_id?: string
          id?: string
          observacao?: string | null
          prazo_entrega_dias?: number | null
          total_proposta?: number | null
          validade_proposta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "respostas_fornecedor_convite_id_fkey"
            columns: ["convite_id"]
            isOneToOne: false
            referencedRelation: "convites_fornecedor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_fornecedor_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "cotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_fornecedor_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      sessoes_conferencia_coca: {
        Row: {
          criado_em: string | null
          data_conferencia: string
          id: string
          numero: number
          observacao: string | null
          usuario_id: string
        }
        Insert: {
          criado_em?: string | null
          data_conferencia?: string
          id?: string
          numero?: number
          observacao?: string | null
          usuario_id: string
        }
        Update: {
          criado_em?: string | null
          data_conferencia?: string
          id?: string
          numero?: number
          observacao?: string | null
          usuario_id?: string
        }
        Relationships: []
      }
      sessoes_fracionamento: {
        Row: {
          criado_em: string | null
          data_sessao: string
          finalizado_em: string | null
          id: string
          observacao: string | null
          status: string | null
          usuario_id: string
        }
        Insert: {
          criado_em?: string | null
          data_sessao?: string
          finalizado_em?: string | null
          id?: string
          observacao?: string | null
          status?: string | null
          usuario_id: string
        }
        Update: {
          criado_em?: string | null
          data_sessao?: string
          finalizado_em?: string | null
          id?: string
          observacao?: string | null
          status?: string | null
          usuario_id?: string
        }
        Relationships: []
      }
      templates_etiquetas: {
        Row: {
          ativo: boolean | null
          atualizado_em: string
          categoria: string | null
          criado_em: string
          criado_por: string | null
          descricao: string | null
          elementos: Json
          id: string
          nome: string
          tamanho: string
          thumbnail_url: string | null
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string
          categoria?: string | null
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          elementos: Json
          id?: string
          nome: string
          tamanho?: string
          thumbnail_url?: string | null
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string
          categoria?: string | null
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          elementos?: Json
          id?: string
          nome?: string
          tamanho?: string
          thumbnail_url?: string | null
        }
        Relationships: []
      }
      user_module_permissions: {
        Row: {
          criado_em: string | null
          id: string
          module: Database["public"]["Enums"]["app_module"]
          user_id: string
        }
        Insert: {
          criado_em?: string | null
          id?: string
          module: Database["public"]["Enums"]["app_module"]
          user_id: string
        }
        Update: {
          criado_em?: string | null
          id?: string
          module?: Database["public"]["Enums"]["app_module"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_module_access: {
        Args: {
          _module: Database["public"]["Enums"]["app_module"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      restore_stock: {
        Args: { p_produto_id: string; p_quantidade: number }
        Returns: undefined
      }
    }
    Enums: {
      app_module:
        | "legumes"
        | "polpas"
        | "coca"
        | "perdas"
        | "produtos"
        | "usuarios"
        | "relatorios"
        | "dashboard"
      app_role: "administrador" | "operador" | "visualizador"
      categoria_produto: "verdura" | "legume" | "fruta" | "outros"
      convite_status: "pendente" | "visualizado" | "respondido" | "expirado"
      cotacao_status:
        | "pendente"
        | "aprovada"
        | "rejeitada"
        | "cancelada"
        | "em_analise"
        | "finalizada"
      motivo_perda: "murcha" | "vencimento" | "avaria" | "transporte" | "outros"
      motivo_perda_geral:
        | "vencido"
        | "danificado"
        | "quebrado"
        | "avaria"
        | "outros"
      ordem_compra_status:
        | "rascunho"
        | "enviada"
        | "confirmada"
        | "entregue"
        | "cancelada"
      status_lancamento: "normal" | "cancelado"
      tipo_resolucao_geral:
        | "sem_resolucao"
        | "troca"
        | "bonificacao"
        | "desconto"
      unidade_medida: "kg" | "unidade"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_module: [
        "legumes",
        "polpas",
        "coca",
        "perdas",
        "produtos",
        "usuarios",
        "relatorios",
        "dashboard",
      ],
      app_role: ["administrador", "operador", "visualizador"],
      categoria_produto: ["verdura", "legume", "fruta", "outros"],
      convite_status: ["pendente", "visualizado", "respondido", "expirado"],
      cotacao_status: [
        "pendente",
        "aprovada",
        "rejeitada",
        "cancelada",
        "em_analise",
        "finalizada",
      ],
      motivo_perda: ["murcha", "vencimento", "avaria", "transporte", "outros"],
      motivo_perda_geral: [
        "vencido",
        "danificado",
        "quebrado",
        "avaria",
        "outros",
      ],
      ordem_compra_status: [
        "rascunho",
        "enviada",
        "confirmada",
        "entregue",
        "cancelada",
      ],
      status_lancamento: ["normal", "cancelado"],
      tipo_resolucao_geral: [
        "sem_resolucao",
        "troca",
        "bonificacao",
        "desconto",
      ],
      unidade_medida: ["kg", "unidade"],
    },
  },
} as const
