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

  // Only render for super admins
  if (!isSuperAdmin) {
    return null;
  }

  const activeCompany = companies.find(c => c.id === activeCompanyId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between gap-2 h-auto py-2 px-3 bg-card border-border hover:bg-muted transition-all"
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-amber-500/20 dark:text-amber-200">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-xs text-muted-foreground font-medium">God Mode</span>
              <span className="text-sm font-semibold text-foreground truncate max-w-[140px]">
                {activeCompany?.name || "Selecionar..."}
              </span>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 bg-card border-border shadow-lg">
        <DropdownMenuLabel className="flex items-center gap-2 text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          Trocar Empresa
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {companies.length === 0 && (
          <div className="px-2 py-2 text-xs text-muted-foreground">Nenhuma empresa disponível</div>
        )}
        {companies.map((company) => (
          <DropdownMenuItem
            key={company.id}
            onClick={() => switchCompany(company.id)}
            className={`flex items-center justify-between cursor-pointer ${
              company.id === activeCompanyId 
                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-white" 
                : "text-foreground hover:bg-muted"
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
                <div className="h-6 w-6 rounded bg-muted flex items-center justify-center">
                  <Building2 className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-medium">{company.name}</span>
                <Badge 
                  variant="secondary" 
                  className="text-[10px] px-1 py-0 h-4 w-fit bg-muted text-muted-foreground"
                >
                  {company.plan}
                </Badge>
              </div>
            </div>
            {company.id === activeCompanyId && (
              <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
