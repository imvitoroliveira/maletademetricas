
import * as React from "react";
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X,
  MoreVertical,
  GripVertical
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

interface CustomMetric {
  id: string;
  name: string;
  value: string;
  category: string;
  status: 'active' | 'pending';
}

export function ManualMetrics() {
  const [isAdmin, setIsAdmin] = React.useState(true);
  const [metrics, setMetrics] = React.useState<CustomMetric[]>([
    { id: '1', name: 'Leads Qualificados (MQL)', value: '142', category: 'Fundo de Funil', status: 'active' },
    { id: '2', name: 'Taxa de Agendamento', value: '12%', category: 'Conversão', status: 'active' },
    { id: '3', name: 'Custo por Lead Qualificado', value: 'R$ 42,50', category: 'Financeiro', status: 'active' },
  ]);

  const [isAdding, setIsAdding] = React.useState(false);
  const [newMetric, setNewMetric] = React.useState({ name: '', value: '', category: '' });

  const handleAddMetric = () => {
    if (newMetric.name && newMetric.value) {
      setMetrics([
        ...metrics,
        {
          id: Math.random().toString(36).substr(2, 9),
          ...newMetric,
          status: 'active'
        }
      ]);
      setNewMetric({ name: '', value: '', category: '' });
      setIsAdding(false);
    }
  };

  const removeMetric = (id: string) => {
    setMetrics(metrics.filter(m => m.id !== id));
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
              <TableHead className="text-right">Ações</TableHead>
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
