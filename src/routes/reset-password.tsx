import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import logo from "@/assets/logo.jpg";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
});

function ResetPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      toast.error("Informe seu e-mail.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setSent(true);
      toast.success("E-mail de redefinição enviado!");
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
            Recuperar Senha
          </CardTitle>
          <CardDescription className="text-sm text-slate-500">
            {sent 
              ? "Verifique sua caixa de entrada para continuar."
              : "Enviaremos um link para você redefinir sua senha."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {sent ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="text-center text-sm text-slate-600">
                Se o e-mail <strong>{email}</strong> estiver cadastrado, você receberá um link em instantes.
              </p>
              <Button asChild variant="outline" className="w-full mt-4">
                <Link to="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar para o Login
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 ml-1">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11"
                    required
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
                    Enviando...
                  </>
                ) : (
                  "Enviar Link de Redefinição"
                )}
              </Button>
              <Button asChild variant="ghost" className="w-full text-slate-500">
                <Link to="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar para o Login
                </Link>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
