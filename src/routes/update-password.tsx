import { useState, useEffect } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import logo from "@/assets/logo.jpg";

export const Route = createFileRoute("/update-password")({
  component: UpdatePassword,
});

function UpdatePassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log("Resultado do getSession no update-password:", !!session, error?.message);
      
      if (session) {
        setHasSession(true);
        setSessionLoading(false);
      } else {
        // Se não houver sessão, vamos aguardar um pouco mais, pois o Supabase 
        // pode estar processando os tokens da URL (especialmente se for hash)
        setTimeout(async () => {
          const { data: { session: secondSession } } = await supabase.auth.getSession();
          if (secondSession) {
            setHasSession(true);
          }
          setSessionLoading(false);
        }, 1500);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      console.log("Auth event no update-password:", event);
      if (session) {
        setHasSession(true);
        setSessionLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!hasSession) {
      toast.error("Sessão de autenticação expirada ou inválida. Solicite um novo link de recuperação.");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setSuccess(true);
      toast.success("Senha atualizada com sucesso!");
      
      setTimeout(() => {
        navigate({ to: "/" });
      }, 3000);
    } catch (err: any) {
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-fuchsia-50 via-white to-purple-50 p-4 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950">
      <Card className="w-full max-w-md border-none shadow-2xl animate-in fade-in zoom-in duration-500">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 rounded-2xl overflow-hidden shadow-xl ring-4 ring-white">
              <img src={logo} alt="Maleta de Métricas" className="h-full w-full object-cover" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            Nova Senha
          </CardTitle>
          <CardDescription className="text-sm text-slate-500">
            Crie uma senha segura para sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {sessionLoading ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-fuchsia-600" />
              <p className="text-sm text-slate-500">Validando sessão...</p>
            </div>
          ) : !hasSession ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <p className="text-sm text-slate-600">
                Sessão de recuperação não encontrada ou expirada.
              </p>
              <Button asChild variant="outline" className="w-full mt-2">
                <Link to="/reset-password">
                  Solicitar Novo Link
                </Link>
              </Button>
            </div>
          ) : success ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="text-sm text-slate-600">
                Sua senha foi alterada com sucesso. Você será redirecionado para o login em instantes.
              </p>
            </div>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 ml-1">Nova Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full h-11 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-semibold"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  "Definir Nova Senha"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
