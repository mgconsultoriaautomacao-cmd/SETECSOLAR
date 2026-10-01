import React, { createContext, useContext, useState, useEffect } from 'react';
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Carrega sessão atual a partir do backend
  const checkSession = async () => {
    try {
      setLoading(true);
      const session = await apiFetch<UserSession>('/auth/me');
      if (session && session.email) {
        setUser(session);
      } else {
        setUser(null);
      }
    } catch {
      // Se a API ainda não possui a rota /auth/me, mantemos verificação segura sem crash
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const login = async (email: string, password: string): Promise<UserSession> => {
    const data = await apiFetch<UserSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (data && data.email) {
      setUser(data);
      return data;
    }
    throw new Error('Falha ao autenticar usuário.');
  };

  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // ignora se endpoint falhar
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
