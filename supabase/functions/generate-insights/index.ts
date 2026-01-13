import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InsightData {
  insight_type: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
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

    // Coletar dados para análise
    const analysisData = await collectAnalysisData(supabase);
    
    // Gerar insights com IA
    const insights = await generateInsightsWithAI(analysisData, lovableApiKey);
    
    // Limpar insights antigos (expirados ou mais de 7 dias)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    await supabase
      .from('ai_insights')
      .delete()
      .or(`expires_at.lt.${new Date().toISOString()},created_at.lt.${sevenDaysAgo.toISOString()}`);
    
    // Salvar novos insights
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1); // Expira em 24h
    
    for (const insight of insights) {
      await supabase
        .from('ai_insights')
        .insert({
          user_id: user.id,
          insight_type: insight.insight_type,
          title: insight.title,
          description: insight.description,
          priority: insight.priority,
          data: insight.data || null,
          expires_at: expiresAt.toISOString(),
          is_read: false,
          is_dismissed: false
        });
    }

    return new Response(JSON.stringify({
      success: true,
      insightsGenerated: insights.length,
      insights
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating insights:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function collectAnalysisData(supabase: any) {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Perdas da semana atual
  const { data: perdasSemanaAtual } = await supabase
    .from('perdas')
    .select(`
      *,
      produtos:produto_id (nome_produto, categoria, preco_unitario, unidade_medida)
    `)
    .gte('data_perda', sevenDaysAgo.toISOString().split('T')[0])
    .lte('data_perda', today.toISOString().split('T')[0]);

  // Perdas da semana anterior
  const { data: perdasSemanaAnterior } = await supabase
    .from('perdas')
    .select(`
      *,
      produtos:produto_id (nome_produto, categoria, preco_unitario, unidade_medida)
    `)
    .gte('data_perda', fourteenDaysAgo.toISOString().split('T')[0])
    .lt('data_perda', sevenDaysAgo.toISOString().split('T')[0]);

  // Perdas gerais da semana
  const { data: perdasGeralSemana } = await supabase
    .from('perdas_geral')
    .select(`
      *,
      itens_perdas_geral:item_id (nome_item, categoria, preco_custo)
    `)
    .gte('data_perda', sevenDaysAgo.toISOString().split('T')[0]);

  // Estoque crítico
  const { data: estoqueData } = await supabase
    .from('estoque')
    .select('*')
    .eq('ativo', true);

  const produtosCriticos = estoqueData?.filter((p: any) => 
    p.estoque_atual <= p.estoque_minimo
  ) || [];

  // Produtos do hortifruti críticos
  const { data: produtosHortifruti } = await supabase
    .from('produtos')
    .select('*');

  const hortifrutiCriticos = produtosHortifruti?.filter((p: any) => 
    p.quantidade_estoque <= p.estoque_minimo
  ) || [];

  // Histórico de preços recente
  const { data: historicoPrecos } = await supabase
    .from('historico_precos_compra')
    .select(`
      *,
      estoque:estoque_id (nome, codigo),
      fornecedores:fornecedor_id (nome)
    `)
    .gte('data_compra', thirtyDaysAgo.toISOString().split('T')[0])
    .order('data_compra', { ascending: false });

  return {
    perdasSemanaAtual: perdasSemanaAtual || [],
    perdasSemanaAnterior: perdasSemanaAnterior || [],
    perdasGeralSemana: perdasGeralSemana || [],
    produtosCriticos,
    hortifrutiCriticos,
    totalEstoque: estoqueData?.length || 0,
    historicoPrecos: historicoPrecos || []
  };
}

async function generateInsightsWithAI(data: any, apiKey: string): Promise<InsightData[]> {
  // Preparar resumo dos dados
  const dataResume = prepareDataSummary(data);
  
  const systemPrompt = `Você é um analista de dados especializado em supermercado/hortifruti.
Analise os dados fornecidos e gere de 1 a 5 insights acionáveis.

REGRAS IMPORTANTES:
1. Cada insight deve ter: type, title, description, priority
2. Types válidos: loss_pattern, stock_alert, price_opportunity, optimization, success
3. Priorities válidas: low, medium, high
4. Título deve ser curto (máximo 50 caracteres)
5. Descrição deve ser específica com números e porcentagens
6. Se não houver problemas, gere insights positivos
7. Responda APENAS com JSON válido, sem markdown

Exemplo de resposta:
[
  {
    "type": "loss_pattern",
    "title": "Tomate com alta perda",
    "description": "O Tomate teve 45% mais perdas esta semana (15kg vs 10kg). Principal motivo: maturação.",
    "priority": "high"
  }
]`;

  const userPrompt = `Analise estes dados e gere insights:

${JSON.stringify(dataResume, null, 2)}

Gere insights relevantes baseados nos dados acima.`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 1500,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', await response.text());
      return generateFallbackInsights(data);
    }

    const aiData = await response.json();
    const content = aiData.choices[0]?.message?.content || '';
    
    // Tentar parsear JSON da resposta
    try {
      // Limpar possíveis marcadores de markdown
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const insights = JSON.parse(cleanContent);
      
      if (Array.isArray(insights)) {
        return insights.map((insight: any) => ({
          insight_type: insight.type || 'optimization',
          title: insight.title?.substring(0, 100) || 'Insight',
          description: insight.description || '',
          priority: ['low', 'medium', 'high'].includes(insight.priority) ? insight.priority : 'medium',
          data: insight.data || null
        }));
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
    }
    
    return generateFallbackInsights(data);
  } catch (error) {
    console.error('Error calling AI:', error);
    return generateFallbackInsights(data);
  }
}

function prepareDataSummary(data: any) {
  // Calcular totais de perdas
  const perdasAtualPorProduto: Record<string, { kg: number; un: number; valor: number }> = {};
  const perdasAnteriorPorProduto: Record<string, { kg: number; un: number; valor: number }> = {};

  data.perdasSemanaAtual?.forEach((p: any) => {
    const nome = p.produtos?.nome_produto || 'Desconhecido';
    const isKg = p.produtos?.unidade_medida === 'kg';
    const amount = isKg ? (p.peso_perdido || 0) : (p.quantidade_perdida || 0);
    const valor = amount * (p.produtos?.preco_unitario || 0);
    
    if (!perdasAtualPorProduto[nome]) {
      perdasAtualPorProduto[nome] = { kg: 0, un: 0, valor: 0 };
    }
    if (isKg) {
      perdasAtualPorProduto[nome].kg += amount;
    } else {
      perdasAtualPorProduto[nome].un += amount;
    }
    perdasAtualPorProduto[nome].valor += valor;
  });

  data.perdasSemanaAnterior?.forEach((p: any) => {
    const nome = p.produtos?.nome_produto || 'Desconhecido';
    const isKg = p.produtos?.unidade_medida === 'kg';
    const amount = isKg ? (p.peso_perdido || 0) : (p.quantidade_perdida || 0);
    const valor = amount * (p.produtos?.preco_unitario || 0);
    
    if (!perdasAnteriorPorProduto[nome]) {
      perdasAnteriorPorProduto[nome] = { kg: 0, un: 0, valor: 0 };
    }
    if (isKg) {
      perdasAnteriorPorProduto[nome].kg += amount;
    } else {
      perdasAnteriorPorProduto[nome].un += amount;
    }
    perdasAnteriorPorProduto[nome].valor += valor;
  });

  // Calcular variações
  const variacoes: any[] = [];
  for (const produto of Object.keys(perdasAtualPorProduto)) {
    const atual = perdasAtualPorProduto[produto];
    const anterior = perdasAnteriorPorProduto[produto] || { kg: 0, un: 0, valor: 0 };
    
    const totalAtual = atual.kg + atual.un;
    const totalAnterior = anterior.kg + anterior.un;
    
    if (totalAnterior > 0) {
      const variacao = ((totalAtual - totalAnterior) / totalAnterior) * 100;
      variacoes.push({
        produto,
        atual: totalAtual,
        anterior: totalAnterior,
        variacao: Math.round(variacao),
        valorAtual: atual.valor
      });
    } else if (totalAtual > 0) {
      variacoes.push({
        produto,
        atual: totalAtual,
        anterior: 0,
        variacao: 100,
        valorAtual: atual.valor
      });
    }
  }

  // Ordenar por variação (maiores aumentos primeiro)
  variacoes.sort((a, b) => b.variacao - a.variacao);

  // Perdas gerais resumo
  const perdasGeralResumo = data.perdasGeralSemana?.reduce((acc: any, p: any) => {
    const nome = p.itens_perdas_geral?.nome_item || 'Desconhecido';
    if (!acc[nome]) acc[nome] = 0;
    acc[nome] += p.quantidade_perdida || 0;
    return acc;
  }, {});

  return {
    resumoPerdasHortifruti: {
      semanaAtual: Object.entries(perdasAtualPorProduto).map(([nome, dados]) => ({
        produto: nome,
        ...dados
      })).sort((a, b) => b.valor - a.valor).slice(0, 10),
      variacoes: variacoes.slice(0, 10),
      totalValorAtual: Object.values(perdasAtualPorProduto).reduce((sum: number, p: any) => sum + p.valor, 0),
      totalValorAnterior: Object.values(perdasAnteriorPorProduto).reduce((sum: number, p: any) => sum + p.valor, 0)
    },
    resumoPerdasGeral: Object.entries(perdasGeralResumo || {}).map(([nome, qtd]) => ({
      item: nome,
      quantidade: qtd
    })).slice(0, 5),
    estoqueCritico: {
      total: data.produtosCriticos?.length || 0,
      itens: data.produtosCriticos?.slice(0, 5).map((p: any) => ({
        nome: p.nome,
        atual: p.estoque_atual,
        minimo: p.estoque_minimo
      })) || []
    },
    hortifrutiCritico: {
      total: data.hortifrutiCriticos?.length || 0,
      itens: data.hortifrutiCriticos?.slice(0, 5).map((p: any) => ({
        nome: p.nome_produto,
        atual: p.quantidade_estoque,
        minimo: p.estoque_minimo
      })) || []
    },
    totalProdutosEstoque: data.totalEstoque
  };
}

function generateFallbackInsights(data: any): InsightData[] {
  const insights: InsightData[] = [];

  // Insight sobre estoque crítico
  const totalCriticos = (data.produtosCriticos?.length || 0) + (data.hortifrutiCriticos?.length || 0);
  if (totalCriticos > 0) {
    insights.push({
      insight_type: 'stock_alert',
      title: `${totalCriticos} produtos abaixo do mínimo`,
      description: `Há ${totalCriticos} produtos com estoque abaixo do nível mínimo que precisam de reposição urgente.`,
      priority: totalCriticos > 5 ? 'high' : 'medium',
      data: { count: totalCriticos }
    });
  }

  // Insight sobre perdas
  const totalPerdas = data.perdasSemanaAtual?.length || 0;
  if (totalPerdas > 0) {
    const valorTotal = data.perdasSemanaAtual.reduce((sum: number, p: any) => {
      const amount = p.produtos?.unidade_medida === 'kg' 
        ? (p.peso_perdido || 0) 
        : (p.quantidade_perdida || 0);
      return sum + (amount * (p.produtos?.preco_unitario || 0));
    }, 0);

    insights.push({
      insight_type: 'loss_pattern',
      title: `R$ ${valorTotal.toFixed(2)} em perdas esta semana`,
      description: `Foram registradas ${totalPerdas} perdas esta semana totalizando R$ ${valorTotal.toFixed(2)}.`,
      priority: valorTotal > 500 ? 'high' : valorTotal > 100 ? 'medium' : 'low',
      data: { valor: valorTotal, registros: totalPerdas }
    });
  }

  // Se não tiver problemas, gerar insight positivo
  if (insights.length === 0) {
    insights.push({
      insight_type: 'success',
      title: 'Tudo sob controle!',
      description: 'Não foram identificados problemas críticos no momento. Continue monitorando seus dados regularmente.',
      priority: 'low'
    });
  }

  return insights;
}
