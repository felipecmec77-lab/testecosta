import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type AppModule = 'legumes' | 'polpas' | 'coca' | 'perdas' | 'produtos' | 'usuarios' | 'relatorios' | 'dashboard';

// Todos os módulos disponíveis
const ALL_MODULES: AppModule[] = ['legumes', 'polpas', 'coca', 'perdas', 'produtos', 'usuarios', 'relatorios', 'dashboard'];

const MODULES_CACHE_KEY = 'costa_user_modules_cache';
const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CachedModulesData {
  userId: string;
  modules: AppModule[];
  timestamp: number;
}

// Cache functions
const cacheModules = (userId: string, modules: AppModule[]) => {
  try {
    const data: CachedModulesData = {
      userId,
      modules,
      timestamp: Date.now(),
    };
    localStorage.setItem(MODULES_CACHE_KEY, JSON.stringify(data));
    console.log('📦 Módulos salvos no cache:', modules.length);
  } catch (error) {
    console.error('Erro ao salvar cache de módulos:', error);
  }
};

const loadCachedModules = (userId: string): AppModule[] | null => {
  try {
    const cached = localStorage.getItem(MODULES_CACHE_KEY);
    if (!cached) return null;

    const data: CachedModulesData = JSON.parse(cached);
    
    if (data.userId === userId && Date.now() - data.timestamp < CACHE_MAX_AGE) {
      console.log('📦 Módulos carregados do cache:', data.modules.length);
      return data.modules;
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao carregar cache de módulos:', error);
    return null;
  }
};

export const useModuleAccess = () => {
  const { userRole, user, isOnline } = useAuth();
  const [modules, setModules] = useState<AppModule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserModules = useCallback(async () => {
    if (!user) {
      setModules([]);
      setLoading(false);
      return;
    }

    // Administradores têm acesso total
    if (userRole === 'administrador') {
      setModules(ALL_MODULES);
      cacheModules(user.id, ALL_MODULES);
      setLoading(false);
      return;
    }

    // First, try to load from cache
    const cachedModules = loadCachedModules(user.id);
    if (cachedModules) {
      setModules(cachedModules);
    }

    // If offline, just use cached data
    if (!navigator.onLine) {
      console.log('📴 Offline - usando módulos do cache');
      if (!cachedModules) {
        // Default to perdas module for offline operators
        setModules(['perdas']);
      }
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_module_permissions')
        .select('module')
        .eq('user_id', user.id);

      if (error) throw error;

      const userModules = (data?.map(p => p.module) as AppModule[]) || [];
      setModules(userModules);
      cacheModules(user.id, userModules);
    } catch (error) {
      console.error('Error fetching user modules:', error);
      // Use cached if available
      if (!cachedModules) {
        setModules([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user, userRole]);

  useEffect(() => {
    fetchUserModules();
  }, [fetchUserModules]);

  const hasAccess = useCallback((module: AppModule): boolean => {
    if (userRole === 'administrador') return true;
    return modules.includes(module);
  }, [userRole, modules]);

  return { 
    modules, 
    loading, 
    hasAccess, 
    refetch: fetchUserModules 
  };
};
