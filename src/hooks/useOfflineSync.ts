import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const PENDING_LOSSES_KEY = 'horticomercial_pending_losses';

interface PendingLoss {
  id: string;
  produto_id: string;
  usuario_id: string;
  peso_perdido: number | null;
  quantidade_perdida: number | null;
  motivo_perda: 'murcha' | 'vencimento' | 'avaria' | 'transporte' | 'outros';
  observacao: string | null;
  data_perda: string;
  created_at: number;
}

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  // Get pending losses from localStorage
  const getPendingLosses = useCallback((): PendingLoss[] => {
    try {
      const stored = localStorage.getItem(PENDING_LOSSES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  // Save pending losses to localStorage
  const savePendingLosses = useCallback((losses: PendingLoss[]) => {
    try {
      localStorage.setItem(PENDING_LOSSES_KEY, JSON.stringify(losses));
      setPendingCount(losses.length);
    } catch (error) {
      console.error('Error saving pending losses:', error);
    }
  }, []);

  // Add losses to pending queue (for offline usage)
  const addPendingLosses = useCallback((losses: Omit<PendingLoss, 'id' | 'created_at'>[]) => {
    const pendingLosses = getPendingLosses();
    const newLosses: PendingLoss[] = losses.map(loss => ({
      ...loss,
      id: crypto.randomUUID(),
      created_at: Date.now(),
    }));
    savePendingLosses([...pendingLosses, ...newLosses]);
    return newLosses;
  }, [getPendingLosses, savePendingLosses]);

  // Sync pending losses when online
  const syncPendingLosses = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    const pendingLosses = getPendingLosses();
    if (pendingLosses.length === 0) return;

    setIsSyncing(true);

    try {
      // Prepare losses for insertion (remove local fields)
      const lossesToSync = pendingLosses.map(({ id, created_at, ...loss }) => loss);

      const { error } = await supabase.from('perdas').insert(lossesToSync);

      if (error) throw error;

      // Clear pending losses on success
      savePendingLosses([]);
      
      toast({
        title: 'Sincronização concluída!',
        description: `${pendingLosses.length} perda(s) sincronizada(s) com sucesso.`,
      });
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: 'Erro na sincronização',
        description: 'Tentaremos novamente quando houver conexão.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, getPendingLosses, savePendingLosses, toast]);

  // Update pending count on mount
  useEffect(() => {
    setPendingCount(getPendingLosses().length);
  }, [getPendingLosses]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: 'Você está online!',
        description: 'Sincronizando dados pendentes...',
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: 'Você está offline',
        description: 'Os lançamentos serão salvos localmente.',
        variant: 'destructive',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncPendingLosses();
    }
  }, [isOnline, pendingCount, syncPendingLosses]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    addPendingLosses,
    syncPendingLosses,
    getPendingLosses,
  };
};
