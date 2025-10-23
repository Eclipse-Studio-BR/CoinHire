import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, Building2, UserCheck, Users } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const roles = [
  {
    value: "talent",
    icon: UserCheck,
    title: "Job Seeker",
    description: "Find and apply to crypto & Web3 jobs",
    features: ["Browse job listings", "Apply to positions", "Save searches", "Track applications"],
  },
  {
    value: "employer",
    icon: Building2,
    title: "Employer",
    description: "Post jobs and find qualified candidates",
    features: ["Post job listings", "Manage applications", "Company profile", "Team collaboration"],
  },
  {
    value: "recruiter",
    icon: Users,
    title: "Recruiter",
    description: "Connect talent with opportunities",
    features: ["Post on behalf of clients", "Manage multiple companies", "Track placements", "Advanced analytics"],
  },
];

export default function RoleSelection() {
  const [, setLocation] = useLocation();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleRoleSelect = async () => {
    if (!selectedRole) return;

    setIsLoading(true);
    try {
      await apiRequest("/api/auth/select-role", {
        method: "POST",
        body: JSON.stringify({ role: selectedRole }),
      });

      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

      toast({
        title: "Role selected",
        description: "Your account has been set up successfully",
      });

      if (selectedRole === "talent") {
        setLocation("/jobs");
      } else if (selectedRole === "employer" || selectedRole === "recruiter") {
        setLocation("/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to select role",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2" data-testid="text-title">
            Welcome to CryptoJobs
          </h1>
          <p className="text-lg text-muted-foreground" data-testid="text-subtitle">
            Choose your role to get started
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {roles.map((role) => (
            <Card
              key={role.value}
              className={`cursor-pointer transition-all hover-elevate active-elevate-2 ${
                selectedRole === role.value ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setSelectedRole(role.value)}
              data-testid={`card-role-${role.value}`}
            >
              <CardHeader>
                <div className="flex items-center justify-center mb-4">
                  <div className="p-4 rounded-full bg-primary/10">
                    <role.icon className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-center">{role.title}</CardTitle>
                <CardDescription className="text-center">{role.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {role.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Briefcase className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleRoleSelect}
            disabled={!selectedRole || isLoading}
            data-testid="button-continue"
          >
            {isLoading ? "Setting up..." : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
