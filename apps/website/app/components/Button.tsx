import { type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "pill-outline";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary rounded-pill px-6 py-3 font-body text-sm font-medium hover:opacity-90 transition-opacity",
  secondary:
    "bg-transparent text-ink underline underline-offset-4 font-body text-base hover:text-action-blue transition-colors",
  "pill-outline":
    "bg-transparent text-primary border border-primary rounded-xl px-3 py-1.5 font-body text-sm font-medium hover:bg-primary hover:text-on-primary transition-colors",
};

export function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  return (
    <button className={`${variantStyles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
