import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AnalysisContext {
  type: 'losses' | 'stock' | 'purchases' | 'general';
  data?: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { message, conversationId, contextType = 'general' } = await req.json();

    // Buscar contexto relevante baseado no tipo de análise
    const context = await getAnalysisContext(supabase, contextType);

    // Buscar histórico da conversa se existir
    let conversationHistory: Message[] = [];
    if (conversationId) {
      const { data: conversation } = await supabase
        .from('ai_conversations')
        .select('messages')
        .eq('id', conversationId)
        .single();
      
      if (conversation?.messages) {
        conversationHistory = conversation.messages as Message[];
      }
    }

    // Construir prompt do sistema com contexto
    const systemPrompt = buildSystemPrompt(contextType, context);

    // Preparar mensagens para a IA
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    // Chamar Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        max_completion_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices[0]?.message?.content || 'Desculpe, não consegui processar sua solicitação.';

    // Salvar ou atualizar conversa
    const updatedMessages = [
      ...conversationHistory,
      { role: 'user', content: message },
      { role: 'assistant', content: assistantMessage }
    ];

    let savedConversationId = conversationId;
    if (conversationId) {
      await supabase
        .from('ai_conversations')
        .update({ 
          messages: updatedMessages,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);
    } else {
      const { data: newConversation } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          messages: updatedMessages,
          context_type: contextType,
          title: message.substring(0, 100)
        })
        .select('id')
        .single();
      
      savedConversationId = newConversation?.id;
    }

    return new Response(JSON.stringify({
      response: assistantMessage,
      conversationId: savedConversationId,
      context: {
        type: contextType,
        dataLoaded: !!context.data
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getAnalysisContext(supabase: any, contextType: string): Promise<AnalysisContext> {
  const context: AnalysisContext = { type: contextType as any };

  try {
    switch (contextType) {
      case 'losses':
        // Buscar dados de perdas dos últimos 30 dias
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: lossesData } = await supabase
          .from('perdas')
          .select(`
            *,
            produtos:produto_id (nome_produto, categoria, preco_unitario)
          `)
          .gte('data_perda', thirtyDaysAgo.toISOString().split('T')[0])
          .order('data_perda', { ascending: false })
          .limit(100);

        const { data: lossesGeralData } = await supabase
          .from('perdas_geral')
          .select(`
            *,
            itens_perdas_geral:item_id (nome_item, categoria, preco_custo)
          `)
          .gte('data_perda', thirtyDaysAgo.toISOString().split('T')[0])
          .order('data_perda', { ascending: false })
          .limit(100);

        context.data = {
          perdasHortifruti: lossesData || [],
          perdasGeral: lossesGeralData || [],
          periodo: '30 dias'
        };
        break;

      case 'stock':
        // Buscar dados de estoque
        const { data: estoqueData } = await supabase
          .from('estoque')
          .select('*')
          .eq('ativo', true)
          .order('nome', { ascending: true });

        const { data: produtosData } = await supabase
          .from('produtos')
          .select('*')
          .order('nome_produto', { ascending: true });

        // Identificar produtos críticos
        const produtosCriticos = estoqueData?.filter((p: any) => 
          p.estoque_atual <= p.estoque_minimo
        ) || [];

        context.data = {
          estoque: estoqueData || [],
          produtos: produtosData || [],
          criticos: produtosCriticos,
          totalItens: (estoqueData?.length || 0) + (produtosData?.length || 0)
        };
        break;

      case 'purchases':
        // Buscar dados de compras e cotações
        const { data: ordensData } = await supabase
          .from('ordens_compra')
          .select(`
            *,
            fornecedores:fornecedor_id (nome, email),
            itens_ordem_compra (*)
          `)
          .order('criado_em', { ascending: false })
          .limit(50);

        const { data: cotacoesData } = await supabase
          .from('cotacoes')
          .select(`
            *,
            itens_cotacao (*)
          `)
          .order('criado_em', { ascending: false })
          .limit(50);

        const { data: historicoPrecos } = await supabase
          .from('historico_precos_compra')
          .select(`
            *,
            estoque:estoque_id (nome, codigo),
            fornecedores:fornecedor_id (nome)
          `)
          .order('data_compra', { ascending: false })
          .limit(100);

        context.data = {
          ordens: ordensData || [],
          cotacoes: cotacoesData || [],
          historicoPrecos: historicoPrecos || []
        };
        break;

      default:
        // Contexto geral - resumo de tudo
        const { data: resumoPerdas } = await supabase
          .from('perdas')
          .select('valor_perda')
          .gte('data_perda', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

        const { data: resumoEstoque } = await supabase
          .from('estoque')
          .select('id, estoque_atual, estoque_minimo')
          .eq('ativo', true);

        const produtosBaixoEstoque = resumoEstoque?.filter((p: any) => 
          p.estoque_atual <= p.estoque_minimo
        ).length || 0;

        const totalPerdas = resumoPerdas?.reduce((acc: number, p: any) => 
          acc + (p.valor_perda || 0), 0
        ) || 0;

        context.data = {
          resumo: {
            totalPerdas30Dias: totalPerdas,
            produtosBaixoEstoque,
            totalProdutosEstoque: resumoEstoque?.length || 0
          }
        };
    }
  } catch (error) {
    console.error('Error fetching context:', error);
  }

  return context;
}

function buildSystemPrompt(contextType: string, context: AnalysisContext): string {
  const basePrompt = `Você é um assistente de IA especializado em gestão de supermercado/hortifruti. 
Seu nome é "Costa IA" e você ajuda a analisar dados de estoque, perdas, compras e fornecedores.

Diretrizes:
- Responda sempre em português brasileiro
- Seja direto e objetivo, mas amigável
- Use dados concretos quando disponíveis
- Sugira ações práticas e específicas
- Use emojis moderadamente para melhorar a legibilidade
- Formate respostas longas com listas e títulos

`;

  let contextPrompt = '';

  switch (contextType) {
    case 'losses':
      contextPrompt = `
CONTEXTO ATUAL - ANÁLISE DE PERDAS:
${context.data ? `
- Período analisado: ${context.data.periodo}
- Total de registros de perdas (hortifruti): ${context.data.perdasHortifruti?.length || 0}
- Total de registros de perdas (geral): ${context.data.perdasGeral?.length || 0}

Dados de perdas disponíveis para análise:
${JSON.stringify(context.data, null, 2).substring(0, 3000)}
` : 'Nenhum dado de perdas disponível no momento.'}

Você pode:
- Identificar produtos com maior índice de perda
- Analisar padrões por dia da semana, motivo, etc.
- Sugerir ações para reduzir perdas
- Calcular impacto financeiro
`;
      break;

    case 'stock':
      contextPrompt = `
CONTEXTO ATUAL - ANÁLISE DE ESTOQUE:
${context.data ? `
- Total de itens no estoque: ${context.data.totalItens}
- Produtos críticos (abaixo do mínimo): ${context.data.criticos?.length || 0}

Produtos críticos que precisam de atenção:
${JSON.stringify(context.data.criticos?.slice(0, 10), null, 2)}
` : 'Nenhum dado de estoque disponível no momento.'}

Você pode:
- Identificar produtos que precisam de reposição urgente
- Analisar giro de estoque
- Sugerir ajustes nos níveis mínimo/máximo
- Identificar produtos parados
`;
      break;

    case 'purchases':
      contextPrompt = `
CONTEXTO ATUAL - ANÁLISE DE COMPRAS:
${context.data ? `
- Ordens de compra recentes: ${context.data.ordens?.length || 0}
- Cotações recentes: ${context.data.cotacoes?.length || 0}
- Registros de histórico de preços: ${context.data.historicoPrecos?.length || 0}

Dados disponíveis:
${JSON.stringify(context.data, null, 2).substring(0, 3000)}
` : 'Nenhum dado de compras disponível no momento.'}

Você pode:
- Comparar preços entre fornecedores
- Identificar oportunidades de negociação
- Analisar tendências de preços
- Sugerir melhores momentos para compra
`;
      break;

    default:
      contextPrompt = `
CONTEXTO ATUAL - VISÃO GERAL:
${context.data ? `
Resumo do sistema:
- Perdas nos últimos 30 dias: R$ ${context.data.resumo?.totalPerdas30Dias?.toFixed(2) || '0.00'}
- Produtos abaixo do estoque mínimo: ${context.data.resumo?.produtosBaixoEstoque || 0}
- Total de produtos no estoque: ${context.data.resumo?.totalProdutosEstoque || 0}
` : 'Coletando dados...'}

Você pode ajudar com:
- Análise de perdas e desperdício
- Gestão de estoque
- Análise de compras e fornecedores
- Recomendações para otimização
- Perguntas gerais sobre o sistema

Pergunte ao usuário o que ele gostaria de analisar ou responda diretamente sua pergunta.
`;
  }

  return basePrompt + contextPrompt;
}
