import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, Sparkles } from 'lucide-react';
import { AiChatDialog } from './AiChatDialog';
import { cn } from '@/lib/utils';

interface AiAssistantButtonProps {
  context?: 'general' | 'losses' | 'stock' | 'purchases';
  variant?: 'floating' | 'inline';
  className?: string;
}

export function AiAssistantButton({ 
  context = 'general', 
  variant = 'floating',
  className 
}: AiAssistantButtonProps) {
  const [open, setOpen] = useState(false);

  if (variant === 'floating') {
    return (
      <>
        <Button
          onClick={() => setOpen(true)}
          className={cn(
            "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50",
            "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
            "transition-transform hover:scale-110",
            className
          )}
          size="icon"
        >
          <Bot className="h-6 w-6" />
        </Button>
        <AiChatDialog open={open} onOpenChange={setOpen} initialContext={context} />
      </>
    );
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className={cn("gap-2", className)}
      >
        <Sparkles className="h-4 w-4" />
        Perguntar à IA
      </Button>
      <AiChatDialog open={open} onOpenChange={setOpen} initialContext={context} />
    </>
  );
}
