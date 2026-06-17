import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listReferenceChannels,
  addReferenceChannel,
  toggleReferenceChannel,
  deleteReferenceChannel,
  generateReelsNow,
  type ReferenceChannel,
} from "@/lib/reels-channels.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Youtube, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function ReelsChannels() {
  const qc = useQueryClient();
  const [channel, setChannel] = useState("");

  const runList = useServerFn(listReferenceChannels);
  const runAdd = useServerFn(addReferenceChannel);
  const runToggle = useServerFn(toggleReferenceChannel);
  const runDelete = useServerFn(deleteReferenceChannel);
  const runGenerate = useServerFn(generateReelsNow);

  const { data: channels = [], isLoading } = useQuery<ReferenceChannel[]>({
    queryKey: ["reels-channels"],
    queryFn: () => runList(),
  });

  const addMutation = useMutation({
    mutationFn: () => runAdd({ data: { channel } }),
    onSuccess: () => {
      setChannel("");
      qc.invalidateQueries({ queryKey: ["reels-channels"] });
      toast.success("Canal adicionado!");
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao adicionar canal."),
  });

  const toggleMutation = useMutation({
    mutationFn: (v: { id: string; isActive: boolean }) => runToggle({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reels-channels"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => runDelete({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reels-channels"] });
      toast.success("Canal removido.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const generateMutation = useMutation({
    mutationFn: () => runGenerate({}),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["reels-scripts"] });
      toast.success(
        r.created > 0
          ? `${r.created} novo(s) roteiro(s) gerado(s)!`
          : "Nenhum vídeo novo em alta encontrado agora.",
      );
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao gerar roteiros."),
  });

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-600" /> Canais de referência
          </CardTitle>
          <CardDescription>
            Cadastre canais do YouTube de marketing digital. Quando tiverem vídeos em alta, geramos
            roteiros automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Link, @handle ou nome do canal"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && channel.trim().length > 1 && addMutation.mutate()}
            />
            <Button
              onClick={() => addMutation.mutate()}
              disabled={addMutation.isPending || channel.trim().length < 2}
              className="bg-fuchsia-600 hover:bg-fuchsia-700 shrink-0"
            >
              {addMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Adicionar
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-fuchsia-600" />
            </div>
          ) : channels.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              Nenhum canal cadastrado ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {channels.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                      {c.channel_name || c.channel_input}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {c.last_checked_at
                        ? `Verificado ${new Date(c.last_checked_at).toLocaleDateString("pt-BR")}`
                        : "Aguardando primeira verificação"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Switch
                      checked={c.is_active}
                      onCheckedChange={(v) => toggleMutation.mutate({ id: c.id, isActive: v })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-400 hover:text-rose-600"
                      onClick={() => deleteMutation.mutate(c.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-none bg-fuchsia-50 shadow-sm dark:bg-fuchsia-950/30">
        <CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-fuchsia-600" />
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">Geração automática ativa</p>
              <p className="text-sm text-slate-500">
                Verificamos os canais periodicamente. Quer rodar agora mesmo?
              </p>
            </div>
          </div>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="bg-fuchsia-600 hover:bg-fuchsia-700 shrink-0"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Gerando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Gerar agora
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
