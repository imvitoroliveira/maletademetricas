import { useState } from "react";
import { Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { AdAccountLite } from "@/hooks/useAdAccountLinks";
import type { ProfileRow } from "@/hooks/useUsers";

type Props = {
  profile: ProfileRow | null;
  adAccounts: AdAccountLite[];
  linkedAccountIds: string[];
  onClose: () => void;
  onToggleLink: (accountId: string) => void;
  onCreateAdAccount: (params: {
    name: string;
    accountId: string;
    accessToken: string;
    appSecret: string;
  }) => Promise<void>;
};

export function AdAccountBindingDialog({
  profile,
  adAccounts,
  linkedAccountIds,
  onClose,
  onToggleLink,
  onCreateAdAccount,
}: Props) {
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [name, setName] = useState("");
  const [externalId, setExternalId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [appSecret, setAppSecret] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onCreateAdAccount({ name, accountId: externalId, accessToken, appSecret });
      setName("");
      setExternalId("");
      setAccessToken("");
      setAppSecret("");
      setIsAddingAccount(false);
    } catch (error: any) {
      toast.error("Erro ao criar conta: " + error.message);
    }
  };

  return (
    <>
      <Dialog open={!!profile} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contas de Anúncio</DialogTitle>
            <CardDescription>
              Vincule as contas de anúncio que o cliente {profile?.email} pode visualizar.
            </CardDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold">Contas Disponíveis</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingAccount(true)}
                className="text-xs h-7"
              >
                Nova Conta
              </Button>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {adAccounts.length === 0 ? (
                <div className="text-center py-8 border rounded-lg border-dashed">
                  <Target className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">Nenhuma conta cadastrada.</p>
                </div>
              ) : (
                adAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{account.name}</span>
                      <span className="text-xs text-slate-500">ID: {account.account_id}</span>
                    </div>
                    <Checkbox
                      checked={linkedAccountIds.includes(account.id)}
                      onCheckedChange={() => onToggleLink(account.id)}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button onClick={onClose} className="w-full">
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddingAccount} onOpenChange={setIsAddingAccount}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Conta de Anúncio</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome da Conta</label>
              <Input
                placeholder="Ex: Meta Ads - Loja X"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">ID da Conta (Externo)</label>
              <Input
                placeholder="Ex: act_123456789"
                value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Meta Access Token</label>
              <Input
                type="password"
                placeholder="Insira o Access Token"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">App Secret</label>
              <Input
                type="password"
                placeholder="Insira o App Secret"
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
                required
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full bg-blue-600">
                Cadastrar Conta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
