import { memo } from "react";
import { X } from "lucide-react";

interface DealTagBadgeProps {
  tag: { id: string; name: string; color: string };
  onRemove?: () => void;
}

export const DealTagBadge = memo(({ tag, onRemove }: DealTagBadgeProps) => {
  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium leading-none max-w-[120px]"
      style={{
        backgroundColor: `${tag.color}26`,
        color: tag.color,
        border: `1px solid ${tag.color}40`,
      }}
    >
      <span className="truncate">{tag.name}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onRemove();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="flex-shrink-0 ml-0.5 rounded-full p-0.5 hover:bg-white/20 transition-colors"
          aria-label={`Remover tag ${tag.name}`}
        >
          <X className="h-2 w-2" />
        </button>
      )}
    </span>
  );
});

DealTagBadge.displayName = "DealTagBadge";
