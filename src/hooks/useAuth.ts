import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AuthLog = { event: string; timestamp: string };

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
    logsRef.current = [{ event: `${prefix} ${event}`, timestamp }, ...logsRef.current].slice(0, 30);
    setAuthLogs(logsRef.current);
    if (typeof console !== "undefined") {
      const consoleMethod = type === 'error' ? 'error' : type === 'warn' ? 'warn' : 'log';
      console[consoleMethod](`[AUTH] ${timestamp}: ${event}`);
    }
  }, []);

  // Carrega perfil + role. Não desloga se falhar — apenas loga.
  const loadProfileAndRole = useCallback(async (uid: string) => {
    addLog(`Carregando perfil e permissões para: ${uid}`);
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

      if (pErr) addLog(`Erro ao buscar perfil: ${pErr.message}`, 'error');
      else if (!profileData) addLog(`Atenção: Perfil não encontrado no banco de dados para o ID ${uid}`, 'warn');
      else addLog(`Perfil carregado com sucesso (${profileData.email})`);

      if (rErr) addLog(`Erro ao buscar roles: ${rErr.message}`, 'error');
      
      setProfile(profileData ?? null);
      const admin = !!roleData?.some((r: any) => r.role === "admin");
      setIsAdmin(admin);
      addLog(`Permissões identificadas: ${admin ? "Gestor" : "Cliente"}`);
      addLog(`Sessão pronta e validada`);
    } catch (err: any) {
      addLog(`Erro fatal ao carregar dados: ${err?.message ?? err}`, 'error');
    }
  }, [addLog]);

  useEffect(() => {
    let mounted = true;

    // Failsafe: nunca deixar o loading travado para sempre
    const failsafe = setTimeout(() => {
      if (mounted) {
        addLog("Failsafe: liberando loading após 5s");
        setLoading(false);
      }
    }, 5000);

    // 1) Listener primeiro (sem await dentro do callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: Session | null) => {
      if (!mounted) return;
      addLog(`Evento Auth: ${event}`);
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        addLog(`Usuário autenticado: ${u.email}`);
        setTimeout(() => { if (mounted) loadProfileAndRole(u.id); }, 0);
      } else {
        addLog("Usuário deslogado ou sem sessão");
        setProfile(null);
        setIsAdmin(false);
      }
    });

    // 2) Hidratar sessão atual
    addLog("Verificando sessão persistente...");
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (!mounted) return;
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        addLog(`Sessão restaurada para: ${u.email}`);
        loadProfileAndRole(u.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        addLog("Nenhuma sessão persistente encontrada");
        setLoading(false);
      }
    }).catch((err: any) => {
      addLog(`Erro crítico ao recuperar sessão: ${err?.message ?? err}`, 'error');
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(failsafe);
      subscription.unsubscribe();
    };
  }, [loadProfileAndRole, addLog]);

  const signOut = useCallback(async () => {
    addLog("Encerrando sessão...");
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
