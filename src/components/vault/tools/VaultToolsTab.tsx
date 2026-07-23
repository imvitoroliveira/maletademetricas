import { useState } from "react";
import {
  ClipboardCheck,
  Flame,
  IdCard,
  MessageSquare,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DocumentForgeTool } from "./DocumentForgeTool";

type ToolId =
  | "documento"
  | "checklist"
  | "aquecimento"
  | "diagnostico"
  | "appeals";

const TOOLS: Array<{
  id: ToolId;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "ready" | "soon";
}> = [
  {
    id: "documento",
    title: "Gerador de mockup de documento",
    description:
      "Cria uma imagem estilizada de documento (RG, CNH, comprovante) com dados do personagem para uso como referência visual.",
    icon: IdCard,
    status: "ready",
  },
  {
    id: "checklist",
    title: "Checklist de criação de perfil",
    description:
      "Passo a passo interativo (fingerprint, cookies, IP, aquecimento inicial) com progresso salvo por perfil.",
    icon: ClipboardCheck,
    status: "soon",
  },
  {
    id: "aquecimento",
    title: "Plano de aquecimento",
    description:
      "Cronograma diário de ações (scroll, curtidas, grupos, marketplace) para esquentar contas em 7/14/30 dias.",
    icon: Flame,
    status: "soon",
  },
  {
    id: "diagnostico",
    title: "Diagnóstico de bloqueio",
    description:
      "Fluxo de perguntas que identifica o tipo de bloqueio (BM, conta pessoal, anúncio, política) e sugere o plano de recuperação.",
    icon: ShieldAlert,
    status: "soon",
  },
  {
    id: "appeals",
    title: "Biblioteca de respostas para appeals",
    description:
      "Templates prontos (identidade, política, cobrança, reativação de BM) para copiar/colar com variáveis.",
    icon: MessageSquare,
    status: "soon",
  },
];

export function VaultToolsTab() {
  const [active, setActive] = useState<ToolId | null>(null);

  if (active === "documento") {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActive(null)}
          className="text-slate-500"
        >
          ← Voltar para ferramentas
        </Button>
        <DocumentForgeTool />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Sparkles className="h-4 w-4 text-fuchsia-600" />
        Ferramentas para acelerar criação, aquecimento e contingência de perfis.
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          const isReady = t.status === "ready";
          return (
            <Card
              key={t.id}
              className={
                "border-none shadow-sm bg-white dark:bg-slate-900 p-5 flex flex-col gap-3 transition-shadow " +
                (isReady
                  ? "cursor-pointer hover:shadow-md hover:ring-1 hover:ring-fuchsia-200"
                  : "opacity-70")
              }
              onClick={() => isReady && setActive(t.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="h-10 w-10 rounded-lg bg-fuchsia-50 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-fuchsia-600" />
                </div>
                {isReady ? (
                  <Badge className="bg-fuchsia-600 hover:bg-fuchsia-600">
                    Disponível
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-slate-500 border-slate-200"
                  >
                    Em breve
                  </Badge>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-50 leading-tight">
                  {t.title}
                </h3>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  {t.description}
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
