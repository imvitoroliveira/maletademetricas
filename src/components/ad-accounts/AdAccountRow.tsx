import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdAccount } from "@/hooks/useAdAccounts";

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

type Props = {
  account: AdAccount;
  onDelete: (account: AdAccount) => void;
};

export function AdAccountRow({ account, onDelete }: Props) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0 space-y-1.5">
        <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">
          {account.name}
        </p>
        <p className="text-[11px] text-slate-400 font-mono truncate">{account.account_id}</p>
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <Badge
            variant="outline"
            className={
              STATUS_META[account.status ?? "active"]?.className ??
              "bg-slate-50 text-slate-700 border-slate-200"
            }
          >
            {STATUS_META[account.status ?? "active"]?.label ?? account.status}
          </Badge>
          {account.software && (
            <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
              {SOFTWARE_LABEL[account.software] ?? account.software}
            </Badge>
          )}
          {account.birth_date && (
            <span className="text-[11px] text-slate-400">
              🎂 {new Date(account.birth_date + "T00:00:00").toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge
          variant="outline"
          className={
            account.has_credentials
              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
              : "bg-amber-50 text-amber-700 border-amber-100"
          }
        >
          {account.has_credentials ? "Conectada" : "Sem token"}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
          onClick={() => onDelete(account)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
