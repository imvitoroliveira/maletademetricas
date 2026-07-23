import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type VaultCredentials = {
  login: string;
  password: string;
  primary_email: string;
  primary_email_password: string;
  secondary_email: string;
  secondary_email_password: string;
  facebook_email: string;
  facebook_password: string;
  x_user: string;
  x_password: string;
  instagram_user: string;
  instagram_password: string;
};

export const emptyVaultCredentials: VaultCredentials = {
  login: "",
  password: "",
  primary_email: "",
  primary_email_password: "",
  secondary_email: "",
  secondary_email_password: "",
  facebook_email: "",
  facebook_password: "",
  x_user: "",
  x_password: "",
  instagram_user: "",
  instagram_password: "",
};

export type VaultProfileFormValues = {
  name: string;
  access_url: string;
  credentials: VaultCredentials;
  notes: string;
  status: string;
  software: string;
  birth_date: string;
  profile_created_date: string;
};

export const emptyVaultProfile: VaultProfileFormValues = {
  name: "",
  access_url: "",
  credentials: { ...emptyVaultCredentials },
  notes: "",
  status: "active",
  software: "",
  birth_date: "",
  profile_created_date: "",
};

export function toVaultPayload(form: VaultProfileFormValues) {
  return {
    ...form,
    software: form.software || null,
    birth_date: form.birth_date || null,
    profile_created_date: form.profile_created_date || null,
  };
}

export function useVaultProfiles(enabled: boolean) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["contingency_vault"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contingency_vault")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["contingency_vault"] });

  const add = useMutation({
    mutationFn: async (payload: ReturnType<typeof toVaultPayload>) => {
      const { data, error } = await supabase
        .from("contingency_vault")
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Perfil de contingência adicionado.");
    },
    onError: (err: any) => toast.error("Erro ao adicionar: " + err.message),
  });

  const update = useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: ReturnType<typeof toVaultPayload> & { id: string }) => {
      const { data, error } = await supabase
        .from("contingency_vault")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Perfil atualizado com sucesso.");
    },
    onError: (err: any) => toast.error("Erro ao atualizar: " + err.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contingency_vault")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Perfil removido do cofre.");
    },
  });

  return { ...query, add, update, remove };
}
