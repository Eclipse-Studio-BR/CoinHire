import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { getInitials } from "@/lib/utils";
import { Loader2, Settings, LogOut, Globe } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TalentProfile } from "@shared/schema";

export default function Profile() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const profileImageUrl: string | undefined = user?.profileImageUrl ?? undefined;

  // Fetch talent profile for visibility status
  const { data: talentProfile } = useQuery<TalentProfile>({
    queryKey: ["/api/talent/profile"],
    enabled: user?.role === "talent",
  });

  // Toggle profile visibility mutation
  const toggleVisibilityMutation = useMutation({
    mutationFn: async (isPublic: boolean) => {
      const response = await fetch("/api/talent/profile/visibility", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isPublic }),
      });
      if (!response.ok) {
        throw new Error("Failed to update profile visibility");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/talent/profile"] });
      toast({
        title: "Profile visibility updated",
        description: "Your profile visibility has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleVisibilityToggle = (checked: boolean) => {
    toggleVisibilityMutation.mutate(checked);
  };

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates: Partial<TalentProfile>) => {
      const response = await fetch("/api/talent/profile/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        throw new Error("Failed to update preferences");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/talent/profile"] });
      toast({
        title: "Preferences updated",
        description: "Your job preferences have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleJobTypeChange = (type: string, checked: boolean) => {
    const value = type.toLowerCase().replace('-', '_');
    const current = talentProfile?.preferredJobTypes || [];
    const updated = checked
      ? [...current, value]
      : current.filter(t => t !== value);
    updatePreferencesMutation.mutate({ preferredJobTypes: updated });
  };

  const handleAvailabilityChange = (availability: string) => {
    updatePreferencesMutation.mutate({ jobAvailability: availability });
  };

  const handleFlexibilityChange = (flex: string, checked: boolean) => {
    const value = flex.toLowerCase();
    const current = talentProfile?.workFlexibility || [];
    const updated = checked
      ? [...current, value]
      : current.filter(f => f !== value);
    updatePreferencesMutation.mutate({ workFlexibility: updated });
  };

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

                    {user.role === "talent" && user.resumePath && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Resume</label>
                        <div className="mt-1">
                          <Button variant="outline" size="sm" asChild>
                            <a href={user.resumePath} target="_blank" rel="noopener noreferrer">
                              View Resume
                            </a>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {user.role === "talent" && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Profile Visibility
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="public-profile">Make my profile public</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow companies to discover your profile on the Talents page. 
                          Public profiles get access to advanced features and increased visibility.
                        </p>
                      </div>
                      <Switch
                        id="public-profile"
                        checked={talentProfile?.isPublic ?? false}
                        onCheckedChange={handleVisibilityToggle}
                        disabled={toggleVisibilityMutation.isPending}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Job Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Preferred Job Type */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Preferred Job Type</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {['Full-Time', 'Part-Time', 'Internship', 'Contract'].map((type) => (
                          <label
                            key={type}
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              className="rounded border-gray-300"
                              checked={talentProfile?.preferredJobTypes?.includes(type.toLowerCase().replace('-', '_')) ?? false}
                              onChange={(e) => handleJobTypeChange(type, e.target.checked)}
                              disabled={updatePreferencesMutation.isPending}
                            />
                            <span className="text-sm">{type}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Job Availability */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Job Availability Type</Label>
                      <div className="space-y-2">
                        {[
                          { value: 'actively_looking', label: 'Actively Looking' },
                          { value: 'open_to_offers', label: 'Open To Offers' },
                          { value: 'not_available', label: 'Not Available' }
                        ].map((option) => (
                          <label
                            key={option.value}
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <input
                              type="radio"
                              name="jobAvailability"
                              className="border-gray-300"
                              checked={talentProfile?.jobAvailability === option.value}
                              onChange={() => handleAvailabilityChange(option.value)}
                              disabled={updatePreferencesMutation.isPending}
                            />
                            <span className="text-sm">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Work Flexibility */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Work Flexibility</Label>
                      <div className="flex gap-3">
                        {['Onsite', 'Remote'].map((flex) => (
                          <label
                            key={flex}
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              className="rounded border-gray-300"
                              checked={talentProfile?.workFlexibility?.includes(flex.toLowerCase()) ?? false}
                              onChange={(e) => handleFlexibilityChange(flex, e.target.checked)}
                              disabled={updatePreferencesMutation.isPending}
                            />
                            <span className="text-sm">{flex}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

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
