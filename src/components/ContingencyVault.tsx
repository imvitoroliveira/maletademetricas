
import React, { useState } from "react";
import { 
  Shield, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Lock, 
  User, 
  Key,
  Search,
  Loader2,
  X,
  Check,
  Eye,
  EyeOff
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ContingencyVault() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const emptyCredentials = {
    login: "",
    password: "",
    primary_email: "",
    primary_email_password: "",
    secondary_email: "",
    secondary_email_password: "",
    facebook_email: "",
    facebook_password: "",
    x_user: "",
    x_password: "",
    instagram_user: "",
    instagram_password: "",
  };

  const [newProfile, setNewProfile] = useState({
    name: "",
    access_url: "",
    credentials: { ...emptyCredentials },
    notes: ""
  });

  const handleVaultAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (profile?.vault_password === passwordInput) {
      setIsAuthenticated(true);
      toast.success("Acesso ao cofre liberado!");
    } else if (!profile?.vault_password) {
      toast.error("Nenhuma senha definida. Defina uma senha no seu Perfil.");
    } else {
      toast.error("Senha incorreta!");
    }
  };

  const { data: vault = [], isLoading } = useQuery({
    queryKey: ["contingency_vault"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contingency_vault")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAuthenticated
  });

  const addMutation = useMutation({
    mutationFn: async (profileData: any) => {
      const { data, error } = await supabase
        .from("contingency_vault")
        .insert([profileData])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contingency_vault"] });
      setIsAdding(false);
      setNewProfile({ name: "", access_url: "", credentials: { ...emptyCredentials }, notes: "" });
      toast.success("Perfil de contingência adicionado.");
    },
    onError: (err: any) => toast.error("Erro ao adicionar: " + err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contingency_vault")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contingency_vault"] });
      toast.success("Perfil removido do cofre.");
    }
  });

  const filteredVault = vault.filter((item: any) => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center py-20 animate-in fade-in duration-500">
        <Card className="w-full max-w-md border-none shadow-2xl p-8 space-y-6 text-center">
          <div className="mx-auto w-16 h-16 bg-fuchsia-100 rounded-full flex items-center justify-center text-fuchsia-600 mb-2">
            <Lock className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Área Restrita</h2>
            <p className="text-sm text-slate-500 mt-2">
              Insira a senha mestre do cofre para visualizar os perfis de contingência.
            </p>
          </div>
          
          <form onSubmit={handleVaultAuth} className="space-y-4">
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                type={showPassword ? "text" : "password"} 
                placeholder="Senha mestre..." 
                className="pl-10 pr-10 h-12 text-center text-lg tracking-widest"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button type="submit" className="w-full h-12 bg-fuchsia-600 hover:bg-fuchsia-700 text-lg font-bold">
              Desbloquear Cofre
            </Button>
          </form>
          
          {!profile?.vault_password && (
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-start gap-3 text-left">
              <Shield className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-700">
                Parece que você ainda não definiu uma senha para o cofre. Vá na aba <strong>"Meu Perfil"</strong> para configurar sua senha mestre.
              </p>
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Shield className="h-6 w-6 text-fuchsia-600" />
            Cofre de Contingência
          </h2>
          <p className="text-slate-500">Armazene e gerencie perfis críticos para manter sua estrutura ativa.</p>
        </div>
        
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 h-11">
              <Plus className="h-4 w-4" />
              Novo Perfil
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Perfil ao Cofre</DialogTitle>
              <CardDescription>Insira as informações de acesso para contingência.</CardDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome do Perfil / Estrutura</label>
                <Input 
                  placeholder="Ex: Perfil Facebook Matriz 01" 
                  value={newProfile.name}
                  onChange={e => setNewProfile({...newProfile, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">URL de Acesso (Link)</label>
                <Input 
                  placeholder="https://..." 
                  value={newProfile.access_url}
                  onChange={e => setNewProfile({...newProfile, access_url: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Login/E-mail</label>
                  <Input 
                    placeholder="user@email.com" 
                    value={newProfile.credentials.login}
                    onChange={e => setNewProfile({
                      ...newProfile, 
                      credentials: { ...newProfile.credentials, login: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Senha</label>
                  <Input 
                    type="text"
                    placeholder="••••••••" 
                    value={newProfile.credentials.password}
                    onChange={e => setNewProfile({
                      ...newProfile, 
                      credentials: { ...newProfile.credentials, password: e.target.value }
                    })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notas Adicionais</label>
                <Textarea 
                  placeholder="Detalhes sobre proxy, cookies ou tipo de conta..." 
                  className="resize-none"
                  value={newProfile.notes}
                  onChange={e => setNewProfile({...newProfile, notes: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button 
                onClick={() => addMutation.mutate(newProfile)} 
                className="w-full bg-fuchsia-600"
                disabled={!newProfile.name || addMutation.isPending}
              >
                {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Salvar no Cofre"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="border-b bg-white dark:bg-slate-900 px-6 py-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar no cofre..." 
              className="pl-10 h-10 bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-fuchsia-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <div className="overflow-x-auto custom-scrollbar">
          <Table className="min-w-[800px] lg:min-w-full">
            <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
              <TableRow>
                <TableHead className="w-[200px] py-4">Perfil</TableHead>
                <TableHead>Acesso</TableHead>
                <TableHead>Credenciais</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-fuchsia-600 mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredVault.map((item: any) => (
                <TableRow key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{item.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono uppercase mt-1">Status: {item.status}</span>
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
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <User className="h-3 w-3 text-slate-400" />
                        <span className="font-mono">{item.credentials?.login || "---"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Key className="h-3 w-3 text-slate-400" />
                        <span className="font-mono">{(item.credentials as any)?.password || "---"}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs text-slate-500 max-w-[250px] truncate" title={item.notes}>
                      {item.notes || "-"}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                        if (confirm("Deseja realmente remover este perfil?")) {
                          deleteMutation.mutate(item.id);
                        }
                      }}
                      className="text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredVault.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-400 italic">
                    Nenhum item encontrado no cofre.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
