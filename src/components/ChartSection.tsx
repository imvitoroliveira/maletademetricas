
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
  Legend
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const data = [
  { name: 'Seg', investimento: 400, convesoes: 24, cpa: 16.6 },
  { name: 'Ter', investimento: 300, convesoes: 13, cpa: 23.0 },
  { name: 'Qua', investimento: 200, convesoes: 38, cpa: 5.2 },
  { name: 'Qui', investimento: 278, convesoes: 39, cpa: 7.1 },
  { name: 'Sex', investimento: 189, convesoes: 48, cpa: 3.9 },
  { name: 'Sáb', investimento: 239, convesoes: 38, cpa: 6.2 },
  { name: 'Dom', investimento: 349, convesoes: 43, cpa: 8.1 },
];

export function ChartSection() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="col-span-1 shadow-sm border-none bg-white dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Investimento vs Conversões</CardTitle>
          <CardDescription>Performance dos últimos 7 dias</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="h-[300px] w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorInv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 12}}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 12}}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="investimento" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorInv)" 
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Area 
                  type="monotone" 
                  dataKey="convesoes" 
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#colorConv)" 
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="col-span-1 shadow-sm border-none bg-white dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">CPA por Dia</CardTitle>
          <CardDescription>Custo por aquisição diário</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="h-[300px] w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 12}}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 12}}
                />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar 
                  dataKey="cpa" 
                  fill="#f43f5e" 
                  radius={[4, 4, 0, 0]}
                  barSize={30}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
