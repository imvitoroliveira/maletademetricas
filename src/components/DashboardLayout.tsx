
import * as React from "react";
import { Link } from "@tanstack/react-router";
import { 
  LayoutDashboard, 
  BarChart3, 
  Settings, 
  Users, 
  Target, 
  PieChart, 
  TrendingUp,
  Search,
  Bell,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, isAdmin } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Campanhas', href: '/campanhas', icon: Target },
    { name: 'Métricas', href: '/metricas', icon: BarChart3 },
    { name: 'Públicos', href: '/publicos', icon: Users },
    { name: 'Relatórios', href: '/relatorios', icon: PieChart },
    { name: 'Configurações', href: '/configuracoes', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed left-0 top-0 z-40 h-screen transition-all duration-300 border-r bg-white dark:bg-slate-900",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="flex h-20 items-center px-6 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-none">
              <TrendingUp className="h-6 w-6" />
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 leading-none">TrafficDash</span>
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-1">Analytics Pro</span>
              </div>
            )}
          </div>
        </div>

        <nav className="mt-4 px-3 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "group flex items-center rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50 transition-colors",
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", isSidebarOpen ? "mr-3" : "mx-auto")} />
              {isSidebarOpen && <span>{item.name}</span>}
            </Link>
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

      {/* Main Content */}
      <main className={cn(
        "transition-all duration-300 min-h-screen",
        isSidebarOpen ? "pl-64" : "pl-20"
      )}>
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b bg-white/50 dark:bg-slate-900/50 px-8 backdrop-blur-xl">
          <div className="flex-1 max-w-md">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <Input 
                type="search" 
                placeholder="Pesquisar métricas ou campanhas..." 
                className="pl-10 bg-slate-100/50 border-none dark:bg-slate-800/50 focus-visible:ring-1 focus-visible:ring-indigo-500 h-10"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-slate-500 hover:text-rose-600 mr-2"
              onClick={() => {
                supabase.auth.signOut();
                toast.success("Sessão encerrada");
              }}
            >
              Sair
            </Button>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-slate-500" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 border-2 border-white dark:border-slate-900"></span>
            </Button>
            <div className="flex items-center gap-3 pl-4 border-l">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium leading-none">{profile?.email || "Usuário"}</p>
                <p className="text-xs text-muted-foreground mt-1">{isAdmin ? "Gestor de Tráfego" : "Cliente"}</p>
              </div>
              <Avatar>
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>GT</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
