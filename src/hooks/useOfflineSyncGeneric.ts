import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type TableName = 'conferencias_coca' | 'conferencias_polpas' | 'recebimentos_legumes' | 'perdas' | 'perdas_geral' | 'perdas_polpas';

interface PendingItem {
  id: string;
  table: TableName;
  data: Record<string, any>;
  created_at: number;
}

const STORAGE_KEY = 'comercial_costa_pending_sync';

export const useOfflineSyncGeneric = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  // Get pending items from localStorage
  const loadPendingItems = useCallback((): PendingItem[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  // Save pending items to localStorage
  const savePendingItems = useCallback((items: PendingItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      setPendingItems(items);
    } catch (error) {
      console.error('Error saving pending items:', error);
    }
  }, []);

  // Add items to pending queue (for offline usage)
  const addPendingItem = useCallback((table: TableName, data: Record<string, any>) => {
    const currentItems = loadPendingItems();
    const newItem: PendingItem = {
      id: crypto.randomUUID(),
      table,
      data,
      created_at: Date.now(),
    };
    savePendingItems([...currentItems, newItem]);
    
    toast({
      title: 'Salvo localmente',
      description: 'Os dados serão sincronizados quando houver conexão.',
    });
    
    return newItem;
  }, [loadPendingItems, savePendingItems, toast]);

  // Add multiple items at once
  const addPendingItems = useCallback((table: TableName, dataList: Record<string, any>[]) => {
    const currentItems = loadPendingItems();
    const newItems: PendingItem[] = dataList.map(data => ({
      id: crypto.randomUUID(),
      table,
      data,
      created_at: Date.now(),
    }));
    savePendingItems([...currentItems, ...newItems]);
    
    toast({
      title: 'Salvos localmente',
      description: `${newItems.length} item(ns) serão sincronizados quando houver conexão.`,
    });
    
    return newItems;
  }, [loadPendingItems, savePendingItems, toast]);

  // Sync pending items when online
  const syncPendingItems = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    const items = loadPendingItems();
    if (items.length === 0) return;

    setIsSyncing(true);
    let syncedCount = 0;
    let failedItems: PendingItem[] = [];

    for (const item of items) {
      try {
        const { error } = await supabase.from(item.table).insert(item.data as any);
        
        if (error) {
          console.error('Sync error:', error);
          failedItems.push(item);
        } else {
          syncedCount++;
        }
      } catch (error) {
        console.error('Sync error:', error);
        failedItems.push(item);
      }
    }

    savePendingItems(failedItems);

    if (syncedCount > 0) {
      toast({
        title: 'Sincronização concluída!',
        description: `${syncedCount} item(ns) sincronizado(s) com sucesso.${failedItems.length > 0 ? ` ${failedItems.length} erro(s).` : ''}`,
      });
    }

    setIsSyncing(false);
  }, [isOnline, isSyncing, loadPendingItems, savePendingItems, toast]);

  // Get pending count for a specific table
  const getPendingCountByTable = useCallback((table: TableName): number => {
    return pendingItems.filter(item => item.table === table).length;
  }, [pendingItems]);

  // Load pending items on mount
  useEffect(() => {
    setPendingItems(loadPendingItems());
  }, [loadPendingItems]);

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
        description: 'Os dados serão salvos localmente.',
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
    if (isOnline && pendingItems.length > 0) {
      syncPendingItems();
    }
  }, [isOnline, pendingItems.length, syncPendingItems]);

  return {
    isOnline,
    pendingCount: pendingItems.length,
    isSyncing,
    addPendingItem,
    addPendingItems,
    syncPendingItems,
    getPendingCountByTable,
    pendingItems,
  };
};
