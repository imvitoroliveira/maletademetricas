
import React, { useState, useEffect } from "react";
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Shield, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Lock,
  Mail,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export function UserManager() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  // Selected user for permissions
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [permissions, setPermissions] = useState<any>({
    can_view_charts: true,
    can_view_metrics: true,
    can_view_insights: true
  });

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          *,
          client_permissions (*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar usuários: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) return;

    try {
      // In a real production app with Edge Functions, we would call an Edge Function
      // Since we are in a demo environment and need to create auth users,
      // we'll use signUp which creates the auth user AND our profile trigger handles the profile.
      const { data, error } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
      });

      if (error) throw error;
      
      toast.success("Usuário criado com sucesso!");
      setIsAdding(false);
      setNewEmail("");
      setNewPassword("");
      fetchProfiles();
    } catch (error: any) {
      toast.error("Erro ao criar usuário: " + error.message);
    }
  };

  const toggleUserStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      
      setProfiles(profiles.map(p => p.id === id ? { ...p, is_active: !currentStatus } : p));
      toast.success(`Usuário ${!currentStatus ? 'ativado' : 'desativado'}`);
    } catch (error: any) {
      toast.error("Erro ao atualizar status: " + error.message);
    }
  };

  const handleUpdatePermissions = async () => {
    if (!selectedProfile) return;

    try {
      const { error } = await supabase
        .from("client_permissions")
        .upsert({
          client_id: selectedProfile.id,
          ...permissions,
          updated_at: new Date().toISOString()
        }, { onConflict: 'client_id' });

      if (error) throw error;
      
      toast.success("Permissões atualizadas!");
      setSelectedProfile(null);
      fetchProfiles();
    } catch (error: any) {
      toast.error("Erro ao salvar permissões: " + error.message);
    }
  };

  const openPermissions = (profile: any) => {
    setSelectedProfile(profile);
    const userPerms = profile.client_permissions?.[0] || {
      can_view_charts: true,
      can_view_metrics: true,
      can_view_insights: true
    };
    setPermissions(userPerms);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Gestão de Clientes</h2>
          <p className="text-slate-500">Crie acessos e gerencie o que cada cliente pode visualizar.</p>
        </div>
        
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-fuchsia-600 hover:bg-fuchsia-700">
              <UserPlus className="h-4 w-4" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
              <CardDescription>
                O cliente poderá acessar o dashboard com este e-mail e senha.
              </CardDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    type="email" 
                    placeholder="cliente@email.com" 
                    className="pl-10"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Senha Temporária</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full bg-fuchsia-600">Criar Acesso</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
            <TableRow>
              <TableHead>Cliente / E-mail</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Permissões</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-fuchsia-600" />
                    <span>Carregando usuários...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : profiles.map((profile) => (
              <TableRow key={profile.id} className="group">
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
                        {profile.client_permissions?.[0]?.can_view_charts && <Badge variant="secondary" className="text-[10px]">Gráficos</Badge>}
                        {profile.client_permissions?.[0]?.can_view_metrics && <Badge variant="secondary" className="text-[10px]">Métricas</Badge>}
                        {profile.client_permissions?.[0]?.can_view_insights && <Badge variant="secondary" className="text-[10px]">Insights</Badge>}
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
                          onClick={() => openPermissions(profile)}
                          className="h-8 text-fuchsia-600 hover:text-fuchsia-700 hover:bg-fuchsia-50"
                        >
                          Permissões
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => toggleUserStatus(profile.id, profile.is_active)}
                          className={profile.is_active ? "text-rose-500" : "text-emerald-500"}
                          title={profile.is_active ? "Desativar" : "Ativar"}
                        >
                          {profile.is_active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Permissions Dialog */}
      <Dialog open={!!selectedProfile} onOpenChange={() => setSelectedProfile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permissões do Cliente</DialogTitle>
            <CardDescription>
              Selecione quais seções {selectedProfile?.email} pode visualizar no dashboard.
            </CardDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="flex items-center space-x-3 space-y-0 border p-4 rounded-lg">
              <Checkbox 
                id="charts" 
                checked={permissions.can_view_charts} 
                onCheckedChange={(checked) => setPermissions({...permissions, can_view_charts: !!checked})}
              />
              <div className="grid gap-1.5 leading-none">
                <label htmlFor="charts" className="text-sm font-medium leading-none cursor-pointer">
                  Visualizar Gráficos de Performance
                </label>
                <p className="text-xs text-slate-500">Permite ver os gráficos principais de ROAS, Investimento, etc.</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 space-y-0 border p-4 rounded-lg">
              <Checkbox 
                id="metrics" 
                checked={permissions.can_view_metrics} 
                onCheckedChange={(checked) => setPermissions({...permissions, can_view_metrics: !!checked})}
              />
              <div className="grid gap-1.5 leading-none">
                <label htmlFor="metrics" className="text-sm font-medium leading-none cursor-pointer">
                  Visualizar Métricas Personalizadas
                </label>
                <p className="text-xs text-slate-500">Tabela de KPIs inseridos manualmente pelo gestor.</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 space-y-0 border p-4 rounded-lg">
              <Checkbox 
                id="insights" 
                checked={permissions.can_view_insights} 
                onCheckedChange={(checked) => setPermissions({...permissions, can_view_insights: !!checked})}
              />
              <div className="grid gap-1.5 leading-none">
                <label htmlFor="insights" className="text-sm font-medium leading-none cursor-pointer">
                  Visualizar Insights e Recomendações
                </label>
                <p className="text-xs text-slate-500">Bloco de sugestões e análises qualitativas.</p>
              </div>
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button onClick={handleUpdatePermissions} className="w-full bg-fuchsia-600">Salvar Permissões</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
