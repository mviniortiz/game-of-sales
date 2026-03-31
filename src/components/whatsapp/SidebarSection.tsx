import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

export const SidebarSection = ({ title, icon: Icon, children, defaultOpen = true, badge }: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    defaultOpen?: boolean;
    badge?: React.ReactNode;
}) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-white/[0.04] last:border-b-0">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors"
            >
                <div className="flex items-center gap-2 min-w-0">
                    <Icon className="w-3.5 h-3.5 text-emerald-500/70 shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/80 truncate">{title}</span>
                    {badge}
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground/40 transition-transform duration-200 ${open ? "" : "-rotate-90"}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-out ${open ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}>
                <div className="px-4 pb-3.5">{children}</div>
            </div>
        </div>
    );
};
