import { useState } from "react";
import { Loader2 } from "lucide-react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAdAccounts, type AdAccount } from "@/hooks/useAdAccounts";
import { AdAccountForm } from "@/components/ad-accounts/AdAccountForm";
import { AdAccountRow } from "@/components/ad-accounts/AdAccountRow";

export function AdAccountsManager() {
  const {
    accounts,
    isLoading,
    testing,
    saving,
    testResult,
    setTestResult,
    testConnection,
    saveAccount,
    deleteAccount,
  } = useAdAccounts();

  const [deleteTarget, setDeleteTarget] = useState<AdAccount | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <AdAccountForm
        testing={testing}
        saving={saving}
        testResult={testResult}
        onResetTest={() => setTestResult(null)}
        onTest={testConnection}
        onSave={saveAccount}
      />

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
              <AdAccountRow key={acc.id} account={acc} onDelete={setDeleteTarget} />
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
              onClick={async () => {
                if (deleteTarget) {
                  await deleteAccount(deleteTarget);
                  setDeleteTarget(null);
                }
              }}
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
