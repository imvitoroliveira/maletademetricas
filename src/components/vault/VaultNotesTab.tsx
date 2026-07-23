import { useMemo, useState } from "react";
import { Download, FileText, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
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
  emptyVaultNote,
  useVaultNotes,
  type VaultNote,
  type VaultNoteFormValues,
} from "@/hooks/useVaultNotes";
import { exportVaultNoteToPdf } from "@/lib/vault-notes-pdf";

export function VaultNotesTab() {
  const { data: notes = [], isLoading, add, update, remove } = useVaultNotes(true);

  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VaultNoteFormValues>(emptyVaultNote);
  const [tagInput, setTagInput] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<VaultNote | null>(null);

  const resetForm = () => {
    setForm(emptyVaultNote);
    setTagInput("");
    setEditingId(null);
  };

  const openNew = () => {
    resetForm();
    setIsOpen(true);
  };

  const openEdit = (note: VaultNote) => {
    setEditingId(note.id);
    setForm({
      title: note.title,
      content: note.content,
      tags: note.tags ?? [],
    });
    setTagInput("");
    setIsOpen(true);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (!form.tags.includes(t)) setForm((f) => ({ ...f, tags: [...f.tags, t] }));
    setTagInput("");
  };

  const removeTag = (t: string) =>
    setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }));

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    const payload = { ...form, title: form.title.trim() };
    if (editingId) {
      update.mutate(
        { id: editingId, ...payload },
        {
          onSuccess: () => {
            setIsOpen(false);
            resetForm();
          },
        },
      );
    } else {
      add.mutate(payload, {
        onSuccess: () => {
          setIsOpen(false);
          resetForm();
        },
      });
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags?.some((t) => t.toLowerCase().includes(q)),
    );
  }, [notes, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar anotações, tags..."
            className="pl-10 h-10 bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-fuchsia-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={openNew} className="gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 h-11">
              <Plus className="h-4 w-4" />
              Nova anotação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar anotação" : "Nova anotação"}
              </DialogTitle>
              <DialogDescription>
                Salve textos, roteiros, condições comerciais ou qualquer conteúdo que você
                usa com frequência. Exporte em PDF quando precisar enviar a um cliente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Título</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Ex.: Proposta comercial — pacote básico"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Conteúdo</label>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="Escreva o texto aqui. Quebras de linha são preservadas no PDF."
                  className="min-h-[260px] font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tags</label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="Adicione uma tag e pressione Enter"
                  />
                  <Button type="button" variant="outline" onClick={addTag}>
                    Adicionar
                  </Button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {form.tags.map((t) => (
                      <Badge
                        key={t}
                        variant="outline"
                        className="bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 gap-1"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => removeTag(t)}
                          className="hover:text-fuchsia-900"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={add.isPending || update.isPending || !form.title.trim()}
                  className="bg-fuchsia-600 hover:bg-fuchsia-700 gap-2"
                >
                  {(add.isPending || update.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {editingId ? "Salvar alterações" : "Salvar anotação"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="h-32 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-fuchsia-600" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 bg-transparent shadow-none">
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <FileText className="h-10 w-10 text-slate-300" />
            <p className="text-slate-500 font-medium">Nenhuma anotação salva.</p>
            <p className="text-sm text-slate-400 max-w-sm">
              Crie sua primeira anotação para centralizar textos que você reutiliza no dia
              a dia e exporte em PDF quando precisar compartilhar.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((note) => (
            <Card
              key={note.id}
              className="border-none shadow-sm bg-white dark:bg-slate-900 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-slate-900 dark:text-slate-50 leading-tight line-clamp-2">
                  {note.title}
                </h3>
              </div>
              <p className="text-sm text-slate-500 whitespace-pre-wrap line-clamp-6 flex-1">
                {note.content || "(sem conteúdo)"}
              </p>
              {note.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {note.tags.map((t) => (
                    <Badge
                      key={t}
                      variant="outline"
                      className="bg-slate-50 text-slate-600 border-slate-200"
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-400">
                  Atualizada em{" "}
                  {new Date(note.updated_at).toLocaleDateString("pt-BR")}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-slate-500 hover:text-fuchsia-600"
                    onClick={() => exportVaultNoteToPdf(note)}
                    title="Exportar em PDF"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-slate-500 hover:text-fuchsia-600"
                    onClick={() => openEdit(note)}
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                    onClick={() => setDeleteTarget(note)}
                    title="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover anotação?</AlertDialogTitle>
            <AlertDialogDescription>
              A anotação "{deleteTarget?.title}" será excluída permanentemente.
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
