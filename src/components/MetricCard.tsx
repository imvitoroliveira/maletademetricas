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
      "overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5", 
      "border-none shadow-sm bg-white dark:bg-slate-900",
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</CardTitle>
        {icon && <div className="text-slate-400 group-hover:text-fuchsia-500 transition-colors">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{value}</div>
        {(description || trend) && (
          <p className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
            {trend && (
              <span className={cn(
                "inline-flex items-center rounded-full px-1.5 py-0.5 font-medium",
                trend.isPositive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
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

