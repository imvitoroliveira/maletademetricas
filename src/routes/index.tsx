
import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MetricCard } from "@/components/MetricCard";
import { ChartSection } from "@/components/ChartSection";
import { ManualMetrics } from "@/components/ManualMetrics";
import { 
  TrendingUp, 
  DollarSign, 
  MousePointer2, 
  Target, 
  Zap, 
  BarChart2,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Auth } from "@/components/Auth";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";


export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const [session, setSession] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Immediate check if we're on the server
    if (typeof window === 'undefined') {
      return;
    }

    let mounted = true;

    const checkSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(currentSession?.user ?? null);
          setLoading(false);
        }
      } catch (err) {
        console.error("Auth init error:", err);
        if (mounted) setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <DashboardLayout>

      <div className="flex flex-col gap-8">
        {/* Page Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Dashboard de Tráfego</h1>
            <p className="text-slate-500 mt-1">Bem-vindo de volta! Aqui está o resumo da performance das campanhas.</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 mr-4">
                <span className="text-sm text-slate-500">Período:</span>
                <Input type="date" className="w-auto" />
                <span className="text-sm text-slate-500">até</span>
                <Input type="date" className="w-auto" />
             </div>
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" />
              Filtrar
            </Button>
            <Button className="gap-2 shadow-sm">
              <Zap className="h-4 w-4" />
              Sincronizar
            </Button>
          </div>
        </div>

        {/* Top Metrics Grid */}
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

        {/* Charts Section */}
        <ChartSection />

        {/* Secondary Metrics & Manual Entry */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ManualMetrics />
          </div>
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
        </div>
      </div>
    </DashboardLayout>
  );
}

// Reuse Card component for the insight box
import { Card } from "@/components/ui/card";
