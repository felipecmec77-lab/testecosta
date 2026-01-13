import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  X,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface AiInsight {
  id: string;
  insight_type: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  data?: any;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
}

interface AiInsightCardProps {
  insight: AiInsight;
  onDismiss?: () => void;
  onAction?: () => void;
}

const priorityConfig = {
  low: { color: 'bg-blue-500', label: 'Baixa' },
  medium: { color: 'bg-yellow-500', label: 'Média' },
  high: { color: 'bg-red-500', label: 'Alta' },
};

const typeConfig: Record<string, { icon: typeof Lightbulb; color: string }> = {
  loss_pattern: { icon: TrendingDown, color: 'text-red-500' },
  stock_alert: { icon: AlertTriangle, color: 'text-yellow-500' },
  optimization: { icon: Lightbulb, color: 'text-blue-500' },
  success: { icon: CheckCircle, color: 'text-green-500' },
  default: { icon: Sparkles, color: 'text-primary' },
};

export function AiInsightCard({ insight, onDismiss, onAction }: AiInsightCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const typeInfo = typeConfig[insight.insight_type] || typeConfig.default;
  const priorityInfo = priorityConfig[insight.priority];
  const Icon = typeInfo.icon;

  const handleDismiss = async () => {
    setIsLoading(true);
    try {
      await supabase
        .from('ai_insights')
        .update({ is_dismissed: true })
        .eq('id', insight.id);
      
      onDismiss?.();
    } catch (error) {
      console.error('Error dismissing insight:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async () => {
    if (insight.is_read) return;
    
    try {
      await supabase
        .from('ai_insights')
        .update({ is_read: true })
        .eq('id', insight.id);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all hover:shadow-md",
        !insight.is_read && "border-l-4 border-l-primary"
      )}
      onMouseEnter={handleMarkAsRead}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Icon className={cn("h-5 w-5 flex-shrink-0", typeInfo.color)} />
            <CardTitle className="text-base truncate">{insight.title}</CardTitle>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="secondary" className={cn(priorityInfo.color, "text-white text-xs")}>
              {priorityInfo.label}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleDismiss}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3 break-words overflow-wrap-anywhere">
          {insight.description}
        </p>
        
        {onAction && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={onAction}
          >
            Ver detalhes
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface AiInsightsListProps {
  insights: AiInsight[];
  onRefresh?: () => void;
  onInsightAction?: (insight: AiInsight) => void;
}

export function AiInsightsList({ insights, onRefresh, onInsightAction }: AiInsightsListProps) {
  const activeInsights = insights.filter(i => !i.is_dismissed);

  if (activeInsights.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-muted-foreground">
          Nenhum insight disponível no momento.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Os insights são gerados automaticamente com base nos seus dados.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {activeInsights.map((insight) => (
        <AiInsightCard
          key={insight.id}
          insight={insight}
          onDismiss={onRefresh}
          onAction={onInsightAction ? () => onInsightAction(insight) : undefined}
        />
      ))}
    </div>
  );
}
