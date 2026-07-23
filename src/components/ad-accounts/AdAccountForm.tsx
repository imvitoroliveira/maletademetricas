import { useState } from "react";
import {
  CheckCircle2,
  HelpCircle,
  Loader2,
  Plug,
  PlugZap,
  Plus,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TestResult } from "@/hooks/useAdAccounts";

type Props = {
  testing: boolean;
  saving: boolean;
  testResult: TestResult | null;
  onResetTest: () => void;
  onTest: (accountId: string, accessToken: string) => Promise<void>;
  onSave: (params: {
    name: string;
    accountId: string;
    accessToken: string;
    software: string;
    birthDate: string;
    status: string;
  }) => Promise<boolean>;
};

export function AdAccountForm({
  testing,
  saving,
  testResult,
  onResetTest,
  onTest,
  onSave,
}: Props) {
  const [name, setName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [accessToken, setAccessToken] = useState("");

  const resetForm = () => {
    setName("");
    setAccountId("");
    setAccessToken("");
    onResetTest();
  };

  const handleSave = async () => {
    const ok = await onSave({
      name,
      accountId,
      accessToken,
      software: "",
      birthDate: "",
      status: "active",
    });
    if (ok) resetForm();
  };

  return (
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
              onResetTest();
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
              onResetTest();
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
            onClick={() => onTest(accountId, accessToken)}
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
  );
}
