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
  Bar
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface ChartSectionProps {
  metrics: any[];
  loading: boolean;
}

export function ChartSection({ metrics, loading }: ChartSectionProps) {
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Logic to transform real metrics into chart data
  const chartData = React.useMemo(() => {
    if (!metrics || metrics.length === 0) return [];
    
    // Sort metrics by date
    const sorted = [...metrics].sort((a, b) => 
      new Date(a.metric_date || '').getTime() - new Date(b.metric_date || '').getTime()
    );

    // Group by date and aggregate values
    const grouped: Record<string, any> = {};
    sorted.forEach(m => {
      const date = m.metric_date ? new Date(m.metric_date).toLocaleDateString() : 'Sem data';
      if (!grouped[date]) {
        grouped[date] = { date };
      }
      // Use metric name as key (lowercase to avoid issues)
      const key = m.name;
      grouped[date][key] = (grouped[date][key] || 0) + (parseFloat(m.value) || 0);
    });

    return Object.values(grouped);
  }, [metrics]);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2].map(i => (
          <Card key={i} className="col-span-1 shadow-sm border-none bg-white dark:bg-slate-900 h-[400px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-fuchsia-600" />
          </Card>
        ))}
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-2 p-12 text-center border-none shadow-sm bg-white dark:bg-slate-900">
          <p className="text-slate-400 font-medium">Insira métricas manuais para visualizar os gráficos de performance.</p>
        </Card>
      </div>
    );
  }

  // Identify numeric metrics for charts (e.g., Investimento, Leads, ROAS)
  const availableMetrics = Array.from(new Set(metrics.map(m => m.name)));

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="col-span-2 lg:col-span-1 shadow-sm border-none bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold">Investimento e Performance</CardTitle>
          <CardDescription>Evolução das métricas por período</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d946ef" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#d946ef" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 10, fill: '#64748b'}}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 10, fill: '#64748b'}}
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: 'none', 
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                }}
              />
              {availableMetrics.slice(0, 2).map((metric, idx) => (
                <Area 
                  key={metric}
                  type="monotone" 
                  dataKey={metric} 
                  stroke={idx === 0 ? "#d946ef" : "#8b5cf6"} 
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                  strokeWidth={3}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="col-span-2 lg:col-span-1 shadow-sm border-none bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold">Distribuição por Categoria</CardTitle>
          <CardDescription>Volume de dados agrupados</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 10, fill: '#64748b'}}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 10, fill: '#64748b'}}
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: 'none', 
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                }}
              />
              {availableMetrics.slice(0, 2).map((metric, idx) => (
                <Bar 
                  key={metric}
                  dataKey={metric} 
                  fill={idx === 0 ? "#d946ef" : "#8b5cf6"} 
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
