import * as React from "react";
import {
  LayoutDashboard,
  Users,
  Target,
  Settings,
  TrendingUp,
  Search,
  Bell,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

type AuthLog = { event: string; timestamp: string };

interface DashboardLayoutProps {
  children: React.ReactNode;
  profile: any;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  authLogs: AuthLog[];
}

export function DashboardLayout({ children, profile, isAdmin, signOut, authLogs }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [showLogs, setShowLogs] = React.useState(false);

  const navigation = [
    { name: "Dashboard", icon: LayoutDashboard, tab: "overview" },
    { name: "Meu Perfil", icon: Users, tab: "profile" },
    ...(isAdmin
      ? [
          { name: "Gestao de Clientes", icon: Target, tab: "users" },
          { name: "Configuracoes", icon: Settings, tab: "config" },
        ]
      : []),
  ];

  const handleSignOut = async () => {
    await signOut();
    toast.success("Sessao encerrada");
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950">
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen transition-all duration-300 border-r bg-white dark:bg-slate-900",
          isSidebarOpen ? "w-64" : "w-20",
        )}
      >
        <div className="flex h-20 items-center px-6 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-none">
              <TrendingUp className="h-6 w-6" />
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 leading-none">
                  TrafficDash
                </span>
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-1">
                  Analytics Pro
                </span>
              </div>
            )}
          </div>
        </div>

        <nav className="mt-4 px-3 space-y-1">
          {navigation.map((item) => (
            <button
              key={item.name}
              className={cn(
                "group flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50 transition-colors",
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", isSidebarOpen ? "mr-3" : "mx-auto")} />
              {isSidebarOpen && <span>{item.name}</span>}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-4 left-0 w-full px-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-slate-500 hover:text-slate-900"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X className="mr-2 h-4 w-4" /> : <Menu className="mx-auto h-5 w-5" />}
            {isSidebarOpen && "Recolher Menu"}
          </Button>
        </div>
      </aside>

      <main
        className={cn(
          "transition-all duration-300 min-h-screen",
          isSidebarOpen ? "pl-64" : "pl-20",
        )}
      >
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b bg-white/50 dark:bg-slate-900/50 px-8 backdrop-blur-xl">
          <div className="flex-1 max-w-md">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
              <Input
                type="search"
                placeholder="Pesquisar metricas ou campanhas..."
                className="pl-10 bg-slate-100/50 border-none dark:bg-slate-800/50 focus-visible:ring-1 focus-visible:ring-sky-500 h-10"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-[10px] text-slate-300 hover:text-sky-500"
              onClick={() => setShowLogs(!showLogs)}
            >
              Logs
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-500 hover:text-rose-600 mr-2"
              onClick={handleSignOut}
            >
              Sair
            </Button>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-slate-500" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 border-2 border-white dark:border-slate-900"></span>
            </Button>
            <div className="flex items-center gap-3 pl-4 border-l">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium leading-none">{profile?.email || "Usuario"}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isAdmin ? "Gestor de Trafego" : "Cliente"}
                </p>
              </div>
              <Avatar>
                <AvatarFallback>{isAdmin ? "GT" : "CL"}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        <div className="p-8">
          {showLogs && (
            <div className="mb-6 p-4 bg-slate-900 text-slate-50 rounded-lg text-xs font-mono border-l-4 border-sky-500 shadow-xl animate-in slide-in-from-top duration-300">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-sky-400">PAINEL DE DIAGNOSTICO AUTH</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={() => setShowLogs(false)}
                >
                  Ocultar
                </Button>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {authLogs.length === 0 && <p className="text-slate-500">Nenhum evento registrado.</p>}
                {authLogs.map((log, i) => (
                  <div key={i} className="flex gap-4 border-b border-slate-800 pb-1">
                    <span className="text-slate-500">[{log.timestamp}]</span>
                    <span>{log.event}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
