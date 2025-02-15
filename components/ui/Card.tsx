// components/ui/Card.tsx
import React from 'react';
import { cn } from "@/lib/utils";

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border shadow-sm p-4 bg-white ${className}`}>
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
    <h3 className="text-lg font-semibold text-gray-800 mb-1">
      {children}
    </h3>
  );
}

export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`text-gray-600 ${className}`}>
      {children}
    </div>
  );
}