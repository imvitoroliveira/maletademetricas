import * as React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader as Loader2 } from "lucide-react";

interface ChartSectionProps {
  metrics: any[];
  loading: boolean;
}

export function ChartSection({ metrics, loading }: ChartSectionProps) {
  const chartData = React.useMemo(() => {
    if (!metrics || metrics.length === 0) return [];
    const sorted = [...metrics].sort(
      (a, b) => new Date(a.metric_date || "").getTime() - new Date(b.metric_date || "").getTime(),
    );
    return [];
  }, [metrics]);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Card
            key={i}
            className="col-span-1 shadow-sm border-none bg-white dark:bg-slate-900 h-[400px] flex items-center justify-center"
          >
            <Loader2 className="h-8 w-8 animate-spin text-slate-200" />
          </Card>
        ))}
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-2 p-12 text-center border-none shadow-sm bg-white dark:bg-slate-900">
          <p className="text-slate-400">Insira metricas manuais para visualizar os graficos de performance.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="col-span-2 p-12 text-center border-none shadow-sm bg-white dark:bg-slate-900">
        <p className="text-slate-400">Graficos gerados a partir das metricas personalizadas inseridas.</p>
      </Card>
    </div>
  );
}
