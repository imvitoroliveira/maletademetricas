import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type VaultNote = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type VaultNoteFormValues = {
  title: string;
  content: string;
  tags: string[];
};

export const emptyVaultNote: VaultNoteFormValues = {
  title: "",
  content: "",
  tags: [],
};

export function useVaultNotes(enabled: boolean) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["vault_notes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vault_notes")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as VaultNote[];
    },
    enabled,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["vault_notes"] });

  const add = useMutation({
    mutationFn: async (payload: VaultNoteFormValues) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("vault_notes")
        .insert([{ ...payload, created_by: userData.user?.id ?? null }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Anotação salva no cofre.");
    },
    onError: (err: any) => toast.error("Erro ao salvar: " + err.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...payload }: VaultNoteFormValues & { id: string }) => {
      const { data, error } = await supabase
        .from("vault_notes")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Anotação atualizada.");
    },
    onError: (err: any) => toast.error("Erro ao atualizar: " + err.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vault_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Anotação removida.");
    },
    onError: (err: any) => toast.error("Erro ao remover: " + err.message),
  });

  return { ...query, add, update, remove };
}
