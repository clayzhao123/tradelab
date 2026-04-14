import { CircleHelp } from "lucide-react";

type PanelInfoButtonProps = {
  label: string;
};

export function PanelInfoButton({ label }: PanelInfoButtonProps) {
  return (
    <div className="relative group">
      <button
        type="button"
        className="h-6 w-6 rounded-full border border-border-subtle bg-page text-tx-tertiary flex items-center justify-center hover:text-tx-primary hover:border-border-default"
        aria-label={label}
      >
        <CircleHelp size={14} />
      </button>
      <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-[240px] rounded-lg border border-border-subtle bg-page px-3 py-2 text-[11px] leading-relaxed text-tx-secondary shadow-md opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
        {label}
      </div>
    </div>
  );
}
