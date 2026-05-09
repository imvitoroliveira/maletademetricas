import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, Lock, CheckCircle2, AlertCircle, Activity } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import logo from "@/assets/logo.jpg";

type ConnStatus = "checking" | "online" | "error";

export function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [conn, setConn] = useState<ConnStatus>("checking");
  const [lastError, setLastError] = useState<string | null>(null);
  const [showDiag, setShowDiag] = useState(false);

  useEffect(() => {
    // Teste de conexão sem tocar em RLS: chama o endpoint público de auth.
    let cancelled = false;
    (async () => {
      try {
        const { error } = await supabase.auth.getSession();
        if (cancelled) return;
        if (error) throw error;
        setConn("online");
      } catch (err: any) {
        if (cancelled) return;
        setConn("error");
        setLastError(err?.message ?? "Falha ao contatar o servidor de autenticação.");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;
    if (!cleanEmail || !cleanPassword) {
      toast.error("Preencha e-mail e senha.");
      return;
    }

    setLastError(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (error) {
        setLastError(error.message);
        if (error.message.includes("Invalid login credentials")) {
          toast.error("E-mail ou senha incorretos.");
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.session) {
        toast.success("Acesso liberado!");
        // O onAuthStateChange já atualiza o estado; sem reload forçado.
      }
    } catch (err: any) {
      setLastError(err?.message ?? "Erro inesperado.");
      toast.error("Erro de comunicação. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-fuchsia-50 via-white to-purple-50 p-4 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950">
      <Card className="w-full max-w-md border-none shadow-2xl shadow-fuchsia-200/40">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 rounded-2xl overflow-hidden shadow-xl shadow-fuchsia-300/40 ring-4 ring-white">
              <img src={logo} alt="Maleta de Métricas" className="h-full w-full object-cover" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            Maleta de Métricas
          </CardTitle>
          <CardDescription className="text-slate-500">
            Acesse seu painel exclusivo de performance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Collapsible open={showDiag} onOpenChange={setShowDiag}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {conn === "checking" && <Activity className="h-4 w-4 animate-spin text-slate-400" />}
                {conn === "online" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                {conn === "error" && <AlertCircle className="h-4 w-4 text-rose-500" />}
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  {conn === "checking" ? "Verificando..." : conn === "online" ? "Servidor Online" : "Servidor Indisponível"}
                </span>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] text-fuchsia-600">
                  {showDiag ? "Fechar" : "Diagnóstico"}
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 font-mono text-[10px] space-y-1">
                <div className="flex justify-between"><span className="text-slate-500">Endpoint:</span><span className="text-slate-300">Auth Cloud</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Status:</span><span className="text-slate-300">{conn}</span></div>
                {lastError ? (
                  <div className="mt-2 p-2 bg-rose-500/10 border border-rose-500/20 rounded text-rose-400 break-words">
                    {lastError}
                  </div>
                ) : (
                  <div className="text-emerald-400">Pronto para autenticar.</div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-semibold"
              disabled={loading || conn === "error"}
            >
              {loading ? "Verificando..." : "Entrar no Dashboard"}
            </Button>
          </form>

          <div className="pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 leading-relaxed px-4">
              O cadastro de novos usuários é gerenciado pelo administrador.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
