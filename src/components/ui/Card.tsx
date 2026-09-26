import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "flat" | "bordered";
}

export function Card({
  className,
  variant = "default",
  children,
  ...props
}: CardProps) {
  const variantStyles = {
    default:
      "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm",
    elevated:
      "bg-white dark:bg-slate-900 shadow-md shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800",
    flat: "bg-slate-100 dark:bg-slate-850",
    bordered: "border-2 border-slate-200 dark:border-slate-800 bg-transparent",
  };

  return (
    <div
      className={cn("rounded-2xl p-4 sm:p-5", variantStyles[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
}
