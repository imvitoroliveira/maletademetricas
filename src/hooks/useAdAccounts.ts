import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

export type AdAccount = Tables<"ad_accounts">;

export type TestResult = {
  ok: boolean;
  error?: string;
  account?: { name: string; status: string; currency: string | null };
};

export function useAdAccounts() {
  const queryClient = useQueryClient();
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const listQuery = useQuery({
    queryKey: ["ad_accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_accounts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AdAccount[];
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["ad_accounts"] });

  const testConnection = async (accountId: string, accessToken: string) => {
    if (!accountId.trim() || !accessToken.trim()) {
      toast.error("Preencha o ID da conta e o token antes de testar.");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const { testMetaConnection } = await import("@/lib/meta.functions");
      const data = await testMetaConnection({
        data: { accountId: accountId.trim(), accessToken: accessToken.trim() },
      });
      setTestResult(data as TestResult);
      if (data.ok) {
        toast.success("Conexão validada com sucesso!");
      } else {
        toast.error(data.error ?? "Falha na conexão.");
      }
    } catch (e) {
      const msg = (e as Error).message;
      setTestResult({ ok: false, error: msg });
      toast.error("Erro ao testar: " + msg);
    } finally {
      setTesting(false);
    }
  };

  const saveAccount = async (params: {
    name: string;
    accountId: string;
    accessToken: string;
    software: string;
    birthDate: string;
    status: string;
  }) => {
    if (!params.name.trim() || !params.accountId.trim() || !params.accessToken.trim()) {
      toast.error("Preencha todos os campos.");
      return false;
    }
    if (!testResult?.ok) {
      toast.error("Teste a conexão com sucesso antes de salvar.");
      return false;
    }
    setSaving(true);
    try {
      const { error } = await supabase.rpc("create_ad_account", {
        p_name: params.name.trim(),
        p_account_id: params.accountId.trim(),
        p_access_token: params.accessToken.trim(),
        p_platform: "meta",
        p_software: params.software || null,
        p_birth_date: params.birthDate || null,
        p_status: params.status,
      });
      if (error) throw error;
      toast.success("Conta de anúncio cadastrada!");
      invalidate();
      return true;
    } catch (e) {
      toast.error("Erro ao salvar: " + (e as Error).message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async (account: AdAccount) => {
    try {
      const { error } = await supabase.from("ad_accounts").delete().eq("id", account.id);
      if (error) throw error;
      toast.success("Conta removida.");
      invalidate();
    } catch (e) {
      toast.error("Erro ao remover: " + (e as Error).message);
    }
  };

  return {
    accounts: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    testing,
    saving,
    testResult,
    setTestResult,
    testConnection,
    saveAccount,
    deleteAccount,
  };
}
