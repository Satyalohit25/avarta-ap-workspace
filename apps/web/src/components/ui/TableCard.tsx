import { ReactNode } from "react";
import { Card, CardProps } from "./Card";
import { cn } from "../../lib/utils";

export interface TableCardProps extends CardProps {
  children: ReactNode;
  className?: string;
}

/**
 * @deprecated Use `<Card level="surface" className="overflow-hidden">` directly.
 */
export function TableCard({ children, className, ...props }: TableCardProps) {
  return (
    <Card level="surface" className={cn("overflow-hidden", className)} {...props}>
      {children}
    </Card>
  );
}

