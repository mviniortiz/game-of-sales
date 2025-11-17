import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { OnboardingButton } from "@/components/onboarding/OnboardingButton";

export const AppHeader = () => {
  const { user, isAdmin, signOut } = useAuth();

  const getUserInitials = () => {
    if (!user?.email) return "U";
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <header className="h-16 border-b border-border/50 bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="lg:hidden" />
        <div className="hidden lg:block">
          <h2 className="text-lg font-semibold">Dashboard</h2>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <OnboardingButton />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 rounded-full px-4 gap-2">
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:inline-flex items-center gap-1">
                {user?.email?.split("@")[0]}
                {isAdmin && <span className="text-xs">👑 Admin</span>}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">Minha Conta</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
