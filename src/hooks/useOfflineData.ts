import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Storage keys
const CATALOG_CACHE_KEY = 'costa_catalog_cache';
const PRODUTOS_CACHE_KEY = 'costa_produtos_cache';
const POLPAS_CACHE_KEY = 'costa_polpas_cache';
const LEGUMES_CACHE_KEY = 'costa_legumes_cache';
const PRODUTOS_COCA_CACHE_KEY = 'costa_produtos_coca_cache';
const ITENS_POLPAS_CACHE_KEY = 'costa_itens_polpas_cache';
const PROFILES_CACHE_KEY = 'costa_profiles_cache';
const CACHE_TIMESTAMP_KEY = 'costa_cache_timestamp';
const PENDING_OPERATIONS_KEY = 'costa_pending_operations';
const CACHE_MAX_AGE = 1000 * 60 * 60 * 4; // 4 hours

// Generic cache interface
interface CacheData<T> {
  data: T;
  timestamp: number;
}

export interface CatalogItem {
  id: string;
  codigo_barras: string | null;
  nome_item: string;
  marca: string | null;
  categoria: string | null;
  imagem_url: string | null;
  preco_custo: number;
  preco_venda: number;
  ativo: boolean | null;
}

export interface Produto {
  id: string;
  nome_produto: string;
  quantidade_estoque: number;
  unidade_medida: string;
  preco_unitario: number;
  categoria: string;
  estoque_minimo: number;
}

export interface Polpa {
  id: string;
  nome_polpa: string;
  quantidade_estoque: number;
  estoque_minimo: number;
  preco_unitario: number;
}

export interface Legume {
  id: string;
  nome_legume: string;
  quantidade_estoque: number;
  estoque_minimo: number;
  preco_unitario: number;
  unidade_medida: string;
}

export interface ProdutoCoca {
  id: string;
  nome_produto: string;
  quantidade_estoque: number;
  estoque_minimo: number;
  preco_unitario: number;
  unidades_por_fardo: number;
}

export interface ItemPolpa {
  id: string;
  nome_item: string;
  preco_custo: number;
  categoria: string | null;
  ativo: boolean | null;
}

export interface Profile {
  id: string;
  nome: string;
  email: string;
  ativo: boolean | null;
}

export interface PendingOperation {
  id: string;
  type: 'perda' | 'consumo' | 'lancamento' | 'conferencia_polpa' | 'conferencia_legume' | 'conferencia_coca';
  data: any;
  createdAt: number;
  retries: number;
}

// Generic cache functions
function loadFromCache<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const parsed: CacheData<T> = JSON.parse(cached);
      // Check if not too old
      if (Date.now() - parsed.timestamp < CACHE_MAX_AGE * 24) { // 24x longer for basic data
        return parsed.data;
      }
    }
  } catch (error) {
    console.error('Erro ao carregar cache:', key, error);
  }
  return null;
}

function saveToCache<T>(key: string, data: T): void {
  try {
    const cacheData: CacheData<T> = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Erro ao salvar cache:', key, error);
  }
}

function isCacheValid(key: string, maxAge: number = CACHE_MAX_AGE): boolean {
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const parsed = JSON.parse(cached);
      return Date.now() - parsed.timestamp < maxAge;
    }
  } catch {}
  return false;
}

export const useOfflineData = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [polpas, setPolpas] = useState<Polpa[]>([]);
  const [legumes, setLegumes] = useState<Legume[]>([]);
  const [produtosCoca, setProdutosCoca] = useState<ProdutoCoca[]>([]);
  const [itensPolpas, setItensPolpas] = useState<ItemPolpa[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [pendingOperations, setPendingOperations] = useState<PendingOperation[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ============= LOAD ALL DATA FROM CACHE =============

  const loadAllFromCache = useCallback(() => {
    const cachedCatalog = loadFromCache<CatalogItem[]>(CATALOG_CACHE_KEY);
    const cachedProdutos = loadFromCache<Produto[]>(PRODUTOS_CACHE_KEY);
    const cachedPolpas = loadFromCache<Polpa[]>(POLPAS_CACHE_KEY);
    const cachedLegumes = loadFromCache<Legume[]>(LEGUMES_CACHE_KEY);
    const cachedProdutosCoca = loadFromCache<ProdutoCoca[]>(PRODUTOS_COCA_CACHE_KEY);
    const cachedItensPolpas = loadFromCache<ItemPolpa[]>(ITENS_POLPAS_CACHE_KEY);
    const cachedProfiles = loadFromCache<Profile[]>(PROFILES_CACHE_KEY);

    if (cachedCatalog) {
      setCatalogItems(cachedCatalog);
      console.log('📦 Catálogo: ', cachedCatalog.length, 'itens');
    }
    if (cachedProdutos) {
      setProdutos(cachedProdutos);
      console.log('📦 Produtos: ', cachedProdutos.length, 'itens');
    }
    if (cachedPolpas) {
      setPolpas(cachedPolpas);
      console.log('📦 Polpas: ', cachedPolpas.length, 'itens');
    }
    if (cachedLegumes) {
      setLegumes(cachedLegumes);
      console.log('📦 Legumes: ', cachedLegumes.length, 'itens');
    }
    if (cachedProdutosCoca) {
      setProdutosCoca(cachedProdutosCoca);
      console.log('📦 Coca: ', cachedProdutosCoca.length, 'itens');
    }
    if (cachedItensPolpas) {
      setItensPolpas(cachedItensPolpas);
      console.log('📦 Itens Polpas: ', cachedItensPolpas.length, 'itens');
    }
    if (cachedProfiles) {
      setProfiles(cachedProfiles);
      console.log('📦 Profiles: ', cachedProfiles.length, 'itens');
    }

    return {
      catalog: cachedCatalog,
      produtos: cachedProdutos,
      polpas: cachedPolpas,
      legumes: cachedLegumes,
      produtosCoca: cachedProdutosCoca,
      itensPolpas: cachedItensPolpas,
      profiles: cachedProfiles
    };
  }, []);

  // ============= FETCH ALL FROM SERVER =============

  const fetchAllFromServer = useCallback(async () => {
    if (!navigator.onLine) {
      console.log('📴 Offline - usando cache');
      return;
    }

    console.log('🔄 Buscando todos os dados do servidor...');

    try {
      // Fetch all in parallel
      const [
        catalogRes,
        produtosRes,
        polpasRes,
        legumesRes,
        cocaRes,
        itensPolpasRes,
        profilesRes
      ] = await Promise.all([
        supabase.from('itens_perdas_geral').select('*').eq('ativo', true).order('nome_item'),
        supabase.from('produtos').select('*').order('nome_produto'),
        supabase.from('polpas').select('*').order('nome_polpa'),
        supabase.from('legumes').select('*').order('nome_legume'),
        supabase.from('produtos_coca').select('*').order('nome_produto'),
        supabase.from('itens_perdas_polpas').select('*').eq('ativo', true).order('nome_item'),
        supabase.from('profiles').select('*').order('nome')
      ]);

      // Process and cache each result
      if (catalogRes.data) {
        setCatalogItems(catalogRes.data);
        saveToCache(CATALOG_CACHE_KEY, catalogRes.data);
        console.log('✅ Catálogo:', catalogRes.data.length);
      }

      if (produtosRes.data) {
        setProdutos(produtosRes.data);
        saveToCache(PRODUTOS_CACHE_KEY, produtosRes.data);
        console.log('✅ Produtos:', produtosRes.data.length);
      }

      if (polpasRes.data) {
        setPolpas(polpasRes.data);
        saveToCache(POLPAS_CACHE_KEY, polpasRes.data);
        console.log('✅ Polpas:', polpasRes.data.length);
      }

      if (legumesRes.data) {
        setLegumes(legumesRes.data);
        saveToCache(LEGUMES_CACHE_KEY, legumesRes.data);
        console.log('✅ Legumes:', legumesRes.data.length);
      }

      if (cocaRes.data) {
        setProdutosCoca(cocaRes.data);
        saveToCache(PRODUTOS_COCA_CACHE_KEY, cocaRes.data);
        console.log('✅ Coca:', cocaRes.data.length);
      }

      if (itensPolpasRes.data) {
        setItensPolpas(itensPolpasRes.data);
        saveToCache(ITENS_POLPAS_CACHE_KEY, itensPolpasRes.data);
        console.log('✅ Itens Polpas:', itensPolpasRes.data.length);
      }

      if (profilesRes.data) {
        setProfiles(profilesRes.data);
        saveToCache(PROFILES_CACHE_KEY, profilesRes.data);
        console.log('✅ Profiles:', profilesRes.data.length);
      }

      // Update global timestamp
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      setLastSyncTime(new Date());
      console.log('🎉 Todos os dados sincronizados!');

    } catch (error) {
      console.error('Erro ao sincronizar dados:', error);
      throw error;
    }
  }, []);

  // ============= INITIALIZE =============

  const initialize = useCallback(async () => {
    setIsLoadingCatalog(true);

    // 1. Load from cache immediately
    const cached = loadAllFromCache();
    
    // Check if we have minimal data
    const hasData = cached.catalog?.length || cached.produtos?.length;

    // 2. If online and cache is stale, refresh
    if (navigator.onLine) {
      const cacheValid = isCacheValid(CACHE_TIMESTAMP_KEY, CACHE_MAX_AGE);
      
      if (!cacheValid || !hasData) {
        try {
          await fetchAllFromServer();
        } catch (error) {
          if (!hasData) {
            toast.warning('Erro ao carregar dados. Tente novamente.');
          }
        }
      }
    } else if (!hasData) {
      toast.warning('Sem conexão e sem dados em cache');
    }

    setIsLoadingCatalog(false);
  }, [loadAllFromCache, fetchAllFromServer]);

  // Force refresh all data
  const refreshCatalog = useCallback(async () => {
    if (!navigator.onLine) {
      toast.error('Sem conexão para atualizar');
      return;
    }

    setIsSyncing(true);
    try {
      await fetchAllFromServer();
      toast.success('Dados atualizados!');
    } catch (error) {
      toast.error('Erro ao atualizar dados');
    } finally {
      setIsSyncing(false);
    }
  }, [fetchAllFromServer]);

  // Search catalog (works offline)
  const searchCatalog = useCallback((barcode: string): CatalogItem | null => {
    const normalizedBarcode = barcode.replace(/\D/g, '').trim();
    if (!normalizedBarcode) return null;

    return catalogItems.find(item => {
      if (!item.codigo_barras) return false;
      const itemBarcode = item.codigo_barras.replace(/\D/g, '').trim();
      
      // Exact match
      if (itemBarcode === normalizedBarcode) return true;
      
      // Match without leading zeros
      const scanNoZeros = normalizedBarcode.replace(/^0+/, '') || normalizedBarcode;
      const dbNoZeros = itemBarcode.replace(/^0+/, '') || itemBarcode;
      return scanNoZeros === dbNoZeros;
    }) || null;
  }, [catalogItems]);

  // ============= PENDING OPERATIONS =============

  const loadPendingOperations = useCallback((): PendingOperation[] => {
    try {
      const stored = localStorage.getItem(PENDING_OPERATIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  const savePendingOperations = useCallback((ops: PendingOperation[]) => {
    try {
      localStorage.setItem(PENDING_OPERATIONS_KEY, JSON.stringify(ops));
      setPendingOperations(ops);
    } catch (error) {
      console.error('Erro ao salvar operações pendentes:', error);
    }
  }, []);

  const addPendingOperation = useCallback((type: PendingOperation['type'], data: any): string => {
    const operation: PendingOperation = {
      id: crypto.randomUUID(),
      type,
      data,
      createdAt: Date.now(),
      retries: 0
    };
    
    const currentOps = loadPendingOperations();
    savePendingOperations([...currentOps, operation]);
    
    console.log('📝 Operação adicionada à fila:', operation.id, type);
    return operation.id;
  }, [loadPendingOperations, savePendingOperations]);

  const removePendingOperation = useCallback((id: string) => {
    const currentOps = loadPendingOperations();
    savePendingOperations(currentOps.filter(op => op.id !== id));
  }, [loadPendingOperations, savePendingOperations]);

  // ============= SYNC OPERATIONS =============

  const syncOperation = useCallback(async (operation: PendingOperation): Promise<boolean> => {
    try {
      switch (operation.type) {
        case 'lancamento': {
          const { lancamento, perdas } = operation.data;
          
          const { data: lancamentoData, error: lancamentoError } = await supabase
            .from('lancamentos_perdas_geral')
            .insert(lancamento)
            .select()
            .single();
          
          if (lancamentoError) throw lancamentoError;
          
          if (perdas && perdas.length > 0) {
            const perdasWithId = perdas.map((p: any) => ({
              ...p,
              lancamento_id: lancamentoData.id
            }));
            
            const { error: perdasError } = await supabase
              .from('perdas_geral')
              .insert(perdasWithId);
            
            if (perdasError) throw perdasError;
          }
          
          return true;
        }

        case 'conferencia_polpa': {
          const { error } = await supabase
            .from('conferencias_polpas')
            .insert(operation.data);
          if (error) throw error;
          return true;
        }

        case 'conferencia_legume': {
          const { error } = await supabase
            .from('recebimentos_legumes')
            .insert(operation.data);
          if (error) throw error;
          return true;
        }

        case 'conferencia_coca': {
          const { error } = await supabase
            .from('conferencias_coca')
            .insert(operation.data);
          if (error) throw error;
          return true;
        }
        
        default:
          console.warn('Tipo de operação desconhecido:', operation.type);
          return true;
      }
    } catch (error) {
      console.error('Erro ao sincronizar operação:', error);
      return false;
    }
  }, []);

  const syncAllPendingOperations = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;
    
    const operations = loadPendingOperations();
    if (operations.length === 0) return;
    
    setIsSyncing(true);
    console.log('🔄 Sincronizando', operations.length, 'operações pendentes...');
    
    let successCount = 0;
    let failCount = 0;
    
    for (const operation of operations) {
      const success = await syncOperation(operation);
      
      if (success) {
        removePendingOperation(operation.id);
        successCount++;
      } else {
        const currentOps = loadPendingOperations();
        const updatedOps = currentOps.map(op => 
          op.id === operation.id 
            ? { ...op, retries: op.retries + 1 }
            : op
        );
        savePendingOperations(updatedOps);
        failCount++;
      }
    }
    
    if (successCount > 0) {
      toast.success(`${successCount} operação(ões) sincronizada(s)`);
    }
    
    if (failCount > 0) {
      toast.error(`${failCount} operação(ões) falharam. Tentaremos novamente.`);
    }
    
    setIsSyncing(false);
  }, [isSyncing, loadPendingOperations, syncOperation, removePendingOperation, savePendingOperations]);

  // ============= EVENT HANDLERS =============

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Conectado! Sincronizando...');
      
      syncTimeoutRef.current = setTimeout(() => {
        syncAllPendingOperations();
        fetchAllFromServer();
      }, 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Modo offline ativado', {
        description: 'Operações serão salvas localmente'
      });
      
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [syncAllPendingOperations, fetchAllFromServer]);

  // Initialize on mount
  useEffect(() => {
    initialize();
    setPendingOperations(loadPendingOperations());
  }, [initialize, loadPendingOperations]);

  // Periodic sync
  useEffect(() => {
    if (!isOnline) return;
    
    const interval = setInterval(() => {
      if (pendingOperations.length > 0) {
        syncAllPendingOperations();
      }
      const cacheValid = isCacheValid(CACHE_TIMESTAMP_KEY, CACHE_MAX_AGE);
      if (!cacheValid) {
        fetchAllFromServer();
      }
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [isOnline, pendingOperations.length, syncAllPendingOperations, fetchAllFromServer]);

  // Count total cached items
  const totalCachedItems = catalogItems.length + produtos.length + polpas.length + 
    legumes.length + produtosCoca.length + itensPolpas.length;

  return {
    // Status
    isOnline,
    isSyncing,
    isLoadingCatalog,
    lastSyncTime,
    pendingCount: pendingOperations.length,
    totalCachedItems,
    
    // Data
    catalogItems,
    produtos,
    polpas,
    legumes,
    produtosCoca,
    itensPolpas,
    profiles,
    
    // Functions
    searchCatalog,
    refreshCatalog,
    addPendingOperation,
    syncAllPendingOperations,
    
    // Force sync
    forceSync: async () => {
      setIsSyncing(true);
      await syncAllPendingOperations();
      await fetchAllFromServer();
      setIsSyncing(false);
    }
  };
};
