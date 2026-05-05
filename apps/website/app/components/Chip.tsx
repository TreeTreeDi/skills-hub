interface ChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function Chip({ label, active = false, onClick }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className={`
        inline-block rounded-sm px-3.5 py-2 font-card-heading text-sm transition-colors
        ${
          active
            ? "bg-coral text-canvas"
            : "bg-transparent text-coral border border-coral-soft hover:bg-coral hover:text-canvas"
        }
      `}
    >
      {label}
    </button>
  );
}
