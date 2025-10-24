import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { getInitials } from "@/lib/utils";
import { Loader2, Settings, LogOut } from "lucide-react";
import { Link } from "wouter";

export default function Profile() {
  const { user, isLoading } = useAuth();
  const profileImageUrl: string | undefined = user?.profileImageUrl ?? undefined;

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Not Authenticated</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Please sign in to view your profile.
              </p>
              <Button asChild data-testid="button-login">
                <Link href="/login">Sign In</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'employer':
      case 'recruiter':
        return 'default';
      case 'talent':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Profile</h1>
            <p className="text-muted-foreground">
              Your account information and settings
            </p>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-6 flex-col sm:flex-row">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profileImageUrl} alt={user.email} />
                    <AvatarFallback className="text-2xl">
                      {getInitials(user.firstName ?? undefined, user.lastName ?? undefined, user.email ?? undefined)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Name</label>
                      <p className="text-lg" data-testid="text-username">
                        {user.firstName && user.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : user.email}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p data-testid="text-email">{user.email}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Role</label>
                      <div className="mt-1">
                        <Badge variant={getRoleBadgeVariant(user.role)} data-testid="badge-role">
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                      </div>
                    </div>

                    <div className="pt-2">
                      <p className="text-sm text-muted-foreground">
                        Your profile information is managed through your authentication provider.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button variant="default" asChild data-testid="button-dashboard">
                  <Link href="/dashboard">
                    Go to Dashboard
                  </Link>
                </Button>

                <Button variant="outline" asChild data-testid="button-settings">
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </Button>

                <Button variant="outline" asChild data-testid="button-logout">
                  <a href="/api/logout">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
