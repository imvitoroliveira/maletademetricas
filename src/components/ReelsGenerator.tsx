import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { generateReelsScript, type ReelsScript } from "@/lib/reels.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Copy, Clapperboard, Link2 } from "lucide-react";
import { toast } from "sonner";

export function ReelsGenerator() {
  const [topic, setTopic] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [niche, setNiche] = useState("");
  const [tone, setTone] = useState("educativo");
  const [duration, setDuration] = useState("30s");

  const runGenerate = useServerFn(generateReelsScript);
  const mutation = useMutation<ReelsScript, Error>({
    mutationFn: () =>
      runGenerate({
        data: { topic, referenceUrl, niche, tone: tone as never, duration: duration as never },
      }),
    onError: (err) => toast.error(err.message || "Falha ao gerar roteiro."),
  });

  const script = mutation.data;

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-fuchsia-600 text-white shadow">
          <Clapperboard className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Roteiro de Reels
          </h1>
          <p className="text-sm text-slate-500">
            Gere roteiros prontos para gravar no Instagram com IA.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Briefing</CardTitle>
            <CardDescription>Preencha os detalhes do conteúdo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="referenceUrl" className="flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" /> Link do vídeo de referência (opcional)
              </Label>
              <Input
                id="referenceUrl"
                type="url"
                placeholder="Cole o link de um Reels, TikTok ou YouTube"
                value={referenceUrl}
                onChange={(e) => setReferenceUrl(e.target.value)}
              />
              <p className="text-[11px] text-slate-400">
                A IA lê o conteúdo do vídeo e cria um roteiro novo inspirado nele.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic">Tema do Reels {referenceUrl.trim() ? "(opcional)" : ""}</Label>
              <Input
                id="topic"
                placeholder="Ex: 3 erros que travam o seu tráfego pago"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="niche">Nicho (opcional)</Label>
              <Input
                id="niche"
                placeholder="Ex: Marketing digital, moda, fitness"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tom</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="educativo">Educativo</SelectItem>
                    <SelectItem value="inspirador">Inspirador</SelectItem>
                    <SelectItem value="divertido">Divertido</SelectItem>
                    <SelectItem value="vendas">Vendas</SelectItem>
                    <SelectItem value="polemico">Polêmico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duração</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15s">15 segundos</SelectItem>
                    <SelectItem value="30s">30 segundos</SelectItem>
                    <SelectItem value="45s">45 segundos</SelectItem>
                    <SelectItem value="60s">60 segundos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              className="w-full bg-fuchsia-600 hover:bg-fuchsia-700"
              disabled={mutation.isPending || (topic.trim().length < 2 && referenceUrl.trim().length === 0)}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Gerar Roteiro
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg">Roteiro Gerado</CardTitle>
              <CardDescription>Pronto para gravar.</CardDescription>
            </div>
            {script && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  copy(
                    `${script.title}\n\nGancho: ${script.hook}\n\n` +
                      script.scenes
                        .map((s) => `[${s.time}] ${s.visual}\nFala: ${s.speech}`)
                        .join("\n\n") +
                      `\n\nCTA: ${script.cta}\n\nLegenda:\n${script.caption}\n\n${script.hashtags
                        .map((h) => `#${h}`)
                        .join(" ")}`,
                  )
                }
              >
                <Copy className="h-4 w-4" /> Copiar tudo
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!script && !mutation.isPending && (
              <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-slate-400">
                <Clapperboard className="h-10 w-10" />
                <p className="text-sm">Seu roteiro aparecerá aqui.</p>
              </div>
            )}
            {mutation.isPending && (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-fuchsia-600" />
              </div>
            )}
            {script && (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">Título</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{script.title}</p>
                </div>
                <div className="rounded-lg bg-fuchsia-50 p-3 dark:bg-fuchsia-950/30">
                  <p className="text-xs font-bold uppercase text-fuchsia-600">Gancho (0-3s)</p>
                  <p className="text-sm text-slate-700 dark:text-slate-200">{script.hook}</p>
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase text-slate-400">Cenas</p>
                  {script.scenes.map((s, i) => (
                    <div key={i} className="rounded-lg border p-3">
                      <Badge variant="secondary" className="mb-2">
                        {s.time}
                      </Badge>
                      <p className="text-sm text-slate-700 dark:text-slate-200">
                        <span className="font-semibold">Visual:</span> {s.visual}
                      </p>
                      <p className="text-sm text-slate-700 dark:text-slate-200">
                        <span className="font-semibold">Fala:</span> {s.speech}
                      </p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">CTA</p>
                  <p className="text-sm text-slate-700 dark:text-slate-200">{script.cta}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">Legenda</p>
                  <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
                    {script.caption}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {script.hashtags.map((h, i) => (
                    <Badge key={i} variant="outline">
                      #{h}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
