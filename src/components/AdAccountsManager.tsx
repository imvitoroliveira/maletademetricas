import * as React from "react";
import {
  Plug,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
  Plus,
  PlugZap,
  HelpCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

type AdAccount = Tables<"ad_accounts">;

type TestResult = {
  ok: boolean;
  error?: string;
  account?: { name: string; status: string; currency: string | null };
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  active: {
    label: "Ativo",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  analysis: {
    label: "Em análise",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  banned: {
    label: "Banido",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
};

const SOFTWARE_LABEL: Record<string, string> = {
  dolphin: "Dolphin",
  incogniton: "Incogniton",
};

export function AdAccountsManager() {
  const queryClient = useQueryClient();
  const [name, setName] = React.useState("");
  const [accountId, setAccountId] = React.useState("");
  const [accessToken, setAccessToken] = React.useState("");
  const [software, setSoftware] = React.useState("");
  const [birthDate, setBirthDate] = React.useState("");
  const [status, setStatus] = React.useState("active");
  const [testing, setTesting] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [testResult, setTestResult] = React.useState<TestResult | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AdAccount | null>(null);

  const { data: accounts = [], isLoading } = useQuery({
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

  const resetForm = () => {
    setName("");
    setAccountId("");
    setAccessToken("");
    setSoftware("");
    setBirthDate("");
    setStatus("active");
    setTestResult(null);
  };

  const handleTest = async () => {
    if (!accountId.trim() || !accessToken.trim()) {
      toast.error("Preencha o ID da conta e o token antes de testar.");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("test-meta-connection", {
        body: { accountId: accountId.trim(), accessToken: accessToken.trim() },
      });
      if (error) throw error;
      setTestResult(data as TestResult);
      if ((data as TestResult).ok) {
        toast.success("Conexão validada com sucesso!");
      } else {
        toast.error((data as TestResult).error ?? "Falha na conexão.");
      }
    } catch (e) {
      const msg = (e as Error).message;
      setTestResult({ ok: false, error: msg });
      toast.error("Erro ao testar: " + msg);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !accountId.trim() || !accessToken.trim()) {
      toast.error("Preencha todos os campos.");
      return;
    }
    if (!testResult?.ok) {
      toast.error("Teste a conexão com sucesso antes de salvar.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("ad_accounts").insert({
        name: name.trim(),
        account_id: accountId.trim(),
        access_token: accessToken.trim(),
        platform: "meta",
      });
      if (error) throw error;
      toast.success("Conta de anúncio cadastrada!");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["ad_accounts"] });
    } catch (e) {
      toast.error("Erro ao salvar: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase
        .from("ad_accounts")
        .delete()
        .eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success("Conta removida.");
      queryClient.invalidateQueries({ queryKey: ["ad_accounts"] });
    } catch (e) {
      toast.error("Erro ao remover: " + (e as Error).message);
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Guided form */}
      <Card className="lg:col-span-3 shadow-sm border-none bg-white dark:bg-slate-900">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-fuchsia-50 text-fuchsia-600 flex items-center justify-center">
              <Plug className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-50">
                Conectar conta de anúncios
              </CardTitle>
              <CardDescription className="text-sm">
                Cadastre a conta do Meta Ads e valide a conexão antes de salvar.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-4 text-xs text-slate-500 space-y-2">
            <p className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
              <HelpCircle className="h-4 w-4" /> Como obter os dados
            </p>
            <p>
              1. No <b>Gerenciador de Negócios</b>, peça ao cliente para adicionar sua
              agência como parceira (ou dar acesso à conta de anúncios).
            </p>
            <p>
              2. Em <b>Configurações do Negócio → Usuários do Sistema</b>, gere um{" "}
              <b>token de Usuário de Sistema</b> com a permissão <code>ads_read</code>.
              Esse token não expira.
            </p>
            <p>
              3. Copie o <b>ID da conta de anúncios</b> (ex.: <code>act_1234567890</code>) e cole abaixo.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="acc-name">Nome de identificação</Label>
            <Input
              id="acc-name"
              placeholder="Ex.: Cliente João - Loja"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="acc-id">ID da conta de anúncios</Label>
            <Input
              id="acc-id"
              placeholder="act_1234567890"
              value={accountId}
              onChange={(e) => {
                setAccountId(e.target.value);
                setTestResult(null);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="acc-token">Token de acesso (Usuário de Sistema)</Label>
            <Input
              id="acc-token"
              type="password"
              placeholder="EAAB..."
              value={accessToken}
              onChange={(e) => {
                setAccessToken(e.target.value);
                setTestResult(null);
              }}
            />
          </div>

          {testResult && (
            <div
              className={
                "rounded-lg p-4 text-sm flex items-start gap-3 " +
                (testResult.ok
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700")
              }
            >
              {testResult.ok ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
              )}
              <div>
                {testResult.ok ? (
                  <>
                    <p className="font-semibold">Conexão válida!</p>
                    <p className="text-xs mt-0.5">
                      {testResult.account?.name} · Status: {testResult.account?.status}
                      {testResult.account?.currency
                        ? ` · ${testResult.account.currency}`
                        : ""}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold">Não foi possível conectar</p>
                    <p className="text-xs mt-0.5">{testResult.error}</p>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={testing || saving}
              className="gap-2"
            >
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlugZap className="h-4 w-4" />
              )}
              {testing ? "Testando..." : "Testar conexão"}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || testing || !testResult?.ok}
              className="gap-2 bg-gradient-accent text-white"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Salvar conta
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Connected accounts list */}
      <Card className="lg:col-span-2 shadow-sm border-none bg-white dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-50">
            Contas conectadas
          </CardTitle>
          <CardDescription className="text-sm">
            {accounts.length} conta(s) cadastrada(s).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="h-32 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-fuchsia-600" />
            </div>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-8 text-center">
              Nenhuma conta conectada ainda.
            </p>
          ) : (
            accounts.map((acc) => (
              <div
                key={acc.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">
                    {acc.name}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono truncate">
                    {acc.account_id}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="outline"
                    className={
                      acc.access_token
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : "bg-amber-50 text-amber-700 border-amber-100"
                    }
                  >
                    {acc.access_token ? "Conectada" : "Sem token"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                    onClick={() => setDeleteTarget(acc)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover conta de anúncio?</AlertDialogTitle>
            <AlertDialogDescription>
              A conta "{deleteTarget?.name}" e suas campanhas sincronizadas serão
              removidas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
