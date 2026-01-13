import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CotacaoEmailRequest {
  fornecedor_email: string;
  fornecedor_nome: string;
  cotacao_numero: number;
  cotacao_titulo: string;
  data_limite: string | null;
  itens: Array<{
    nome_produto: string;
    quantidade: number;
    codigo_barras?: string;
  }>;
  observacao?: string;
  link_resposta?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-cotacao-email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: CotacaoEmailRequest = await req.json();
    console.log("Request data:", JSON.stringify(data));

    if (!data.fornecedor_email) {
      throw new Error("Email do fornecedor é obrigatório");
    }

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY não configurada");
    }

    // Buscar configurações de email
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: config, error: configError } = await supabase
      .from('configuracoes_email')
      .select('*')
      .eq('tipo_email', 'cotacao')
      .single();

    if (configError) {
      console.log("Erro ao buscar config, usando padrão:", configError);
    }

    // Verificar se está ativo
    if (config && config.ativo === false) {
      console.log("Email de cotação está desativado");
      return new Response(JSON.stringify({ success: true, message: "Email desativado" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const nomeEmpresa = config?.nome_empresa || 'Comercial Costa';
    const corPrimaria = config?.cor_primaria || '#3b82f6';
    const assuntoPadrao = config?.assunto_padrao || 'Solicitação de Cotação #{numero}';
    const mensagemCabecalho = config?.mensagem_cabecalho || 'Prezado fornecedor, você recebeu uma nova solicitação de cotação. Por favor, analise os itens e envie sua melhor proposta.';
    const mensagemRodape = config?.mensagem_rodape || 'Agradecemos sua parceria e aguardamos seu retorno.';
    const telefone = config?.telefone_empresa || '';
    const emailEmpresa = config?.email_empresa || '';
    const endereco = config?.endereco_empresa || '';
    const logoUrl = config?.logo_url || '';

    const assunto = assuntoPadrao
      .replace('{numero}', data.cotacao_numero.toString())
      .replace('#{numero}', `#${data.cotacao_numero}`);

    const itensHtml = data.itens
      .map(
        (item, index) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${index + 1}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.nome_produto}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; font-weight: bold;">${item.quantidade}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; font-family: monospace; font-size: 12px;">${item.codigo_barras || '-'}</td>
        </tr>
      `
      )
      .join("");

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; }
          .header { background: linear-gradient(135deg, ${corPrimaria}, ${corPrimaria}dd); color: white; padding: 25px; }
          .header img { max-width: 180px; max-height: 50px; margin-bottom: 10px; }
          .header h1 { margin: 0 0 5px 0; font-size: 22px; }
          .header p { margin: 0; opacity: 0.9; font-size: 14px; }
          .content { padding: 25px; }
          .info-box { background: ${corPrimaria}10; border-left: 4px solid ${corPrimaria}; padding: 15px; margin: 15px 0; border-radius: 0 8px 8px 0; }
          table { width: 100%; border-collapse: collapse; background: white; margin: 20px 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
          th { background: ${corPrimaria}; color: white; padding: 14px; text-align: left; font-size: 13px; text-transform: uppercase; }
          .footer { background: #1f2937; color: white; padding: 20px; text-align: center; }
          .footer p { margin: 5px 0; font-size: 14px; }
          .footer a { color: ${corPrimaria}; text-decoration: none; }
          .btn { display: inline-block; background: ${corPrimaria}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin-top: 15px; font-weight: bold; }
          .deadline { background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; border-radius: 8px; margin: 15px 0; }
          .deadline strong { color: #b45309; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${logoUrl ? `<img src="${logoUrl}" alt="${nomeEmpresa}" />` : ''}
            <h1>📋 Cotação #${data.cotacao_numero}</h1>
            ${data.cotacao_titulo ? `<p>${data.cotacao_titulo}</p>` : ''}
          </div>
          <div class="content">
            <p>Olá <strong>${data.fornecedor_nome}</strong>,</p>
            
            <div class="info-box">
              <p style="margin: 0;">${mensagemCabecalho}</p>
            </div>
            
            ${data.data_limite ? `
              <div class="deadline">
                <strong>⏰ Prazo para resposta:</strong> ${new Date(data.data_limite).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}
              </div>
            ` : ''}
            
            <table>
              <thead>
                <tr>
                  <th style="width: 50px; text-align: center;">#</th>
                  <th>Produto</th>
                  <th style="width: 100px; text-align: center;">Qtd.</th>
                  <th style="width: 120px;">Código</th>
                </tr>
              </thead>
              <tbody>
                ${itensHtml}
              </tbody>
            </table>
            
            ${data.observacao ? `
              <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <strong>📝 Observações:</strong>
                <p style="margin: 10px 0 0 0;">${data.observacao}</p>
              </div>
            ` : ''}
            
            <p>${mensagemRodape}</p>
            
            ${data.link_resposta ? `<a href="${data.link_resposta}" class="btn">Responder Cotação</a>` : ''}
          </div>
          <div class="footer">
            <p style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">${nomeEmpresa}</p>
            ${telefone ? `<p>📞 ${telefone}</p>` : ''}
            ${emailEmpresa ? `<p>✉️ <a href="mailto:${emailEmpresa}">${emailEmpresa}</a></p>` : ''}
            ${endereco ? `<p>📍 ${endereco}</p>` : ''}
          </div>
        </div>
      </body>
      </html>
    `;

    console.log("Sending email to:", data.fornecedor_email);
    
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${nomeEmpresa} <onboarding@resend.dev>`,
        to: [data.fornecedor_email],
        subject: assunto,
        html: emailHtml,
      }),
    });
    
    const responseData = await response.json();
    console.log("Resend response status:", response.status);
    console.log("Resend response:", JSON.stringify(responseData));
    
    if (!response.ok) {
      throw new Error(`Resend API error: ${JSON.stringify(responseData)}`);
    }

    console.log("Email sent successfully:", responseData);

    return new Response(JSON.stringify({ success: true, data: responseData }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-cotacao-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
