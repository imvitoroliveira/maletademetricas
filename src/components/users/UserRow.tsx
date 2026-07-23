import {
  CheckCircle2,
  Shield,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { ProfileRow } from "@/hooks/useUsers";

type Props = {
  profile: ProfileRow;
  currentUserId: string | null;
  canDeleteUsers: boolean;
  onOpenPermissions: (p: ProfileRow) => void;
  onOpenAccounts: (p: ProfileRow) => void;
  onToggleStatus: (id: string, current: boolean | null) => void;
  onDelete: (id: string) => void;
};

export function UserRow({
  profile,
  currentUserId,
  canDeleteUsers,
  onOpenPermissions,
  onOpenAccounts,
  onToggleStatus,
  onDelete,
}: Props) {
  const perms = profile.client_permissions?.[0];

  return (
    <TableRow className="group">
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium text-slate-900 dark:text-slate-100">{profile.email}</span>
          <span className="text-xs text-slate-500">ID: {profile.id.substring(0, 8)}...</span>
        </div>
      </TableCell>
      <TableCell>
        {profile.is_admin ? (
          <Badge className="bg-amber-50 text-amber-700 border-amber-100 flex w-fit gap-1">
            <Shield className="h-3 w-3" /> Gestor
          </Badge>
        ) : (
          <Badge variant="outline" className="flex w-fit gap-1">
            <Users className="h-3 w-3" /> Cliente
          </Badge>
        )}
      </TableCell>
      <TableCell>
        {profile.is_active ? (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 flex w-fit gap-1">
            <CheckCircle2 className="h-3 w-3" /> Ativo
          </Badge>
        ) : (
          <Badge className="bg-rose-50 text-rose-700 border-rose-100 flex w-fit gap-1">
            <XCircle className="h-3 w-3" /> Inativo
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <div className="flex gap-1 flex-wrap">
          {!profile.is_admin && (
            <>
              {perms?.can_view_charts && <Badge variant="secondary" className="text-[10px]">Gráficos</Badge>}
              {perms?.can_view_metrics && <Badge variant="secondary" className="text-[10px]">Métricas</Badge>}
              {perms?.can_view_insights && <Badge variant="secondary" className="text-[10px]">Insights</Badge>}
            </>
          )}
          {profile.is_admin && <span className="text-xs text-slate-400 italic">Acesso Total</span>}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          {!profile.is_admin && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenPermissions(profile)}
                className="h-8 text-fuchsia-600 hover:text-fuchsia-700 hover:bg-fuchsia-50"
              >
                Permissões
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenAccounts(profile)}
                className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                Contas
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onToggleStatus(profile.id, profile.is_active)}
                className={profile.is_active ? "text-rose-500" : "text-emerald-500"}
                title={profile.is_active ? "Desativar" : "Ativar"}
              >
                {profile.is_active ? (
                  <ToggleRight className="h-5 w-5" />
                ) : (
                  <ToggleLeft className="h-5 w-5" />
                )}
              </Button>

              {canDeleteUsers && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(profile.id)}
                  className="text-slate-400 hover:text-rose-600 transition-colors"
                  title="Excluir Usuário"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
          {profile.is_admin && profile.id !== currentUserId && canDeleteUsers && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(profile.id)}
              className="text-slate-400 hover:text-rose-600 transition-colors"
              title="Excluir Gestor"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
