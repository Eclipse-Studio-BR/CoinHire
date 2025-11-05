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
import {
  Briefcase,
  Building2,
  Home,
  User,
  LogOut,
  Settings as SettingsIcon,
  LayoutDashboard,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getInitials } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function FloatingNav() {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const { toast } = useToast();

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Logged out successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/jobs", label: "Jobs", icon: Briefcase },
    { href: "/companies", label: "Companies", icon: Building2 },
    ...(isAuthenticated
      ? [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }]
      : []),
  ];

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <nav className="hidden md:block fixed top-6 left-1/2 -translate-x-1/2 z-50">
      <div className="glass-strong rounded-pill shadow-glass-lg px-2 py-2 flex items-center gap-2">
        {/* Logo */}
        <Link href="/" className="pl-2 pr-1">
          <img
            src="/images/logos/coinhire.png"
            alt="CoinHire"
            className="h-7 cursor-pointer"
          />
        </Link>

        {/* Divider */}
        <div className="h-6 w-px bg-white/10" />

        {/* Nav Items */}
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link key={item.href} href={item.href}>
              <button
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-pill text-sm font-medium transition-smooth",
                  active
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-foreground hover:bg-white/10"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            </Link>
          );
        })}

        {/* Right Section */}
        <div className="flex items-center gap-2 pl-1">
          {/* Divider */}
          <div className="h-6 w-px bg-white/10" />

          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-2 rounded-pill hover:bg-white/10 transition-smooth">
                  <Avatar className="h-7 w-7">
                    <AvatarImage
                      src={user.profileImage || undefined}
                      alt={user.fullName || user.email}
                    />
                    <AvatarFallback className="text-xs">
                      {getInitials(user.fullName || user.email)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="glass-strong rounded-xl min-w-[200px]"
              >
                <Link href="/profile">
                  <DropdownMenuItem className="rounded-lg cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                </Link>
                <Link href="/settings">
                  <DropdownMenuItem className="rounded-lg cursor-pointer">
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  onClick={() => logoutMutation.mutate()}
                  className="rounded-lg cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm" className="rounded-pill">
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="rounded-pill">
                  Sign Up
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
