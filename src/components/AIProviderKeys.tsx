import React, { useState } from "react";
import { Key, Plus, Trash2, Loader2, Power } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type Provider = "anthropic" | "openai" | "google";

const PROVIDER_LABELS: Record<Provider, string> = {
  anthropic: "Claude (Anthropic)",
  openai: "GPT (OpenAI)",
  google: "Gemini (Google)",
};

const MODEL_PLACEHOLDER: Record<Provider, string> = {
  anthropic: "claude-3-5-sonnet-20241022",
  openai: "gpt-4o-mini",
  google: "gemini-1.5-flash",
};

export function AIProviderKeys() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    label: "",
    provider: "google" as Provider,
    api_key: "",
    model: "",
  });

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["ai_provider_keys"],
    queryFn: async () => {
      // Nunca selecionamos api_key no cliente — só metadados.
      const { data, error } = await supabase
        .from("ai_provider_keys")
        .select("id, label, provider, model, is_active, priority")
        .order("priority", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!form.label.trim() || !form.api_key.trim()) {
        throw new Error("Preencha o nome e a chave de API.");
      }
      const { error } = await supabase.from("ai_provider_keys").insert([{
        label: form.label.trim(),
        provider: form.provider,
        api_key: form.api_key.trim(),
        model: form.model.trim() || MODEL_PLACEHOLDER[form.provider],
        priority: keys.length,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai_provider_keys"] });
      setForm({ label: "", provider: "google", api_key: "", model: "" });
      toast.success("Chave adicionada à rotação.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("ai_provider_keys")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai_provider_keys"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_provider_keys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai_provider_keys"] });
      toast.success("Chave removida.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 w-full justify-start">
          <Key className="h-4 w-4" />
          Chaves de I.A.
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-fuchsia-600" />
            Rotação de Chaves de I.A.
          </DialogTitle>
          <DialogDescription>
            Cadastre chaves de contas secundárias (Claude, GPT, Gemini). O chat tenta cada
            uma por ordem de prioridade e usa a Lovable AI como reserva.
          </DialogDescription>
        </DialogHeader>

        {/* Form */}
        <div className="space-y-3 rounded-lg border border-slate-100 dark:border-slate-800 p-4">
          <Input
            placeholder="Nome (ex: Claude conta backup 01)"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              value={form.provider}
              onValueChange={(v) => setForm({ ...form, provider: v as Provider })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PROVIDER_LABELS) as Provider[]).map((p) => (
                  <SelectItem key={p} value={p}>{PROVIDER_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder={`Modelo (${MODEL_PLACEHOLDER[form.provider]})`}
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
            />
          </div>
          <Input
            type="password"
            placeholder="Chave de API (sk-... / AIza...)"
            value={form.api_key}
            onChange={(e) => setForm({ ...form, api_key: e.target.value })}
          />
          <Button
            onClick={() => addMutation.mutate()}
            disabled={addMutation.isPending}
            className="w-full gap-2 bg-fuchsia-600 hover:bg-fuchsia-700"
          >
            {addMutation.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Plus className="h-4 w-4" />}
            Adicionar chave
          </Button>
        </div>

        {/* List */}
        <div className="space-y-2">
          {isLoading && <Loader2 className="h-5 w-5 animate-spin text-slate-400 mx-auto" />}
          {!isLoading && keys.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">
              Nenhuma chave cadastrada. Só a Lovable AI será usada.
            </p>
          )}
          {keys.map((k) => (
            <div
              key={k.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 dark:border-slate-800 p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{k.label}</p>
                <p className="text-xs text-slate-500 truncate">
                  {PROVIDER_LABELS[k.provider as Provider]} · {k.model}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Badge variant={k.is_active ? "default" : "secondary"} className="text-[10px]">
                  {k.is_active ? "Ativa" : "Pausada"}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => toggleMutation.mutate({ id: k.id, is_active: !k.is_active })}
                  title={k.is_active ? "Pausar" : "Ativar"}
                >
                  <Power className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-rose-500 hover:text-rose-600"
                  onClick={() => deleteMutation.mutate(k.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
