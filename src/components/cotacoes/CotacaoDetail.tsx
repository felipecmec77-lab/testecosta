import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Building2, 
  MessageSquare,
  FileCheck,
  Printer,
  Send,
  RefreshCw,
  Plus,
  Trash2,
  Search,
  Package
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import RespostaFornecedor from './RespostaFornecedor';
import SelecionarProdutosModal from './SelecionarProdutosModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Cotacao {
  id: string;
  numero: number;
  titulo: string | null;
  data_cotacao: string;
  data_validade: string | null;
  data_limite_resposta: string | null;
  status: string;
  total: number | null;
  observacao: string | null;
  justificativa_escolha: string | null;
  fornecedor?: {
    id: string;
    nome: string;
    telefone: string | null;
    email: string | null;
  };
}

interface ItemCotacao {
  id: string;
  nome_produto: string;
  quantidade: number;
  codigo_barras: string | null;
  preco_unitario: number | null;
  preco_total: number | null;
}

interface Fornecedor {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
}

interface Convite {
  id: string;
  fornecedor_id: string;
  status: string;
  enviado_em: string | null;
  respondido_em: string | null;
  fornecedor?: Fornecedor;
}

interface CotacaoDetailProps {
  cotacao: Cotacao;
  onClose: () => void;
  onStatusUpdate?: () => void;
  onUpdate?: () => void;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pendente: { label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-500', icon: Clock },
  em_analise: { label: 'Em Análise', color: 'bg-blue-500/20 text-blue-500', icon: Clock },
  aprovada: { label: 'Aprovada', color: 'bg-green-500/20 text-green-500', icon: CheckCircle },
  rejeitada: { label: 'Rejeitada', color: 'bg-red-500/20 text-red-500', icon: XCircle },
  cancelada: { label: 'Cancelada', color: 'bg-gray-500/20 text-gray-500', icon: XCircle },
  finalizada: { label: 'Finalizada', color: 'bg-emerald-500/20 text-emerald-500', icon: FileCheck },
};

const CotacaoDetail = ({ cotacao, onClose, onStatusUpdate, onUpdate }: CotacaoDetailProps) => {
  const [itens, setItens] = useState<ItemCotacao[]>([]);
  const [convites, setConvites] = useState<Convite[]>([]);
  const [fornecedoresDisponiveis, setFornecedoresDisponiveis] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRespostaDialog, setShowRespostaDialog] = useState(false);
  const [showConvidarDialog, setShowConvidarDialog] = useState(false);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [showSelecionarProdutos, setShowSelecionarProdutos] = useState(false);
  const [selectedFornecedores, setSelectedFornecedores] = useState<string[]>([]);
  const [justificativa, setJustificativa] = useState(cotacao.justificativa_escolha || '');
  const [resendingTo, setResendingTo] = useState<string | null>(null);
  
  // Estado para novo item
  const [novoItem, setNovoItem] = useState({
    nome_produto: '',
    quantidade: 1,
    codigo_barras: ''
  });

  useEffect(() => {
    carregarDados();
  }, [cotacao.id]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const { data: itensData, error: itensError } = await supabase
        .from('itens_cotacao')
        .select('*')
        .eq('cotacao_id', cotacao.id);

      if (itensError) throw itensError;

      const { data: convitesData, error: convitesError } = await supabase
        .from('convites_fornecedor')
        .select('*, fornecedor:fornecedores(*)')
        .eq('cotacao_id', cotacao.id);

      if (convitesError) throw convitesError;

      const { data: fornecedoresData, error: fornecedoresError } = await supabase
        .from('fornecedores')
        .select('id, nome, email, telefone')
        .eq('ativo', true)
        .order('nome');

      if (fornecedoresError) throw fornecedoresError;

      setItens(itensData || []);
      setConvites(convitesData || []);
      setFornecedoresDisponiveis(fornecedoresData || []);
    } catch (error) {
      console.error('Erro ao carregar dados da cotação:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Função para reenviar convite para um fornecedor específico
  const resendConvite = async (convite: Convite) => {
    if (!convite.fornecedor?.email) {
      toast.error(`${convite.fornecedor?.nome || 'Fornecedor'} não possui email cadastrado`);
      return;
    }

    setResendingTo(convite.id);
    try {
      // Atualizar data de envio
      await supabase
        .from('convites_fornecedor')
        .update({ enviado_em: new Date().toISOString() })
        .eq('id', convite.id);

      // Enviar email
      const { error: emailError } = await supabase.functions.invoke('send-cotacao-email', {
        body: {
          fornecedor_email: convite.fornecedor.email,
          fornecedor_nome: convite.fornecedor.nome,
          cotacao_numero: cotacao.numero,
          cotacao_titulo: cotacao.titulo || 'Solicitação de Cotação',
          data_limite: cotacao.data_limite_resposta,
          itens: itens.map(item => ({
            nome_produto: item.nome_produto,
            quantidade: item.quantidade,
            codigo_barras: item.codigo_barras
          })),
          observacao: cotacao.observacao
        }
      });

      if (emailError) throw emailError;

      toast.success(`Convite reenviado para ${convite.fornecedor.nome}!`);
      carregarDados();
    } catch (error) {
      console.error('Erro ao reenviar convite:', error);
      toast.error('Erro ao reenviar convite');
    } finally {
      setResendingTo(null);
    }
  };

  const convidarFornecedores = async () => {
    if (selectedFornecedores.length === 0) {
      toast.error('Selecione pelo menos um fornecedor');
      return;
    }

    try {
      const { data: fornecedoresSelecionados, error: fornecedoresError } = await supabase
        .from('fornecedores')
        .select('id, nome, email, telefone')
        .in('id', selectedFornecedores);

      if (fornecedoresError) throw fornecedoresError;

      const convitesData = selectedFornecedores.map(fornecedorId => ({
        cotacao_id: cotacao.id,
        fornecedor_id: fornecedorId,
        status: 'pendente' as const,
        enviado_em: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('convites_fornecedor')
        .upsert(convitesData, { onConflict: 'cotacao_id,fornecedor_id' });

      if (error) throw error;

      let emailsEnviados = 0;
      let emailsFalharam = 0;

      for (const fornecedor of fornecedoresSelecionados || []) {
        if (fornecedor.email) {
          try {
            const { error: emailError } = await supabase.functions.invoke('send-cotacao-email', {
              body: {
                fornecedor_email: fornecedor.email,
                fornecedor_nome: fornecedor.nome,
                cotacao_numero: cotacao.numero,
                cotacao_titulo: cotacao.titulo || 'Solicitação de Cotação',
                data_limite: cotacao.data_limite_resposta,
                itens: itens.map(item => ({
                  nome_produto: item.nome_produto,
                  quantidade: item.quantidade,
                  codigo_barras: item.codigo_barras
                })),
                observacao: cotacao.observacao
              }
            });

            if (emailError) {
              emailsFalharam++;
            } else {
              emailsEnviados++;
            }
          } catch (emailErr) {
            emailsFalharam++;
          }
        }
      }

      if (emailsEnviados > 0 && emailsFalharam === 0) {
        toast.success(`Convites enviados! ${emailsEnviados} email(s) enviado(s) com sucesso.`);
      } else if (emailsEnviados > 0 && emailsFalharam > 0) {
        toast.warning(`Convites salvos. ${emailsEnviados} email(s) enviado(s), ${emailsFalharam} falhou(aram).`);
      } else if (emailsFalharam > 0) {
        toast.error(`Convites salvos, mas os emails falharam.`);
      } else {
        toast.success('Convites salvos! Nenhum fornecedor tem email cadastrado.');
      }

      setShowConvidarDialog(false);
      setSelectedFornecedores([]);
      carregarDados();
    } catch (error) {
      console.error('Erro ao enviar convites:', error);
      toast.error('Erro ao enviar convites');
    }
  };

  // Adicionar item à cotação
  const addItem = async () => {
    if (!novoItem.nome_produto.trim()) {
      toast.error('Nome do produto é obrigatório');
      return;
    }

    try {
      const { error } = await supabase.from('itens_cotacao').insert({
        cotacao_id: cotacao.id,
        nome_produto: novoItem.nome_produto,
        quantidade: novoItem.quantidade,
        codigo_barras: novoItem.codigo_barras || null
      });

      if (error) throw error;

      toast.success('Item adicionado!');
      setNovoItem({ nome_produto: '', quantidade: 1, codigo_barras: '' });
      setShowAddItemDialog(false);
      carregarDados();
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      toast.error('Erro ao adicionar item');
    }
  };

  // Remover item da cotação
  const removeItem = async (itemId: string) => {
    try {
      const { error } = await supabase.from('itens_cotacao').delete().eq('id', itemId);
      if (error) throw error;
      toast.success('Item removido!');
      carregarDados();
    } catch (error) {
      console.error('Erro ao remover item:', error);
      toast.error('Erro ao remover item');
    }
  };

  const updateStatus = async (status: string) => {
    try {
      const updateData: any = { status };
      
      if (status === 'aprovada' && justificativa) {
        updateData.justificativa_escolha = justificativa;
        updateData.aprovado_em = new Date().toISOString();
      }

      const { error } = await supabase
        .from('cotacoes')
        .update(updateData)
        .eq('id', cotacao.id);

      if (error) throw error;

      toast.success(`Cotação ${status}!`);
      onUpdate?.();
      onStatusUpdate?.();
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('COTAÇÃO DE PRODUTOS', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Cotação Nº: ${cotacao.numero}`, 14, 35);
    doc.text(`Data: ${format(new Date(cotacao.data_cotacao), 'dd/MM/yyyy', { locale: ptBR })}`, 14, 42);
    if (cotacao.titulo) doc.text(`Título: ${cotacao.titulo}`, 14, 49);
    
    const tableData = itens.map(item => [
      item.codigo_barras || '-',
      item.nome_produto,
      item.quantidade.toString(),
    ]);

    autoTable(doc, {
      head: [['Código', 'Produto', 'Quantidade']],
      body: tableData,
      startY: 60,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });

    if (cotacao.observacao) {
      const finalY = (doc as any).lastAutoTable.finalY;
      doc.text(`Observação: ${cotacao.observacao}`, 14, finalY + 15);
    }

    doc.save(`cotacao-${cotacao.numero}.pdf`);
    toast.success('PDF gerado!');
  };

  const StatusIcon = statusConfig[cotacao.status]?.icon || Clock;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Cotação #{cotacao.numero}</h3>
          {cotacao.titulo && <p className="text-muted-foreground">{cotacao.titulo}</p>}
        </div>
        <Badge className={statusConfig[cotacao.status]?.color}>
          <StatusIcon className="w-4 h-4 mr-1" />
          {statusConfig[cotacao.status]?.label}
        </Badge>
      </div>

      {/* Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Data</p>
          <p className="font-medium">{format(new Date(cotacao.data_cotacao), 'dd/MM/yyyy', { locale: ptBR })}</p>
        </div>
        {cotacao.data_limite_resposta && (
          <div>
            <p className="text-muted-foreground">Limite de Resposta</p>
            <p className="font-medium">{format(new Date(cotacao.data_limite_resposta), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
          </div>
        )}
        <div>
          <p className="text-muted-foreground">Total de Itens</p>
          <p className="font-medium">{itens.length}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Fornecedores Convidados</p>
          <p className="font-medium">{convites.length}</p>
        </div>
      </div>

      {/* Itens */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Itens da Cotação
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={() => setShowSelecionarProdutos(true)}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Selecionar Produtos
            </Button>
            <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Manual
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Item à Cotação</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nome do Produto *</Label>
                    <Input
                      value={novoItem.nome_produto}
                      onChange={(e) => setNovoItem(prev => ({ ...prev, nome_produto: e.target.value }))}
                      placeholder="Ex: Arroz 5kg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Quantidade</Label>
                      <Input
                        type="number"
                        min="1"
                        value={novoItem.quantidade}
                        onChange={(e) => setNovoItem(prev => ({ ...prev, quantidade: parseFloat(e.target.value) || 1 }))}
                      />
                    </div>
                    <div>
                      <Label>Código de Barras</Label>
                      <Input
                        value={novoItem.codigo_barras}
                        onChange={(e) => setNovoItem(prev => ({ ...prev, codigo_barras: e.target.value }))}
                        placeholder="Opcional"
                      />
                    </div>
                  </div>
                  <Button onClick={addItem} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-center">Quantidade</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.codigo_barras || '-'}</TableCell>
                  <TableCell>{item.nome_produto}</TableCell>
                  <TableCell className="text-center">{item.quantidade}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {itens.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                    Nenhum item adicionado ainda
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Fornecedores Convidados */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Fornecedores
          </CardTitle>
          <Dialog open={showConvidarDialog} onOpenChange={setShowConvidarDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Send className="w-4 h-4 mr-2" />
                Convidar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Convidar Fornecedores</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Selecione os fornecedores para enviar esta cotação:
                </p>
                {fornecedoresDisponiveis.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>Nenhum fornecedor cadastrado.</p>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-2">
                    {fornecedoresDisponiveis.map((f) => {
                      const jaConvidado = convites.some(c => c.fornecedor_id === f.id);
                      return (
                        <label 
                          key={f.id} 
                          className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                            jaConvidado ? 'bg-muted/50' : 'hover:bg-accent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedFornecedores.includes(f.id) || jaConvidado}
                            disabled={jaConvidado}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedFornecedores([...selectedFornecedores, f.id]);
                              } else {
                                setSelectedFornecedores(selectedFornecedores.filter(id => id !== f.id));
                              }
                            }}
                            className="rounded"
                          />
                          <span className="font-medium">{f.nome}</span>
                          {jaConvidado && <Badge variant="secondary" className="text-xs ml-auto">Já convidado</Badge>}
                        </label>
                      );
                    })}
                  </div>
                )}
                <Button 
                  onClick={convidarFornecedores} 
                  className="w-full"
                  disabled={fornecedoresDisponiveis.length === 0 || selectedFornecedores.length === 0}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Convites ({selectedFornecedores.length} selecionado{selectedFornecedores.length !== 1 ? 's' : ''})
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {convites.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Nenhum fornecedor convidado ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {convites.map((convite) => (
                <div key={convite.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{convite.fornecedor?.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      Enviado em: {convite.enviado_em ? format(new Date(convite.enviado_em), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={
                      convite.status === 'respondido' ? 'bg-green-500/20 text-green-500' :
                      convite.status === 'visualizado' ? 'bg-blue-500/20 text-blue-500' :
                      'bg-yellow-500/20 text-yellow-500'
                    }>
                      {convite.status === 'respondido' ? 'Respondido' :
                       convite.status === 'visualizado' ? 'Visualizado' : 'Pendente'}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resendConvite(convite)}
                      disabled={resendingTo === convite.id || !convite.fornecedor?.email}
                      title={convite.fornecedor?.email ? 'Reenviar convite' : 'Fornecedor sem email'}
                    >
                      {resendingTo === convite.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex flex-wrap gap-2 justify-end pt-4 border-t">
        <Button variant="outline" onClick={generatePDF}>
          <Printer className="w-4 h-4 mr-2" />
          PDF
        </Button>
        
        <Dialog open={showRespostaDialog} onOpenChange={setShowRespostaDialog}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <MessageSquare className="w-4 h-4 mr-2" />
              Registrar Resposta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Resposta do Fornecedor</DialogTitle>
            </DialogHeader>
            <RespostaFornecedor
              cotacao={{ id: cotacao.id, numero: cotacao.numero, titulo: cotacao.titulo }}
              fornecedores={fornecedoresDisponiveis}
              onClose={() => setShowRespostaDialog(false)}
              onSuccess={() => {
                carregarDados();
                onUpdate?.();
                onStatusUpdate?.();
              }}
            />
          </DialogContent>
        </Dialog>

        {cotacao.status === 'pendente' && (
          <Button
            className="bg-blue-500 hover:bg-blue-600"
            onClick={() => updateStatus('em_analise')}
          >
            Iniciar Análise
          </Button>
        )}

        {cotacao.status === 'em_analise' && (
          <>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-green-500 hover:bg-green-600">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Aprovar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Aprovar Cotação</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Justificativa da Escolha (opcional)</Label>
                    <Textarea
                      value={justificativa}
                      onChange={(e) => setJustificativa(e.target.value)}
                      placeholder="Explique o motivo da escolha do fornecedor..."
                    />
                  </div>
                  <Button onClick={() => updateStatus('aprovada')} className="w-full bg-green-500">
                    Confirmar Aprovação
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button
              variant="destructive"
              onClick={() => updateStatus('rejeitada')}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Rejeitar
            </Button>
          </>
        )}
      </div>

      {/* Modal de Seleção de Produtos */}
      <SelecionarProdutosModal
        open={showSelecionarProdutos}
        onOpenChange={setShowSelecionarProdutos}
        cotacaoId={cotacao.id}
        cotacaoTitulo={cotacao.titulo || `Cotação #${cotacao.numero}`}
        onProdutosAdicionados={carregarDados}
      />
    </div>
  );
};

export default CotacaoDetail;
