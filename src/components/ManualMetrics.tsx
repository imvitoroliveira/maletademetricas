import * as React from "react";
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X,
  FileText,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ErrorHandler } from "@/lib/error-utils";
import { cn } from "@/lib/utils";

interface CustomMetric {
  id: string;
  name: string;
  value: string;
  category: string | null;
  status: string | null;
  user_id: string | null;
  metric_date?: string | null;
}

/**
 * World-Class Manual Metrics Engine
 * Otimizado para performance de renderização e integridade de dados através do TanStack Query.
 */
export function ManualMetrics({ startDate, endDate }: { startDate?: string, endDate?: string }) {
  const queryClient = useQueryClient();
  const { user, isAdmin, loading: authLoading } = useAuth();
  
  const [isAdding, setIsAdding] = React.useState(false);
  const [newMetric, setNewMetric] = React.useState({ 
    name: '', 
    value: '', 
    category: '', 
    metric_date: new Date().toISOString().split('T')[0] 
  });

  const { data: metrics = [], isLoading: loading } = useQuery({
    queryKey: ['custom_metrics', user?.id, startDate, endDate],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('custom_metrics')
        .select('*');

      if (startDate) query = query.gte('metric_date', startDate);
      if (endDate) query = query.lte('metric_date', endDate);
      if (!isAdmin) query = query.eq('user_id', user.id);

      const { data, error } = await query.order('metric_date', { ascending: false });

      if (error) {
        ErrorHandler.report(error, "Carga de Métricas");
        throw error;
      }
      return data as CustomMetric[] || [];
    },
    enabled: !authLoading && !!user,
  });

  const addMutation = useMutation({
    mutationFn: async (metricData: Omit<CustomMetric, 'id' | 'user_id' | 'status'>) => {
      if (!user) throw new Error("Sessão inválida");
      const { data, error } = await supabase
        .from('custom_metrics')
        .insert([{ ...metricData, user_id: user.id, status: 'active' }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom_metrics'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      setIsAdding(false);
      setNewMetric({ name: '', value: '', category: '', metric_date: new Date().toISOString().split('T')[0] });
      toast.success("Métrica inserida com sucesso.");
    },
    onError: (error) => ErrorHandler.report(error, "Inserção de Métrica")
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('custom_metrics').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom_metrics'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      toast.success("Métrica removida.");
    },
    onError: (error) => ErrorHandler.report(error, "Exclusão de Métrica")
  });

  const handleAddMetric = () => {
    if (newMetric.name && newMetric.value) {
      addMutation.mutate(newMetric);
    }
  };

  const removeMetric = (id: string) => {
    deleteMutation.mutate(id);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Relatório de Tráfego Pago", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Data: ${new Date().toLocaleDateString()}`, 14, 30);
    
    const tableData = metrics.map(m => [
      m.metric_date ? new Date(m.metric_date).toLocaleDateString() : '-',
      m.name, 
      m.value, 
      m.category || '-', 
      m.status || 'Pendente'
    ]);
    
    (doc as any).autoTable({
      startY: 40,
      head: [['Data', 'Métrica', 'Valor', 'Categoria', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
    });

    doc.save("relatorio-trafego.pdf");
    toast.success("Relatório PDF exportado!");
  };

  return (
    <Card className="shadow-sm border-none bg-white dark:bg-slate-900 overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b p-4 gap-4">
        <div>
          <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-50">Métricas Personalizadas</CardTitle>
          <CardDescription className="text-sm">Gestão granular de KPIs por período.</CardDescription>
        </div>
        <div className="flex w-full sm:w-auto gap-2">
          <Button variant="outline" size="sm" onClick={exportPDF} className="flex-1 sm:flex-none gap-2 border-slate-200 h-10 px-4">
            <FileText className="h-4 w-4" />
            <span className="hidden xs:inline">PDF</span>
          </Button>
          {isAdmin && (
            <Button onClick={() => setIsAdding(!isAdding)} size="sm" className="flex-1 sm:flex-none gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 h-10 px-4">
              {isAdding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              <span>{isAdding ? "Cancelar" : "Novo"}</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="w-full overflow-x-auto custom-scrollbar">
          <Table className="min-w-[700px] lg:min-w-full">
            <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider h-12">Data</TableHead>
                <TableHead className="w-[250px] lg:w-auto text-[10px] font-bold uppercase tracking-wider h-12">Métrica</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider h-12">Valor</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider h-12">Categoria</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider h-12 text-center">Status</TableHead>
                {isAdmin && <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider h-12">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 6 : 5} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-fuchsia-600" />
                      <span className="text-sm font-medium text-slate-400">Sincronizando dados...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {isAdding && (
                    <TableRow className="bg-fuchsia-50/20 animate-in fade-in duration-300">
                      <TableCell>
                        <Input 
                          type="date"
                          value={newMetric.metric_date || ''}
                          onChange={(e) => setNewMetric({...newMetric, metric_date: e.target.value})}
                          className="h-9 border-fuchsia-100 min-w-[120px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          placeholder="Ex: Leads" 
                          value={newMetric.name}
                          onChange={(e) => setNewMetric({...newMetric, name: e.target.value})}
                          className="h-9 border-fuchsia-100"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          placeholder="Ex: 52" 
                          value={newMetric.value}
                          onChange={(e) => setNewMetric({...newMetric, value: e.target.value})}
                          className="h-9 border-fuchsia-100"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          placeholder="Ex: Facebook Ads" 
                          value={newMetric.category || ''}
                          onChange={(e) => setNewMetric({...newMetric, category: e.target.value})}
                          className="h-9 border-fuchsia-100"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-fuchsia-600 bg-fuchsia-50 border-fuchsia-100">Pendente</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" className="h-10 w-10 text-emerald-600 hover:bg-emerald-50" onClick={handleAddMetric}>
                          <Check className="h-5 w-5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                  {metrics.map((metric) => (
                    <TableRow key={metric.id} className="group hover:bg-slate-50 transition-colors">
                      <TableCell className="text-sm text-slate-500 font-mono py-4">
                        {metric.metric_date ? new Date(metric.metric_date).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-800 dark:text-slate-200 py-4">
                        {metric.name}
                      </TableCell>
                      <TableCell className="font-medium text-slate-600 py-4">
                        {metric.value}
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className="font-normal border-slate-200 text-slate-400 bg-white">
                          {metric.category || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center py-4">
                        <Badge className={cn(
                          "font-medium",
                          metric.status === 'active' 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                            : "bg-amber-50 text-amber-700 border-amber-100"
                        )}>
                          {metric.status === 'active' ? 'Publicado' : 'Revisão'}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right py-4">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-10 w-10 text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                              onClick={() => removeMetric(metric.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {metrics.length === 0 && !isAdding && (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 6 : 5} className="h-40 text-center text-slate-400 text-sm italic">
                        Nenhuma métrica personalizada encontrada para este período.
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

