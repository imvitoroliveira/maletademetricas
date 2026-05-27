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

  const addLog = useCallback((event: string) => {
    const timestamp = new Date().toLocaleTimeString();
    logsRef.current = [{ event, timestamp }, ...logsRef.current].slice(0, 20);
    setAuthLogs(logsRef.current);
    if (typeof console !== "undefined") console.log(`[AUTH] ${timestamp}: ${event}`);
  }, []);

  // Carrega perfil + role. Não desloga se falhar — apenas loga.
  const loadProfileAndRole = useCallback(async (uid: string) => {
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

      if (pErr) addLog(`Perfil: ${pErr.message}`);
      if (rErr) addLog(`Roles: ${rErr.message}`);

      setProfile(profileData ?? null);
      const admin = !!roleData?.some((r: any) => r.role === "admin");
      setIsAdmin(admin);
      addLog(`Sessão pronta (${admin ? "Gestor" : "Cliente"})`);
    } catch (err: any) {
      addLog(`Erro ao carregar perfil: ${err?.message ?? err}`);
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
      addLog(`Evento: ${event}`);
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        setTimeout(() => { if (mounted) loadProfileAndRole(u.id); }, 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
    });

    // 2) Hidratar sessão atual
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (!mounted) return;
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        addLog("Sessão restaurada");
        loadProfileAndRole(u.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        addLog("Sem sessão ativa");
        setLoading(false);
      }
    }).catch((err: any) => {
      addLog(`Falha getSession: ${err?.message ?? err}`);
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
