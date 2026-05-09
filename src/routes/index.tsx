
import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MetricCard } from "@/components/MetricCard";
import { ChartSection } from "@/components/ChartSection";
import { ManualMetrics } from "@/components/ManualMetrics";
import { UserManager } from "@/components/UserManager";
import { useAuth } from "@/hooks/useAuth";
import { 
  TrendingUp, 
  DollarSign, 
  MousePointer2, 
  Target, 
  Zap, 
  BarChart2,
  X,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Auth } from "@/components/Auth";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const { user: session, profile, isAdmin, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Permissions check
  const permissions = profile?.client_permissions?.[0] || {
    can_view_charts: true,
    can_view_metrics: true,
    can_view_insights: true
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          <p className="text-sm font-medium text-slate-500 animate-pulse">Carregando dashboard...</p>
          <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>Resetar Sessão</Button>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  if (profile && !profile.is_active) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
        <Card className="w-full max-w-md p-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center text-rose-600">
            <X className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold">Acesso Suspenso</h2>
          <p className="text-slate-500">Seu acesso ao dashboard foi desativado pelo administrador. Entre em contato para mais informações.</p>
          <Button variant="outline" onClick={() => supabase.auth.signOut()} className="w-full">Sair</Button>
        </Card>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        {/* Navigation Tabs for Admin */}
        {isAdmin && (
          <div className="flex gap-2 border-b pb-4">
            <Button 
              variant={activeTab === "overview" ? "default" : "ghost"} 
              onClick={() => setActiveTab("overview")}
              className={activeTab === "overview" ? "bg-indigo-600" : ""}
            >
              Visão Geral
            </Button>
            <Button 
              variant={activeTab === "users" ? "default" : "ghost"} 
              onClick={() => setActiveTab("users")}
              className={activeTab === "users" ? "bg-indigo-600" : ""}
            >
              Gestão de Clientes
            </Button>
          </div>
        )}

        {activeTab === "users" && isAdmin ? (
          <UserManager />
        ) : (
          <>
            {/* Page Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Dashboard de Tráfego</h1>
                <p className="text-slate-500 mt-1">Bem-vindo de volta! Aqui está o resumo da performance das campanhas.</p>
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
                <Button className="gap-2 shadow-md bg-indigo-600 hover:bg-indigo-700 h-10 px-5">
                  <Zap className="h-4 w-4" />
                  Sincronizar
                </Button>
              </div>
            </div>

            {/* Top Metrics Grid */}
            {(isAdmin || permissions.can_view_charts) && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard 
                  title="Investimento Total" 
                  value="R$ 12.450,00" 
                  description="em relação ao mês anterior"
                  trend={{ value: 12.5, isPositive: true }}
                  icon={<DollarSign className="h-4 w-4" />}
                  className="border-none shadow-sm"
                />
                <MetricCard 
                  title="ROAS Médio" 
                  value="4.2x" 
                  description="retorno sobre investimento"
                  trend={{ value: 0.8, isPositive: true }}
                  icon={<TrendingUp className="h-4 w-4" />}
                  className="border-none shadow-sm"
                />
                <MetricCard 
                  title="Conversões" 
                  value="342" 
                  description="leads e vendas gerados"
                  trend={{ value: 4.2, isPositive: false }}
                  icon={<Target className="h-4 w-4" />}
                  className="border-none shadow-sm"
                />
                <MetricCard 
                  title="CTR Médio" 
                  value="2.84%" 
                  description="cliques por impressão"
                  trend={{ value: 15.3, isPositive: true }}
                  icon={<MousePointer2 className="h-4 w-4" />}
                  className="border-none shadow-sm"
                />
              </div>
            )}

            {/* Charts Section */}
            {(isAdmin || permissions.can_view_charts) && <ChartSection />}

            {/* Secondary Metrics & Manual Entry */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className={cn(isAdmin || permissions.can_view_insights ? "lg:col-span-2" : "lg:col-span-3")}>
                {(isAdmin || permissions.can_view_metrics) && (
                  <ManualMetrics startDate={startDate} endDate={endDate} />
                )}
              </div>
              
              {(isAdmin || permissions.can_view_insights) && (
                <div className="lg:col-span-1">
                  <Card className="h-full shadow-sm border-none bg-indigo-600 text-white overflow-hidden">
                    <div className="p-6 relative z-10">
                      <h3 className="text-lg font-semibold mb-2">Performance Insight</h3>
                      <p className="text-indigo-100 text-sm leading-relaxed mb-6">
                        Suas campanhas de Facebook Ads estão performando 15% acima da média este mês. Recomendamos aumentar o orçamento da Campanha de Remarketing.
                      </p>
                      <div className="space-y-4">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-indigo-200">Meta Mensal</span>
                            <span className="font-medium">85% atingida</span>
                          </div>
                          <div className="w-full bg-indigo-500/50 rounded-full h-2">
                            <div className="bg-white h-2 rounded-full w-[85%] shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
                          </div>
                      </div>
                      <Button variant="secondary" className="w-full mt-8 bg-white text-indigo-600 hover:bg-indigo-50 border-none">
                          Ver Relatório Completo
                      </Button>
                    </div>
                    {/* Abstract decoration */}
                    <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl"></div>
                    <div className="absolute top-0 right-0 p-4 opacity-20">
                        <BarChart2 className="h-24 w-24" />
                    </div>
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
