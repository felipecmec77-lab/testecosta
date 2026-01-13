import { WifiOff, Wifi, Cloud, Loader2, RefreshCw, Database } from 'lucide-react';
import { useOfflineData } from '@/hooks/useOfflineData';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface OfflineIndicatorProps {
  showAlways?: boolean;
}

const OfflineIndicator = ({ showAlways = false }: OfflineIndicatorProps) => {
  const { isOnline, pendingCount, isSyncing, totalCachedItems, forceSync, lastSyncTime } = useOfflineData();

  // Hide if online, no pending, and not forced to show
  if (!showAlways && isOnline && pendingCount === 0) {
    return null;
  }

  const formatLastSync = () => {
    if (!lastSyncTime) return 'Nunca';
    const diff = Date.now() - lastSyncTime.getTime();
    if (diff < 60000) return 'Agora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min atrás`;
    return lastSyncTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-auto">
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg backdrop-blur-sm transition-all",
          isOnline
            ? pendingCount > 0 
              ? "bg-warning/90 text-warning-foreground"
              : "bg-primary/90 text-primary-foreground"
            : "bg-destructive/90 text-destructive-foreground"
        )}
      >
        {isOnline ? (
          isSyncing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <div className="flex flex-col">
                <span className="font-medium">Sincronizando...</span>
                <span className="text-xs opacity-90">{totalCachedItems} itens em cache</span>
              </div>
            </>
          ) : pendingCount > 0 ? (
            <>
              <Cloud className="w-5 h-5" />
              <div className="flex flex-col flex-1">
                <span className="font-medium">{pendingCount} pendente(s)</span>
                <span className="text-xs opacity-90">Toque para sincronizar</span>
              </div>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 w-8 p-0"
                onClick={forceSync}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </>
          ) : showAlways ? (
            <>
              <Wifi className="w-5 h-5" />
              <div className="flex flex-col flex-1">
                <span className="font-medium">Online</span>
                <span className="text-xs opacity-90">
                  <Database className="w-3 h-3 inline mr-1" />
                  {totalCachedItems} itens | Sync: {formatLastSync()}
                </span>
              </div>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 w-8 p-0"
                onClick={forceSync}
                disabled={isSyncing}
              >
                <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
              </Button>
            </>
          ) : null
        ) : (
          <>
            <WifiOff className="w-5 h-5" />
            <div className="flex flex-col">
              <span className="font-medium">Modo Offline</span>
              <span className="text-xs opacity-90">
                <Database className="w-3 h-3 inline mr-1" />
                {totalCachedItems} itens em cache
                {pendingCount > 0 && ` • ${pendingCount} para sincronizar`}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OfflineIndicator;
