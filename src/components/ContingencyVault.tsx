import { useState } from "react";
import { FileText, Loader2, Plus, Search, Shield, Users, Wrench } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { vaultStatus } from "@/lib/vault.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  emptyVaultProfile,
  toVaultPayload,
  useVaultProfiles,
  type VaultProfileFormValues,
} from "@/hooks/useVaultProfiles";
import { VaultUnlock } from "@/components/vault/VaultUnlock";
import { VaultProfileForm } from "@/components/vault/VaultProfileForm";
import { VaultProfileRow } from "@/components/vault/VaultProfileRow";
import { VaultNotesTab } from "@/components/vault/VaultNotesTab";

export function ContingencyVault() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [newProfile, setNewProfile] = useState<VaultProfileFormValues>(emptyVaultProfile);

  const { data: vaultStatusData } = useQuery({
    queryKey: ["vault_status"],
    queryFn: () => vaultStatus(),
  });
  const vaultConfigured = vaultStatusData?.configured ?? false;

  const { data: vault = [], isLoading, add, update, remove } = useVaultProfiles(isAuthenticated);

  const resetForm = () => {
    setNewProfile(emptyVaultProfile);
    setEditingId(null);
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setNewProfile({
      name: item.name ?? "",
      access_url: item.access_url ?? "",
      credentials: { ...emptyVaultProfile.credentials, ...(item.credentials ?? {}) },
      notes: item.notes ?? "",
      status: item.status ?? "active",
      software: item.software ?? "",
      birth_date: item.birth_date ?? "",
      profile_created_date: item.profile_created_date ?? "",
    });
    setIsAdding(true);
  };

  const handleSubmit = () => {
    const payload = toVaultPayload(newProfile);
    if (editingId) {
      update.mutate(
        { id: editingId, ...payload },
        {
          onSuccess: () => {
            setIsAdding(false);
            resetForm();
          },
        },
      );
    } else {
      add.mutate(payload, {
        onSuccess: () => {
          setIsAdding(false);
          resetForm();
        },
      });
    }
  };

  const filteredVault = (vault as any[]).filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  if (!isAuthenticated) {
    return (
      <VaultUnlock
        vaultConfigured={vaultConfigured}
        onAuthenticated={() => setIsAuthenticated(true)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
          <Shield className="h-6 w-6 text-fuchsia-600" />
          Cofre de Contingência
        </h2>
        <p className="text-slate-500">
          Armazene perfis críticos e anotações confidenciais para manter sua operação ativa.
        </p>
      </div>

      <Tabs defaultValue="profiles" className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 h-11">
          <TabsTrigger value="profiles" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-fuchsia-700">
            <Users className="h-4 w-4" />
            Perfis
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-fuchsia-700">
            <FileText className="h-4 w-4" />
            Anotações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profiles" className="space-y-6 mt-0">
          <div className="flex justify-end">
            <Dialog
              open={isAdding}
              onOpenChange={(open) => {
                setIsAdding(open);
                if (!open) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button onClick={resetForm} className="gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 h-11">
                  <Plus className="h-4 w-4" />
                  Novo Perfil
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Editar Perfil do Cofre" : "Adicionar Perfil ao Cofre"}</DialogTitle>
                  <CardDescription>Insira as informações de acesso para contingência.</CardDescription>
                </DialogHeader>
                <VaultProfileForm
                  value={newProfile}
                  onChange={(patch) => setNewProfile((prev) => ({ ...prev, ...patch }))}
                  onSubmit={handleSubmit}
                  isEditing={!!editingId}
                  isSubmitting={add.isPending || update.isPending}
                />
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
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                  ) : (
                    filteredVault.map((item) => (
                      <VaultProfileRow
                        key={item.id}
                        item={item}
                        onEdit={openEdit}
                        onDelete={(id) => remove.mutate(id)}
                      />
                    ))
                  )}
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
        </TabsContent>

        <TabsContent value="notes" className="mt-0">
          <VaultNotesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
