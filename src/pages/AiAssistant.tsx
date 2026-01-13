import { useState, useEffect, useRef } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bot,
  Send,
  Loader2,
  User,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  TrendingDown,
  Package,
  ShoppingCart,
  MessageSquare,
  Clock,
  Trash2,
  Plus,
  History,
  Brain,
  BarChart3,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  context_type: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

const contextConfig = {
  general: { label: 'Geral', icon: Sparkles, color: 'bg-primary', gradient: 'from-primary to-primary/60' },
  losses: { label: 'Perdas', icon: TrendingDown, color: 'bg-destructive', gradient: 'from-red-500 to-red-600' },
  stock: { label: 'Estoque', icon: Package, color: 'bg-blue-500', gradient: 'from-blue-500 to-blue-600' },
  purchases: { label: 'Compras', icon: ShoppingCart, color: 'bg-green-500', gradient: 'from-green-500 to-green-600' },
};

const suggestionsByContext = {
  general: [
    'Qual é o resumo das perdas este mês?',
    'Quais produtos estão em falta?',
    'Como posso reduzir desperdício?',
    'Faça uma análise geral do negócio',
  ],
  losses: [
    'Quais produtos têm mais perdas?',
    'Qual o principal motivo das perdas?',
    'Compare perdas desta semana vs anterior',
    'Quanto perdemos em valor este mês?',
  ],
  stock: [
    'Quais produtos precisam reposição urgente?',
    'Identifique produtos parados há mais de 30 dias',
    'Sugira ajustes nos níveis mínimos de estoque',
    'Qual o valor total do estoque atual?',
  ],
  purchases: [
    'Compare preços entre fornecedores',
    'Qual a tendência de preços do último mês?',
    'Sugira melhores negociações baseado no histórico',
    'Quais fornecedores têm melhores condições?',
  ],
};

const AiAssistant = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [context, setContext] = useState<'general' | 'losses' | 'stock' | 'purchases'>('general');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const parsed = (data || []).map(conv => ({
        ...conv,
        messages: (conv.messages as unknown as Message[]) || []
      }));

      setConversations(parsed);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const startNewConversation = () => {
    setSelectedConversation(null);
    setMessages([]);
    setInput('');
  };

  const selectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setMessages(conv.messages);
    setContext(conv.context_type as any);
  };

  const deleteConversation = async (convId: string) => {
    try {
      const { error } = await supabase
        .from('ai_conversations')
        .delete()
        .eq('id', convId);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== convId));
      
      if (selectedConversation?.id === convId) {
        startNewConversation();
      }

      toast.success('Conversa excluída');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Erro ao excluir conversa');
    }
  };

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await supabase.functions.invoke('ai-agent', {
        body: {
          message: text,
          conversationId: selectedConversation?.id,
          contextType: context
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (response.error) throw response.error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.response
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (response.data.conversationId) {
        // Reload conversations to get updated list
        await loadConversations();
        
        // Find and select the conversation
        const updatedConv = conversations.find(c => c.id === response.data.conversationId);
        if (updatedConv) {
          setSelectedConversation({
            ...updatedConv,
            messages: [...messages, userMessage, assistantMessage]
          });
        } else if (!selectedConversation) {
          // New conversation created
          setSelectedConversation({
            id: response.data.conversationId,
            title: text.substring(0, 100),
            context_type: context,
            messages: [userMessage, assistantMessage],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (messageIndex: number, wasHelpful: boolean) => {
    if (!selectedConversation) return;

    try {
      await supabase.from('ai_feedback').insert({
        conversation_id: selectedConversation.id,
        message_index: messageIndex,
        was_helpful: wasHelpful,
        user_id: user?.id
      });

      toast.success(wasHelpful ? 'Obrigado pelo feedback!' : 'Feedback registrado');
    } catch (error) {
      console.error('Error saving feedback:', error);
    }
  };

  const ContextInfo = contextConfig[context];
  const suggestions = suggestionsByContext[context];

  return (
    <MainLayout>
      <div className="h-[calc(100vh-120px)] flex flex-col lg:flex-row gap-4">
        {/* Sidebar - Conversation History */}
        <Card className="lg:w-80 flex-shrink-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5" />
                Conversas
              </CardTitle>
              <Button size="sm" onClick={startNewConversation} variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Nova
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-2">
            <ScrollArea className="h-[300px] lg:h-[calc(100vh-280px)]">
              {isLoadingConversations ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma conversa ainda</p>
                  <p className="text-xs mt-1">Inicie uma nova conversa!</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {conversations.map((conv) => {
                    const ConvIcon = contextConfig[conv.context_type as keyof typeof contextConfig]?.icon || Sparkles;
                    const isSelected = selectedConversation?.id === conv.id;

                    return (
                      <div
                        key={conv.id}
                        className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                          isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'
                        }`}
                        onClick={() => selectConversation(conv)}
                      >
                        <ConvIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{conv.title || 'Conversa sem título'}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(conv.updated_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(conv.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Main Chat Area */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <CardHeader className="pb-3 border-b">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${ContextInfo.gradient} text-white`}>
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Costa IA</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Assistente inteligente para análise do seu negócio
                  </p>
                </div>
                <Badge className={`ml-auto ${ContextInfo.color} text-white`}>
                  <ContextInfo.icon className="h-3 w-3 mr-1" />
                  {ContextInfo.label}
                </Badge>
              </div>

              {/* Context Tabs */}
              <Tabs value={context} onValueChange={(v) => setContext(v as any)}>
                <TabsList className="grid grid-cols-4">
                  {Object.entries(contextConfig).map(([key, value]) => (
                    <TabsTrigger key={key} value={key} className="gap-1 text-xs">
                      <value.icon className="h-3 w-3" />
                      <span className="hidden sm:inline">{value.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>

          {/* Messages */}
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full p-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <div className={`p-4 rounded-full bg-gradient-to-br ${ContextInfo.gradient} text-white mb-4`}>
                    <Brain className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Olá! Sou a Costa IA 👋</h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    Posso ajudar a analisar perdas, estoque, compras e muito mais. 
                    Selecione um contexto acima e faça sua pergunta!
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                    {suggestions.map((suggestion, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="text-left h-auto py-3 px-4 justify-start"
                        onClick={() => sendMessage(suggestion)}
                      >
                        <span className="text-sm">{suggestion}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br ${ContextInfo.gradient} flex items-center justify-center`}>
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                      )}

                      <div className={`max-w-[80%] min-w-0 ${msg.role === 'user' ? 'order-first' : ''}`}>
                        <div
                          className={`rounded-lg p-3 ${
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">{msg.content}</p>
                        </div>

                        {msg.role === 'assistant' && (
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
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br ${ContextInfo.gradient} flex items-center justify-center`}>
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Analisando...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </CardContent>

          {/* Input */}
          <div className="p-4 border-t">
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
        </Card>

        {/* Stats Sidebar - Desktop only */}
        <Card className="hidden xl:flex w-72 flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Estatísticas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">IA Aprendendo</span>
              </div>
              <p className="text-2xl font-bold">{conversations.length}</p>
              <p className="text-xs text-muted-foreground">conversas realizadas</p>
            </div>

            <div className="p-4 rounded-lg bg-muted">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Mensagens</span>
              </div>
              <p className="text-2xl font-bold">
                {conversations.reduce((acc, c) => acc + (c.messages?.length || 0), 0)}
              </p>
              <p className="text-xs text-muted-foreground">total de mensagens</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Por Contexto</p>
              {Object.entries(contextConfig).map(([key, value]) => {
                const count = conversations.filter(c => c.context_type === key).length;
                return (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <value.icon className="h-3 w-3 text-muted-foreground" />
                      <span>{value.label}</span>
                    </div>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default AiAssistant;
