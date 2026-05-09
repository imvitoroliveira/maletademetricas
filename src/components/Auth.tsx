
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, Lock, ShieldCheck, WifiOff, Activity, CheckCircle2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function Auth() {
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [lastError, setLastError] = useState<string | null>(null);
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      setConnectionStatus('checking');
      try {
        const { error } = await supabase.from('profiles').select('id').limit(1);
        if (error && (error.message.includes("fetch") || (error as any).status === 500)) {
          throw error;
        }
        setConnectionStatus('connected');
        setLastError(null);
      } catch (err: any) {
        console.error("Supabase connection check failed:", err);
        setConnectionStatus('error');
        setLastError(err.message || "Falha na comunicação com Supabase");
      }
    };
    checkConnection();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    
    if (loading) return;
    
    setLastError(null);
    setLoading(true);
    setIsSlowConnection(false);

    const slowConnTimeout = setTimeout(() => {
      setIsSlowConnection(true);
    }, 5000);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: cleanEmail, 
        password: cleanPassword 
      });
      clearTimeout(slowConnTimeout);
      
      if (error) {
        setLastError(error.message);
        if (error.message.includes("Invalid login credentials")) {
          toast.error("E-mail ou senha incorretos.");
        } else if (error.message.includes("Network request failed")) {
          toast.error("Erro de rede. Verifique sua internet.");
        } else {
          toast.error(error.message || "Erro inesperado.");
        }
        return;
      }

      if (data.user) {
        toast.success("Autenticado! Carregando dashboard...");
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (err: any) {
      clearTimeout(slowConnTimeout);
      toast.error("Erro crítico no sistema.");
    } finally {
      setLoading(false);
      setIsSlowConnection(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <Card className="w-full max-w-md border-none shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-6">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-xl shadow-indigo-200">
              <ShieldCheck className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            Acesso Restrito
          </CardTitle>
          <CardDescription className="text-slate-500">
            Entre com as credenciais fornecidas pelo gestor para acessar o dashboard de métricas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Collapsible open={showDiagnostic} onOpenChange={setShowDiagnostic} className="w-full">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {connectionStatus === 'checking' && <Activity className="h-4 w-4 animate-spin text-slate-400" />}
                {connectionStatus === 'connected' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                {connectionStatus === 'error' && <AlertCircle className="h-4 w-4 text-rose-500" />}
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  Status: {connectionStatus === 'checking' ? 'Sincronizando...' : connectionStatus === 'connected' ? 'Servidor Online' : 'Offline'}
                </span>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] text-indigo-600 hover:text-indigo-700">
                  {showDiagnostic ? 'Fechar Diagnóstico' : 'Diagnóstico'}
                </Button>
              </CollapsibleTrigger>
            </div>
            
            <CollapsibleContent className="space-y-3">
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 animate-in slide-in-from-top duration-200">
                <p className="text-[10px] font-mono text-indigo-400 mb-2 border-b border-slate-800 pb-1">CONSOLE DE AUTENTICAÇÃO</p>
                <div className="space-y-1 font-mono text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Host:</span>
                    <span className="text-slate-300">Supabase Cloud</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">URL Conexão:</span>
                    <span className="text-slate-300">Validada</span>
                  </div>
                  {lastError && (
                    <div className="mt-2 p-2 bg-rose-500/10 border border-rose-500/20 rounded text-rose-400 break-words">
                      ERRO: {lastError}
                    </div>
                  )}
                  {!lastError && connectionStatus === 'connected' && (
                    <div className="mt-2 text-emerald-400">Pronto para autenticação.</div>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {connectionStatus === 'error' && (
            <Alert variant="destructive" className="bg-rose-50 border-rose-100 text-rose-900">
              <WifiOff className="h-4 w-4" />
              <AlertTitle>Erro Crítico</AlertTitle>
              <AlertDescription className="text-xs">
                {lastError || "Falha na conexão com o banco de dados."}
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-rose-700 font-bold ml-1" 
                  onClick={() => window.location.reload()}
                >
                  Recarregar App
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 bg-slate-50/50 border-slate-200 focus:border-indigo-500 transition-all"
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
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11 bg-slate-50/50 border-slate-200 focus:border-indigo-500 transition-all"
                  required
                />
              </div>
            </div>
            <Button 
              type="submit"
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-100 transition-all" 
              disabled={loading || magicLoading}
            >
              {loading ? (isSlowConnection ? "Conexão lenta, aguarde..." : "Verificando...") : "Entrar no Dashboard"}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400">Ou use acesso direto</span>
              </div>
            </div>

            <Button 
              type="button"
              variant="outline"
              className="w-full h-11 border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-medium transition-all"
              onClick={async () => {
                if (magicLoading) return;
                setMagicLoading(true);
                try {
                  const { error } = await supabase.auth.signInWithOtp({ 
                    email: 'ovitoroliveira60@gmail.com',
                    options: { shouldCreateUser: false }
                  });
                  if (error) throw error;
                  toast.success("Link de acesso enviado para seu e-mail!");
                } catch (err: any) {
                  toast.error("Erro ao enviar link: " + err.message);
                } finally {
                  setMagicLoading(false);
                }
              }}
              disabled={magicLoading || loading}
            >
              {magicLoading ? "Enviando..." : "Receber Link por E-mail"}
            </Button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 leading-relaxed px-4">
              O cadastro de novos usuários é gerenciado exclusivamente pelo administrador do sistema.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
