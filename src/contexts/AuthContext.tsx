import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'administrador' | 'operador' | 'visualizador';

interface CachedUserData {
  userId: string;
  role: UserRole;
  name: string;
  timestamp: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole | null;
  userName: string | null;
  loading: boolean;
  isOnline: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, nome: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_CACHE_KEY = 'costa_user_cache';
const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cache user data to localStorage
  const cacheUserData = (userId: string, role: UserRole, name: string) => {
    try {
      const cacheData: CachedUserData = {
        userId,
        role,
        name,
        timestamp: Date.now(),
      };
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(cacheData));
      console.log('📦 Dados do usuário salvos no cache');
    } catch (error) {
      console.error('Erro ao salvar cache do usuário:', error);
    }
  };

  // Load cached user data
  const loadCachedUserData = (userId: string): CachedUserData | null => {
    try {
      const cached = localStorage.getItem(USER_CACHE_KEY);
      if (!cached) return null;

      const data: CachedUserData = JSON.parse(cached);
      
      // Check if cache is for same user and not expired
      if (data.userId === userId && Date.now() - data.timestamp < CACHE_MAX_AGE) {
        console.log('📦 Dados do usuário carregados do cache');
        return data;
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao carregar cache do usuário:', error);
      return null;
    }
  };

  // Clear user cache
  const clearUserCache = () => {
    try {
      localStorage.removeItem(USER_CACHE_KEY);
    } catch (error) {
      console.error('Erro ao limpar cache do usuário:', error);
    }
  };

  const fetchUserData = async (userId: string) => {
    // First, try to load from cache (especially useful when offline)
    const cachedData = loadCachedUserData(userId);
    if (cachedData) {
      setUserRole(cachedData.role);
      setUserName(cachedData.name);
    }

    // If offline, just use cached data
    if (!navigator.onLine) {
      console.log('📴 Offline - usando dados do cache');
      if (!cachedData) {
        // No cache and offline - set defaults
        setUserRole('operador');
        setUserName('Usuário');
      }
      return;
    }

    try {
      console.log('Fetching user data for:', userId);
      
      // Use the SECURITY DEFINER function to get role (bypasses RLS)
      const { data: roleResult, error: roleError } = await supabase
        .rpc('get_user_role', { _user_id: userId });

      console.log('Role result:', roleResult, 'Error:', roleError);

      let role: UserRole = 'operador';
      if (roleResult) {
        role = roleResult as UserRole;
        setUserRole(role);
      } else {
        console.warn('No role found for user, defaulting to operador');
        setUserRole('operador');
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('nome')
        .eq('id', userId)
        .single();

      console.log('Profile data:', profileData, 'Error:', profileError);

      let name = 'Usuário';
      if (profileData) {
        name = profileData.nome;
        setUserName(name);
      }

      // Cache the fetched data
      cacheUserData(userId, role, name);
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Use cached data if available, otherwise default
      if (!cachedData) {
        setUserRole('operador');
        setUserName('Usuário');
      }
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
          setUserName(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, nome: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { nome },
      },
    });
    return { error };
  };

  const signOut = async () => {
    clearUserCache();
    setUserRole(null);
    setUserName(null);
    setUser(null);
    setSession(null);
    await supabase.auth.signOut();
  };

  const refreshUser = async () => {
    if (user) {
      // Limpar cache para forçar buscar dados atualizados
      clearUserCache();
      await fetchUserData(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      userRole,
      userName,
      loading,
      isOnline,
      signIn,
      signUp,
      signOut,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
