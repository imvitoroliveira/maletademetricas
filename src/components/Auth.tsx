
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, Lock, LogIn, ShieldCheck } from "lucide-react";

export function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    setIsSlowConnection(false);

    // Timeout to detect slow connection
    const slowConnTimeout = setTimeout(() => {
      setIsSlowConnection(true);
    }, 5000);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      clearTimeout(slowConnTimeout);
      
      if (error) {
        console.error("Login error:", error);
        if (error.message.includes("Invalid login credentials")) {
          toast.error("E-mail ou senha incorretos. Verifique suas credenciais.");
        } else if (error.message.includes("Network request failed")) {
          toast.error("Falha na conexão. Verifique sua internet.");
        } else if (error.status === 429) {
          toast.error("Muitas tentativas. Tente novamente em alguns minutos.");
        } else {
          toast.error(error.message || "Erro inesperado ao realizar login.");
        }
        return;
      }

      if (data.user) {
        toast.success("Bem-vindo ao Dashboard!");
      }
    } catch (error: any) {
      clearTimeout(slowConnTimeout);
      toast.error("Erro no sistema. Tente novamente mais tarde.");
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
        <CardContent>
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
            <Button className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-100 transition-all" disabled={loading}>
              {loading ? (isSlowConnection ? "Conexão lenta, aguarde..." : "Autenticando...") : "Entrar no Dashboard"}
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
