
import * as React from "react";
import { Link } from "@tanstack/react-router";
import { 
  LayoutDashboard, 
  Search,
  Bell,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sun,
  Moon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/hooks/useTheme";
import logo from "@/assets/logo.jpg";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * DashboardLayout (Adaptive & Ergonomic)
 * Implementa uma arquitetura fluida com sidebar inteligente:
 * - Desktop: Sidebar persistente com toggle de expansão.
 * - Mobile: Sidebar transformada em Drawer (Sheet) para maximizar área útil.
 * Targets de toque otimizados (mínimo 44px).
 */
export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, isAdmin, signOut, authLogs } = useAuth();
  const isMobile = useIsMobile();
  const [isSidebarExpanded, setIsSidebarExpanded] = React.useState(true);
  const [showLogs, setShowLogs] = React.useState(false);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      <div className="flex h-20 items-center px-6 border-b shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-xl overflow-hidden shadow-lg shadow-fuchsia-200 ring-2 ring-white">
            <img src={logo} alt="Maleta de Métricas" className="h-full w-full object-cover" />
          </div>
          {(isSidebarExpanded || isMobile) && (
            <div className="flex flex-col animate-in fade-in duration-300">
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-50 leading-none">Maleta de Métricas</span>
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-1">Performance Pro</span>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 mt-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {navigation.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            onClick={() => isMobile && setIsSheetOpen(false)}
            className={cn(
              "group flex items-center rounded-lg px-3 h-11 text-sm font-medium transition-all",
              "text-slate-600 hover:bg-fuchsia-50 hover:text-fuchsia-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
            )}
          >
            <item.icon className={cn("h-5 w-5 shrink-0", (isSidebarExpanded || isMobile) ? "mr-3" : "mx-auto")} />
            {(isSidebarExpanded || isMobile) && <span>{item.name}</span>}
          </Link>
        ))}
      </nav>
      
      <div className="p-4 border-t space-y-2">
        {!isMobile && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-slate-400 hover:text-slate-600 h-10 px-3"
            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
          >
            {isSidebarExpanded ? <ChevronLeft className="mr-3 h-4 w-4" /> : <ChevronRight className="mx-auto h-4 w-4" />}
            {isSidebarExpanded && "Recolher"}
          </Button>
        )}
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start text-rose-500 hover:bg-rose-50 hover:text-rose-600 h-10 px-3"
          onClick={() => {
            signOut();
            toast.success("Sessão encerrada");
          }}
        >
          <LogOut className={cn("h-4 w-4 shrink-0", (isSidebarExpanded || isMobile) ? "mr-3" : "mx-auto")} />
          {(isSidebarExpanded || isMobile) && "Sair do Sistema"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside 
          className={cn(
            "fixed left-0 top-0 z-40 h-screen transition-all duration-300 border-r bg-white dark:bg-slate-900",
            isSidebarExpanded ? "w-64" : "w-20"
          )}
        >
          <SidebarContent />
        </aside>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent side="left" className="p-0 w-[280px] border-r-0">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      )}

      {/* Main Viewport */}
      <div className={cn(
        "flex-1 flex flex-col min-h-screen transition-all duration-300 w-full",
        !isMobile && (isSidebarExpanded ? "pl-64" : "pl-20")
      )}>
        {/* Responsive Header */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b bg-white/80 dark:bg-slate-900/80 px-4 md:px-8 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-4 flex-1">
            {isMobile && (
              <Button variant="ghost" size="icon" className="h-10 w-10 -ml-2" onClick={() => setIsSheetOpen(true)}>
                <Menu className="h-6 w-6 text-slate-600" />
              </Button>
            )}
            <div className="relative group flex-1 max-w-sm hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-fuchsia-500 transition-colors" />
              <Input 
                type="search" 
                placeholder="Pesquisar..." 
                className="pl-10 bg-slate-100/50 border-none h-10 focus-visible:ring-1 focus-visible:ring-fuchsia-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 text-slate-400 hover:text-fuchsia-600"
              onClick={() => setShowLogs(!showLogs)}
            >
              <Search className="h-5 w-5 sm:hidden" /> {/* Mobile search toggle icon would go here, using Search as placeholder */}
              <Bell className="h-5 w-5 hidden sm:block" />
            </Button>
            
            <div className="flex items-center gap-3 pl-2 md:pl-4 border-l">
              <div className="text-right hidden lg:block">
                <p className="text-sm font-bold text-slate-900 truncate max-w-[150px]">{profile?.email || "Usuário"}</p>
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter">{isAdmin ? "Gestor" : "Cliente"}</p>
              </div>
              <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                <AvatarImage src={logo} className="object-cover" />
                <AvatarFallback className="bg-fuchsia-100 text-fuchsia-700 text-xs">MM</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Dynamic Content Area */}
        <div className="p-4 md:p-8 flex-1 w-full max-w-[1600px] mx-auto overflow-x-hidden min-w-0">
          {showLogs && (
            <div className="mb-6 p-4 bg-slate-900 text-slate-50 rounded-xl text-xs font-mono border-l-4 border-fuchsia-500 shadow-2xl animate-in slide-in-from-top duration-300">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-fuchsia-400 uppercase tracking-widest">Painel de Diagnóstico</span>
                <Button variant="ghost" size="sm" className="h-7 text-[10px] hover:bg-slate-800" onClick={() => setShowLogs(false)}>Fechar</Button>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                {authLogs.length === 0 && <p className="text-slate-500 italic">Aguardando telemetria...</p>}
                {authLogs.map((log, i) => (
                  <div key={i} className="flex gap-3 py-1 border-b border-slate-800/50 last:border-0">
                    <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                    <span className="break-words">{log.event}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

