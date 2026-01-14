import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Save, RotateCcw, Upload, Trash2, LogIn, Loader2 } from 'lucide-react';

interface LoginConfig {
  id?: string;
  titulo: string;
  subtitulo: string;
  logo_url: string | null;
  cor_fundo: string;
  permitir_cadastro: boolean;
  mostrar_icones: boolean;
}

const DEFAULT_CONFIG: LoginConfig = {
  titulo: 'Entrar',
  subtitulo: 'Acesse sua conta para continuar',
  logo_url: null,
  cor_fundo: '#16a34a',
  permitir_cadastro: false,
  mostrar_icones: true,
};

export const LoginConfigManager = () => {
  const [config, setConfig] = useState<LoginConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes_login')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar configuração:', error);
        return;
      }

      if (data) {
        setConfig({
          id: data.id,
          titulo: data.titulo,
          subtitulo: data.subtitulo,
          logo_url: data.logo_url,
          cor_fundo: data.cor_fundo || '#16a34a',
          permitir_cadastro: data.permitir_cadastro ?? false,
          mostrar_icones: data.mostrar_icones ?? true,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (config.id) {
        const { error } = await supabase
          .from('configuracoes_login')
          .update({
            titulo: config.titulo,
            subtitulo: config.subtitulo,
            logo_url: config.logo_url,
            cor_fundo: config.cor_fundo,
            permitir_cadastro: config.permitir_cadastro,
            mostrar_icones: config.mostrar_icones,
            atualizado_em: new Date().toISOString(),
          })
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('configuracoes_login')
          .insert({
            titulo: config.titulo,
            subtitulo: config.subtitulo,
            logo_url: config.logo_url,
            cor_fundo: config.cor_fundo,
            permitir_cadastro: config.permitir_cadastro,
            mostrar_icones: config.mostrar_icones,
          })
          .select()
          .single();

        if (error) throw error;
        setConfig({ ...config, id: data.id });
      }

      toast.success('Configurações de login salvas!');
      setHasChanges(false);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `login-logo-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('logos')
        .getPublicUrl(data.path);

      setConfig({ ...config, logo_url: urlData.publicUrl });
      setHasChanges(true);
      toast.success('Logo enviado!');
    } catch (error) {
      console.error('Erro ao enviar logo:', error);
      toast.error('Erro ao enviar logo');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleRemoveLogo = () => {
    setConfig({ ...config, logo_url: null });
    setHasChanges(true);
  };

  const handleReset = () => {
    setConfig({ ...DEFAULT_CONFIG, id: config.id });
    setHasChanges(true);
  };

  const updateConfig = (updates: Partial<LoginConfig>) => {
    setConfig({ ...config, ...updates });
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="w-5 h-5" />
              Tela de Login
            </CardTitle>
            <CardDescription>
              Personalize a aparência da tela de login
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Resetar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Coluna de configurações */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={config.titulo}
                onChange={(e) => updateConfig({ titulo: e.target.value })}
                placeholder="Entrar"
              />
            </div>

            <div className="space-y-2">
              <Label>Subtítulo</Label>
              <Input
                value={config.subtitulo}
                onChange={(e) => updateConfig({ subtitulo: e.target.value })}
                placeholder="Acesse sua conta para continuar"
              />
            </div>

            <div className="space-y-2">
              <Label>Cor de Fundo (Gradiente)</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={config.cor_fundo}
                  onChange={(e) => updateConfig({ cor_fundo: e.target.value })}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={config.cor_fundo}
                  onChange={(e) => updateConfig({ cor_fundo: e.target.value })}
                  placeholder="#16a34a"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Logo Personalizado</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="flex-1"
                  disabled={uploading}
                />
                {config.logo_url && (
                  <Button variant="outline" size="icon" onClick={handleRemoveLogo}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {config.logo_url && (
                <img src={config.logo_url} alt="Logo" className="h-16 object-contain mt-2" />
              )}
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <Label>Permitir Cadastro</Label>
                <p className="text-xs text-muted-foreground">
                  Mostrar opção de criar conta
                </p>
              </div>
              <Switch
                checked={config.permitir_cadastro}
                onCheckedChange={(checked) => updateConfig({ permitir_cadastro: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <Label>Mostrar Ícones</Label>
                <p className="text-xs text-muted-foreground">
                  Ícones de legumes, verduras e frutas
                </p>
              </div>
              <Switch
                checked={config.mostrar_icones}
                onCheckedChange={(checked) => updateConfig({ mostrar_icones: checked })}
              />
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Prévia</Label>
            <div 
              className="rounded-lg overflow-hidden border shadow-lg"
              style={{ minHeight: '300px' }}
            >
              <div 
                className="p-6 text-white text-center"
                style={{ background: `linear-gradient(135deg, ${config.cor_fundo}, ${config.cor_fundo}dd)` }}
              >
                {config.logo_url ? (
                  <img src={config.logo_url} alt="Logo" className="h-16 mx-auto mb-4 object-contain" />
                ) : (
                  <div className="w-16 h-16 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <LogIn className="w-8 h-8" />
                  </div>
                )}
                <h2 className="text-xl font-bold">Costa</h2>
                {config.mostrar_icones && (
                  <div className="flex justify-center gap-4 mt-4 text-xs opacity-80">
                    <span>🥕 Legumes</span>
                    <span>🥬 Verduras</span>
                    <span>🍎 Frutas</span>
                  </div>
                )}
              </div>
              <div className="bg-background p-6 text-center">
                <h3 className="text-lg font-bold">{config.titulo}</h3>
                <p className="text-sm text-muted-foreground mb-4">{config.subtitulo}</p>
                <div className="space-y-2">
                  <div className="h-10 bg-muted rounded-lg"></div>
                  <div className="h-10 bg-muted rounded-lg"></div>
                  <div 
                    className="h-10 rounded-lg text-white flex items-center justify-center text-sm font-medium"
                    style={{ backgroundColor: config.cor_fundo }}
                  >
                    Entrar
                  </div>
                </div>
                {config.permitir_cadastro && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Não tem conta? Cadastre-se
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};