import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Mail, Save, Loader2, Send, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ConfigEmail {
  id: string;
  tipo_email: string;
  assunto_padrao: string;
  mensagem_cabecalho: string | null;
  mensagem_rodape: string | null;
  cor_primaria: string | null;
  nome_empresa: string | null;
  telefone_empresa: string | null;
  email_empresa: string | null;
  endereco_empresa: string | null;
  logo_url: string | null;
  ativo: boolean | null;
}

const ConfiguracoesEmail = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [configs, setConfigs] = useState<ConfigEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes_email')
        .select('*')
        .order('tipo_email');

      if (error) throw error;
      setConfigs(data || []);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (tipo: string, field: string, value: string | boolean) => {
    setConfigs(prev => prev.map(c => 
      c.tipo_email === tipo ? { ...c, [field]: value } : c
    ));
  };

  const saveConfig = async (config: ConfigEmail) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('configuracoes_email')
        .update({
          assunto_padrao: config.assunto_padrao,
          mensagem_cabecalho: config.mensagem_cabecalho,
          mensagem_rodape: config.mensagem_rodape,
          cor_primaria: config.cor_primaria,
          nome_empresa: config.nome_empresa,
          telefone_empresa: config.telefone_empresa,
          email_empresa: config.email_empresa,
          endereco_empresa: config.endereco_empresa,
          logo_url: config.logo_url,
          ativo: config.ativo
        })
        .eq('id', config.id);

      if (error) throw error;
      toast.success('Configurações salvas!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const sendTestEmail = async (tipo: string) => {
    if (!testEmail) {
      toast.error('Digite um email para teste');
      return;
    }

    setSendingTest(true);
    try {
      const config = configs.find(c => c.tipo_email === tipo);
      
      const { error } = await supabase.functions.invoke('send-cotacao-email', {
        body: {
          fornecedor_email: testEmail,
          fornecedor_nome: 'Teste',
          cotacao_numero: 999,
          cotacao_titulo: 'Email de Teste',
          data_limite: null,
          itens: [{ nome_produto: 'Produto Exemplo', quantidade: 10, codigo_barras: '123456' }],
          observacao: 'Este é um email de teste do sistema.',
          config: config
        }
      });

      if (error) throw error;
      toast.success(`Email de teste enviado para ${testEmail}!`);
    } catch (error) {
      console.error('Erro ao enviar teste:', error);
      toast.error('Erro ao enviar email de teste');
    } finally {
      setSendingTest(false);
    }
  };

  const getConfigByTipo = (tipo: string) => configs.find(c => c.tipo_email === tipo);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  const cotacaoConfig = getConfigByTipo('cotacao');
  const boasVindasConfig = getConfigByTipo('boas_vindas');

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="h-6 w-6" />
              Configurações de Email
            </h1>
            <p className="text-muted-foreground">
              Personalize os templates de email enviados pelo sistema
            </p>
          </div>
        </div>

        {/* Dados da Empresa (compartilhados) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Dados da Empresa
            </CardTitle>
            <CardDescription>
              Informações que aparecerão em todos os emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Empresa</Label>
                <Input
                  value={cotacaoConfig?.nome_empresa || ''}
                  onChange={(e) => {
                    updateConfig('cotacao', 'nome_empresa', e.target.value);
                    updateConfig('boas_vindas', 'nome_empresa', e.target.value);
                  }}
                  placeholder="Comercial Costa"
                />
              </div>
              <div className="space-y-2">
                <Label>Email da Empresa</Label>
                <Input
                  type="email"
                  value={cotacaoConfig?.email_empresa || ''}
                  onChange={(e) => {
                    updateConfig('cotacao', 'email_empresa', e.target.value);
                    updateConfig('boas_vindas', 'email_empresa', e.target.value);
                  }}
                  placeholder="contato@comercialcosta.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={cotacaoConfig?.telefone_empresa || ''}
                  onChange={(e) => {
                    updateConfig('cotacao', 'telefone_empresa', e.target.value);
                    updateConfig('boas_vindas', 'telefone_empresa', e.target.value);
                  }}
                  placeholder="(94) 99999-9999"
                />
              </div>
              <div className="space-y-2">
                <Label>Cor Primária</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={cotacaoConfig?.cor_primaria || '#3b82f6'}
                    onChange={(e) => {
                      updateConfig('cotacao', 'cor_primaria', e.target.value);
                      updateConfig('boas_vindas', 'cor_primaria', e.target.value);
                    }}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={cotacaoConfig?.cor_primaria || '#3b82f6'}
                    onChange={(e) => {
                      updateConfig('cotacao', 'cor_primaria', e.target.value);
                      updateConfig('boas_vindas', 'cor_primaria', e.target.value);
                    }}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input
                value={cotacaoConfig?.endereco_empresa || ''}
                onChange={(e) => {
                  updateConfig('cotacao', 'endereco_empresa', e.target.value);
                  updateConfig('boas_vindas', 'endereco_empresa', e.target.value);
                }}
                placeholder="Rua Principal, 123 - Centro - Cidade/UF"
              />
            </div>
            <div className="space-y-2">
              <Label>URL do Logo (opcional)</Label>
              <Input
                value={cotacaoConfig?.logo_url || ''}
                onChange={(e) => {
                  updateConfig('cotacao', 'logo_url', e.target.value);
                  updateConfig('boas_vindas', 'logo_url', e.target.value);
                }}
                placeholder="https://exemplo.com/logo.png"
              />
              <p className="text-xs text-muted-foreground">
                Cole a URL de uma imagem hospedada online (recomendado: 200x60 pixels)
              </p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="cotacao" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cotacao">Email de Cotação</TabsTrigger>
            <TabsTrigger value="boas_vindas">Boas-vindas Fornecedor</TabsTrigger>
          </TabsList>

          {/* Email de Cotação */}
          <TabsContent value="cotacao">
            {cotacaoConfig && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Template de Cotação</CardTitle>
                      <CardDescription>
                        Enviado quando você convida um fornecedor para uma cotação
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label>Ativo</Label>
                      <Switch
                        checked={cotacaoConfig.ativo ?? true}
                        onCheckedChange={(checked) => updateConfig('cotacao', 'ativo', checked)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Assunto do Email</Label>
                    <Input
                      value={cotacaoConfig.assunto_padrao}
                      onChange={(e) => updateConfig('cotacao', 'assunto_padrao', e.target.value)}
                      placeholder="Solicitação de Cotação #{numero}"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use {'{numero}'} para incluir o número da cotação
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Mensagem de Abertura</Label>
                    <Textarea
                      value={cotacaoConfig.mensagem_cabecalho || ''}
                      onChange={(e) => updateConfig('cotacao', 'mensagem_cabecalho', e.target.value)}
                      placeholder="Prezado fornecedor, você recebeu uma nova solicitação de cotação..."
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Texto que aparece antes da lista de produtos
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Mensagem de Encerramento</Label>
                    <Textarea
                      value={cotacaoConfig.mensagem_rodape || ''}
                      onChange={(e) => updateConfig('cotacao', 'mensagem_rodape', e.target.value)}
                      placeholder="Agradecemos sua parceria e aguardamos seu retorno."
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Texto que aparece após a lista de produtos
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
                    <div className="flex-1 flex gap-2">
                      <Input
                        type="email"
                        placeholder="Email para teste"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                      />
                      <Button
                        variant="outline"
                        onClick={() => sendTestEmail('cotacao')}
                        disabled={sendingTest}
                      >
                        {sendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                    <Button onClick={() => saveConfig(cotacaoConfig)} disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Salvar Configurações
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Email de Boas-vindas */}
          <TabsContent value="boas_vindas">
            {boasVindasConfig && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Template de Boas-vindas</CardTitle>
                      <CardDescription>
                        Enviado automaticamente ao cadastrar um novo fornecedor com email
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label>Ativo</Label>
                      <Switch
                        checked={boasVindasConfig.ativo ?? true}
                        onCheckedChange={(checked) => updateConfig('boas_vindas', 'ativo', checked)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Assunto do Email</Label>
                    <Input
                      value={boasVindasConfig.assunto_padrao}
                      onChange={(e) => updateConfig('boas_vindas', 'assunto_padrao', e.target.value)}
                      placeholder="Bem-vindo à Comercial Costa!"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Mensagem de Abertura</Label>
                    <Textarea
                      value={boasVindasConfig.mensagem_cabecalho || ''}
                      onChange={(e) => updateConfig('boas_vindas', 'mensagem_cabecalho', e.target.value)}
                      placeholder="Seja bem-vindo! É um prazer tê-lo como nosso parceiro fornecedor."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Mensagem de Encerramento</Label>
                    <Textarea
                      value={boasVindasConfig.mensagem_rodape || ''}
                      onChange={(e) => updateConfig('boas_vindas', 'mensagem_rodape', e.target.value)}
                      placeholder="Estamos à disposição para qualquer dúvida. Aguardamos boas parcerias!"
                      rows={4}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
                    <div className="flex-1 flex gap-2">
                      <Input
                        type="email"
                        placeholder="Email para teste"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                      />
                      <Button
                        variant="outline"
                        onClick={() => sendTestEmail('boas_vindas')}
                        disabled={sendingTest}
                      >
                        {sendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                    <Button onClick={() => saveConfig(boasVindasConfig)} disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Salvar Configurações
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default ConfiguracoesEmail;
