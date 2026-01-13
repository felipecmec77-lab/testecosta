import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReportSection {
  title: string;
  content: string;
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

    // Get report type from request body
    const { reportType = 'completo', period = '30days' } = await req.json().catch(() => ({}));

    // Collect comprehensive data for analysis
    const analysisData = await collectReportData(supabase, period);
    
    // Generate AI analysis for the report
    const aiAnalysis = await generateAIAnalysis(analysisData, reportType, lovableApiKey);
    
    // Get user name
    const { data: profileData } = await supabase
      .from('profiles')
      .select('nome')
      .eq('id', user.id)
      .single();

    return new Response(JSON.stringify({
      success: true,
      report: {
        generatedAt: new Date().toISOString(),
        generatedBy: profileData?.nome || 'Usuário',
        reportType,
        period,
        data: analysisData,
        aiAnalysis
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function collectReportData(supabase: any, period: string) {
  const today = new Date();
  let startDate = new Date();
  
  switch (period) {
    case '7days':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30days':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90days':
      startDate.setDate(startDate.getDate() - 90);
      break;
    default:
      startDate.setDate(startDate.getDate() - 30);
  }

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = today.toISOString().split('T')[0];

  // Perdas hortifruti
  const { data: perdasHortifruti } = await supabase
    .from('perdas')
    .select(`
      *,
      produtos:produto_id (nome_produto, categoria, preco_unitario, unidade_medida),
      lancamentos:lancamento_id (status)
    `)
    .gte('data_perda', startDateStr)
    .lte('data_perda', endDateStr);

  // Filter valid losses
  const perdasValidas = perdasHortifruti?.filter((p: any) => 
    !p.lancamento_id || p.lancamentos?.status === 'normal'
  ) || [];

  // Perdas gerais
  const { data: perdasGeral } = await supabase
    .from('perdas_geral')
    .select(`
      *,
      itens_perdas_geral:item_id (nome_item, categoria, preco_custo)
    `)
    .gte('data_perda', startDateStr)
    .lte('data_perda', endDateStr);

  // Estoque crítico
  const { data: estoqueCritico } = await supabase
    .from('estoque')
    .select('*')
    .eq('ativo', true);

  // Produtos hortifruti
  const { data: produtosHortifruti } = await supabase
    .from('produtos')
    .select('*');

  // Histórico de preços
  const { data: historicoPrecos } = await supabase
    .from('historico_precos_compra')
    .select(`
      *,
      estoque:estoque_id (nome, codigo),
      fornecedores:fornecedor_id (nome)
    `)
    .gte('data_compra', startDateStr)
    .order('data_compra', { ascending: false });

  // Calculate summaries
  const perdasPorProduto: Record<string, { kg: number; un: number; valor: number; motivos: Record<string, number> }> = {};
  const perdasPorDia: Record<string, number> = {};
  const perdasPorMotivo: Record<string, number> = {};
  
  let totalValorPerdas = 0;
  let totalKgPerdas = 0;
  let totalUnPerdas = 0;

  perdasValidas.forEach((p: any) => {
    const nome = p.produtos?.nome_produto || 'Desconhecido';
    const isKg = p.produtos?.unidade_medida === 'kg';
    const amount = isKg ? (p.peso_perdido || 0) : (p.quantidade_perdida || 0);
    const valor = amount * (p.produtos?.preco_unitario || 0);
    
    if (!perdasPorProduto[nome]) {
      perdasPorProduto[nome] = { kg: 0, un: 0, valor: 0, motivos: {} };
    }
    
    if (isKg) {
      perdasPorProduto[nome].kg += amount;
      totalKgPerdas += amount;
    } else {
      perdasPorProduto[nome].un += amount;
      totalUnPerdas += amount;
    }
    perdasPorProduto[nome].valor += valor;
    perdasPorProduto[nome].motivos[p.motivo_perda] = (perdasPorProduto[nome].motivos[p.motivo_perda] || 0) + 1;
    
    totalValorPerdas += valor;
    perdasPorDia[p.data_perda] = (perdasPorDia[p.data_perda] || 0) + valor;
    perdasPorMotivo[p.motivo_perda] = (perdasPorMotivo[p.motivo_perda] || 0) + valor;
  });

  // Produtos críticos
  const produtosCriticosEstoque = estoqueCritico?.filter((p: any) => 
    p.estoque_atual <= p.estoque_minimo
  ) || [];

  const produtosCriticosHortifruti = produtosHortifruti?.filter((p: any) => 
    p.quantidade_estoque <= p.estoque_minimo
  ) || [];

  // Top produtos com perdas
  const topProdutosPerdas = Object.entries(perdasPorProduto)
    .map(([nome, dados]) => ({ nome, ...dados }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10);

  // Análise de preços
  const precosAnalise: Record<string, { precos: number[]; fornecedores: string[] }> = {};
  historicoPrecos?.forEach((h: any) => {
    const nome = h.estoque?.nome || 'Desconhecido';
    if (!precosAnalise[nome]) {
      precosAnalise[nome] = { precos: [], fornecedores: [] };
    }
    precosAnalise[nome].precos.push(h.preco_compra);
    if (h.fornecedores?.nome && !precosAnalise[nome].fornecedores.includes(h.fornecedores.nome)) {
      precosAnalise[nome].fornecedores.push(h.fornecedores.nome);
    }
  });

  return {
    periodo: { inicio: startDateStr, fim: endDateStr },
    resumoPerdas: {
      totalValor: totalValorPerdas,
      totalKg: totalKgPerdas,
      totalUnidades: totalUnPerdas,
      totalRegistros: perdasValidas.length + (perdasGeral?.length || 0)
    },
    topProdutosPerdas,
    perdasPorMotivo,
    perdasPorDia,
    estoqueCritico: {
      estoqueGeral: produtosCriticosEstoque.map((p: any) => ({
        nome: p.nome,
        atual: p.estoque_atual,
        minimo: p.estoque_minimo,
        deficit: p.estoque_minimo - p.estoque_atual
      })),
      hortifruti: produtosCriticosHortifruti.map((p: any) => ({
        nome: p.nome_produto,
        atual: p.quantidade_estoque,
        minimo: p.estoque_minimo,
        deficit: p.estoque_minimo - p.quantidade_estoque
      }))
    },
    analisePrecos: Object.entries(precosAnalise).map(([nome, dados]) => ({
      produto: nome,
      precoMedio: dados.precos.length > 0 ? dados.precos.reduce((a, b) => a + b, 0) / dados.precos.length : 0,
      precoMin: dados.precos.length > 0 ? Math.min(...dados.precos) : 0,
      precoMax: dados.precos.length > 0 ? Math.max(...dados.precos) : 0,
      fornecedores: dados.fornecedores
    })).slice(0, 10)
  };
}

async function generateAIAnalysis(data: any, reportType: string, apiKey: string) {
  const systemPrompt = `Você é um consultor especialista em gestão de supermercado/hortifruti.
Analise os dados fornecidos e gere um relatório executivo com:

1. RESUMO EXECUTIVO (2-3 parágrafos)
   - Visão geral da situação
   - Principais preocupações
   - Oportunidades identificadas

2. ANÁLISE DE PERDAS
   - Produtos mais problemáticos
   - Padrões identificados (dias, motivos)
   - Impacto financeiro

3. ANÁLISE DE ESTOQUE
   - Produtos críticos
   - Riscos de ruptura
   - Recomendações de reposição

4. ANÁLISE DE PREÇOS (se disponível)
   - Variações significativas
   - Oportunidades de economia
   - Fornecedores recomendados

5. RECOMENDAÇÕES ACIONÁVEIS
   - 3-5 ações prioritárias com impacto estimado
   - Prazo sugerido para implementação

Seja específico com números e porcentagens. Use linguagem profissional mas acessível.
Responda em formato JSON com as seções acima.`;

  const userPrompt = `Analise estes dados e gere um relatório ${reportType}:

${JSON.stringify(data, null, 2)}

Gere um relatório completo seguindo a estrutura definida.`;

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
        max_completion_tokens: 3000,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', await response.text());
      return generateFallbackAnalysis(data);
    }

    const aiData = await response.json();
    const content = aiData.choices[0]?.message?.content || '';
    
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleanContent);
    } catch {
      // If parsing fails, return structured text
      return {
        resumoExecutivo: content,
        analisePerdas: null,
        analiseEstoque: null,
        analisePrecos: null,
        recomendacoes: []
      };
    }
  } catch (error) {
    console.error('Error calling AI:', error);
    return generateFallbackAnalysis(data);
  }
}

function generateFallbackAnalysis(data: any) {
  const topPerdas = data.topProdutosPerdas?.slice(0, 3).map((p: any) => p.nome).join(', ') || 'N/A';
  const totalCriticos = (data.estoqueCritico?.estoqueGeral?.length || 0) + (data.estoqueCritico?.hortifruti?.length || 0);

  return {
    resumoExecutivo: `No período analisado, foram registradas perdas totalizando R$ ${data.resumoPerdas?.totalValor?.toFixed(2) || '0,00'}. Os produtos com maiores perdas foram: ${topPerdas}. Atualmente, ${totalCriticos} produtos estão com estoque crítico e precisam de reposição urgente.`,
    analisePerdas: {
      descricao: `Total de ${data.resumoPerdas?.totalRegistros || 0} registros de perdas no período.`,
      impacto: `R$ ${data.resumoPerdas?.totalValor?.toFixed(2) || '0,00'} em perdas.`
    },
    analiseEstoque: {
      descricao: `${totalCriticos} produtos abaixo do estoque mínimo.`,
      urgencia: totalCriticos > 5 ? 'Alta' : totalCriticos > 0 ? 'Média' : 'Baixa'
    },
    analisePrecos: null,
    recomendacoes: [
      'Revisar processos de manuseio dos produtos com maiores perdas',
      'Priorizar reposição dos itens em estoque crítico',
      'Ajustar pedidos baseado no histórico de perdas'
    ]
  };
}
