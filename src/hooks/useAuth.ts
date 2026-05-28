import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AuthLog = { event: string; timestamp: string; type: 'info' | 'error' | 'warn' };

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authLogs, setAuthLogs] = useState<AuthLog[]>([]);
  const logsRef = useRef<AuthLog[]>([]);

  const addLog = useCallback((event: string, type: 'info' | 'error' | 'warn' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : 'ℹ️';
    
    // Mapeamento amigável para o usuário
    let userFriendlyMessage = event;
    if (event.includes("Invalid login credentials")) {
      userFriendlyMessage = "E-mail ou senha incorretos. Verifique os dados digitados.";
    } else if (event.includes("relation \"public.profiles\" does not exist") || event.includes("schema cache")) {
      userFriendlyMessage = "Erro de Banco de Dados: As tabelas não foram encontradas. Verifique se executou o script SQL no Supabase.";
    } else if (event.includes("Failed to fetch") || event.includes("network")) {
      userFriendlyMessage = "Erro de Conexão: Não foi possível alcançar o servidor. Verifique sua internet ou as chaves do Supabase.";
    } else if (event.includes("JWT") || event.includes("apikey")) {
      userFriendlyMessage = "Erro de Autenticação: Chave de acesso (Anon Key) inválida ou expirada.";
    } else if (event.includes("Email not confirmed")) {
      userFriendlyMessage = "E-mail não confirmado. Verifique sua caixa de entrada ou desative a confirmação no Supabase.";
    } else if (event.includes("Profile not found")) {
      userFriendlyMessage = "Usuário sem perfil: Sua conta existe, mas não possui permissões no banco de dados.";
    } else if (event.includes("is_active") && event.includes("false")) {
      userFriendlyMessage = "Conta Inativa: Seu acesso foi desativado pelo administrador.";
    }

    logsRef.current = [{ event: `${prefix} ${userFriendlyMessage}`, timestamp, type }, ...logsRef.current].slice(0, 30);
    setAuthLogs([...logsRef.current]);
    
    if (typeof console !== "undefined") {
      const consoleMethod = type === 'error' ? 'error' : type === 'warn' ? 'warn' : 'log';
      console[consoleMethod](`[AUTH] ${timestamp}: ${event}`);
    }
  }, []);

  const loadProfileAndRole = useCallback(async (uid: string) => {
    addLog(`Validando permissões para o ID: ${uid.substring(0, 8)}...`);
    try {
      const [{ data: profileData, error: pErr }, { data: roleData, error: rErr }] = await Promise.all([
        supabase
          .from("profiles")
          .select("*, client_permissions(*)")
          .eq("id", uid)
          .maybeSingle(),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", uid),
      ]);

      if (pErr) {
        addLog(`Erro ao carregar perfil: ${pErr.message}`, 'error');
      } else if (!profileData) {
        addLog(`Profile not found: O usuário não tem registro na tabela 'profiles'.`, 'error');
      } else if (profileData.is_active === false) {
        addLog(`is_active: false - Este acesso está bloqueado.`, 'warn');
      }

      if (rErr) addLog(`Erro ao buscar roles: ${rErr.message}`, 'error');
      
      setProfile(profileData ?? null);
      const admin = !!roleData?.some((r: any) => r.role === "admin");
      setIsAdmin(admin);
      
      if (profileData && profileData.is_active !== false) {
        addLog(`Acesso liberado como ${admin ? "Gestor" : "Cliente"}.`);
      }
    } catch (err: any) {
      addLog(`Erro inesperado no banco: ${err?.message ?? err}`, 'error');
    }
  }, [addLog]);

  useEffect(() => {
    let mounted = true;

    const failsafe = setTimeout(() => {
      if (mounted && loading) {
        addLog("O servidor está demorando para responder. Verifique sua conexão.", "warn");
        setLoading(false);
      }
    }, 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: Session | null) => {
      if (!mounted) return;
      addLog(`Estado da Autenticação: ${event}`);
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        setTimeout(() => { if (mounted) loadProfileAndRole(u.id); }, 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
    });

    addLog("Iniciando verificação de segurança...");
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (!mounted) return;
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        addLog("Sessão anterior encontrada.");
        loadProfileAndRole(u.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        addLog("Nenhuma sessão ativa. Por favor, faça login.");
        setLoading(false);
      }
    }).catch((err: any) => {
      addLog(`Failed to fetch: Erro de rede ou URL do Supabase incorreta.`, 'error');
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(failsafe);
      subscription.unsubscribe();
    };
  }, [loadProfileAndRole, addLog]);

  const signOut = useCallback(async () => {
    addLog("Saindo do sistema...");
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
