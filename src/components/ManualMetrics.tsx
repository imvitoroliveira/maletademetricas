
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

interface CustomMetric {
  id: string;
  name: string;
  value: string;
  category: string;
  status: string;
  user_id?: string;
}

export function ManualMetrics() {
  const [isAdmin, setIsAdmin] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [metrics, setMetrics] = React.useState<CustomMetric[]>([]);

  const [isAdding, setIsAdding] = React.useState(false);
  const [newMetric, setNewMetric] = React.useState({ name: '', value: '', category: '' });

  React.useEffect(() => {
    fetchMetrics();
    
    // Check if user is admin (gestor)
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAdmin(!!user);
    };
    checkUser();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('custom_metrics')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMetrics(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar métricas: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMetric = async () => {
    if (newMetric.name && newMetric.value) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Você precisa estar logado para adicionar métricas.");

        const { data, error } = await supabase
          .from('custom_metrics')
          .insert([{ ...newMetric, user_id: user.id }])
          .select()
          .single();

        if (error) throw error;

        setMetrics([...metrics, data]);
        setNewMetric({ name: '', value: '', category: '' });
        setIsAdding(false);
        toast.success("Métrica adicionada com sucesso!");
      } catch (error: any) {
        toast.error("Erro ao adicionar métrica: " + error.message);
      }
    }
  };

  const removeMetric = async (id: string) => {
    try {
      const { error } = await supabase
        .from('custom_metrics')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMetrics(metrics.filter(m => m.id !== id));
      toast.success("Métrica removida.");
    } catch (error: any) {
      toast.error("Erro ao remover métrica: " + error.message);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("Relatório de Tráfego Pago", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Data: ${new Date().toLocaleDateString()}`, 14, 30);
    
    const tableData = metrics.map(m => [m.name, m.value, m.category || '-', m.status]);
    
    (doc as any).autoTable({
      startY: 40,
      head: [['Métrica', 'Valor', 'Categoria', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
    });
    
    doc.save("relatorio-trafego.pdf");
    toast.success("Relatório PDF exportado!");
  };

  return (
    <Card className="shadow-sm border-none bg-white dark:bg-slate-900 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
        <div>
          <CardTitle className="text-lg font-semibold">Métricas Personalizadas</CardTitle>
          <CardDescription>Métricas inseridas manualmente para o cliente</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsAdmin(!isAdmin)}>
            {isAdmin ? "Ver como Cliente" : "Voltar para Gestor"}
          </Button>
          {isAdmin && (
            <Button onClick={() => setIsAdding(!isAdding)} size="sm" className="gap-2">
              {isAdding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {isAdding ? "Adicionar Métrica" : "Nova Métrica"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
            <TableRow>
              <TableHead className="w-[300px]">Nome da Métrica</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isAdding && (
              <TableRow className="bg-blue-50/30 dark:bg-blue-900/10">
                <TableCell>
                  <Input 
                    placeholder="Ex: Leads Qualificados" 
                    value={newMetric.name}
                    onChange={(e) => setNewMetric({...newMetric, name: e.target.value})}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    placeholder="Ex: 142" 
                    value={newMetric.value}
                    onChange={(e) => setNewMetric({...newMetric, value: e.target.value})}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    placeholder="Ex: Conversão" 
                    value={newMetric.category}
                    onChange={(e) => setNewMetric({...newMetric, category: e.target.value})}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">Pendente</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" onClick={handleAddMetric}>
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {metrics.map((metric) => (
              <TableRow key={metric.id} className="group transition-colors">
                <TableCell className="font-medium text-slate-700 dark:text-slate-200">
                  {metric.name}
                </TableCell>
                <TableCell className="text-slate-600 dark:text-slate-400">
                  {metric.value}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-normal border-slate-200 text-slate-500">
                    {metric.category}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={metric.status === 'active' ? 'secondary' : 'default'} className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400">
                    {metric.status === 'active' ? 'Ativo' : 'Pendente'}
                  </Badge>
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-slate-400 hover:text-rose-600"
                        onClick={() => removeMetric(metric.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {metrics.length === 0 && !isAdding && (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  Nenhuma métrica personalizada adicionada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
