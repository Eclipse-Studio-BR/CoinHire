import { Link, useLocation } from "wouter";
import {
  Briefcase,
  Building2,
  Home,
  LayoutDashboard,
  User,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export function MobileTabBar() {
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/jobs", icon: Briefcase, label: "Jobs" },
    { href: "/companies", icon: Building2, label: "Companies" },
    ...(isAuthenticated
      ? [
          { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
          { href: "/profile", icon: User, label: "Profile" },
        ]
      : [
          { href: "/login", icon: User, label: "Login" },
        ]),
  ];

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="glass-strong border-t border-[var(--stroke-strong)] px-4 py-2">
        <div className="flex items-center justify-around">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link key={item.href} href={item.href}>
                <button
                  className={cn(
                    "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-smooth",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  aria-label={item.label}
                >
                  <Icon className={cn("h-5 w-5", active && "fill-current")} />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
