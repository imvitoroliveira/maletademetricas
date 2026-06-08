import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCcw, AlertTriangle, CheckCircle2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ReconciliationReport() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);

  const fetchReconciliationData = async () => {
    setLoading(true);
    try {
      // Fetch logs and current metrics to compare
      const { data: logs, error: logsError } = await supabase
        .from('meta_api_logs')
        .select(`
          *,
          ad_accounts(name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (logsError) throw logsError;

      const { data: metrics, error: metricsError } = await supabase
        .from('custom_metrics')
        .select('*');

      if (metricsError) throw metricsError;

      // Join data for comparison
      const report = logs?.map((log: any) => {
        const matchingMetric = metrics?.find((m: any) => 
          m.ad_account_id === log.ad_account_id && 
          m.metric_date === log.metric_date && 
          m.name === log.metric_name
        );

        const appValue = matchingMetric ? parseFloat(matchingMetric.value) : 0;
        const metaValue = parseFloat(log.raw_value);
        const diff = Math.abs(appValue - metaValue);
        const hasParity = diff < 0.01; // Small threshold for float precision

        return {
          ...log,
          appValue,
          metaValue,
          diff,
          hasParity
        };
      });

      setData(report || []);
    } catch (error: any) {
      toast.error("Erro ao gerar relatório: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReconciliationData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Relatório de Reconciliação</h2>
          <p className="text-slate-500">Validação de paridade entre Meta Ads API e Dados do App.</p>
        </div>
        <Button onClick={fetchReconciliationData} variant="outline" className="gap-2">
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead>Conta / Data</TableHead>
              <TableHead>Métrica</TableHead>
              <TableHead className="text-right">Valor Meta API</TableHead>
              <TableHead className="text-right">Valor no App</TableHead>
              <TableHead className="text-center">Status de Paridade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-slate-400">
                  Calculando divergências...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-slate-400">
                  Nenhum dado de log encontrado para reconciliação.
                </TableCell>
              </TableRow>
            ) : data.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{item.ad_accounts?.name}</span>
                    <span className="text-xs text-slate-500">{new Date(item.metric_date).toLocaleDateString()}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{item.metric_name}</Badge>
                </TableCell>
                <TableCell className="text-right font-mono">{item.metaValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-right font-mono">{item.appValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="flex justify-center py-4">
                  {item.hasParity ? (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Paridade OK
                    </Badge>
                  ) : (
                    <Badge className="bg-rose-50 text-rose-700 border-rose-100 gap-1">
                      <AlertTriangle className="h-3 w-3" /> Divergência: {item.diff.toFixed(2)}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
