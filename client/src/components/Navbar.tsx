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

export function Navbar() {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();

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
              <Link href="/jobs">
                <a className={`text-sm font-medium transition-colors hover:text-primary ${location === '/jobs' ? 'text-foreground' : 'text-muted-foreground'}`} data-testid="link-jobs">
                  Find Jobs
                </a>
              </Link>
              <Link href="/companies">
                <a className={`text-sm font-medium transition-colors hover:text-primary ${location === '/companies' ? 'text-foreground' : 'text-muted-foreground'}`} data-testid="link-companies">
                  Companies
                </a>
              </Link>
              {isAuthenticated && user?.role === 'employer' && (
                <Link href="/post-job">
                  <a className={`text-sm font-medium transition-colors hover:text-primary ${location === '/post-job' ? 'text-foreground' : 'text-muted-foreground'}`} data-testid="link-post-job">
                    Post a Job
                  </a>
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {!isAuthenticated ? (
              <Button asChild data-testid="button-login">
                <a href="/api/login">Sign In</a>
              </Button>
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
                    <Link href="/dashboard">
                      <a className="flex items-center w-full" data-testid="link-dashboard">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                      </a>
                    </Link>
                  </DropdownMenuItem>
                  {user?.role === 'talent' && (
                    <DropdownMenuItem asChild>
                      <Link href="/profile">
                        <a className="flex items-center w-full" data-testid="link-profile">
                          <User className="mr-2 h-4 w-4" />
                          <span>Profile</span>
                        </a>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {user?.role === 'employer' && (
                    <DropdownMenuItem asChild>
                      <Link href="/company">
                        <a className="flex items-center w-full" data-testid="link-company">
                          <Building2 className="mr-2 h-4 w-4" />
                          <span>My Company</span>
                        </a>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <a className="flex items-center w-full" data-testid="link-settings">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </a>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <a href="/api/logout" className="flex items-center w-full" data-testid="link-logout">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </a>
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
