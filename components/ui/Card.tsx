// components/ui/Card.tsx
import React from 'react';
import { cn } from "@/lib/utils";

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-solid border-[var(--border-color)] bg-[var(--card-background)] p-4 text-[var(--foreground)]",
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export function CardHeader({ className, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn("mb2", className)}
      {...props}
    />
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">
      {children}
    </h3>
  );
}

export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("text-[var(--muted-text)]", className)}>
      {children}
    </div>
  );
}