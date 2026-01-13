import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CategorizationRequest {
  productName: string;
  currentCategory?: string;
  availableCategories: string[];
}

interface CategorizationResult {
  suggestedCategory: string;
  confidence: number;
  reasoning: string;
  basedOnFeedback: boolean;
  similarProducts?: string[];
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

    const { products, availableCategories } = await req.json() as {
      products: CategorizationRequest[];
      availableCategories: string[];
    };

    if (!products || !products.length) {
      return new Response(JSON.stringify({ error: 'No products provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar feedbacks anteriores para aprendizado
    const { data: feedbackHistory } = await supabase
      .from('ai_categorization_feedback')
      .select('product_name, suggested_category, final_category, was_accepted')
      .order('created_at', { ascending: false })
      .limit(100);

    // Construir contexto de aprendizado
    const learningContext = buildLearningContext(feedbackHistory || []);

    // Processar cada produto
    const results: CategorizationResult[] = [];

    for (const product of products) {
      // Verificar se há feedback direto para este produto
      const directFeedback = feedbackHistory?.find(
        f => f.product_name.toLowerCase() === product.productName.toLowerCase()
      );

      if (directFeedback) {
        // Usar feedback direto se existir
        results.push({
          suggestedCategory: directFeedback.final_category,
          confidence: 0.95,
          reasoning: `Baseado em decisão anterior do usuário para este produto.`,
          basedOnFeedback: true,
          similarProducts: []
        });
        continue;
      }

      // Usar IA para categorizar
      const categorization = await categorizeWithAI(
        product,
        availableCategories,
        learningContext,
        lovableApiKey
      );

      results.push(categorization);
    }

    return new Response(JSON.stringify({ results }), {
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

function buildLearningContext(feedbackHistory: any[]): string {
  if (!feedbackHistory.length) {
    return 'Nenhum histórico de decisões anteriores disponível.';
  }

  // Agrupar por categoria final
  const categoryExamples: Record<string, string[]> = {};
  const corrections: string[] = [];

  for (const feedback of feedbackHistory) {
    if (!categoryExamples[feedback.final_category]) {
      categoryExamples[feedback.final_category] = [];
    }
    if (categoryExamples[feedback.final_category].length < 5) {
      categoryExamples[feedback.final_category].push(feedback.product_name);
    }

    // Registrar correções (quando sugestão foi rejeitada)
    if (!feedback.was_accepted) {
      corrections.push(
        `"${feedback.product_name}" NÃO é "${feedback.suggested_category}", é "${feedback.final_category}"`
      );
    }
  }

  let context = 'HISTÓRICO DE DECISÕES DO USUÁRIO:\n\n';
  
  context += 'Exemplos de produtos por categoria:\n';
  for (const [category, examples] of Object.entries(categoryExamples)) {
    context += `- ${category}: ${examples.join(', ')}\n`;
  }

  if (corrections.length > 0) {
    context += '\nCORREÇÕES IMPORTANTES (sugestões rejeitadas):\n';
    for (const correction of corrections.slice(0, 20)) {
      context += `- ${correction}\n`;
    }
  }

  return context;
}

async function categorizeWithAI(
  product: CategorizationRequest,
  availableCategories: string[],
  learningContext: string,
  apiKey: string
): Promise<CategorizationResult> {
  const systemPrompt = `Você é um especialista em categorização de produtos de supermercado/hortifruti.
Sua tarefa é sugerir a melhor categoria para um produto.

REGRAS:
1. Sempre escolha uma das categorias disponíveis
2. Considere o histórico de decisões do usuário
3. Se um produto similar já foi categorizado, use a mesma lógica
4. Forneça um nível de confiança de 0 a 1

${learningContext}

CATEGORIAS DISPONÍVEIS:
${availableCategories.join(', ')}

Responda APENAS com JSON no formato:
{
  "category": "nome_da_categoria",
  "confidence": 0.85,
  "reasoning": "Breve explicação",
  "similarProducts": ["produto1", "produto2"]
}`;

  const userMessage = `Categorize este produto: "${product.productName}"
${product.currentCategory ? `Categoria atual: ${product.currentCategory}` : ''}`;

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
          { role: 'user', content: userMessage }
        ],
        max_completion_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    // Extrair JSON da resposta
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        suggestedCategory: parsed.category || availableCategories[0],
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || 'Análise baseada em padrões de nome',
        basedOnFeedback: learningContext.includes(product.productName.toLowerCase()),
        similarProducts: parsed.similarProducts || []
      };
    }
  } catch (error) {
    console.error('AI categorization error:', error);
  }

  // Fallback: usar heurística simples
  return {
    suggestedCategory: availableCategories[0],
    confidence: 0.3,
    reasoning: 'Não foi possível analisar com IA, categoria padrão sugerida',
    basedOnFeedback: false,
    similarProducts: []
  };
}
