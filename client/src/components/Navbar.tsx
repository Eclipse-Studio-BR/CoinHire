import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Briefcase, Building2, User, LogOut, Settings, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getInitials } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function Navbar() {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const { toast } = useToast();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Signed out" });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer" data-testid="link-home">
                <Briefcase className="w-6 h-6 text-primary" />
                <span className="font-bold text-xl">Web3 Jobs</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <Link href="/jobs" className={`text-sm font-medium transition-colors hover:text-primary ${location === '/jobs' ? 'text-foreground' : 'text-muted-foreground'}`} data-testid="link-jobs">
                Find Jobs
              </Link>
              <Link href="/companies" className={`text-sm font-medium transition-colors hover:text-primary ${location === '/companies' ? 'text-foreground' : 'text-muted-foreground'}`} data-testid="link-companies">
                Companies
              </Link>
              {isAuthenticated && user?.role === 'employer' && (
                <Link href="/post-job" className={`text-sm font-medium transition-colors hover:text-primary ${location === '/post-job' ? 'text-foreground' : 'text-muted-foreground'}`} data-testid="link-post-job">
                  Post a Job
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {!isAuthenticated ? (
              <>
                <Button variant="ghost" asChild data-testid="button-login">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild data-testid="button-register">
                  <Link href="/register">Sign Up</Link>
                </Button>
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full" data-testid="button-user-menu">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.email || 'User'} className="object-cover" />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {getInitials(user?.firstName, user?.lastName, user?.email)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none" data-testid="text-user-name">
                        {user?.firstName && user?.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : user?.email || 'User'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground" data-testid="text-user-email">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="flex items-center w-full" data-testid="link-dashboard">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  {user?.role === 'talent' && (
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex items-center w-full" data-testid="link-profile">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {user?.role === 'employer' && (
                    <DropdownMenuItem asChild>
                      <Link href="/company" className="flex items-center w-full" data-testid="link-company">
                        <Building2 className="mr-2 h-4 w-4" />
                        <span>My Company</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center w-full" data-testid="link-settings">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      if (!logoutMutation.isPending) {
                        logoutMutation.mutate();
                      }
                    }}
                    data-testid="link-logout"
                    className="flex items-center w-full"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{logoutMutation.isPending ? "Signing out..." : "Log out"}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
