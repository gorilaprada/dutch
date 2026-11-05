import type { ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

type ActionButtonProps = {
  children: ReactNode;
  onClick: () => void;
  // primary is magenta: reserved for the one hero action on screen (the Dutch call)
  variant?: Variant;
  disabled?: boolean;
  pressed?: boolean;
  title?: string;
};

export function ActionButton({
  children,
  onClick,
  variant = "secondary",
  disabled = false,
  pressed,
  title,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      className={`btn btn-${variant}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      title={title}
    >
      {children}
    </button>
  );
}
