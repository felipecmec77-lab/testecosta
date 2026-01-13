import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Scale, Package, Sparkles } from 'lucide-react';
import { ImportarHortifruti } from './ImportarHortifruti';
import { FracionamentoManual } from './FracionamentoManual';

interface ItemOferta {
  item_id: string;
  nome_item: string;
  preco_custo: number;
  preco_venda_normal: number;
  preco_oferta: number;
  margem_lucro?: number;
  lucro_real?: number;
  destaque: boolean;
}

interface HortifrutiTabProps {
  onImportarItens: (itens: ItemOferta[]) => void;
}

type ViewState = 'menu' | 'fracionamento' | 'importar';

export function HortifrutiTab({ onImportarItens }: HortifrutiTabProps) {
  const [currentView, setCurrentView] = useState<ViewState>('menu');

  if (currentView === 'fracionamento') {
    return <FracionamentoManual onVoltar={() => setCurrentView('menu')} />;
  }

  if (currentView === 'importar') {
    return (
      <ImportarHortifruti 
        onVoltar={() => setCurrentView('menu')} 
        onConfirmar={(itens) => {
          onImportarItens(itens);
          setCurrentView('menu');
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl md:text-2xl font-bold">Ofertas Hortifruti</h2>
        <p className="text-muted-foreground mt-1">Escolha o método para criar suas ofertas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Opção 1: Fracionamento Manual */}
        <Card className="relative overflow-hidden border-2 hover:border-emerald-500 transition-colors cursor-pointer group">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg">
                <Scale className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-1">Fracionamento Manual</h3>
                <p className="text-sm text-muted-foreground mb-4">Usar tabela de fracionamento</p>
                
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    Produtos pré-cadastrados em Sistema
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    Calcula preço por kg/unidade
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    Histórico de sessões
                  </li>
                </ul>
              </div>
            </div>
            <Button 
              className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setCurrentView('fracionamento')}
            >
              Acessar <span className="ml-2">→</span>
            </Button>
          </CardContent>
        </Card>

        {/* Opção 2: Importar do Estoque */}
        <Card className="relative overflow-hidden border-2 hover:border-green-500 transition-colors cursor-pointer group">
          <Badge className="absolute top-4 right-4 bg-green-500 text-white">
            ⏱ Mais Rápido
          </Badge>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-1">Importar do Estoque</h3>
                <p className="text-sm text-muted-foreground mb-4">Fluxo rápido com sugestões</p>
                
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    Importa do subgrupo HORTIFRUTI
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    Custo já vem do sistema
                  </li>
                  <li className="flex items-center gap-2 text-green-600 font-medium">
                    <Sparkles className="w-4 h-4" />
                    Sugestão inteligente de preço
                  </li>
                </ul>
              </div>
            </div>
            <Button 
              className="w-full mt-6 bg-green-600 hover:bg-green-700"
              onClick={() => setCurrentView('importar')}
            >
              Começar <span className="ml-2">→</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
