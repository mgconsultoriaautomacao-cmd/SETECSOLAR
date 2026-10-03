import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';

export type UserRole = 'SUPER_ADMIN' | 'GESTOR' | 'OPERADOR' | 'TECNICO' | 'CLIENTE';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: UserSession | null;
  role: UserRole | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserSession>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapSupabaseUser = async (sbUser: any): Promise<UserSession> => {
  let role: UserRole = 'CLIENTE';
  let name = sbUser.user_metadata?.name || sbUser.email?.split('@')[0] || 'Usuário';

  // 1. Tenta consultar a rota oficial autenticada /auth/me do backend
  try {
    const me = await apiFetch<UserSession>('/auth/me');
    if (me?.role) {
      return me;
    }
  } catch {
    // 2. Fallback caso o backend esteja indisponível: consulta a tabela User no Supabase
    try {
      const { data } = await supabase
        .from('User')
        .select('name, role')
        .eq('email', sbUser.email)
        .maybeSingle();

      if (data) {
        if (data.role) role = data.role as UserRole;
        if (data.name) name = data.name;
      } else {
        const { data: clientData } = await supabase
          .from('Client')
          .select('name')
          .eq('email', sbUser.email)
          .maybeSingle();
        if (clientData?.name) {
          name = clientData.name;
          role = 'CLIENTE';
        } else if (sbUser.user_metadata?.role) {
          role = sbUser.user_metadata.role as UserRole;
        }
      }
    } catch {
      // mantém role segura como CLIENTE
    }
  }

  return {
    id: sbUser.id,
    name,
    email: sbUser.email || '',
    role,
  };
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Carrega sessão ativa do Supabase
  const checkSession = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const sessionUser = await mapSupabaseUser(session.user);
        setUser(sessionUser);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.warn('Erro ao verificar sessão do Supabase:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();

    // Escuta mudanças de auth (login, logout, token refresh)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const sessionUser = await mapSupabaseUser(session.user);
        setUser(sessionUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<UserSession> => {
    const cleanEmail = email.trim();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      console.error('Supabase auth error:', error);
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('E-mail ou senha incorretos.');
      }
      if (error.message.includes('Email not confirmed')) {
        throw new Error('E-mail ainda não confirmado no Supabase. No painel do Supabase (Auth > Users), clique nos 3 pontinhos do usuário e em "Confirm User", ou desative a confirmação de e-mail em Auth > Providers > Email.');
      }
      throw new Error(error.message || 'Falha ao autenticar no Supabase.');
    }

    if (data.user) {
      const userSession = await mapSupabaseUser(data.user);
      setUser(userSession);
      return userSession;
    }

    throw new Error('Usuário não localizado após autenticação.');
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Erro no logout do Supabase:', err);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
