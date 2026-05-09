
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authLogs, setAuthLogs] = useState<{event: string, timestamp: string}[]>([]);
  const isInitialMount = useRef(true);

  const addLog = useCallback((event: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setAuthLogs(prev => [{ event, timestamp }, ...prev].slice(0, 15));
    console.log(`[AUTH] ${timestamp}: ${event}`);
  }, []);

  const fetchProfileData = useCallback(async (sessionUser: User | null) => {
    if (!sessionUser) {
      setProfile(null);
      return null;
    }

    try {
      addLog(`Buscando perfil para ID: ${sessionUser.id.substring(0, 8)}...`);
      const { data, error } = await supabase
        .from("profiles")
        .select("*, client_permissions(*)")
        .eq("id", sessionUser.id)
        .maybeSingle();

      if (error) {
        addLog(`Erro na busca do perfil: ${error.message}`);
        return null;
      }

      if (data) {
        if (!data.is_active) {
          addLog("Perfil inativo. Encerrando sessão.");
          await supabase.auth.signOut();
          setProfile(null);
          setUser(null);
          toast.error("Conta desativada. Entre em contato com o gestor.");
          return null;
        }
        setProfile(data);
        addLog(`Perfil carregado: ${data.is_admin ? 'Gestor' : 'Cliente'}`);
        return data;
      } else {
        addLog("Perfil não encontrado no banco.");
        return null;
      }
    } catch (err) {
      addLog(`Exceção no perfil: ${err}`);
      return null;
    }
  }, [addLog]);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      setLoading(true);
      try {
        // getUser is more secure than getSession as it validates with the server
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          addLog(`Nenhum usuário ativo: ${userError.message}`);
          if (mounted) {
            setUser(null);
            setProfile(null);
          }
        } else if (currentUser && mounted) {
          setUser(currentUser);
          addLog("Usuário validado com sucesso");
          await fetchProfileData(currentUser);
        }
      } catch (err) {
        addLog(`Erro na inicialização: ${err}`);
      } finally {
        if (mounted) setLoading(false);
        isInitialMount.current = false;
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      addLog(`Evento Auth: ${event}`);
      const currentUser = session?.user ?? null;

      if (!mounted) return;

      if (event === 'SIGNED_IN') {
        setUser(currentUser);
        setLoading(true);
        await fetchProfileData(currentUser);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED') {
        // Only fetch if user ID changed or profile is missing
        if (currentUser && (!profile || profile.id !== currentUser.id)) {
          await fetchProfileData(currentUser);
        }
      } else if (event === 'USER_UPDATED') {
        if (currentUser) {
          setUser(currentUser);
          await fetchProfileData(currentUser);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfileData, addLog]); // profile intentionally omitted to prevent loop

  const signOut = async () => {
    setLoading(true);
    addLog("Iniciando logout manual...");
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      addLog("Logout concluído.");
      toast.success("Sessão encerrada.");
    } catch (err) {
      addLog(`Erro no logout: ${err}`);
    } finally {
      setLoading(false);
    }
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
