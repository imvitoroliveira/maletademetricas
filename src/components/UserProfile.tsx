
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, Shield, CheckCircle2, AlertCircle, Key, Lock, Loader2 } from "lucide-react";

export function UserProfile() {
  const { profile, user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [vaultPassword, setVaultPassword] = useState("");
  const [loadingVault, setLoadingVault] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.info("Funcionalidade de atualização de nome em desenvolvimento.");
  };

  const handleUpdateVaultPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setLoadingVault(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ vault_password: vaultPassword } as any)
        .eq("id", profile.id);

      if (error) throw error;
      toast.success("Senha do cofre atualizada com sucesso!");
      setVaultPassword("");
    } catch (error: any) {
      toast.error("Erro ao atualizar senha do cofre: " + error.message);
    } finally {
      setLoadingVault(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <User className="h-6 w-6 text-fuchsia-600" />
            Meu Perfil
          </CardTitle>
          <CardDescription>
            Informações da sua conta e permissões no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>E-mail</Label>
              <div className="p-2 bg-slate-50 rounded-md border text-slate-600">
                {user?.email}
              </div>
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
            <h3 className="font-medium text-slate-900">Configurações Gerais</h3>
            <div className="space-y-2">
              <Label htmlFor="display_name">Nome de Exibição</Label>
              <Input id="display_name" placeholder="Seu nome" defaultValue={profile.email.split('@')[0]} />
            </div>
            <Button type="submit" className="bg-fuchsia-600" disabled={isUpdating}>
              Salvar Alterações
            </Button>
          </form>
        </CardContent>
      </Card>

      {!profile.is_admin && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Minhas Permissões</CardTitle>
            <CardDescription>O que você tem acesso neste dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {profile.client_permissions?.[0]?.can_view_charts && (
                <Badge variant="secondary">Gráficos de Performance</Badge>
              )}
              {profile.client_permissions?.[0]?.can_view_metrics && (
                <Badge variant="secondary">Métricas Personalizadas</Badge>
              )}
              {profile.client_permissions?.[0]?.can_view_insights && (
                <Badge variant="secondary">Insights Estratégicos</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {profile.is_admin && (
        <Card className="border-none shadow-sm border-l-4 border-l-fuchsia-500">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-fuchsia-600" />
              <CardTitle className="text-xl">Segurança do Cofre</CardTitle>
            </div>
            <CardDescription>Defina uma senha mestre para acessar a área de contingência.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateVaultPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vault_pass">Nova Senha do Cofre</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    id="vault_pass"
                    type="password" 
                    placeholder="Digite a senha mestre..." 
                    className="pl-10 h-11"
                    value={vaultPassword}
                    onChange={(e) => setVaultPassword(e.target.value)}
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Esta senha será solicitada sempre que você tentar acessar a aba "Cofre".
                </p>
              </div>
              <Button type="submit" disabled={loadingVault} className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 h-11">
                {loadingVault ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Salvar Senha do Cofre"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
