import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";

export type AuthLog = { 
  event: string; 
  timestamp: string; 
  type: 'info' | 'error' | 'warn' 
};

export type UserProfile = Tables<"profiles"> & {
  client_permissions?: Tables<"client_permissions">[];
};

/**
 * Hook de Autenticação e Autorização (World-Class Engine)
 * Gerencia o estado da sessão, perfil e permissões com resiliência e logs de diagnóstico.
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [authLogs, setAuthLogs] = useState<AuthLog[]>([]);
  const logsRef = useRef<AuthLog[]>([]);

  /**
   * Centraliza o logging de eventos de autenticação para telemetria e suporte ao usuário.
   */
  const addLog = useCallback((event: string, type: 'info' | 'error' | 'warn' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : 'ℹ️';
    
    const messages: Record<string, string> = {
      "Invalid login credentials": "E-mail ou senha incorretos. Verifique os dados.",
      "profiles\" does not exist": "Banco de Dados não preparado: Execute o script SQL no Supabase.",
      "Failed to fetch": "Falha de Rede: Não foi possível conectar ao Supabase.",
      "Email not confirmed": "E-mail Pendente: Confirme seu e-mail no Supabase.",
      "Profile not found": "Usuário sem Perfil: Conta existe no Auth, mas falta registro na tabela de perfis.",
      "is_active\" && \"false": "Acesso Bloqueado: Sua conta foi desativada pelo administrador."
    };

    let userFriendlyMessage = event;
    for (const [key, msg] of Object.entries(messages)) {
      if (event.includes(key)) {
        userFriendlyMessage = msg;
        break;
      }
    }

    const newLog = { event: `${prefix} ${userFriendlyMessage}`, timestamp, type };
    logsRef.current = [newLog, ...logsRef.current].slice(0, 30);
    setAuthLogs([...logsRef.current]);
    
    if (typeof console !== "undefined") {
      const consoleMethod = type === 'error' ? 'error' : type === 'warn' ? 'warn' : 'log';
      console[consoleMethod](`[AUTH_ENGINE] ${timestamp}: ${event}`);
    }
  }, []);

  /**
   * Carrega perfil e roles com estratégias de tratamento de erro robustas.
   */
  const loadProfileAndRole = useCallback(async (uid: string) => {
    addLog(`Iniciando validação de perfil [ID: ${uid.substring(0, 8)}]`);
    
    try {
      // Usamos chamadas sequenciais para evitar problemas de concorrência no cliente JS inicial
      const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*, client_permissions(*)")
          .eq("id", uid)
          .maybeSingle();

      if (profileError) {
        addLog(`Falha ao carregar perfil: ${profileError.message}`, 'error');
      } else if (!profileData) {
        addLog(`Perfil não encontrado na tabela 'profiles'.`, 'error');
      }

      setProfile(profileData as UserProfile | null);
      
      const { data: rolesData, error: rolesError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", uid);

      if (rolesError) {
        addLog(`Falha ao carregar roles: ${rolesError.message}`, 'warn');
      }
      
      const roles = rolesData || [];
      const isGestor = profileData?.is_admin === true || 
                       roles.some((r: { role: string }) => r.role === "admin");
      
      setIsAdmin(isGestor);
      
      if (profileData) {
        if (profileData.is_active === false) {
          addLog(`CONTA INATIVA: Acesso restrito por decisão administrativa.`, 'warn');
        } else {
          addLog(`AUTORIZAÇÃO CONCLUÍDA: Role=${isGestor ? "Gestor" : "Cliente"}`);
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      addLog(`Erro crítico na camada de dados: ${error.message}`, 'error');
    }
  }, [addLog]);

  useEffect(() => {
    let mounted = true;
    let authCheckTimeout: ReturnType<typeof setTimeout>;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: Session | null) => {
      if (!mounted) return;
      
      const u = session?.user ?? null;
      setUser(u);
      
      if (u) {
        addLog(`Evento Auth: ${event}`);
        loadProfileAndRole(u.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    // Failsafe: Libera a tela se nada responder em 5s
    authCheckTimeout = setTimeout(() => {
      if (mounted && loading) {
        addLog("Sincronização excedeu o timeout (5s). Verificando fallback...", "warn");
        setLoading(false);
      }
    }, 5000);

    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (!mounted) return;
      const u = session?.user ?? null;
      setUser(u);
      
      if (u) {
        addLog("Sessão ativa detectada. Sincronizando perfil...");
        loadProfileAndRole(u.id).finally(() => {
          if (mounted) {
            setLoading(false);
            clearTimeout(authCheckTimeout);
          }
        });
      } else {
        setLoading(false);
        clearTimeout(authCheckTimeout);
      }
    }).catch((err: unknown) => {
      const error = err as Error;
      addLog(`Erro de inicialização: ${error.message}`, 'error');
      if (mounted) {
        setLoading(false);
        clearTimeout(authCheckTimeout);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(authCheckTimeout);
    };
  }, [loadProfileAndRole, addLog]); // Removido 'loading' das dependências para evitar loops

  const signOut = useCallback(async () => {
    addLog("Encerrando sessão ativa...");
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
  }, [addLog]);

  return {
    user,
    profile,
    isAdmin,
    isActive: profile?.is_active ?? true,
    loading,
    authLogs,
    signOut,
  };
}
