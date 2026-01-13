import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("product-search function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, page = 1, pageSize = 20 } = await req.json();
    console.log("Search query:", query, "Page:", page);

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ products: [], total: 0, message: "Digite pelo menos 2 caracteres" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Search Open Food Facts API by product name
    const searchUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page=${page}&page_size=${pageSize}&lc=pt&cc=br`;
    
    console.log("Fetching from Open Food Facts:", searchUrl);
    
    const response = await fetch(searchUrl);
    const data = await response.json();

    console.log("Open Food Facts response count:", data.count);

    const products = (data.products || []).map((p: any) => ({
      codigo_barras: p.code || "",
      nome: p.product_name || p.product_name_pt || p.product_name_en || "Produto sem nome",
      marca: p.brands || "",
      categoria: p.categories_tags?.[0]?.replace("en:", "").replace("pt:", "") || "",
      imagem_url: p.image_small_url || p.image_url || null,
      descricao: p.generic_name || p.generic_name_pt || "",
      quantidade_embalagem: p.quantity || "",
    }));

    return new Response(
      JSON.stringify({
        products,
        total: data.count || 0,
        page,
        pageSize,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in product-search function:", error);
    return new Response(
      JSON.stringify({ error: error.message, products: [], total: 0 }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
