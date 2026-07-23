import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type VaultDocument = {
  id: string;
  title: string;
  doc_type: string;
  subject_data: Record<string, string>;
  prompt: string;
  image_data: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type VaultDocumentInput = {
  title: string;
  doc_type: string;
  subject_data: Record<string, string>;
  prompt: string;
  image_data: string;
};

export function useVaultDocuments(enabled: boolean) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["vault_documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vault_documents")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as VaultDocument[];
    },
    enabled,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["vault_documents"] });

  const add = useMutation({
    mutationFn: async (payload: VaultDocumentInput) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("vault_documents")
        .insert([{ ...payload, created_by: userData.user?.id ?? null }])
        .select()
        .single();
      if (error) throw error;
      return data as VaultDocument;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Documento salvo no cofre.");
    },
    onError: (err: any) => toast.error("Erro ao salvar: " + err.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("vault_documents")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Documento removido.");
    },
    onError: (err: any) => toast.error("Erro ao remover: " + err.message),
  });

  return { ...query, add, remove };
}
