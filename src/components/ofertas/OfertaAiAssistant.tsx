import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Send, 
  Loader2, 
  Bot, 
  User, 
  Sparkles,
  Star,
  Package,
  TrendingUp,
  AlertTriangle,
  Check,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

interface SugestaoItem {
  item_id: string;
  nome: string;
  preco_custo: number;
  preco_venda_atual: number;
  preco_oferta_sugerido: number;
  margem_sugerida: number;
  motivo: string;
  destaque: boolean;
}

interface SugestaoOferta {
  itens: SugestaoItem[];
  estrategia: string;
  alertas: string[];
}

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

interface OfertaAiAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddItems: (itens: ItemOferta[]) => void;
}

const quickSuggestions = [
  { label: 'Oferta Fim de Semana', message: 'Sugira 10 itens para uma oferta de fim de semana com bom mix de categorias' },
  { label: 'Queima Estoque', message: 'Quais itens têm estoque alto e boa margem para uma queima de estoque?' },
  { label: 'Bebidas', message: 'Monte uma oferta focada em bebidas com boas margens' },
  { label: 'Produtos Premium', message: 'Sugira itens premium com margem acima de 25% para oferta especial' },
];

// Função de arredondamento comercial
function arredondarPrecoComercial(preco: number): number {
  const parteInteira = Math.floor(preco);
  const parteDecimal = preco - parteInteira;
  
  if (parteDecimal <= 0.49) {
    return parteInteira + 0.49;
  } else {
    return parteInteira + 0.99;
  }
}

export function OfertaAiAssistant({ open, onOpenChange, onAddItems }: OfertaAiAssistantProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sugestao, setSugestao] = useState<SugestaoOferta | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: '✨ Olá! Sou seu assistente de ofertas. Posso sugerir itens com base em estoque, margens e sazonalidade. O que você gostaria de criar hoje?',
        timestamp: new Date()
      }]);
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const formatarPreco = (valor: number) => valor.toFixed(2).replace('.', ',');

  const getMargemStyle = (margem: number) => {
    if (margem < 5) return 'bg-red-600 text-white';
    if (margem < 15) return 'bg-amber-500 text-white';
    if (margem < 30) return 'bg-emerald-500 text-white';
    return 'bg-blue-600 text-white';
  };

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setSugestao(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('ai-agent', {
        body: {
          message: text,
          conversationId,
          contextType: 'ofertas'
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (response.error) throw response.error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (response.data.conversationId) {
        setConversationId(response.data.conversationId);
      }

      // Verificar se há sugestão estruturada
      if (response.data.sugestao) {
        setSugestao(response.data.sugestao);
        // Selecionar todos por padrão
        setSelectedItems(new Set(response.data.sugestao.itens.map((i: SugestaoItem) => i.item_id)));
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItem = (itemId: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleAddSelectedItems = () => {
    if (!sugestao || selectedItems.size === 0) return;

    const itensParaAdicionar: ItemOferta[] = sugestao.itens
      .filter(item => selectedItems.has(item.item_id))
      .map(item => ({
        item_id: item.item_id,
        nome_item: item.nome,
        preco_custo: item.preco_custo,
        preco_venda_normal: item.preco_venda_atual,
        preco_oferta: item.preco_oferta_sugerido,
        margem_lucro: item.margem_sugerida,
        lucro_real: item.preco_oferta_sugerido - item.preco_custo,
        destaque: item.destaque
      }));

    onAddItems(itensParaAdicionar);
    toast.success(`${itensParaAdicionar.length} item(ns) adicionado(s) à oferta!`);
    onOpenChange(false);
  };

  const resetConversation = () => {
    setMessages([{
      role: 'assistant',
      content: '✨ Conversa reiniciada! Como posso ajudar com suas ofertas?',
      timestamp: new Date()
    }]);
    setConversationId(null);
    setSugestao(null);
    setSelectedItems(new Set());
  };

  // Calcular resumo
  const resumo = sugestao ? {
    totalItens: sugestao.itens.length,
    margemMedia: sugestao.itens.reduce((acc, i) => acc + i.margem_sugerida, 0) / sugestao.itens.length,
    lucroEstimado: sugestao.itens.reduce((acc, i) => acc + (i.preco_oferta_sugerido - i.preco_custo), 0) * 100,
    destaques: sugestao.itens.filter(i => i.destaque).length,
    abaixo10: sugestao.itens.filter(i => i.margem_sugerida < 10).length
  } : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 border-b bg-gradient-to-r from-primary/10 to-purple-500/10">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Assistente de Ofertas IA
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={resetConversation}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Nova Conversa
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Chat */}
          <div className="flex-1 flex flex-col border-r">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    
                    <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                      <div
                        className={`rounded-lg p-3 ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>

                    {msg.role === 'user' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Quick Suggestions */}
            {messages.length <= 1 && (
              <div className="px-4 pb-2 border-t pt-2">
                <p className="text-xs text-muted-foreground mb-2">Sugestões rápidas:</p>
                <div className="flex flex-wrap gap-2">
                  {quickSuggestions.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => sendMessage(suggestion.message)}
                    >
                      {suggestion.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 pt-2 border-t">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ex: Sugira 10 itens para oferta de fim de semana..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button type="submit" disabled={isLoading || !input.trim()}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </div>

          {/* Panel de Sugestões */}
          {sugestao && (
            <div className="w-[450px] flex flex-col overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-b">
                <h3 className="font-bold flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  IA sugeriu {sugestao.itens.length} itens
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{sugestao.estrategia}</p>
              </div>

              {/* Resumo */}
              {resumo && (
                <div className="p-4 bg-muted/50 border-b">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Itens:</span>
                      <span className="font-bold ml-2">{resumo.totalItens}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Margem média:</span>
                      <span className="font-bold ml-2">{resumo.margemMedia.toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Destaques:</span>
                      <span className="font-bold ml-2">⭐ {resumo.destaques}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Lucro (100 vendas):</span>
                      <span className="font-bold ml-2 text-emerald-600">R$ {formatarPreco(resumo.lucroEstimado)}</span>
                    </div>
                  </div>
                  {resumo.abaixo10 > 0 && (
                    <div className="mt-2 flex items-center gap-2 text-amber-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-xs">{resumo.abaixo10} item(ns) com margem abaixo de 10%</span>
                    </div>
                  )}
                </div>
              )}

              {/* Alertas */}
              {sugestao.alertas.length > 0 && (
                <div className="p-2 bg-amber-500/10 border-b">
                  {sugestao.alertas.map((alerta, i) => (
                    <p key={i} className="text-xs text-amber-700 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {alerta}
                    </p>
                  ))}
                </div>
              )}

              {/* Tabela de itens */}
              <ScrollArea className="flex-1">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-8">Sel.</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Oferta</TableHead>
                      <TableHead className="text-right">Margem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sugestao.itens.map((item) => {
                      const isSelected = selectedItems.has(item.item_id);
                      return (
                        <TableRow 
                          key={item.item_id}
                          className={isSelected ? 'bg-emerald-50 dark:bg-emerald-950/30' : ''}
                        >
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleItem(item.item_id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {item.destaque && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                              <span className="text-sm font-medium">{item.nome}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{item.motivo}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-mono font-bold text-emerald-600">
                              R$ {formatarPreco(item.preco_oferta_sugerido)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge className={getMargemStyle(item.margem_sugerida)}>
                              {item.margem_sugerida.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Ações */}
              <div className="p-4 border-t bg-background">
                <Button 
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  disabled={selectedItems.size === 0}
                  onClick={handleAddSelectedItems}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar {selectedItems.size} Selecionados
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Importar Plus no final
import { Plus } from 'lucide-react';
