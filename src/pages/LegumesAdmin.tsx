import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Printer, Leaf, Settings, Package, Eye, Share2, Image, ChevronDown, ChevronRight, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ThermalReceipt from "@/components/ThermalReceipt";
import html2canvas from "html2canvas";

interface Legume {
  id: string;
  nome_legume: string;
  quantidade_estoque: number;
  estoque_minimo: number;
  preco_unitario: number;
  unidade_medida: string;
  criado_em: string;
}

interface Recebimento {
  id: string;
  legume_id: string;
  usuario_id: string;
  quantidade_recebida: number;
  data_recebimento: string;
  observacao: string | null;
  criado_em: string;
  numero_recebimento: number | null;
  legume?: Legume;
}

interface RecebimentoAgrupado {
  numero: number | null;
  data: string;
  criado_em: string;
  items: Recebimento[];
}

interface PrintConfig {
  paperWidth: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  fontSize: number;
  showHeader: boolean;
  showDate: boolean;
  showObservation: boolean;
}

const defaultPrintConfig: PrintConfig = {
  paperWidth: 80,
  marginTop: 5,
  marginBottom: 5,
  marginLeft: 5,
  marginRight: 5,
  fontSize: 12,
  showHeader: true,
  showDate: true,
  showObservation: true,
};

export default function LegumesAdmin() {
  const { user, userRole } = useAuth();
  const [legumes, setLegumes] = useState<Legume[]>([]);
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([]);
  const [recebimentosAgrupados, setRecebimentosAgrupados] = useState<RecebimentoAgrupado[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLegume, setEditingLegume] = useState<Legume | null>(null);
  const [recebimentoDialogOpen, setRecebimentoDialogOpen] = useState(false);
  const [printConfigOpen, setPrintConfigOpen] = useState(false);
  const [selectedRecebimento, setSelectedRecebimento] = useState<RecebimentoAgrupado | null>(null);
  const [expandedRecebimentos, setExpandedRecebimentos] = useState<Set<string>>(new Set());
  const receiptRef = useRef<HTMLDivElement>(null);
  const [printConfig, setPrintConfig] = useState<PrintConfig>(() => {
    const saved = localStorage.getItem('thermalPrintConfig');
    return saved ? JSON.parse(saved) : defaultPrintConfig;
  });
  
  const [newLegume, setNewLegume] = useState({
    nome_legume: '',
    quantidade_estoque: '',
    estoque_minimo: '',
    preco_unitario: '',
    unidade_medida: 'kg',
  });

  const [newRecebimento, setNewRecebimento] = useState({
    legume_id: '',
    quantidade_recebida: '',
    observacao: '',
  });

  const isAdmin = userRole === 'administrador';

  useEffect(() => {
    fetchLegumes();
    fetchRecebimentos();
  }, []);

  useEffect(() => {
    localStorage.setItem('thermalPrintConfig', JSON.stringify(printConfig));
  }, [printConfig]);

  useEffect(() => {
    // Agrupar recebimentos por numero_recebimento ou data
    const grupos: Record<string, RecebimentoAgrupado> = {};
    
    recebimentos.forEach(rec => {
      const key = rec.numero_recebimento?.toString() || `date_${rec.data_recebimento}_${rec.criado_em}`;
      if (!grupos[key]) {
        grupos[key] = {
          numero: rec.numero_recebimento,
          data: rec.data_recebimento,
          criado_em: rec.criado_em,
          items: [],
        };
      }
      grupos[key].items.push(rec);
    });

    const agrupados = Object.values(grupos).sort((a, b) => 
      new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
    );
    
    setRecebimentosAgrupados(agrupados);
  }, [recebimentos]);

  const fetchLegumes = async () => {
    const { data, error } = await supabase
      .from('legumes')
      .select('*')
      .order('nome_legume');

    if (error) {
      toast.error("Erro ao carregar legumes");
      console.error(error);
    } else {
      setLegumes(data || []);
    }
    setLoading(false);
  };

  const fetchRecebimentos = async () => {
    const { data, error } = await supabase
      .from('recebimentos_legumes')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(100);

    if (error) {
      console.error(error);
    } else {
      setRecebimentos(data || []);
    }
  };

  const handleAddLegume = async () => {
    if (!newLegume.nome_legume.trim()) {
      toast.error("Nome do legume é obrigatório");
      return;
    }

    const { error } = await supabase.from('legumes').insert([{
      nome_legume: newLegume.nome_legume,
      quantidade_estoque: newLegume.quantidade_estoque ? Number(newLegume.quantidade_estoque) : 0,
      estoque_minimo: newLegume.estoque_minimo ? Number(newLegume.estoque_minimo) : 0,
      preco_unitario: newLegume.preco_unitario ? Number(newLegume.preco_unitario) : 0,
      unidade_medida: newLegume.unidade_medida,
    }]);

    if (error) {
      toast.error("Erro ao adicionar legume");
      console.error(error);
    } else {
      toast.success("Legume adicionado com sucesso");
      setNewLegume({ nome_legume: '', quantidade_estoque: '', estoque_minimo: '', preco_unitario: '', unidade_medida: 'kg' });
      setDialogOpen(false);
      fetchLegumes();
    }
  };

  const handleEditLegume = async () => {
    if (!editingLegume) return;

    const { error } = await supabase
      .from('legumes')
      .update({
        nome_legume: editingLegume.nome_legume,
        quantidade_estoque: editingLegume.quantidade_estoque,
        estoque_minimo: editingLegume.estoque_minimo,
        preco_unitario: editingLegume.preco_unitario,
        unidade_medida: editingLegume.unidade_medida,
      })
      .eq('id', editingLegume.id);

    if (error) {
      toast.error("Erro ao atualizar legume");
      console.error(error);
    } else {
      toast.success("Legume atualizado com sucesso");
      setEditingLegume(null);
      fetchLegumes();
    }
  };

  const handleDeleteLegume = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este legume?")) return;

    const { error } = await supabase.from('legumes').delete().eq('id', id);

    if (error) {
      toast.error("Erro ao excluir legume");
      console.error(error);
    } else {
      toast.success("Legume excluído com sucesso");
      fetchLegumes();
    }
  };

  const handleAddRecebimento = async () => {
    if (!newRecebimento.legume_id || !newRecebimento.quantidade_recebida) {
      toast.error("Selecione um legume e informe a quantidade");
      return;
    }

    const { error } = await supabase.from('recebimentos_legumes').insert([{
      legume_id: newRecebimento.legume_id,
      usuario_id: user?.id,
      quantidade_recebida: Number(newRecebimento.quantidade_recebida),
      observacao: newRecebimento.observacao || null,
    }]);

    if (error) {
      toast.error("Erro ao registrar recebimento");
      console.error(error);
    } else {
      // Update stock
      const legume = legumes.find(l => l.id === newRecebimento.legume_id);
      if (legume) {
        await supabase
          .from('legumes')
          .update({ 
            quantidade_estoque: legume.quantidade_estoque + Number(newRecebimento.quantidade_recebida) 
          })
          .eq('id', newRecebimento.legume_id);
      }

      toast.success("Recebimento registrado com sucesso");
      setNewRecebimento({ legume_id: '', quantidade_recebida: '', observacao: '' });
      setRecebimentoDialogOpen(false);
      fetchLegumes();
      fetchRecebimentos();
    }
  };

  const printRecebimento = (recebimento: Recebimento) => {
    const legume = legumes.find(l => l.id === recebimento.legume_id);
    if (!legume) return;

    const printWindow = window.open('', '_blank', 'width=300,height=400');
    if (!printWindow) {
      toast.error("Não foi possível abrir a janela de impressão");
      return;
    }

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Recebimento de Legume</title>
        <style>
          @page {
            size: ${printConfig.paperWidth}mm auto;
            margin: ${printConfig.marginTop}mm ${printConfig.marginRight}mm ${printConfig.marginBottom}mm ${printConfig.marginLeft}mm;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Courier New', monospace;
            font-size: ${printConfig.fontSize}px;
            line-height: 1.4;
            width: ${printConfig.paperWidth - printConfig.marginLeft - printConfig.marginRight}mm;
          }
          .header {
            text-align: center;
            border-bottom: 1px dashed #000;
            padding-bottom: 8px;
            margin-bottom: 8px;
          }
          .header h1 {
            font-size: ${printConfig.fontSize + 4}px;
            font-weight: bold;
          }
          .content {
            padding: 8px 0;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
          }
          .label {
            font-weight: bold;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 8px 0;
          }
          .center {
            text-align: center;
          }
          .large {
            font-size: ${printConfig.fontSize + 6}px;
            font-weight: bold;
          }
          .footer {
            text-align: center;
            margin-top: 16px;
            font-size: ${printConfig.fontSize - 2}px;
          }
        </style>
      </head>
      <body>
        ${printConfig.showHeader ? `
          <div class="header">
            <h1>RECEBIMENTO</h1>
            <p>Comercial Costa</p>
          </div>
        ` : ''}
        
        <div class="content">
          ${printConfig.showDate ? `
            <div class="row">
              <span class="label">Data:</span>
              <span>${format(new Date(recebimento.data_recebimento), 'dd/MM/yyyy', { locale: ptBR })}</span>
            </div>
            <div class="row">
              <span class="label">Hora:</span>
              <span>${format(new Date(recebimento.criado_em), 'HH:mm', { locale: ptBR })}</span>
            </div>
          ` : ''}
          
          <div class="divider"></div>
          
          <div class="center">
            <p class="label">LEGUME</p>
            <p class="large">${legume.nome_legume}</p>
          </div>
          
          <div class="divider"></div>
          
          <div class="center">
            <p class="label">QUANTIDADE RECEBIDA</p>
            <p class="large">${recebimento.quantidade_recebida} ${legume.unidade_medida}</p>
          </div>
          
          ${printConfig.showObservation && recebimento.observacao ? `
            <div class="divider"></div>
            <div>
              <p class="label">Observação:</p>
              <p>${recebimento.observacao}</p>
            </div>
          ` : ''}
        </div>
        
        <div class="footer">
          <div class="divider"></div>
          <p>*** FIM DO COMPROVANTE ***</p>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  };

  const printAllRecebimentosDia = () => {
    const hoje = format(new Date(), 'yyyy-MM-dd');
    const recebimentosHoje = recebimentos.filter(r => r.data_recebimento === hoje);

    if (recebimentosHoje.length === 0) {
      toast.info("Nenhum recebimento registrado hoje");
      return;
    }

    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) {
      toast.error("Não foi possível abrir a janela de impressão");
      return;
    }

    const items = recebimentosHoje.map(r => {
      const legume = legumes.find(l => l.id === r.legume_id);
      return {
        nome: legume?.nome_legume || 'N/A',
        quantidade: r.quantidade_recebida,
        unidade: legume?.unidade_medida || 'kg',
      };
    });

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Recebimentos do Dia</title>
        <style>
          @page {
            size: ${printConfig.paperWidth}mm auto;
            margin: ${printConfig.marginTop}mm ${printConfig.marginRight}mm ${printConfig.marginBottom}mm ${printConfig.marginLeft}mm;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Courier New', monospace;
            font-size: ${printConfig.fontSize}px;
            line-height: 1.4;
            width: ${printConfig.paperWidth - printConfig.marginLeft - printConfig.marginRight}mm;
          }
          .header {
            text-align: center;
            border-bottom: 1px dashed #000;
            padding-bottom: 8px;
            margin-bottom: 8px;
          }
          .header h1 {
            font-size: ${printConfig.fontSize + 4}px;
            font-weight: bold;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            text-align: left;
            padding: 4px 2px;
            border-bottom: 1px dotted #ccc;
          }
          th {
            font-weight: bold;
            border-bottom: 1px solid #000;
          }
          .footer {
            text-align: center;
            margin-top: 16px;
            font-size: ${printConfig.fontSize - 2}px;
            border-top: 1px dashed #000;
            padding-top: 8px;
          }
        </style>
      </head>
      <body>
        ${printConfig.showHeader ? `
          <div class="header">
            <h1>RECEBIMENTOS</h1>
            <p>Comercial Costa</p>
            <p>${format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}</p>
          </div>
        ` : ''}
        
        <table>
          <thead>
            <tr>
              <th>Legume</th>
              <th>Qtd</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td>${item.nome}</td>
                <td>${item.quantidade} ${item.unidade}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Total: ${items.length} itens</p>
          <p>*** FIM ***</p>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
      {/* Header clicável - estilo moderno */}
      <button 
        className="w-full text-center p-4 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
      >
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center justify-center gap-3">
          <Leaf className="w-8 h-8" />
          LEGUMES
        </h1>
        <p className="text-white/80 text-sm mt-1">COMERCIAL COSTA</p>
      </button>
      
      <div className="flex gap-2 justify-end">
          <Dialog open={printConfigOpen} onOpenChange={setPrintConfigOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Config. Impressão
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Configuração de Impressão Térmica</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Largura do papel (mm)</Label>
                    <Input
                      type="number"
                      value={printConfig.paperWidth}
                      onChange={(e) => setPrintConfig({ ...printConfig, paperWidth: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Tamanho da fonte (px)</Label>
                    <Input
                      type="number"
                      value={printConfig.fontSize}
                      onChange={(e) => setPrintConfig({ ...printConfig, fontSize: Number(e.target.value) })}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Margem superior (mm)</Label>
                    <Input
                      type="number"
                      value={printConfig.marginTop}
                      onChange={(e) => setPrintConfig({ ...printConfig, marginTop: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Margem inferior (mm)</Label>
                    <Input
                      type="number"
                      value={printConfig.marginBottom}
                      onChange={(e) => setPrintConfig({ ...printConfig, marginBottom: Number(e.target.value) })}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Margem esquerda (mm)</Label>
                    <Input
                      type="number"
                      value={printConfig.marginLeft}
                      onChange={(e) => setPrintConfig({ ...printConfig, marginLeft: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Margem direita (mm)</Label>
                    <Input
                      type="number"
                      value={printConfig.marginRight}
                      onChange={(e) => setPrintConfig({ ...printConfig, marginRight: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Opções de exibição</Label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={printConfig.showHeader}
                        onChange={(e) => setPrintConfig({ ...printConfig, showHeader: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm">Mostrar cabeçalho</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={printConfig.showDate}
                        onChange={(e) => setPrintConfig({ ...printConfig, showDate: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm">Mostrar data/hora</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={printConfig.showObservation}
                        onChange={(e) => setPrintConfig({ ...printConfig, showObservation: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm">Mostrar observação</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setPrintConfig(defaultPrintConfig)}
                    className="flex-1"
                  >
                    Restaurar Padrão
                  </Button>
                  <Button onClick={() => setPrintConfigOpen(false)} className="flex-1">
                    Salvar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="cadastro" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cadastro" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Cadastro
          </TabsTrigger>
          <TabsTrigger value="recebimentos" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Recebimentos
          </TabsTrigger>
          <TabsTrigger value="historico" className="flex items-center gap-2">
            Histórico
            {recebimentos.length > 0 && (
              <Badge variant="secondary" className="ml-1">{recebimentos.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Cadastro Tab */}
        <TabsContent value="cadastro" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Legumes Cadastrados</CardTitle>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Legume
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Legume</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nome do Legume</Label>
                      <Input
                        value={newLegume.nome_legume}
                        onChange={(e) => setNewLegume({ ...newLegume, nome_legume: e.target.value })}
                        placeholder=""
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Quantidade em Estoque</Label>
                        <Input
                          type="number"
                          value={newLegume.quantidade_estoque}
                          onChange={(e) => setNewLegume({ ...newLegume, quantidade_estoque: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label>Estoque Mínimo</Label>
                        <Input
                          type="number"
                          value={newLegume.estoque_minimo}
                          onChange={(e) => setNewLegume({ ...newLegume, estoque_minimo: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Preço Unitário (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={newLegume.preco_unitario}
                          onChange={(e) => setNewLegume({ ...newLegume, preco_unitario: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label>Unidade de Medida</Label>
                        <select
                          className="w-full h-10 px-3 rounded-md border border-input bg-background"
                          value={newLegume.unidade_medida}
                          onChange={(e) => setNewLegume({ ...newLegume, unidade_medida: e.target.value })}
                        >
                          <option value="kg">Quilograma (kg)</option>
                          <option value="un">Unidade (un)</option>
                          <option value="maco">Maço</option>
                          <option value="cx">Caixa (cx)</option>
                        </select>
                      </div>
                    </div>
                    <Button onClick={handleAddLegume} className="w-full">
                      Adicionar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Estoque</TableHead>
                    <TableHead>Mínimo</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {legumes.map((legume) => (
                    <TableRow key={legume.id}>
                      <TableCell className="font-medium">{legume.nome_legume}</TableCell>
                      <TableCell>
                        <Badge variant={legume.quantidade_estoque <= legume.estoque_minimo ? "destructive" : "default"}>
                          {legume.quantidade_estoque}
                        </Badge>
                      </TableCell>
                      <TableCell>{legume.estoque_minimo}</TableCell>
                      <TableCell>R$ {legume.preco_unitario.toFixed(2)}</TableCell>
                      <TableCell>{legume.unidade_medida}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setEditingLegume(legume)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Editar Legume</DialogTitle>
                              </DialogHeader>
                              {editingLegume && (
                                <div className="space-y-4">
                                  <div>
                                    <Label>Nome</Label>
                                    <Input
                                      value={editingLegume.nome_legume}
                                      onChange={(e) => setEditingLegume({ ...editingLegume, nome_legume: e.target.value })}
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Quantidade</Label>
                                      <Input
                                        type="number"
                                        value={editingLegume.quantidade_estoque}
                                        onChange={(e) => setEditingLegume({ ...editingLegume, quantidade_estoque: Number(e.target.value) })}
                                      />
                                    </div>
                                    <div>
                                      <Label>Mínimo</Label>
                                      <Input
                                        type="number"
                                        value={editingLegume.estoque_minimo}
                                        onChange={(e) => setEditingLegume({ ...editingLegume, estoque_minimo: Number(e.target.value) })}
                                      />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Preço</Label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={editingLegume.preco_unitario}
                                        onChange={(e) => setEditingLegume({ ...editingLegume, preco_unitario: Number(e.target.value) })}
                                      />
                                    </div>
                                    <div>
                                      <Label>Unidade</Label>
                                      <select
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                        value={editingLegume.unidade_medida}
                                        onChange={(e) => setEditingLegume({ ...editingLegume, unidade_medida: e.target.value })}
                                      >
                                        <option value="kg">kg</option>
                                        <option value="un">un</option>
                                        <option value="maco">maço</option>
                                        <option value="cx">cx</option>
                                      </select>
                                    </div>
                                  </div>
                                  <Button onClick={handleEditLegume} className="w-full">
                                    Salvar
                                  </Button>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteLegume(legume.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {legumes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhum legume cadastrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recebimentos Tab */}
        <TabsContent value="recebimentos" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Registrar Recebimento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Selecione o Legume</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    value={newRecebimento.legume_id}
                    onChange={(e) => setNewRecebimento({ ...newRecebimento, legume_id: e.target.value })}
                  >
                    <option value="">Selecione...</option>
                    {legumes.map((legume) => (
                      <option key={legume.id} value={legume.id}>
                        {legume.nome_legume} (Estoque atual: {legume.quantidade_estoque} {legume.unidade_medida})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Quantidade Recebida</Label>
                  <Input
                    type="number"
                    value={newRecebimento.quantidade_recebida}
                    onChange={(e) => setNewRecebimento({ ...newRecebimento, quantidade_recebida: e.target.value })}
                    placeholder="Informe a quantidade"
                  />
                </div>
                <div>
                  <Label>Observação (opcional)</Label>
                  <Input
                    value={newRecebimento.observacao}
                    onChange={(e) => setNewRecebimento({ ...newRecebimento, observacao: e.target.value })}
                    placeholder="Ex: Fornecedor, qualidade, etc."
                  />
                </div>
                <Button onClick={handleAddRecebimento} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Recebimento
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Histórico Tab */}
        <TabsContent value="historico" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Histórico de Recebimentos</CardTitle>
              <Button variant="outline" onClick={printAllRecebimentosDia}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir do Dia
              </Button>
            </CardHeader>
            <CardContent>
              {recebimentosAgrupados.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Nenhum recebimento registrado
                </div>
              ) : (
                <div className="space-y-3">
                  {recebimentosAgrupados.map((grupo, idx) => {
                    const grupoKey = grupo.numero?.toString() || `idx_${idx}`;
                    const isExpanded = expandedRecebimentos.has(grupoKey);
                    
                    return (
                      <Collapsible key={grupoKey} open={isExpanded}>
                        <Card className="border">
                          <CollapsibleTrigger asChild>
                            <CardHeader 
                              className="cursor-pointer hover:bg-muted/50 transition-colors py-4"
                              onClick={() => {
                                setExpandedRecebimentos(prev => {
                                  const next = new Set(prev);
                                  if (next.has(grupoKey)) {
                                    next.delete(grupoKey);
                                  } else {
                                    next.add(grupoKey);
                                  }
                                  return next;
                                });
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {isExpanded ? (
                                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                  )}
                                  <div>
                                    <CardTitle className="text-base">
                                      Recebimento {grupo.numero ? `#${grupo.numero}` : ''}
                                    </CardTitle>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                      <Calendar className="w-4 h-4" />
                                      {format(new Date(grupo.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                      <Badge variant="secondary" className="ml-2">
                                        {grupo.items.length} {grupo.items.length === 1 ? 'item' : 'itens'}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                                {isAdmin && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedRecebimento(grupo);
                                    }}
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    Visualizar
                                  </Button>
                                )}
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent className="pt-0">
                              <div className="divide-y divide-border">
                                {grupo.items.map((item) => {
                                  const legume = legumes.find(l => l.id === item.legume_id);
                                  return (
                                    <div key={item.id} className="flex justify-between py-2">
                                      <span>{legume?.nome_legume || 'N/A'}</span>
                                      <span className="font-medium">
                                        {item.quantidade_recebida} {legume?.unidade_medida || ''}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para visualizar recebimento com opções de imprimir/compartilhar */}
      <Dialog open={!!selectedRecebimento} onOpenChange={(open) => !open && setSelectedRecebimento(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Recebimento {selectedRecebimento?.numero ? `#${selectedRecebimento.numero}` : ''}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRecebimento && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {format(new Date(selectedRecebimento.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </div>

              {/* Receipt Preview */}
              <div className="flex justify-center">
                <div className="shadow-lg rounded-lg overflow-hidden border border-border">
                  <ThermalReceipt
                    ref={receiptRef}
                    items={selectedRecebimento.items.map(item => {
                      const legume = legumes.find(l => l.id === item.legume_id);
                      return {
                        nome: legume?.nome_legume || 'N/A',
                        quantidade: item.quantidade_recebida,
                        unidade: legume?.unidade_medida,
                      };
                    })}
                    numero={selectedRecebimento.numero || 0}
                    tipo="RECEBIMENTO LEGUMES"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={async () => {
                    if (!receiptRef.current) return;
                    try {
                      const canvas = await html2canvas(receiptRef.current, {
                        backgroundColor: '#ffffff',
                        scale: 2,
                      });
                      const blob = await new Promise<Blob>((resolve) => {
                        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95);
                      });
                      const file = new File([blob], `recebimento-legumes-${selectedRecebimento.numero || 'sem-numero'}.jpg`, { type: 'image/jpeg' });
                      if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({ files: [file], title: 'Recebimento de Legumes' });
                      } else {
                        const link = document.createElement('a');
                        link.download = file.name;
                        link.href = canvas.toDataURL('image/jpeg', 0.95);
                        link.click();
                        toast.success('Imagem salva! Abra o WhatsApp e envie manualmente');
                      }
                    } catch (error) {
                      if ((error as Error).name !== 'AbortError') {
                        toast.error('Erro ao compartilhar');
                      }
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Compartilhar WhatsApp
                </Button>
                <Button 
                  onClick={() => {
                    if (!receiptRef.current) return;
                    const printWindow = window.open('', '_blank');
                    if (!printWindow) {
                      toast.error('Não foi possível abrir a janela de impressão');
                      return;
                    }
                    printWindow.document.write(`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <title>Recebimento Legumes</title>
                          <style>
                            @page { size: 80mm auto; margin: 0; }
                            body { margin: 0; padding: 0; font-family: 'Courier New', Courier, monospace; }
                            .receipt { width: 80mm; padding: 5mm; box-sizing: border-box; }
                          </style>
                        </head>
                        <body>
                          <div class="receipt">${receiptRef.current.innerHTML}</div>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                    printWindow.focus();
                    setTimeout(() => {
                      printWindow.print();
                      printWindow.close();
                    }, 250);
                  }}
                  variant="outline"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir
                </Button>
                <Button 
                  onClick={async () => {
                    if (!receiptRef.current) return;
                    try {
                      const canvas = await html2canvas(receiptRef.current, {
                        backgroundColor: '#ffffff',
                        scale: 2,
                      });
                      const link = document.createElement('a');
                      link.download = `recebimento-legumes-${selectedRecebimento.numero || 'sem-numero'}.jpg`;
                      link.href = canvas.toDataURL('image/jpeg', 0.9);
                      link.click();
                      toast.success('Imagem salva!');
                    } catch (error) {
                      toast.error('Erro ao salvar imagem');
                    }
                  }}
                  variant="secondary"
                >
                  <Image className="w-4 h-4 mr-2" />
                  Salvar JPG
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </MainLayout>
  );
}
