
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
  ToggleRight,
  ExternalLink,
  Target
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
import { Tables } from "@/integrations/supabase/types";

type ProfileRow = Tables<"profiles"> & {
  client_permissions?: Tables<"client_permissions">[];
};
type AdAccount = Tables<"ad_accounts">;
type PermissionState = {
  can_view_charts: boolean;
  can_view_metrics: boolean;
  can_view_insights: boolean;
};

export function UserManager() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  // The actual permission is enforced server-side in the admin-delete-user function.
  // Optionally restrict the UI to a configured master email (no hardcoded identity).
  const masterEmail = import.meta.env.VITE_MASTER_ADMIN_EMAIL as string | undefined;
  const canDeleteUsers = masterEmail ? currentUserEmail === masterEmail : !!currentUserEmail;
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  // Selected user for permissions
  const [selectedProfile, setSelectedProfile] = useState<ProfileRow | null>(null);
  const [selectedProfileForAccounts, setSelectedProfileForAccounts] = useState<ProfileRow | null>(null);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [linkedAccountIds, setLinkedAccountIds] = useState<string[]>([]);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountExternalId, setNewAccountExternalId] = useState("");
  const [newAccountAccessToken, setNewAccountAccessToken] = useState("");
  const [newAccountAppSecret, setNewAccountAppSecret] = useState("");
  const [permissions, setPermissions] = useState<PermissionState>({
    can_view_charts: true,
    can_view_metrics: true,
    can_view_insights: true
  });

  useEffect(() => {
    fetchProfiles();
    fetchAdAccounts();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserEmail(user.email || null);
      setCurrentUserId(user.id);
    }
  };

  const fetchAdAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("ad_accounts")
        .select("id, name, account_id, created_at, updated_at")
        .order("name");
      if (error) throw error;
      setAdAccounts((data as AdAccount[]) || []);
    } catch (error: any) {
      console.error("Erro ao carregar contas de anúncio:", error);
    }
  };

  const fetchLinkedAccounts = async (profileId: string) => {
    try {
      const { data, error } = await supabase
        .from("profile_ad_accounts")
        .select("ad_account_id")
        .eq("profile_id", profileId);
      if (error) throw error;
      setLinkedAccountIds(data?.map((d: any) => d.ad_account_id) || []);
    } catch (error: any) {
      console.error("Erro ao carregar contas vinculadas:", error);
    }
  };

  const handleCreateAdAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from("ad_accounts")
        .insert({
          name: newAccountName,
          account_id: newAccountExternalId,
          access_token: newAccountAccessToken,
          app_secret: newAccountAppSecret
        })
        .select("id, name, account_id, created_at, updated_at")
        .single();

      if (error) throw error;
      
      toast.success("Conta de anúncio criada!");
      setAdAccounts([...adAccounts, data]);
      setNewAccountName("");
      setNewAccountExternalId("");
      setNewAccountAccessToken("");
      setNewAccountAppSecret("");
      setIsAddingAccount(false);
    } catch (error: any) {
      toast.error("Erro ao criar conta: " + error.message);
    }
  };

  const toggleAccountLink = async (accountId: string) => {
    if (!selectedProfileForAccounts) return;
    
    const isLinked = linkedAccountIds.includes(accountId);
    try {
      if (isLinked) {
        const { error } = await supabase
          .from("profile_ad_accounts")
          .delete()
          .match({ 
            profile_id: selectedProfileForAccounts.id, 
            ad_account_id: accountId 
          });
        if (error) throw error;
        setLinkedAccountIds(linkedAccountIds.filter(id => id !== accountId));
        toast.success("Conta desvinculada");
      } else {
        const { error } = await supabase
          .from("profile_ad_accounts")
          .insert({ 
            profile_id: selectedProfileForAccounts.id, 
            ad_account_id: accountId 
          });
        if (error) throw error;
        setLinkedAccountIds([...linkedAccountIds, accountId]);
        toast.success("Conta vinculada");
      }
    } catch (error: any) {
      toast.error("Erro ao atualizar vínculo: " + error.message);
    }
  };

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id, email, is_admin, is_active, created_at, updated_at,
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
      // Use the admin-create-user Edge Function instead of client-side signUp
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: { email: newEmail, password: newPassword }
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

  const toggleUserStatus = async (id: string, currentStatus: boolean | null) => {
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

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir permanentemente este usuário e todos os seus dados? Esta ação não pode ser desfeita.")) return;
    
    try {
      console.log("Solicitando exclusão do usuário:", id);
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { userId: id }
      });

      if (error) {
        console.error("Erro na Edge Function:", error);
        throw new Error(error.message || "Erro desconhecido ao excluir usuário");
      }
      
      console.log("Resposta da exclusão:", data);
      setProfiles(prev => prev.filter(p => p.id !== id));
      toast.success("Usuário excluído com sucesso");
      
      // Opcional: recarregar a lista para garantir sincronia
      setTimeout(() => fetchProfiles(), 1000);
    } catch (error: any) {
      console.error("Erro ao excluir:", error);
      toast.error(error.message || "Erro ao excluir usuário");
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

  const openPermissions = (profile: ProfileRow) => {
    setSelectedProfile(profile);
    const userPerms: PermissionState = profile.client_permissions?.[0]
      ? {
          can_view_charts: profile.client_permissions[0].can_view_charts ?? true,
          can_view_metrics: profile.client_permissions[0].can_view_metrics ?? true,
          can_view_insights: profile.client_permissions[0].can_view_insights ?? true,
        }
      : {
          can_view_charts: true,
          can_view_metrics: true,
          can_view_insights: true,
        };
    setPermissions(userPerms);
  };

  const openAccountBinding = (profile: ProfileRow) => {
    setSelectedProfileForAccounts(profile);
    fetchLinkedAccounts(profile.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50">Gestão de Clientes</h2>
          <p className="text-sm text-slate-500">Crie acessos e gerencie o que cada cliente pode visualizar.</p>
        </div>
        
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 w-full sm:w-auto shrink-0 min-h-11">
              <UserPlus className="h-4 w-4" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90dvh] overflow-y-auto">
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
        <div className="overflow-x-auto custom-scrollbar">
          <Table className="min-w-[800px] lg:min-w-full">
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
                          size="sm" 
                          onClick={() => openAccountBinding(profile)}
                          className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          Contas
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
                        
                        {canDeleteUsers && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteUser(profile.id)}
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
                          onClick={() => handleDeleteUser(profile.id)}
                          className="text-slate-400 hover:text-rose-600 transition-colors"
                          title="Excluir Gestor"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          </Table>
        </div>
      </Card>

      {/* Permissions Dialog */}
      <Dialog open={!!selectedProfile} onOpenChange={() => setSelectedProfile(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
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

      {/* Ad Account Binding Dialog */}
      <Dialog open={!!selectedProfileForAccounts} onOpenChange={() => setSelectedProfileForAccounts(null)}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contas de Anúncio</DialogTitle>
            <CardDescription>
              Vincule as contas de anúncio que o cliente {selectedProfileForAccounts?.email} pode visualizar.
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
              ) : adAccounts.map((account) => (
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
                    onCheckedChange={() => toggleAccountLink(account.id)}
                  />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button onClick={() => setSelectedProfileForAccounts(null)} className="w-full">Concluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Ad Account Dialog */}
      <Dialog open={isAddingAccount} onOpenChange={setIsAddingAccount}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Conta de Anúncio</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAdAccount} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome da Conta</label>
              <Input 
                placeholder="Ex: Meta Ads - Loja X" 
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">ID da Conta (Externo)</label>
              <Input 
                placeholder="Ex: act_123456789" 
                value={newAccountExternalId}
                onChange={(e) => setNewAccountExternalId(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Meta Access Token</label>
              <Input 
                type="password"
                placeholder="Insira o Access Token" 
                value={newAccountAccessToken}
                onChange={(e) => setNewAccountAccessToken(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">App Secret</label>
              <Input 
                type="password"
                placeholder="Insira o App Secret" 
                value={newAccountAppSecret}
                onChange={(e) => setNewAccountAppSecret(e.target.value)}
                required
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full bg-blue-600">Cadastrar Conta</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
