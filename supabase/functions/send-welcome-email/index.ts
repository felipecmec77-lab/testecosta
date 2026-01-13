import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  fornecedor_email: string;
  fornecedor_nome: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-welcome-email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fornecedor_email, fornecedor_nome }: WelcomeEmailRequest = await req.json();
    console.log("Request data:", { fornecedor_email, fornecedor_nome });

    if (!fornecedor_email) {
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
      .eq('tipo_email', 'boas_vindas')
      .single();

    if (configError) {
      console.log("Erro ao buscar config, usando padrão:", configError);
    }

    // Verificar se está ativo
    if (config && config.ativo === false) {
      console.log("Email de boas-vindas está desativado");
      return new Response(JSON.stringify({ success: true, message: "Email desativado" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const nomeEmpresa = config?.nome_empresa || 'Comercial Costa';
    const corPrimaria = config?.cor_primaria || '#3b82f6';
    const assunto = config?.assunto_padrao || `Bem-vindo à ${nomeEmpresa}!`;
    const mensagemCabecalho = config?.mensagem_cabecalho || 'Seja bem-vindo! É um prazer tê-lo como nosso parceiro fornecedor.';
    const mensagemRodape = config?.mensagem_rodape || 'Estamos à disposição para qualquer dúvida. Aguardamos boas parcerias!';
    const telefone = config?.telefone_empresa || '';
    const emailEmpresa = config?.email_empresa || '';
    const endereco = config?.endereco_empresa || '';
    const logoUrl = config?.logo_url || '';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; }
          .header { background: linear-gradient(135deg, ${corPrimaria}, ${corPrimaria}dd); color: white; padding: 30px; text-align: center; }
          .header img { max-width: 200px; max-height: 60px; margin-bottom: 15px; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 30px; }
          .welcome-box { background: ${corPrimaria}10; border-left: 4px solid ${corPrimaria}; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
          .footer { background: #1f2937; color: white; padding: 20px; text-align: center; }
          .footer p { margin: 5px 0; font-size: 14px; }
          .footer a { color: ${corPrimaria}; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${logoUrl ? `<img src="${logoUrl}" alt="${nomeEmpresa}" />` : ''}
            <h1>🎉 Bem-vindo!</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${fornecedor_nome}</strong>,</p>
            
            <div class="welcome-box">
              <p style="margin: 0;">${mensagemCabecalho}</p>
            </div>
            
            <p>Agora você faz parte da nossa rede de fornecedores e poderá receber solicitações de cotações diretamente por email.</p>
            
            <p><strong>O que esperar:</strong></p>
            <ul>
              <li>Receber solicitações de cotação por email</li>
              <li>Enviar suas propostas de forma simples</li>
              <li>Acompanhar o status das suas cotações</li>
            </ul>
            
            <p>${mensagemRodape}</p>
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

    console.log("Sending welcome email to:", fornecedor_email);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${nomeEmpresa} <onboarding@resend.dev>`,
        to: [fornecedor_email],
        subject: assunto,
        html: emailHtml,
      }),
    });
    
    const responseData = await response.json();
    console.log("Resend response:", responseData);
    
    if (!response.ok) {
      throw new Error(`Resend API error: ${JSON.stringify(responseData)}`);
    }

    console.log("Welcome email sent successfully");

    return new Response(JSON.stringify({ success: true, data: responseData }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
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
