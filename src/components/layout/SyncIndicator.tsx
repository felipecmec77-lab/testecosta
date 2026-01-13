import { Cloud, CloudOff, Loader2, RefreshCw } from 'lucide-react';
import { useOfflineData } from '@/hooks/useOfflineData';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const SyncIndicator = () => {
  const { 
    isOnline, 
    pendingCount, 
    isSyncing, 
    totalCachedItems,
    forceSync, 
    lastSyncTime 
  } = useOfflineData();

  const formatLastSync = () => {
    if (!lastSyncTime) return 'Nunca sincronizado';
    const diff = Date.now() - lastSyncTime.getTime();
    if (diff < 60000) return 'Sync: agora';
    if (diff < 3600000) return `Sync: ${Math.floor(diff / 60000)}min atrás`;
    return `Sync: ${lastSyncTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  // If syncing, show spinner
  if (isSyncing) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/20 text-primary">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs font-medium">Sincronizando...</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Sincronizando dados com o servidor</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Offline
  if (!isOnline) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/20 text-destructive">
              <CloudOff className="w-4 h-4" />
              <div className="flex flex-col">
                <span className="text-xs font-medium">Offline</span>
                <span className="text-[10px] opacity-80">
                  {totalCachedItems} itens em cache
                  {pendingCount > 0 && ` • ${pendingCount} pendente(s)`}
                </span>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Você está offline. Dados serão sincronizados quando conectar.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Online with pending operations
  if (pendingCount > 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={forceSync}
              className="w-full justify-start gap-2 px-3 py-2 h-auto bg-warning/20 text-warning hover:bg-warning/30"
            >
              <Cloud className="w-4 h-4" />
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium">{pendingCount} pendente(s)</span>
                <span className="text-[10px] opacity-80">Toque para sincronizar</span>
              </div>
              <RefreshCw className="w-3 h-3 ml-auto" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Clique para sincronizar dados pendentes</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Online and synced
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={forceSync}
            className="w-full justify-start gap-2 px-3 py-2 h-auto text-sidebar-foreground/70 hover:bg-sidebar-accent"
          >
            <Cloud className="w-4 h-4 text-primary" />
            <div className="flex flex-col items-start">
              <span className="text-xs font-medium">{formatLastSync()}</span>
              <span className="text-[10px] opacity-70">{totalCachedItems} itens em cache</span>
            </div>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Clique para atualizar dados</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default SyncIndicator;
