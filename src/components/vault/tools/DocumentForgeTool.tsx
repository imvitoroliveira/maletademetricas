import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Download,
  FileImage,
  Loader2,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useVaultDocuments,
  type VaultDocument,
} from "@/hooks/useVaultDocuments";
import { streamImage } from "@/lib/streamImage";

type DocType = "rg" | "cnh" | "comprovante" | "custom";

const DOC_LABELS: Record<DocType, string> = {
  rg: "RG (Identidade)",
  cnh: "CNH (Habilitação)",
  comprovante: "Comprovante de residência",
  custom: "Personalizado",
};

type FormState = {
  title: string;
  doc_type: DocType;
  full_name: string;
  birth_date: string;
  birthplace: string;
  document_number: string;
  address: string;
  extra: string;
};

const emptyForm: FormState = {
  title: "",
  doc_type: "rg",
  full_name: "",
  birth_date: "",
  birthplace: "",
  document_number: "",
  address: "",
  extra: "",
};

function buildPrompt(f: FormState): string {
  const header =
    "Generate a stylized MOCKUP illustration of a document layout for creative/reference use only. " +
    "The image must clearly look like a design template — include a visible watermark reading 'MOCKUP / SAMPLE' " +
    "across the document and do NOT reproduce any real government seals, holograms, coats of arms or official logos. " +
    "Use fictional layout inspired loosely by Brazilian document formats.";

  const body: string[] = [];
  body.push(`Document type: ${DOC_LABELS[f.doc_type]}.`);
  if (f.full_name) body.push(`Full name on the document: ${f.full_name}.`);
  if (f.birth_date) body.push(`Date of birth: ${f.birth_date}.`);
  if (f.birthplace) body.push(`Place of birth / state: ${f.birthplace}.`);
  if (f.document_number) body.push(`Document number: ${f.document_number}.`);
  if (f.address) body.push(`Address line: ${f.address}.`);
  if (f.extra) body.push(f.extra);
  body.push(
    "Style: flat vector illustration, soft paper texture, muted colors, clean typography, no photorealism of a real ID card, no real logos.",
  );

  return `${header}\n\n${body.join(" ")}`;
}

export function DocumentForgeTool() {
  const { data: docs = [], isLoading, add, remove } = useVaultDocuments(true);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [preview, setPreview] = useState<string | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VaultDocument | null>(null);

  const canGenerate = useMemo(
    () => form.title.trim().length > 0 && form.full_name.trim().length > 0,
    [form.title, form.full_name],
  );

  const update = (patch: Partial<FormState>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  async function handleGenerate() {
    if (!canGenerate || isGenerating) return;
    setIsGenerating(true);
    setPreview(null);
    setIsFinal(false);
    const prompt = buildPrompt(form);
    try {
      await streamImage(
        "/api/generate-document-image",
        { prompt },
        (dataUrl, final) => {
          setPreview(dataUrl);
          if (final) setIsFinal(true);
        },
      );
    } catch (err: any) {
      const { toast } = await import("sonner");
      toast.error("Erro ao gerar: " + (err?.message ?? "desconhecido"));
    } finally {
      setIsGenerating(false);
    }
  }

  function handleSave() {
    if (!preview || !isFinal) return;
    add.mutate(
      {
        title: form.title.trim(),
        doc_type: form.doc_type,
        subject_data: {
          full_name: form.full_name,
          birth_date: form.birth_date,
          birthplace: form.birthplace,
          document_number: form.document_number,
          address: form.address,
          extra: form.extra,
        },
        prompt: buildPrompt(form),
        image_data: preview,
      },
      {
        onSuccess: () => {
          setForm(emptyForm);
          setPreview(null);
          setIsFinal(false);
        },
      },
    );
  }

  function download(dataUrl: string, name: string) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${name.replace(/[^a-z0-9-_]+/gi, "_") || "documento"}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-4 text-sm">
        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-amber-900 dark:text-amber-200">
          <p className="font-semibold">Uso responsável</p>
          <p className="text-amber-800 dark:text-amber-300 mt-1">
            A ferramenta gera <strong>mockups estilizados com marca d'água "SAMPLE"</strong>{" "}
            para referência visual, treinamento e planejamento — não substitui e
            não deve ser usada como documento verídico. Usar imagens geradas
            para enganar verificação de identidade caracteriza falsificação.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-fuchsia-600" />
            <h3 className="font-semibold text-lg">Dados do personagem</h3>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Título do mockup</label>
              <Input
                value={form.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="Ex.: RG - Perfil João Silva"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tipo de documento</label>
              <Select
                value={form.doc_type}
                onValueChange={(v) => update({ doc_type: v as DocType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DOC_LABELS) as DocType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {DOC_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <label className="text-sm font-medium">Nome completo</label>
                <Input
                  value={form.full_name}
                  onChange={(e) => update({ full_name: e.target.value })}
                  placeholder="João da Silva"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Data de nascimento</label>
                <Input
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => update({ birth_date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Naturalidade / UF</label>
                <Input
                  value={form.birthplace}
                  onChange={(e) => update({ birthplace: e.target.value })}
                  placeholder="Ex.: São Paulo / SP"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className="text-sm font-medium">Número do documento</label>
                <Input
                  value={form.document_number}
                  onChange={(e) => update({ document_number: e.target.value })}
                  placeholder="Ex.: 00.000.000-0"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className="text-sm font-medium">Endereço (opcional)</label>
                <Input
                  value={form.address}
                  onChange={(e) => update({ address: e.target.value })}
                  placeholder="Rua Exemplo, 123 — Bairro / Cidade"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className="text-sm font-medium">
                  Instruções extras (opcional)
                </label>
                <Textarea
                  value={form.extra}
                  onChange={(e) => update({ extra: e.target.value })}
                  placeholder="Detalhes adicionais para o layout do mockup."
                  className="min-h-[80px]"
                />
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating}
              className="w-full h-11 bg-fuchsia-600 hover:bg-fuchsia-700 gap-2"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isGenerating ? "Gerando..." : "Gerar mockup"}
            </Button>
          </div>
        </Card>

        <Card className="border-none shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <FileImage className="h-5 w-5 text-fuchsia-600" />
            <h3 className="font-semibold text-lg">Prévia</h3>
          </div>

          <div className="aspect-[4/3] rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center overflow-hidden">
            {preview ? (
              <img
                src={preview}
                alt="Prévia do mockup"
                className={
                  "w-full h-full object-contain transition-[filter] duration-500 " +
                  (isFinal ? "blur-0" : "blur-lg")
                }
              />
            ) : (
              <div className="text-center text-slate-400 text-sm px-6">
                {isGenerating
                  ? "Gerando prévia..."
                  : "Preencha os dados e clique em \"Gerar mockup\"."}
              </div>
            )}
          </div>

          {preview && isFinal && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => download(preview, form.title || "mockup")}
                className="gap-2 flex-1"
              >
                <Download className="h-4 w-4" />
                Baixar PNG
              </Button>
              <Button
                onClick={handleSave}
                disabled={add.isPending}
                className="flex-1 bg-fuchsia-600 hover:bg-fuchsia-700 gap-2"
              >
                {add.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar no cofre
              </Button>
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Histórico</h3>
        {isLoading ? (
          <div className="h-24 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-fuchsia-600" />
          </div>
        ) : docs.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 bg-transparent shadow-none p-8 text-center text-sm text-slate-400">
            Nenhum documento salvo ainda.
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {docs.map((d) => (
              <Card
                key={d.id}
                className="border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden flex flex-col"
              >
                <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  {d.image_data ? (
                    <img
                      src={d.image_data}
                      alt={d.title}
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="p-4 flex flex-col gap-2 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm leading-tight line-clamp-2">
                      {d.title}
                    </h4>
                    <Badge
                      variant="outline"
                      className="bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 flex-shrink-0"
                    >
                      {DOC_LABELS[d.doc_type as DocType] ?? d.doc_type}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {d.subject_data?.full_name}
                  </p>
                  <div className="flex items-center justify-between pt-2 mt-auto border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] text-slate-400">
                      {new Date(d.created_at).toLocaleDateString("pt-BR")}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-500 hover:text-fuchsia-600"
                        onClick={() => download(d.image_data, d.title)}
                        title="Baixar"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                        onClick={() => setDeleteTarget(d)}
                        title="Remover"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover documento?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" será excluído permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  remove.mutate(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
