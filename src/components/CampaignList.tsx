import * as React from "react";
import { 
  Target, 
  Loader2,
  RefreshCcw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Campaign = Tables<"campaigns"> & {
  ad_accounts: { name: string } | null;
};

export function CampaignList() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = React.useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { syncMetaCampaigns } = await import("@/lib/meta.functions");
      const data = await syncMetaCampaigns({ data: {} });


      const results: Array<{ account: string; status: string; reason?: string; count?: number }> =
        data?.results ?? [];
      const ok = results.filter((r) => r.status === "ok");
      const failed = results.filter((r) => r.status !== "ok");
      const total = ok.reduce((sum, r) => sum + (r.count ?? 0), 0);

      if (ok.length > 0) {
        toast.success(`Sincronização concluída: ${total} campanha(s) atualizada(s).`);
      }
      if (failed.length > 0) {
        toast.error(
          `${failed.length} conta(s) com falha: ${failed.map((f) => `${f.account} (${f.reason})`).join("; ")}`,
        );
      }
      if (results.length === 0) {
        toast.info("Nenhuma conta de anúncio cadastrada para sincronizar.");
      }

      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    } catch (e) {
      toast.error("Erro ao sincronizar: " + (e as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          ad_accounts (
            name
          )
        `)
        .order('spent', { ascending: false });

      if (error) throw error;
      return (data as unknown) as Campaign[];
    },
    enabled: !!user
  });

  if (isLoading) {
    return (
      <Card className="shadow-sm border-none bg-white dark:bg-slate-900">
        <CardContent className="h-60 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-fuchsia-600" />
        </CardContent>
      </Card>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Card className="shadow-sm border-none bg-white dark:bg-slate-900">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-50">Campanhas do Meta Ads</CardTitle>
            <CardDescription className="text-sm">Visualize a performance das campanhas vinculadas.</CardDescription>
          </div>
          {isAdmin && (
            <Button onClick={handleSync} disabled={syncing} variant="outline" size="sm" className="gap-2 shrink-0">
              <RefreshCcw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Sincronizando..." : "Sincronizar"}
            </Button>
          )}
        </CardHeader>
        <CardContent className="h-40 flex items-center justify-center text-slate-400 italic">
          Nenhuma campanha encontrada. {isAdmin ? "Clique em Sincronizar para buscar do Meta Ads." : ""}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-none bg-white dark:bg-slate-900 overflow-hidden">
      <CardHeader className="border-b p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-50">Campanhas do Meta Ads</CardTitle>
            <CardDescription className="text-sm">Dados sincronizados diretamente do Gerenciador de Anúncios.</CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && (
              <Button onClick={handleSync} disabled={syncing} variant="outline" size="sm" className="gap-2">
                <RefreshCcw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Sincronizando..." : "Sincronizar"}
              </Button>
            )}
            <Badge className="bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100">
              {campaigns.length} Ativas
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="w-full overflow-x-auto custom-scrollbar">
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider h-12">Campanha</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider h-12 text-center">Status</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider h-12 text-center">Alcance</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider h-12 text-center">Cliques</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider h-12 text-center">Gasto</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider h-12 text-center">CTR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign: Campaign) => (
                <TableRow key={campaign.id} className="group hover:bg-slate-50 transition-colors">
                  <TableCell className="py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{campaign.name}</span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Target className="h-3 w-3" /> {campaign.ad_accounts?.name || 'Conta desconhecida'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center py-4">
                    <Badge variant="outline" className={
                      campaign.status === 'ACTIVE' 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                      : "bg-slate-50 text-slate-500 border-slate-100"
                    }>
                      {campaign.status === 'ACTIVE' ? 'Ativa' : 'Pausada'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center py-4 font-mono text-xs">
                    {campaign.reach?.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center py-4 font-mono text-xs">
                    {campaign.clicks?.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center py-4 font-mono text-xs font-semibold text-slate-700">
                    R$ {campaign.spent?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-center py-4">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-bold">{campaign.ctr}%</span>
                      <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-fuchsia-500" 
                          style={{ width: `${Math.min((Number(campaign.ctr) || 0) * 20, 100)}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
