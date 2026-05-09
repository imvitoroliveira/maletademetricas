import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, Shield, CircleCheck as CheckCircle2, CircleAlert as AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function UserProfile() {
  const { profile, user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.info("Funcionalidade de atualizacao de nome em desenvolvimento.");
  };

  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <User className="h-6 w-6 text-sky-600" />
            Meu Perfil
          </CardTitle>
          <CardDescription>Informacoes da sua conta e permissoes no sistema.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>E-mail</Label>
              <div className="p-2 bg-slate-50 rounded-md border text-slate-600">{user?.email}</div>
            </div>
            <div className="space-y-2">
              <Label>Status da Conta</Label>
              <div className="flex items-center gap-2 h-10">
                {profile.is_active ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 flex gap-1 h-7">
                    <CheckCircle2 className="h-3 w-3" /> Ativo
                  </Badge>
                ) : (
                  <Badge className="bg-rose-50 text-rose-700 border-rose-100 flex gap-1 h-7">
                    <AlertCircle className="h-3 w-3" /> Inativo
                  </Badge>
                )}
                {profile.is_admin && (
                  <Badge className="bg-amber-50 text-amber-700 border-amber-100 flex gap-1 h-7">
                    <Shield className="h-3 w-3" /> Gestor
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4 pt-4 border-t">
            <h3 className="font-medium text-slate-900">Configuracoes Gerais</h3>
            <div className="space-y-2">
              <Label htmlFor="display_name">Nome de Exibicao</Label>
              <Input id="display_name" placeholder="Seu nome" defaultValue={profile.display_name} />
            </div>
            <Button type="submit" className="bg-sky-600" disabled={isUpdating}>
              Salvar Alteracoes
            </Button>
          </form>
        </CardContent>
      </Card>

      {!profile.is_admin && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Minhas Permissoes</CardTitle>
            <CardDescription>O que voce tem acesso neste dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {profile.client_permissions?.[0]?.can_view_charts && (
                <Badge variant="secondary">Graficos de Performance</Badge>
              )}
              {profile.client_permissions?.[0]?.can_view_metrics && (
                <Badge variant="secondary">Metricas Personalizadas</Badge>
              )}
              {profile.client_permissions?.[0]?.can_view_insights && (
                <Badge variant="secondary">Insights Estrategicos</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
