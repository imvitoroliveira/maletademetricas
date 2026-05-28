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
    
    // Mapeamento amigável para o usuário (7 logs principais solicitados)
    let userFriendlyMessage = event;
    
    // 1. Erro de Credenciais
    if (event.includes("Invalid login credentials")) {
      userFriendlyMessage = "E-mail ou senha incorretos. Verifique os dados.";
    } 
    // 2. Erro de Banco/Tabelas (Migração pendente)
    else if (event.includes("relation \"public.profiles\" does not exist") || event.includes("schema cache")) {
      userFriendlyMessage = "Banco de Dados não preparado: Execute o script SQL no Supabase.";
    } 
    // 3. Erro de Conexão/Rede
    else if (event.includes("Failed to fetch") || event.includes("network")) {
      userFriendlyMessage = "Falha de Rede: Não foi possível conectar ao Supabase.";
    } 
    // 4. Erro de Configuração (URL/Key)
    else if (event.includes("apikey") || event.includes("JWT")) {
      userFriendlyMessage = "Chaves de API Inválidas: Verifique as chaves do projeto.";
    } 
    // 5. E-mail não confirmado
    else if (event.includes("Email not confirmed")) {
      userFriendlyMessage = "E-mail Pendente: Confirme seu e-mail no Supabase.";
    } 
    // 6. Usuário sem registro no banco (Auth existe, Profile não)
    else if (event.includes("Profile not found")) {
      userFriendlyMessage = "Usuário sem Perfil: Conta existe no Auth, mas falta registro na tabela de perfis.";
    } 
    // 7. Conta inativa ou bloqueada
    else if (event.includes("is_active") && event.includes("false")) {
      userFriendlyMessage = "Acesso Bloqueado: Sua conta foi desativada pelo administrador.";
    }

    const newLog = { event: `${prefix} ${userFriendlyMessage}`, timestamp, type };
    logsRef.current = [newLog, ...logsRef.current].slice(0, 30);
    setAuthLogs([...logsRef.current]);
    
    if (typeof console !== "undefined") {
      const consoleMethod = type === 'error' ? 'error' : type === 'warn' ? 'warn' : 'log';
      console[consoleMethod](`[AUTH] ${timestamp}: ${event}`);
    }
  }, []);

  const loadProfileAndRole = useCallback(async (uid: string) => {
    addLog(`Iniciando validação de perfil para o ID: ${uid.substring(0, 8)}...`);
    try {
      // Tenta buscar o perfil
      const { data: profileData, error: pErr } = await supabase
        .from("profiles")
        .select("*, client_permissions(*)")
        .eq("id", uid)
        .maybeSingle();

      if (pErr) {
        if (pErr.message.includes("profiles\" does not exist")) {
          addLog(`ERRO: A tabela 'profiles' não existe no seu banco de dados.`, 'error');
        } else if (pErr.code === "PGRST116") {
          addLog(`PERFIL NÃO ENCONTRADO: Sua conta existe no Auth, mas não há registro na tabela 'profiles'.`, 'error');
        } else {
          addLog(`Erro ao carregar perfil: ${pErr.message}`, 'error');
        }
      } else if (!profileData) {
        addLog(`LOG 6: Perfil não encontrado no banco. Isso geralmente ocorre se o Trigger do SQL não foi disparado.`, 'error');
      }

      // Tenta buscar as roles
      const { data: roleData, error: rErr } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);

      if (rErr) {
        if (rErr.message.includes("user_roles\" does not exist")) {
          addLog(`AVISO: A tabela 'user_roles' não existe. Usando permissões básicas.`, 'warn');
        } else {
          addLog(`Erro ao buscar roles: ${rErr.message}`, 'error');
        }
      }
      
      setProfile(profileData ?? null);
      
      // Checa tanto is_admin do perfil quanto a tabela user_roles
      const is_gestor = profileData?.is_admin === true || 
                       roleData?.some((r: any) => r.role === "admin" || r.role === "gestor");
      
      setIsAdmin(!!is_gestor);
      
      if (profileData) {
        if (profileData.is_active === false) {
          addLog(`LOG 7: Sua conta está marcada como INATIVA no banco de dados.`, 'warn');
        } else {
          addLog(`ACESSO LIBERADO: Bem-vindo como ${is_gestor ? "Gestor" : "Cliente"}.`);
        }
      }
    } catch (err: any) {
      addLog(`ERRO 3: Falha de conexão ou rede com o banco de dados.`, 'error');
    }
  }, [addLog]);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: Session | null) => {
      if (!mounted) return;
      addLog(`Evento Auth: ${event}`);
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        loadProfileAndRole(u.id);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
    });

    // Verificação inicial
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (!mounted) return;
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        addLog("Sessão ativa detectada.");
        loadProfileAndRole(u.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        addLog("Nenhuma sessão. Aguardando login...");
        setLoading(false);
      }
    }).catch((err: any) => {
      addLog(`Supabase Offline: Verifique a URL e a conexão.`, 'error');
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
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
