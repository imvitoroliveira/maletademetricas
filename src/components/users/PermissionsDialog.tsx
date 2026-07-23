import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { PermissionState, ProfileRow } from "@/hooks/useUsers";

type Props = {
  profile: ProfileRow | null;
  onClose: () => void;
  onSave: (clientId: string, permissions: PermissionState) => Promise<void>;
};

const DEFAULT: PermissionState = {
  can_view_charts: true,
  can_view_metrics: true,
  can_view_insights: true,
};

export function PermissionsDialog({ profile, onClose, onSave }: Props) {
  const [permissions, setPermissions] = useState<PermissionState>(DEFAULT);

  useEffect(() => {
    if (!profile) return;
    const p = profile.client_permissions?.[0];
    setPermissions(
      p
        ? {
            can_view_charts: p.can_view_charts ?? true,
            can_view_metrics: p.can_view_metrics ?? true,
            can_view_insights: p.can_view_insights ?? true,
          }
        : DEFAULT,
    );
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;
    try {
      await onSave(profile.id, permissions);
      onClose();
    } catch (error: any) {
      toast.error("Erro ao salvar permissões: " + error.message);
    }
  };

  const items: Array<{ key: keyof PermissionState; title: string; desc: string }> = [
    {
      key: "can_view_charts",
      title: "Visualizar Gráficos de Performance",
      desc: "Permite ver os gráficos principais de ROAS, Investimento, etc.",
    },
    {
      key: "can_view_metrics",
      title: "Visualizar Métricas Personalizadas",
      desc: "Tabela de KPIs inseridos manualmente pelo gestor.",
    },
    {
      key: "can_view_insights",
      title: "Visualizar Insights e Recomendações",
      desc: "Bloco de sugestões e análises qualitativas.",
    },
  ];

  return (
    <Dialog open={!!profile} onOpenChange={onClose}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Permissões do Cliente</DialogTitle>
          <CardDescription>
            Selecione quais seções {profile?.email} pode visualizar no dashboard.
          </CardDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          {items.map((item) => (
            <div
              key={item.key}
              className="flex items-center space-x-3 space-y-0 border p-4 rounded-lg"
            >
              <Checkbox
                id={item.key}
                checked={permissions[item.key]}
                onCheckedChange={(checked) =>
                  setPermissions({ ...permissions, [item.key]: !!checked })
                }
              />
              <div className="grid gap-1.5 leading-none">
                <label htmlFor={item.key} className="text-sm font-medium leading-none cursor-pointer">
                  {item.title}
                </label>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter className="pt-4">
          <Button onClick={handleSave} className="w-full bg-fuchsia-600">
            Salvar Permissões
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
