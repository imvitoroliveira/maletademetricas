import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

export type ProfileRow = Tables<"profiles"> & {
  client_permissions?: Tables<"client_permissions">[];
};

export type PermissionState = {
  can_view_charts: boolean;
  can_view_metrics: boolean;
  can_view_insights: boolean;
};

export function useUsers() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          `id, email, is_admin, is_active, created_at, updated_at,
           client_permissions (*)`,
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar usuários: " + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserEmail(user.email || null);
        setCurrentUserId(user.id);
      }
    })();
    fetchProfiles();
  }, [fetchProfiles]);

  const createUser = async (email: string, password: string) => {
    const { adminCreateUser } = await import("@/lib/admin-users.functions");
    await adminCreateUser({ data: { email, password } });
    toast.success("Usuário criado com sucesso!");
    fetchProfiles();
  };

  const deleteUser = async (id: string) => {
    const { adminDeleteUser } = await import("@/lib/admin-users.functions");
    await adminDeleteUser({ data: { userId: id } });
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    toast.success("Usuário excluído com sucesso");
    setTimeout(() => fetchProfiles(), 1000);
  };

  const toggleUserStatus = async (id: string, currentStatus: boolean | null) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: !currentStatus })
        .eq("id", id);
      if (error) throw error;
      setProfiles((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_active: !currentStatus } : p)),
      );
      toast.success(`Usuário ${!currentStatus ? "ativado" : "desativado"}`);
    } catch (error: any) {
      toast.error("Erro ao atualizar status: " + error.message);
    }
  };

  const savePermissions = async (clientId: string, permissions: PermissionState) => {
    const { error } = await supabase
      .from("client_permissions")
      .upsert(
        {
          client_id: clientId,
          ...permissions,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "client_id" },
      );
    if (error) throw error;
    toast.success("Permissões atualizadas!");
    fetchProfiles();
  };

  return {
    profiles,
    loading,
    currentUserEmail,
    currentUserId,
    fetchProfiles,
    createUser,
    deleteUser,
    toggleUserStatus,
    savePermissions,
  };
}
