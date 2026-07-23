import { ExternalLink, Key, Pencil, Trash2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";

const STATUS_META: Record<string, { label: string; className: string }> = {
  active: { label: "Ativo", className: "bg-blue-50 text-blue-700 border-blue-200" },
  analysis: { label: "Em análise", className: "bg-amber-50 text-amber-700 border-amber-200" },
  banned: { label: "Banido", className: "bg-rose-50 text-rose-700 border-rose-200" },
};

const SOFTWARE_LABEL: Record<string, string> = {
  dolphin: "Dolphin",
  incogniton: "Incogniton",
};

type Props = {
  item: any;
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
};

export function VaultProfileRow({ item, onEdit, onDelete }: Props) {
  const credentials = [
    { label: "Login", user: item.credentials?.login, pass: item.credentials?.password },
    { label: "E-mail primário", user: item.credentials?.primary_email, pass: item.credentials?.primary_email_password },
    { label: "E-mail secundário", user: item.credentials?.secondary_email, pass: item.credentials?.secondary_email_password },
    { label: "Facebook", user: item.credentials?.facebook_email, pass: item.credentials?.facebook_password },
    { label: "X", user: item.credentials?.x_user, pass: item.credentials?.x_password },
    { label: "Instagram", user: item.credentials?.instagram_user, pass: item.credentials?.instagram_password },
  ].filter((c) => c.user || c.pass);

  return (
    <TableRow className="group hover:bg-slate-50/50 transition-colors">
      <TableCell>
        <div className="flex flex-col gap-1.5">
          <span className="font-bold text-slate-900 dark:text-slate-100">{item.name}</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className={
                STATUS_META[item.status ?? "active"]?.className ??
                "bg-slate-50 text-slate-700 border-slate-200"
              }
            >
              {STATUS_META[item.status ?? "active"]?.label ?? item.status}
            </Badge>
            {item.software && (
              <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                {SOFTWARE_LABEL[item.software] ?? item.software}
              </Badge>
            )}
          </div>
          <div className="flex flex-col gap-0.5 text-[10px] text-slate-400">
            {item.birth_date && (
              <span>🎂 Nasc.: {new Date(item.birth_date + "T00:00:00").toLocaleDateString("pt-BR")}</span>
            )}
            {item.profile_created_date && (
              <span>📅 Criação: {new Date(item.profile_created_date + "T00:00:00").toLocaleDateString("pt-BR")}</span>
            )}
          </div>
        </div>
      </TableCell>

      <TableCell>
        {item.access_url ? (
          <a
            href={item.access_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-fuchsia-600 hover:underline font-medium"
          >
            Abrir Link <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="text-xs text-slate-400">Nenhum link</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1.5 min-w-[220px]">
          {credentials.map((c) => (
            <div key={c.label} className="text-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">{c.label}</span>
              <div className="flex items-center gap-2 text-slate-600">
                <User className="h-3 w-3 text-slate-400" />
                <span className="font-mono">{c.user || "---"}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Key className="h-3 w-3 text-slate-400" />
                <span className="font-mono">{c.pass || "---"}</span>
              </div>
            </div>
          ))}
          {credentials.length === 0 && (
            <span className="text-xs text-slate-400">Sem credenciais</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <p className="text-xs text-slate-500 max-w-[250px] truncate" title={item.notes}>
          {item.notes || "-"}
        </p>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(item)}
            className="text-slate-400 hover:text-fuchsia-600 transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm("Deseja realmente remover este perfil?")) {
                onDelete(item.id);
              }
            }}
            className="text-slate-400 hover:text-rose-500 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
