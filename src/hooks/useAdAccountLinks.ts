import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

export type AdAccountLite = Pick<
  Tables<"ad_accounts">,
  "id" | "name" | "account_id" | "created_at" | "updated_at"
>;

export function useAdAccountLinks() {
  const [adAccounts, setAdAccounts] = useState<AdAccountLite[]>([]);
  const [linkedAccountIds, setLinkedAccountIds] = useState<string[]>([]);

  const fetchAdAccounts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("ad_accounts")
        .select("id, name, account_id, created_at, updated_at")
        .order("name");
      if (error) throw error;
      setAdAccounts((data as AdAccountLite[]) || []);
    } catch (error: any) {
      console.error("Erro ao carregar contas de anúncio:", error);
    }
  }, []);

  useEffect(() => {
    fetchAdAccounts();
  }, [fetchAdAccounts]);

  const fetchLinkedAccounts = useCallback(async (profileId: string) => {
    try {
      const { data, error } = await supabase
        .from("profile_ad_accounts")
        .select("ad_account_id")
        .eq("profile_id", profileId);
      if (error) throw error;
      setLinkedAccountIds(data?.map((d: any) => d.ad_account_id) || []);
    } catch (error: any) {
      console.error("Erro ao carregar contas vinculadas:", error);
    }
  }, []);

  const toggleLink = async (profileId: string, accountId: string) => {
    const isLinked = linkedAccountIds.includes(accountId);
    try {
      if (isLinked) {
        const { error } = await supabase
          .from("profile_ad_accounts")
          .delete()
          .match({ profile_id: profileId, ad_account_id: accountId });
        if (error) throw error;
        setLinkedAccountIds((prev) => prev.filter((id) => id !== accountId));
        toast.success("Conta desvinculada");
      } else {
        const { error } = await supabase
          .from("profile_ad_accounts")
          .insert({ profile_id: profileId, ad_account_id: accountId });
        if (error) throw error;
        setLinkedAccountIds((prev) => [...prev, accountId]);
        toast.success("Conta vinculada");
      }
    } catch (error: any) {
      toast.error("Erro ao atualizar vínculo: " + error.message);
    }
  };

  const createAdAccount = async (params: {
    name: string;
    accountId: string;
    accessToken: string;
    appSecret: string;
  }) => {
    const { data, error } = await supabase
      .from("ad_accounts")
      .insert({
        name: params.name,
        account_id: params.accountId,
        access_token: params.accessToken,
        app_secret: params.appSecret,
      })
      .select("id, name, account_id, created_at, updated_at")
      .single();
    if (error) throw error;
    toast.success("Conta de anúncio criada!");
    setAdAccounts((prev) => [...prev, data as AdAccountLite]);
  };

  return {
    adAccounts,
    linkedAccountIds,
    fetchLinkedAccounts,
    toggleLink,
    createAdAccount,
  };
}
