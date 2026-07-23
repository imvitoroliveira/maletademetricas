import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { VaultCredentials, VaultProfileFormValues } from "@/hooks/useVaultProfiles";

type CredKey = keyof VaultCredentials;

type CredPairProps = {
  label: string;
  userLabel: string;
  passLabel?: string;
  userPlaceholder?: string;
  userKey: CredKey;
  passKey: CredKey;
  credentials: VaultCredentials;
  onChange: (patch: Partial<VaultCredentials>) => void;
};

function CredPair({
  label,
  userLabel,
  passLabel = "Senha",
  userPlaceholder,
  userKey,
  passKey,
  credentials,
  onChange,
}: CredPairProps) {
  return (
    <div className="space-y-3 rounded-lg border border-slate-100 dark:border-slate-800 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{userLabel}</label>
          <Input
            placeholder={userPlaceholder}
            value={credentials[userKey]}
            onChange={(e) => onChange({ [userKey]: e.target.value } as Partial<VaultCredentials>)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">{passLabel}</label>
          <Input
            type="password"
            placeholder="••••••••"
            value={credentials[passKey]}
            onChange={(e) => onChange({ [passKey]: e.target.value } as Partial<VaultCredentials>)}
          />
        </div>
      </div>
    </div>
  );
}

type Props = {
  value: VaultProfileFormValues;
  onChange: (patch: Partial<VaultProfileFormValues>) => void;
  onSubmit: () => void;
  isEditing: boolean;
  isSubmitting: boolean;
};

export function VaultProfileForm({ value, onChange, onSubmit, isEditing, isSubmitting }: Props) {
  const setCred = (patch: Partial<VaultCredentials>) =>
    onChange({ credentials: { ...value.credentials, ...patch } });

  return (
    <>
      <div className="space-y-5 pt-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Nome do Perfil / Estrutura</label>
          <Input
            placeholder="Ex: Perfil Facebook Matriz 01"
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">URL de Acesso (Link)</label>
          <Input
            placeholder="https://..."
            value={value.access_url}
            onChange={(e) => onChange({ access_url: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Programa</label>
            <Select value={value.software} onValueChange={(v) => onChange({ software: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o programa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dolphin">Dolphin</SelectItem>
                <SelectItem value="incogniton">Incogniton</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={value.status} onValueChange={(v) => onChange({ status: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="analysis">Em análise</SelectItem>
                <SelectItem value="banned">Banido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Data de nascimento</label>
            <Input
              type="date"
              value={value.birth_date}
              onChange={(e) => onChange({ birth_date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Data de criação do perfil</label>
            <Input
              type="date"
              value={value.profile_created_date}
              onChange={(e) => onChange({ profile_created_date: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Login principal</label>
            <Input
              placeholder="user@email.com"
              value={value.credentials.login}
              onChange={(e) => setCred({ login: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Senha do login</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={value.credentials.password}
              onChange={(e) => setCred({ password: e.target.value })}
            />
          </div>
        </div>

        <CredPair
          label="E-mail primário"
          userLabel="E-mail primário"
          passLabel="Senha do e-mail primário"
          userPlaceholder="primario@email.com"
          userKey="primary_email"
          passKey="primary_email_password"
          credentials={value.credentials}
          onChange={setCred}
        />
        <CredPair
          label="E-mail secundário"
          userLabel="E-mail secundário"
          passLabel="Senha do e-mail secundário"
          userPlaceholder="secundario@email.com"
          userKey="secondary_email"
          passKey="secondary_email_password"
          credentials={value.credentials}
          onChange={setCred}
        />
        <CredPair
          label="Acesso Facebook"
          userLabel="E-mail / usuário"
          userPlaceholder="user@email.com"
          userKey="facebook_email"
          passKey="facebook_password"
          credentials={value.credentials}
          onChange={setCred}
        />
        <CredPair
          label="Acesso X (Twitter)"
          userLabel="E-mail / usuário"
          userPlaceholder="@usuario ou e-mail"
          userKey="x_user"
          passKey="x_password"
          credentials={value.credentials}
          onChange={setCred}
        />
        <CredPair
          label="Acesso Instagram"
          userLabel="Usuário"
          userPlaceholder="@usuario"
          userKey="instagram_user"
          passKey="instagram_password"
          credentials={value.credentials}
          onChange={setCred}
        />

        <div className="space-y-2">
          <label className="text-sm font-medium">Notas Adicionais</label>
          <Textarea
            placeholder="Detalhes sobre proxy, cookies ou tipo de conta..."
            className="resize-none"
            value={value.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
          />
        </div>
      </div>
      <DialogFooter className="pt-4">
        <Button
          onClick={onSubmit}
          className="w-full bg-fuchsia-600"
          disabled={!value.name || isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : isEditing ? (
            "Salvar Alterações"
          ) : (
            "Salvar no Cofre"
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
