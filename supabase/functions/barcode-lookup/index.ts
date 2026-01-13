import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { barcode } = await req.json();

    if (!barcode) {
      return new Response(
        JSON.stringify({ error: 'Código de barras não informado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Buscando produto com código de barras:', barcode);

    // Try Open Food Facts API first (free, works worldwide)
    const openFoodFactsUrl = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
    
    const response = await fetch(openFoodFactsUrl);
    const data = await response.json();

    if (data.status === 1 && data.product) {
      const product = data.product;
      
      console.log('Produto encontrado no Open Food Facts:', product.product_name);
      
      return new Response(
        JSON.stringify({
          found: true,
          source: 'Open Food Facts',
          product: {
            codigo_barras: barcode,
            nome: product.product_name || product.product_name_pt || product.generic_name || 'Produto sem nome',
            marca: product.brands || '',
            categoria: product.categories?.split(',')[0]?.trim() || '',
            descricao: product.generic_name || product.ingredients_text || '',
            imagem_url: product.image_url || product.image_front_url || '',
            quantidade: product.quantity || '',
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If not found, return not found response
    console.log('Produto não encontrado para o código:', barcode);
    
    return new Response(
      JSON.stringify({
        found: false,
        source: null,
        product: null,
        message: 'Produto não encontrado. Por favor, cadastre manualmente.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro na busca de código de barras:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao buscar produto', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
