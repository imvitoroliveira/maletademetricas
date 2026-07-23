import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useUsers, type ProfileRow } from "@/hooks/useUsers";
import { useAdAccountLinks } from "@/hooks/useAdAccountLinks";
import { UserRow } from "@/components/users/UserRow";
import { UserCreateDialog } from "@/components/users/UserCreateDialog";
import { PermissionsDialog } from "@/components/users/PermissionsDialog";
import { AdAccountBindingDialog } from "@/components/users/AdAccountBindingDialog";

export function UserManager() {
  const {
    profiles,
    loading,
    currentUserEmail,
    currentUserId,
    createUser,
    deleteUser,
    toggleUserStatus,
    savePermissions,
  } = useUsers();

  const {
    adAccounts,
    linkedAccountIds,
    fetchLinkedAccounts,
    toggleLink,
    createAdAccount,
  } = useAdAccountLinks();

  const [selectedProfile, setSelectedProfile] = useState<ProfileRow | null>(null);
  const [selectedProfileForAccounts, setSelectedProfileForAccounts] = useState<ProfileRow | null>(
    null,
  );

  const masterEmail = import.meta.env.VITE_MASTER_ADMIN_EMAIL as string | undefined;
  const canDeleteUsers = masterEmail
    ? currentUserEmail === masterEmail
    : !!currentUserEmail;

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Tem certeza que deseja excluir permanentemente este usuário e todos os seus dados? Esta ação não pode ser desfeita.",
      )
    )
      return;
    try {
      await deleteUser(id);
    } catch (error: any) {
      console.error("Erro ao excluir:", error);
      toast.error(error.message || "Erro ao excluir usuário");
    }
  };

  const openAccountBinding = (profile: ProfileRow) => {
    setSelectedProfileForAccounts(profile);
    fetchLinkedAccounts(profile.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50">
            Gestão de Clientes
          </h2>
          <p className="text-sm text-slate-500">
            Crie acessos e gerencie o que cada cliente pode visualizar.
          </p>
        </div>

        <UserCreateDialog onCreate={createUser} />
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
              ) : (
                profiles.map((profile) => (
                  <UserRow
                    key={profile.id}
                    profile={profile}
                    currentUserId={currentUserId}
                    canDeleteUsers={canDeleteUsers}
                    onOpenPermissions={setSelectedProfile}
                    onOpenAccounts={openAccountBinding}
                    onToggleStatus={toggleUserStatus}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <PermissionsDialog
        profile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
        onSave={savePermissions}
      />

      <AdAccountBindingDialog
        profile={selectedProfileForAccounts}
        adAccounts={adAccounts}
        linkedAccountIds={linkedAccountIds}
        onClose={() => setSelectedProfileForAccounts(null)}
        onToggleLink={(accountId) => {
          if (selectedProfileForAccounts) {
            toggleLink(selectedProfileForAccounts.id, accountId);
          }
        }}
        onCreateAdAccount={createAdAccount}
      />
    </div>
  );
}
