import * as React from "react";
import { Plus, Trash2, CreditCard as Edit2, Check, X, FileText, Loader as Loader2 } from "lucide-react";
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

interface CustomMetric {
  id: string;
  name: string;
  value: string;
  category: string | null;
  status: string | null;
  user_id: string | null;
  metric_date?: string | null;
}

export function ManualMetrics({ startDate, endDate }: { startDate?: string; endDate?: string }) {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [metrics, setMetrics] = React.useState<CustomMetric[]>([]);

  const [isAdding, setIsAdding] = React.useState(false);
  const [newMetric, setNewMetric] = React.useState({
    name: "",
    value: "",
    category: "",
    metric_date: new Date().toISOString().split("T")[0],
  });

  React.useEffect(() => {
    if (user) {
      fetchMetrics();
    }
  }, [startDate, endDate, user]);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      let query = supabase.from("custom_metrics").select("*");

      if (startDate) {
        query = query.gte("metric_date", startDate);
      }
      if (endDate) {
        query = query.lte("metric_date", endDate);
      }

      if (!isAdmin && user) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query.order("metric_date", { ascending: false });

      if (error) throw error;
      setMetrics(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar metricas: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMetric = async () => {
    if (newMetric.name && newMetric.value) {
      try {
        if (!user) throw new Error("Voce precisa estar logado para adicionar metricas.");

        const { data, error } = await supabase
          .from("custom_metrics")
          .insert([{ ...newMetric, user_id: user.id }])
          .select()
          .single();

        if (error) throw error;

        setMetrics([...metrics, data]);
        setNewMetric({ name: "", value: "", category: "", metric_date: new Date().toISOString().split("T")[0] });
        setIsAdding(false);
        toast.success("Metrica adicionada com sucesso!");
      } catch (error: any) {
        toast.error("Erro ao adicionar metrica: " + error.message);
      }
    }
  };

  const removeMetric = async (id: string) => {
    try {
      const { error } = await supabase.from("custom_metrics").delete().eq("id", id);

      if (error) throw error;
      setMetrics(metrics.filter((m) => m.id !== id));
      toast.success("Metrica removida.");
    } catch (error: any) {
      toast.error("Erro ao remover metrica: " + error.message);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text("Relatorio de Trafego Pago", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Data: ${new Date().toLocaleDateString()}`, 14, 30);

    const tableData = metrics.map((m) => [
      m.metric_date ? new Date(m.metric_date).toLocaleDateString() : "-",
      m.name,
      m.value,
      m.category || "-",
      m.status,
    ]);

    (doc as any).autoTable({
      startY: 40,
      head: [["Data", "Metrica", "Valor", "Categoria", "Status"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [2, 132, 199] },
    });

    doc.save("relatorio-trafego.pdf");
    toast.success("Relatorio PDF exportado!");
  };

  return (
    <Card className="shadow-sm border-none bg-white dark:bg-slate-900 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
        <div>
          <CardTitle className="text-lg font-semibold">Metricas Personalizadas</CardTitle>
          <CardDescription>Metricas inseridas manualmente para o cliente</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportPDF} className="gap-2">
            <FileText className="h-4 w-4" />
            PDF
          </Button>
          {isAdmin && (
            <Button onClick={() => setIsAdding(!isAdding)} size="sm" className="gap-2">
              {isAdding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {isAdding ? "Cancelar" : "Nova Metrica"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead className="w-[300px]">Nome da Metrica</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead className="text-right">Acoes</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="h-32 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando metricas...
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              <>
                {isAdding && (
                  <TableRow className="bg-sky-50/30 dark:bg-sky-900/10">
                    <TableCell>
                      <Input
                        type="date"
                        value={newMetric.metric_date || ""}
                        onChange={(e) => setNewMetric({ ...newMetric, metric_date: e.target.value })}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Ex: Leads"
                        value={newMetric.name}
                        onChange={(e) => setNewMetric({ ...newMetric, name: e.target.value })}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Ex: 142"
                        value={newMetric.value}
                        onChange={(e) => setNewMetric({ ...newMetric, value: e.target.value })}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Ex: Conversao"
                        value={newMetric.category || ""}
                        onChange={(e) => setNewMetric({ ...newMetric, category: e.target.value })}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">Pendente</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-emerald-600"
                          onClick={handleAddMetric}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {metrics.map((metric) => (
                  <TableRow key={metric.id} className="group transition-colors">
                    <TableCell className="text-sm text-slate-500">
                      {metric.metric_date ? new Date(metric.metric_date).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell className="font-medium text-slate-700 dark:text-slate-200">
                      {metric.name}
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400">{metric.value}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal border-slate-200 text-slate-500">
                        {metric.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={metric.status === "active" ? "secondary" : "default"}
                        className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400"
                      >
                        {metric.status === "active" ? "Ativo" : "Pendente"}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-400 hover:text-slate-600"
                          >
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
                    <TableCell
                      colSpan={isAdmin ? 6 : 5}
                      className="h-32 text-center text-muted-foreground"
                    >
                      Nenhuma metrica personalizada encontrada para este periodo.
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
