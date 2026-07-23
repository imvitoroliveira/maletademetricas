
import * as React from "react";
import {
  Bell,
  Menu,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sun,
  Moon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/hooks/useTheme";
import logo from "@/assets/logo.jpg";
import { getAvailableTabs, type DashboardTab, type DashboardTabId } from "@/lib/dashboard-tabs";

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab?: DashboardTabId;
  onTabChange?: (tab: DashboardTabId) => void;
  tabs?: readonly DashboardTab[];
}

/**
 * DashboardLayout (Adaptive & Ergonomic)
 * Recebe a lista de abas já filtrada por role para manter a navegação
 * (sidebar/drawer) e o conteúdo em sincronia com um único array.
 */
export function DashboardLayout({ children, activeTab = "overview", onTabChange, tabs }: DashboardLayoutProps) {
  const { profile, isAdmin, signOut } = useAuth();
  const isMobile = useIsMobile();
  const { isDark, toggleTheme } = useTheme();
  const [isSidebarExpanded, setIsSidebarExpanded] = React.useState(true);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

  const navigation = tabs ?? getAvailableTabs(isAdmin);

  const handleNavigate = (tab: DashboardTabId) => {
    onTabChange?.(tab);
    if (isMobile) setIsSheetOpen(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      <div className="flex h-20 items-center px-6 border-b border-border/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-xl overflow-hidden shadow-glow ring-2 ring-white/60 dark:ring-white/10">
            <img src={logo} alt="Maleta de Métricas" className="h-full w-full object-cover" />
          </div>
          {(isSidebarExpanded || isMobile) && (
            <div className="flex flex-col animate-in fade-in duration-300">
              <span className="font-display text-base font-bold tracking-tight text-foreground leading-none">Maleta de Métricas</span>
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.18em] mt-1">Performance Pro</span>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 mt-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {navigation.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavigate(item.id)}
              className={cn(
                "group flex w-full items-center rounded-lg px-3 h-11 text-sm font-medium transition-all",
                isActive
                  ? "bg-fuchsia-50 text-fuchsia-600 dark:bg-slate-800 dark:text-fuchsia-400"
                  : "text-slate-600 hover:bg-fuchsia-50 hover:text-fuchsia-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", (isSidebarExpanded || isMobile) ? "mr-3" : "mx-auto")} />
              {(isSidebarExpanded || isMobile) && <span>{item.name}</span>}
            </button>
          );
        })}
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
    <div className="min-h-dvh bg-slate-50/50 dark:bg-slate-950 flex w-full overflow-x-hidden">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside 
          className={cn(
            "fixed left-0 top-0 z-40 h-dvh transition-all duration-300 border-r bg-white dark:bg-slate-900",
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
        "flex-1 flex flex-col min-h-dvh transition-all duration-300 w-full min-w-0",
        !isMobile && (isSidebarExpanded ? "pl-64" : "pl-20")
      )}>
        {/* Responsive Header */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-border/60 glass-panel px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            {isMobile && (
              <Button variant="ghost" size="icon" className="h-10 w-10 -ml-2" onClick={() => setIsSheetOpen(true)}>
                <Menu className="h-6 w-6 text-slate-600" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-slate-400 hover:text-fuchsia-600 dark:hover:text-fuchsia-400"
              onClick={toggleTheme}
              aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
              title={isDark ? "Modo claro" : "Modo escuro"}
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 text-slate-400 hover:text-fuchsia-600"
              aria-label="Notificações"
            >
              <Bell className="h-5 w-5" />
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
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

