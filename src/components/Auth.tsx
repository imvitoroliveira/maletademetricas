import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, Lock, CheckCircle2, AlertCircle, Activity, ScrollText, KeyRound } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import logo from "@/assets/logo.jpg";
import { cn } from "@/lib/utils";

type ConnStatus = "checking" | "online" | "error";

interface AuthProps {
  authLogs?: { event: string; timestamp: string; type: 'info' | 'error' | 'warn' }[];
}

export function Auth({ authLogs = [] }: AuthProps) {
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 p-4 dark:bg-slate-950">
      {/* Ambient premium aurora background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/20 blur-[120px] dark:bg-fuchsia-600/20" />
        <div className="absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-violet-500/20 blur-[120px] dark:bg-violet-700/20" />
        <div className="absolute left-1/2 top-1/2 h-[20rem] w-[20rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-400/10 blur-[100px]" />
      </div>

      <Card className="relative w-full max-w-[92vw] sm:max-w-md glass-panel shadow-elevated animate-rise rounded-2xl">
        <CardHeader className="space-y-2 text-center pb-2 sm:pb-6">
          <div className="flex justify-center mb-2 sm:mb-6">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl overflow-hidden shadow-glow ring-4 ring-white/60 dark:ring-white/10">
              <img src={logo} alt="Maleta de Métricas" className="h-full w-full object-cover" />
            </div>
          </div>
          <CardTitle className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Maleta de Métricas
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
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
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 font-mono text-[10px] space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                <div className="flex items-center gap-2 text-fuchsia-400 border-b border-slate-800 pb-1 mb-2">
                  <ScrollText className="h-3 w-3" />
                  <span className="font-bold uppercase tracking-widest">Logs de Acesso (Tempo Real)</span>
                </div>
                
                {authLogs.length > 0 ? (
                  authLogs.map((log, i) => (
                    <div key={i} className="flex flex-col border-b border-slate-800/50 pb-1 last:border-0">
                      <div className="flex justify-between items-start gap-2">
                        <span className={cn(
                          "break-words flex-1",
                          log.type === 'error' ? "text-rose-400" : log.type === 'warn' ? "text-amber-400" : "text-slate-300"
                        )}>
                          {log.event}
                        </span>
                        <span className="text-slate-600 shrink-0">{log.timestamp}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 italic">Nenhum evento registrado ainda.</div>
                )}

                <div className="mt-3 pt-2 border-t border-slate-800 text-[9px] text-slate-500">
                  <div className="flex justify-between"><span>Status:</span><span className="text-slate-300 uppercase">{conn}</span></div>
                  {lastError && (
                    <div className="mt-1 text-rose-500 font-bold break-words bg-rose-500/5 p-1 rounded">
                      ERRO: {lastError}
                    </div>
                  )}
                </div>
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
            {lastError && (
              <div className="bg-rose-50 dark:bg-rose-950/30 p-3 rounded-lg flex gap-2 items-start border border-rose-100 dark:border-rose-900/30 animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                  {lastError.includes("Invalid login credentials") 
                    ? "E-mail ou senha incorretos. Verifique seus dados." 
                    : lastError}
                </p>
              </div>
            )}
            <div className="flex justify-end">
              <Link 
                to="/reset-password" 
                className="text-xs text-fuchsia-600 hover:text-fuchsia-700 font-medium flex items-center gap-1 transition-colors"
              >
                <KeyRound className="h-3 w-3" />
                Esqueci minha senha
              </Link>
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-gradient-accent text-white font-semibold shadow-glow transition-all duration-300 hover:brightness-110 hover:shadow-[0_16px_50px_-12px_oklch(0.66_0.27_332_/_0.6)] active:scale-[0.98]"
              disabled={loading || conn === "error"}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 animate-spin" />
                  <span>Verificando...</span>
                </div>
              ) : "Entrar no Dashboard"}
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
