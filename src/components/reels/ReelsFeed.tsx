import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listReelsScripts,
  updateReelsScriptStatus,
  deleteReelsScript,
  type ReelsScriptRow,
} from "@/lib/reels-channels.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, Trash2, Bookmark, Check, Eye, Clapperboard, ExternalLink } from "lucide-react";
import { toast } from "sonner";

function scriptToText(s: ReelsScriptRow): string {
  return (
    `${s.title}\n\nGancho: ${s.hook ?? ""}\n\n` +
    s.scenes.map((sc) => `[${sc.time}] ${sc.visual}\nFala: ${sc.speech}`).join("\n\n") +
    `\n\nCTA: ${s.cta ?? ""}\n\nLegenda:\n${s.caption ?? ""}\n\n` +
    s.hashtags.map((h) => `#${h}`).join(" ")
  );
}

export function ReelsFeed() {
  const qc = useQueryClient();
  const runList = useServerFn(listReelsScripts);
  const runStatus = useServerFn(updateReelsScriptStatus);
  const runDelete = useServerFn(deleteReelsScript);

  const { data, isLoading } = useQuery<ReelsScriptRow[]>({
    queryKey: ["reels-scripts"],
    queryFn: () => runList(),
  });
  const scripts = Array.isArray(data) ? data : [];

  const statusMutation = useMutation({
    mutationFn: (v: { id: string; status: "new" | "saved" | "used" }) => runStatus({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reels-scripts"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => runDelete({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reels-scripts"] });
      toast.success("Roteiro removido.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copy = (s: ReelsScriptRow) => {
    navigator.clipboard.writeText(scriptToText(s));
    toast.success("Roteiro copiado!");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-fuchsia-600" />
      </div>
    );
  }

  if (scripts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center text-slate-400">
        <Clapperboard className="h-10 w-10" />
        <p className="text-sm">
          Nenhum roteiro ainda. Cadastre canais de referência — os roteiros aparecem aqui
          automaticamente quando houver vídeos em alta.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {scripts.map((s) => (
        <Card key={s.id} className="border-none shadow-sm">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  {s.theme && <Badge variant="secondary">{s.theme}</Badge>}
                  {s.status === "saved" && <Badge className="bg-amber-500">Salvo</Badge>}
                  {s.status === "used" && <Badge className="bg-emerald-600">Usado</Badge>}
                </div>
                <h3 className="font-semibold leading-tight text-slate-900 dark:text-slate-100">
                  {s.title}
                </h3>
                {s.source_channel_name && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                    <Eye className="h-3 w-3" />
                    {s.source_views ? `${s.source_views.toLocaleString("pt-BR")} views · ` : ""}
                    {s.source_channel_name}
                    {s.source_video_url && (
                      <a
                        href={s.source_video_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-fuchsia-600 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-fuchsia-50 p-3 dark:bg-fuchsia-950/30">
              <p className="text-xs font-bold uppercase text-fuchsia-600">Gancho</p>
              <p className="text-sm text-slate-700 dark:text-slate-200">{s.hook}</p>
            </div>

            <div className="space-y-2">
              {s.scenes.map((sc, i) => (
                <div key={i} className="rounded-lg border p-2.5 text-sm">
                  <Badge variant="outline" className="mb-1.5">
                    {sc.time}
                  </Badge>
                  <p className="text-slate-700 dark:text-slate-200">
                    <span className="font-semibold">Visual:</span> {sc.visual}
                  </p>
                  <p className="text-slate-700 dark:text-slate-200">
                    <span className="font-semibold">Fala:</span> {sc.speech}
                  </p>
                </div>
              ))}
            </div>

            {s.cta && (
              <p className="text-sm text-slate-700 dark:text-slate-200">
                <span className="font-semibold">CTA:</span> {s.cta}
              </p>
            )}

            {s.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {s.hashtags.map((h, i) => (
                  <Badge key={i} variant="outline" className="text-[10px]">
                    #{h}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2 border-t pt-3">
              <Button size="sm" variant="outline" onClick={() => copy(s)}>
                <Copy className="h-3.5 w-3.5" /> Copiar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  statusMutation.mutate({ id: s.id, status: s.status === "saved" ? "new" : "saved" })
                }
              >
                <Bookmark className="h-3.5 w-3.5" /> {s.status === "saved" ? "Remover" : "Salvar"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  statusMutation.mutate({ id: s.id, status: s.status === "used" ? "new" : "used" })
                }
              >
                <Check className="h-3.5 w-3.5" /> {s.status === "used" ? "Desmarcar" : "Marcar usado"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto text-slate-400 hover:text-rose-600"
                onClick={() => deleteMutation.mutate(s.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
