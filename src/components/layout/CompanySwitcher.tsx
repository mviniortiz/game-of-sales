import { Building2, ChevronDown, Check, Sparkles } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function CompanySwitcher() {
  const { activeCompanyId, companies, switchCompany, isSuperAdmin, loading } = useTenant();

  // Only render for super admins with multiple companies
  if (!isSuperAdmin || companies.length <= 1) {
    return null;
  }

  const activeCompany = companies.find(c => c.id === activeCompanyId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between gap-2 h-auto py-2 px-3 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/50 transition-all"
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/20">
              <Building2 className="h-4 w-4 text-amber-400" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-xs text-amber-400/70 font-medium">God Mode</span>
              <span className="text-sm font-semibold text-white truncate max-w-[140px]">
                {activeCompany?.name || "Selecionar..."}
              </span>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-amber-400/70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 bg-slate-900 border-white/10">
        <DropdownMenuLabel className="flex items-center gap-2 text-amber-400">
          <Sparkles className="h-4 w-4" />
          Trocar Empresa
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        {companies.map((company) => (
          <DropdownMenuItem
            key={company.id}
            onClick={() => switchCompany(company.id)}
            className={`flex items-center justify-between cursor-pointer ${
              company.id === activeCompanyId 
                ? "bg-indigo-500/10 text-indigo-400" 
                : "text-slate-300 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2">
              {company.logo_url ? (
                <img 
                  src={company.logo_url} 
                  alt={company.name} 
                  className="h-6 w-6 rounded object-cover"
                />
              ) : (
                <div className="h-6 w-6 rounded bg-slate-700 flex items-center justify-center">
                  <Building2 className="h-3 w-3 text-slate-400" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-medium">{company.name}</span>
                <Badge 
                  variant="secondary" 
                  className="text-[10px] px-1 py-0 h-4 w-fit bg-slate-800 text-slate-400"
                >
                  {company.plan}
                </Badge>
              </div>
            </div>
            {company.id === activeCompanyId && (
              <Check className="h-4 w-4 text-indigo-400" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
