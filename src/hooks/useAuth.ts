
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authLogs, setAuthLogs] = useState<{event: string, timestamp: string}[]>([]);

  const addLog = useCallback((event: string) => {
    const newLog = { event, timestamp: new Date().toLocaleTimeString() };
    setAuthLogs(prev => [newLog, ...prev].slice(0, 10));
    console.log(`[AUTH DIAGNOSTIC] ${newLog.timestamp}: ${event}`);
  }, []);

  const fetchProfileData = useCallback(async (sessionUser: User | null) => {
    if (!sessionUser) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, client_permissions(*)")
        .eq("id", sessionUser.id)
        .maybeSingle();

      if (error) {
        addLog(`Erro ao carregar perfil: ${error.message}`);
      } else if (data) {
        if (!data.is_active) {
          addLog("Usuário inativo detectado, encerrando sessão.");
          await supabase.auth.signOut();
          setProfile(null);
          setUser(null);
          toast.error("Sua conta está desativada. Entre em contato com o suporte.");
        } else {
          setProfile(data);
          addLog(`Perfil carregado: ${data.is_admin ? 'Gestor' : 'Cliente'}`);
        }
      } else {
        addLog("Perfil não encontrado no banco de dados.");
      }
    } catch (err) {
      addLog(`Exceção ao buscar perfil: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        const currentUser = session?.user ?? null;
        if (mounted) {
          setUser(currentUser);
          if (currentUser) {
            addLog("Sessão inicial detectada");
            await fetchProfileData(currentUser);
          } else {
            addLog("Nenhuma sessão inicial");
            setLoading(false);
          }
        }
      } catch (err) {
        addLog(`Erro na inicialização: ${err}`);
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      addLog(`Evento de Auth: ${event}`);
      
      if (mounted) {
        setUser(currentUser);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          await fetchProfileData(currentUser);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setUser(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfileData, addLog]);

  const signOut = async () => {
    setLoading(true);
    addLog("Iniciando logout manual");
    const { error } = await supabase.auth.signOut();
    if (error) {
      addLog(`Erro no logout: ${error.message}`);
      toast.error("Erro ao sair do sistema.");
    } else {
      addLog("Logout concluído com sucesso");
      setProfile(null);
      setUser(null);
    }
    setLoading(false);
  };

  return { 
    user, 
    profile, 
    isAdmin: profile?.is_admin || false, 
    isActive: profile?.is_active || false,
    loading, 
    authLogs,
    signOut 
  };
}
