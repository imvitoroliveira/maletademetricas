import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  Plus,
  Trash2,
  Send,
  Loader2,
  MessageSquare,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { AIProviderKeys } from "@/components/AIProviderKeys";

type Conversation = { id: string; title: string; updated_at: string };
type Message = { id: string; role: "user" | "assistant" | "system"; content: string; model?: string | null };

export function AIChat() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversations = [] } = useQuery({
    queryKey: ["ai_conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_conversations")
        .select("id, title, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Conversation[];
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["ai_messages", activeId],
    queryFn: async () => {
      if (!activeId) return [];
      const { data, error } = await supabase
        .from("ai_messages")
        .select("id, role, content, model")
        .eq("conversation_id", activeId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!activeId,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isThinking]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [activeId]);

  const newConversation = () => {
    setActiveId(null);
    setInput("");
    textareaRef.current?.focus();
  };

  const deleteConversation = async (id: string) => {
    const { error } = await supabase.from("ai_conversations").delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir: " + error.message);
    if (activeId === id) setActiveId(null);
    queryClient.invalidateQueries({ queryKey: ["ai_conversations"] });
    toast.success("Conversa excluída.");
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isThinking || !user) return;

    let convId = activeId;
    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    try {
      setIsThinking(true);
      setInput("");

      // Cria a conversa na primeira mensagem.
      if (!convId) {
        const { data: conv, error: convErr } = await supabase
          .from("ai_conversations")
          .insert([{ user_id: user.id, title: text.slice(0, 60) }])
          .select("id")
          .single();
        if (convErr) throw convErr;
        convId = conv.id;
        setActiveId(convId);
        queryClient.invalidateQueries({ queryKey: ["ai_conversations"] });
      }

      // Salva a mensagem do usuário.
      await supabase.from("ai_messages").insert([
        { conversation_id: convId, role: "user", content: text },
      ]);
      queryClient.invalidateQueries({ queryKey: ["ai_messages", convId] });

      // Chama a I.A. (com rotação de chaves no servidor) via fetch direto.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada. Faça login novamente.");

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ messages: [...history, { role: "user", content: text }] }),
        },
      );
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || data?.error) throw new Error(data?.error || `Erro ${resp.status}`);

      await supabase.from("ai_messages").insert([
        { conversation_id: convId, role: "assistant", content: data.text, model: data.model },
      ]);
      await supabase
        .from("ai_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", convId);

      queryClient.invalidateQueries({ queryKey: ["ai_messages", convId] });
      queryClient.invalidateQueries({ queryKey: ["ai_conversations"] });
    } catch (err) {
      toast.error("Erro na I.A.: " + (err as Error).message);
      setInput(text);
    } finally {
      setIsThinking(false);
      textareaRef.current?.focus();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100dvh-12rem)] min-h-[480px]">
      {/* Sidebar de conversas */}
      <aside className="lg:w-72 shrink-0 flex flex-col gap-3 rounded-2xl border border-border/60 bg-white dark:bg-slate-900 p-3">
        <Button onClick={newConversation} className="gap-2 bg-fuchsia-600 hover:bg-fuchsia-700">
          <Plus className="h-4 w-4" />
          Nova conversa
        </Button>
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 -mx-1 px-1">
          {conversations.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-6">Nenhuma conversa ainda.</p>
          )}
          {conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={cn(
                "group flex items-center gap-2 rounded-lg px-3 h-11 text-sm cursor-pointer transition-colors",
                activeId === c.id
                  ? "bg-fuchsia-50 text-fuchsia-700 dark:bg-slate-800 dark:text-fuchsia-300"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
              )}
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span className="truncate flex-1">{c.title}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-opacity"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <AIProviderKeys />
      </aside>

      {/* Área do chat */}
      <section className="flex-1 flex flex-col rounded-2xl border border-border/60 bg-white dark:bg-slate-900 overflow-hidden min-w-0">
        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-6">
          {messages.length === 0 && !isThinking && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-gradient-accent flex items-center justify-center text-white shadow-glow">
                <Sparkles className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                Assistente de I.A.
              </h3>
              <p className="text-sm max-w-sm">
                Pergunte sobre campanhas, criativos, copy ou estratégia. Usa suas chaves com
                rotação automática e Lovable AI como reserva.
              </p>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}
            >
              {m.role === "assistant" && (
                <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-accent flex items-center justify-center text-white">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  m.role === "user"
                    ? "bg-fuchsia-600 text-white rounded-br-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-sm",
                )}
              >
                {m.role === "assistant" ? (
                  <div className="markdown-body [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_pre]:bg-slate-900 [&_pre]:text-slate-50 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-2 [&_code]:text-xs [&_a]:text-fuchsia-600 [&_a]:underline [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-semibold [&_strong]:font-semibold">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    {m.model && (
                      <span className="block mt-2 text-[10px] text-slate-400">via {m.model}</span>
                    )}
                  </div>
                ) : (
                  <span className="whitespace-pre-wrap">{m.content}</span>
                )}
              </div>
              {m.role === "user" && (
                <div className="w-8 h-8 shrink-0 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-200">
                  <UserIcon className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {isThinking && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-accent flex items-center justify-center text-white">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Pensando...</span>
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-border/60 p-3 md:p-4">
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Escreva sua mensagem... (Enter envia, Shift+Enter quebra linha)"
              className="resize-none min-h-[48px] max-h-40 flex-1"
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isThinking}
              size="icon"
              className="h-12 w-12 shrink-0 bg-fuchsia-600 hover:bg-fuchsia-700"
            >
              {isThinking ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
