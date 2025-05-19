import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { OrderStatus } from "@shared/schema";

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        new: "bg-red-100 text-red-800 border-red-200",
        "in-progress": "bg-yellow-100 text-yellow-800 border-yellow-200",
        ready: "bg-green-100 text-green-800 border-green-200",
      },
      animated: {
        true: "animate-pulse",
        false: "",
      },
    },
    defaultVariants: {
      variant: "new",
      animated: false,
    },
  }
);

const statusTextMap: Record<OrderStatus, string> = {
  new: "新規",
  "in-progress": "調理中",
  ready: "完了",
};

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  status: OrderStatus;
}

export function StatusBadge({
  status,
  animated,
  className,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(statusBadgeVariants({ variant: status, animated, className }))}
      {...props}
    >
      {statusTextMap[status] || status}
    </span>
  );
}
