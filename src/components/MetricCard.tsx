import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  className?: string;
}

/**
 * MetricCard Engine (Optimized)
 * Usa React.memo para evitar re-renders desnecessários em dashboards de alta frequência.
 * Implementa micro-animações para melhor feedback de UX.
 */
export const MetricCard = React.memo(({ title, value, description, trend, icon, className }: MetricCardProps) => {
  return (
    <Card className={cn(
      "group relative overflow-hidden card-lift",
      "border border-border/60 shadow-soft bg-card",
      className
    )}>
      {/* Subtle accent wash that intensifies on hover */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-fuchsia-500/5 blur-2xl transition-opacity duration-500 group-hover:opacity-100 opacity-60" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</CardTitle>
        {icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-fuchsia-50 text-fuchsia-600 transition-all duration-300 group-hover:bg-fuchsia-600 group-hover:text-white group-hover:shadow-glow dark:bg-fuchsia-500/10 dark:text-fuchsia-400">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">{value}</div>
        {(description || trend) && (
          <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
            {trend && (
              <span className={cn(
                "inline-flex items-center rounded-full px-1.5 py-0.5 font-semibold",
                trend.isPositive ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
              )}>
                {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
              </span>
            )}
            <span className="opacity-80">{description}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
});

MetricCard.displayName = "MetricCard";

