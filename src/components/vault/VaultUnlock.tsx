import { useState } from "react";
import { Key, Loader2, Lock, Shield, Eye, EyeOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { vaultVerify } from "@/lib/vault.functions";
import { toast } from "sonner";

type Props = {
  vaultConfigured: boolean;
  onAuthenticated: () => void;
};

export function VaultUnlock({ vaultConfigured, onAuthenticated }: Props) {
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  const handleVaultAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlocking(true);
    try {
      const data = await vaultVerify({ data: { password: passwordInput } });
      if (!data?.configured) {
        toast.error("Nenhuma senha definida. Defina uma senha no seu Perfil.");
      } else if (data?.valid) {
        setPasswordInput("");
        toast.success("Acesso ao cofre liberado!");
        onAuthenticated();
      } else {
        toast.error("Senha incorreta!");
      }
    } catch (err: unknown) {
      toast.error("Erro ao validar senha: " + (err as Error).message);
    } finally {
      setUnlocking(false);
    }
  };

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
          <Button
            type="submit"
            disabled={unlocking}
            className="w-full h-12 bg-fuchsia-600 hover:bg-fuchsia-700 text-lg font-bold"
          >
            {unlocking ? <Loader2 className="h-5 w-5 animate-spin" /> : "Desbloquear Cofre"}
          </Button>
        </form>

        {!vaultConfigured && (
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
