import { LayoutDashboard, Users, Clapperboard, ShieldCheck, Plug, UserCircle, type LucideIcon } from "lucide-react";

export type DashboardTabId =
  | "overview"
  | "users"
  | "accounts"
  | "reels"
  | "vault"
  | "profile";

export interface DashboardTab {
  id: DashboardTabId;
  name: string;
  icon: LucideIcon;
  adminOnly: boolean;
}

export const DASHBOARD_TABS: readonly DashboardTab[] = [
  { id: "overview", name: "Visão Geral", icon: LayoutDashboard, adminOnly: false },
  { id: "users", name: "Gestão de Clientes", icon: Users, adminOnly: true },
  { id: "accounts", name: "Contas de Anúncio", icon: Plug, adminOnly: true },
  { id: "reels", name: "Roteiro de Reels", icon: Clapperboard, adminOnly: true },
  { id: "vault", name: "Cofre", icon: ShieldCheck, adminOnly: true },
  { id: "profile", name: "Meu Perfil", icon: UserCircle, adminOnly: false },
] as const;

export function getAvailableTabs(isAdmin: boolean): DashboardTab[] {
  return DASHBOARD_TABS.filter((t) => isAdmin || !t.adminOnly);
}

export function resolveTab(requested: string | undefined, isAdmin: boolean): DashboardTabId {
  const available = getAvailableTabs(isAdmin);
  const match = available.find((t) => t.id === requested);
  return match ? match.id : "overview";
}
