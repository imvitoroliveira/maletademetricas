
import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MetricCard } from "@/components/MetricCard";
import { ChartSection } from "@/components/ChartSection";
import { ManualMetrics } from "@/components/ManualMetrics";
import { UserManager } from "@/components/UserManager";
import { UserProfile } from "@/components/UserProfile";
import { useAuth } from "@/hooks/useAuth";
import { 
  TrendingUp, 
  DollarSign, 
  MousePointer2, 
  Target, 
  Zap, 
  BarChart2,
  X,
  Loader2,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Auth } from "@/components/Auth";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const { user: session, profile, isAdmin, isActive, loading: authLoading, signOut, authLogs } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (session) {
      fetchMetrics();
    }
  }, [session, startDate, endDate]);

  const fetchMetrics = async () => {
    setLoadingMetrics(true);
    try {
      let query = supabase
        .from('custom_metrics')
        .select('*')
        .order('metric_date', { ascending: false });

      if (startDate) query = query.gte('metric_date', startDate);
      if (endDate) query = query.lte('metric_date', endDate);
      
      // RLS handles the filtering by user_id for clients
      const { data, error } = await query;
      if (error) throw error;
      setMetrics(data || []);
    } catch (error: any) {
      console.error("Error fetching metrics:", error);
    } finally {
      setLoadingMetrics(false);
    }
  };

  // Permissions check
  const permissions = profile?.client_permissions?.[0] || {
    can_view_charts: true,
    can_view_metrics: true,
    can_view_insights: true
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="h-10 w-10 animate-spin text-fuchsia-600" />
            <div className="absolute inset-0 h-10 w-10 animate-ping rounded-full bg-fuchsia-400/20"></div>
          </div>
          <p className="text-sm font-medium text-slate-500 animate-pulse">Sincronizando acesso...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    // Sessão não detectada ou invalidada
    return <Auth authLogs={authLogs} />;
  }

  if (session && !profile && !authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
        <Card className="w-full max-w-md p-8 text-center space-y-4 border-none shadow-2xl">
          <div className="mx-auto w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 shadow-inner">
            <AlertCircle className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Perfil não Encontrado</h2>
          <p className="text-slate-500 text-sm">
            Sua conta de autenticação foi criada, mas seu perfil de acesso no banco de dados ainda não existe ou o banco não foi configurado.
          </p>
          <div className="bg-slate-900 p-4 rounded-lg text-left overflow-hidden">
            <p className="text-[10px] font-mono text-slate-400 uppercase mb-2">Logs de Diagnóstico:</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {authLogs.map((log, i) => (
                <div key={i} className="text-[10px] font-mono text-slate-300 border-b border-slate-800 pb-1">
                  {log.event}
                </div>
              ))}
            </div>
          </div>
          <Button variant="outline" onClick={() => signOut()} className="w-full h-11 transition-all">
            Sair e Tentar Novamente
          </Button>
          <p className="text-[10px] text-slate-400">Dica: Execute o script SQL consolidado no seu Supabase.</p>
        </Card>
      </div>
    );
  }

  if (profile && !isActive) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
        <Card className="w-full max-w-md p-8 text-center space-y-4 border-none shadow-2xl">
          <div className="mx-auto w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 shadow-inner">
            <X className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Acesso Suspenso</h2>
          <p className="text-slate-500">Seu perfil foi desativado por um administrador. Entre em contato para reativar.</p>
          <Button variant="outline" onClick={() => signOut()} className="w-full h-11 border-slate-200 hover:bg-slate-50 transition-all">
            Voltar para Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        {isAdmin && (
          <div className="flex gap-2 border-b pb-4">
            <Button 
              variant={activeTab === "overview" ? "default" : "ghost"} 
              onClick={() => setActiveTab("overview")}
              className={activeTab === "overview" ? "bg-fuchsia-600" : ""}
            >
              Visão Geral
            </Button>
            <Button 
              variant={activeTab === "users" ? "default" : "ghost"} 
              onClick={() => setActiveTab("users")}
              className={activeTab === "users" ? "bg-fuchsia-600" : ""}
            >
              Gestão de Clientes
            </Button>
            <Button 
              variant={activeTab === "profile" ? "default" : "ghost"} 
              onClick={() => setActiveTab("profile")}
              className={activeTab === "profile" ? "bg-fuchsia-600" : ""}
            >
              Meu Perfil
            </Button>
          </div>
        )}

        {activeTab === "profile" ? (
          <UserProfile />
        ) : activeTab === "users" && isAdmin ? (
          <UserManager />
        ) : (
          <>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Dashboard de Performance</h1>
                <p className="text-slate-500 mt-1">Gestão de Tráfego Pago e Métricas de Conversão.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-lg border shadow-sm">
                    <span className="text-xs font-medium text-slate-500 uppercase ml-1">Período:</span>
                    <Input 
                      type="date" 
                      className="w-auto h-9 border-none bg-transparent focus-visible:ring-0" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                    <span className="text-slate-300">|</span>
                    <Input 
                      type="date" 
                      className="w-auto h-9 border-none bg-transparent focus-visible:ring-0" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
              </div>
            </div>

            {/* Metrics cards would only show values if there are relevant metrics */}
            {(isAdmin || permissions.can_view_charts) && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard 
                  title="Métricas Ativas" 
                  value={metrics.length} 
                  description="total no período"
                  icon={<BarChart2 className="h-4 w-4" />}
                  className="border-none shadow-sm"
                />
                {/* Outros cartões seriam preenchidos dinamicamente baseados nas métricas inseridas */}
              </div>
            )}

            {(isAdmin || permissions.can_view_charts) && (
              <ChartSection metrics={metrics} loading={loadingMetrics} />
            )}

            <div className="grid gap-6 lg:grid-cols-3">
              <div className={cn(isAdmin || permissions.can_view_insights ? "lg:col-span-2" : "lg:col-span-3")}>
                {(isAdmin || permissions.can_view_metrics) && (
                  <ManualMetrics startDate={startDate} endDate={endDate} />
                )}
              </div>
              
              {(isAdmin || permissions.can_view_insights) && (
                <div className="lg:col-span-1">
                  <Card className="h-full shadow-sm border-none bg-fuchsia-600 text-white overflow-hidden">
                    <div className="p-6 relative z-10">
                      <h3 className="text-lg font-semibold mb-2">Análise Estratégica</h3>
                      <p className="text-fuchsia-100 text-sm leading-relaxed mb-6">
                        O gestor adicionará aqui os insights baseados na performance real do período selecionado.
                      </p>
                    </div>
                    <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-fuchsia-500/20 rounded-full blur-3xl"></div>
                  </Card>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
