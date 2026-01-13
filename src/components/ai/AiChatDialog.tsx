import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Loader2, 
  Bot, 
  User, 
  ThumbsUp, 
  ThumbsDown,
  Sparkles,
  TrendingDown,
  Package,
  ShoppingCart
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

interface AiChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialContext?: 'general' | 'losses' | 'stock' | 'purchases';
}

const contextLabels = {
  general: { label: 'Geral', icon: Sparkles, color: 'bg-primary' },
  losses: { label: 'Perdas', icon: TrendingDown, color: 'bg-destructive' },
  stock: { label: 'Estoque', icon: Package, color: 'bg-blue-500' },
  purchases: { label: 'Compras', icon: ShoppingCart, color: 'bg-green-500' },
};

const suggestionsByContext = {
  general: [
    'Qual é o resumo das perdas este mês?',
    'Quais produtos estão em falta?',
    'Como posso reduzir desperdício?',
  ],
  losses: [
    'Quais produtos têm mais perdas?',
    'Qual o principal motivo das perdas?',
    'Compare perdas desta semana vs anterior',
  ],
  stock: [
    'Quais produtos precisam reposição?',
    'Identifique produtos parados',
    'Sugira ajustes nos níveis mínimos',
  ],
  purchases: [
    'Compare preços entre fornecedores',
    'Qual a tendência de preços?',
    'Sugira melhores negociações',
  ],
};

export function AiChatDialog({ open, onOpenChange, initialContext = 'general' }: AiChatDialogProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [context, setContext] = useState(initialContext);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      // Mensagem inicial baseada no contexto
      const welcomeMessages: Record<string, string> = {
        general: 'Olá! 👋 Sou a Costa IA, seu assistente para gestão do supermercado. Como posso ajudar?',
        losses: 'Olá! 📊 Estou aqui para ajudar a analisar as perdas. Já carreguei os dados dos últimos 30 dias. O que você gostaria de saber?',
        stock: 'Olá! 📦 Estou pronto para analisar seu estoque. Já identifiquei os produtos críticos. Como posso ajudar?',
        purchases: 'Olá! 🛒 Vou ajudar com a análise de compras e fornecedores. O que você precisa?',
      };
      
      setMessages([{
        role: 'assistant',
        content: welcomeMessages[context],
        timestamp: new Date()
      }]);
    }
  }, [open, context]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    setContext(initialContext);
  }, [initialContext]);

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

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('ai-agent', {
        body: {
          message: text,
          conversationId,
          contextType: context
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

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (messageIndex: number, wasHelpful: boolean) => {
    if (!conversationId) return;

    try {
      await supabase.from('ai_feedback').insert({
        conversation_id: conversationId,
        message_index: messageIndex,
        was_helpful: wasHelpful,
        user_id: user?.id
      });

      toast.success(wasHelpful ? 'Obrigado pelo feedback positivo!' : 'Feedback registrado, vamos melhorar!');
    } catch (error) {
      console.error('Error saving feedback:', error);
    }
  };

  const resetConversation = () => {
    setMessages([]);
    setConversationId(null);
  };

  const ContextInfo = contextLabels[context];
  const suggestions = suggestionsByContext[context];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Costa IA
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={`${ContextInfo.color} text-white`}>
                <ContextInfo.icon className="h-3 w-3 mr-1" />
                {ContextInfo.label}
              </Badge>
            </div>
          </div>
          
          {/* Context selector */}
          <div className="flex gap-1 mt-2">
            {Object.entries(contextLabels).map(([key, value]) => (
              <Button
                key={key}
                variant={context === key ? 'default' : 'ghost'}
                size="sm"
                className="text-xs"
                onClick={() => {
                  setContext(key as any);
                  resetConversation();
                }}
              >
                <value.icon className="h-3 w-3 mr-1" />
                {value.label}
              </Button>
            ))}
          </div>
        </DialogHeader>

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
                  
                  {msg.role === 'assistant' && index > 0 && (
                    <div className="flex gap-1 mt-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleFeedback(index, true)}
                      >
                        <ThumbsUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleFeedback(index, false)}
                      >
                        <ThumbsDown className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
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

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2">
            <p className="text-xs text-muted-foreground mb-2">Sugestões:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => sendMessage(suggestion)}
                >
                  {suggestion}
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
              placeholder="Digite sua pergunta..."
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
      </DialogContent>
    </Dialog>
  );
}
