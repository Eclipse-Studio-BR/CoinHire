import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Briefcase, Building2, Trash2, Edit } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AdminCreateCompanyDialog } from "@/components/AdminCreateCompanyDialog";
import { AdminCreateJobDialog } from "@/components/AdminCreateJobDialog";
import { AdminCreateTalentDialog } from "@/components/AdminCreateTalentDialog";
import { AdminEditCompanyDialog } from "@/components/AdminEditCompanyDialog";
import { AdminEditJobDialog } from "@/components/AdminEditJobDialog";
import { AdminEditTalentDialog } from "@/components/AdminEditTalentDialog";
import { useState } from "react";
import type { Company, Job } from "@shared/schema";

type JobWithCompany = Job & {
  company?: Company;
};

type AdminStats = {
  totalJobs: number;
  totalCompanies: number;
  totalUsers: number;
};

type TalentProfile = {
  userId: string;
  headline: string;
  bio: string;
  location: string;
  hourlyRate: number | null;
  skills: string[];
  tools: string[];
  languages: string[];
  linkedinUrl: string | null;
  telegram: string | null;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    profileImageUrl: string | null;
  };
};

const adminLoginSchema = z.object({
  email: z.string().email("Admin email is required"),
  password: z.string().min(1, "Password is required"),
});

type AdminLoginValues = z.infer<typeof adminLoginSchema>;

function AdminLoginCard() {
  const form = useForm<AdminLoginValues>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: "", password: "" },
  });
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleSubmit = async (values: AdminLoginValues) => {
    try {
      await apiRequest("POST", "/api/auth/admin-login", values);
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Admin access granted" });
      setLocation("/admin");
    } catch (error) {
      toast({
        title: "Admin login failed",
        description: error instanceof Error ? error.message : "Please confirm the configured admin credentials.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Admin Access</CardTitle>
        <CardDescription>Enter the admin credentials configured for this deployment.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Admin Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="admin@example.com" {...field} autoComplete="username" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} autoComplete="current-password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Verifying..." : "Sign In as Admin"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              These credentials are managed via environment variables on the server.
            </p>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function CompaniesManagement() {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/companies/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Company deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setDeleteDialogOpen(false);
      setCompanyToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleDelete = (id: string) => {
    setCompanyToDelete(id);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Manage Companies</h2>
        <AdminCreateCompanyDialog />
      </div>

      <div className="space-y-2">
        {companies.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No companies yet
            </CardContent>
          </Card>
        ) : (
          companies.map((company) => (
            <Card key={company.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{company.name}</h3>
                      {company.createdByAdmin && (
                        <Badge variant="secondary">Admin Created</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {company.description}
                    </p>
                    {company.location && (
                      <p className="text-sm text-muted-foreground">{company.location}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <AdminEditCompanyDialog company={company} />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(company.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Company?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the company and all associated jobs. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => companyToDelete && deleteMutation.mutate(companyToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function JobsManagement() {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);
  const [togglingJobId, setTogglingJobId] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  const { data: jobs = [] } = useQuery<JobWithCompany[]>({
    queryKey: ["/api/jobs"],
  });

  const toggleFeatureMutation = useMutation({
    mutationFn: async (jobId: string) => {
      setTogglingJobId(jobId);
      await apiRequest("POST", `/api/admin/jobs/${jobId}/toggle-featured`);
    },
    onSuccess: () => {
      toast({ title: "Featured status updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setTogglingJobId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setTogglingJobId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/jobs/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Job deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setDeleteDialogOpen(false);
      setJobToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleDelete = (id: string) => {
    setJobToDelete(id);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Manage Jobs</h2>
        <AdminCreateJobDialog />
      </div>

      <div className="space-y-2">
        {jobs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No jobs yet
            </CardContent>
          </Card>
        ) : (
          jobs.map((job) => (
            <Card key={job.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{job.title}</h3>
                      <Badge variant={job.status === 'active' ? 'default' : 'secondary'}>
                        {job.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {job.description}
                    </p>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      {job.company?.name && <span className="font-medium">{job.company.name}</span>}
                      {job.location && <span>{job.location}</span>}
                      {job.jobType && <span>{job.jobType}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">Featured</span>
                      <Button
                        variant={job.tier === 'featured' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleFeatureMutation.mutate(job.id)}
                        disabled={togglingJobId === job.id}
                        className="w-16"
                      >
                        {togglingJobId === job.id ? '...' : job.tier === 'featured' ? 'YES' : 'NO'}
                      </Button>
                    </div>
                    <AdminEditJobDialog job={job} />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(job.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the job listing and reject all active applications. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => jobToDelete && deleteMutation.mutate(jobToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TalentsManagement() {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [talentToDelete, setTalentToDelete] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  const { data: talents = [] } = useQuery<TalentProfile[]>({
    queryKey: ["/api/talents/public"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      toast({ title: "Talent deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/talents/public"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setDeleteDialogOpen(false);
      setTalentToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleDelete = (userId: string) => {
    setTalentToDelete(userId);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Manage Talents</h2>
        <AdminCreateTalentDialog />
      </div>

      <div className="space-y-2">
        {talents.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No talent profiles yet
            </CardContent>
          </Card>
        ) : (
          talents.map((talent) => (
            <Card key={talent.userId}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">
                      {talent.user.firstName} {talent.user.lastName}
                    </h3>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      {talent.headline}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {talent.bio}
                    </p>
                    {talent.location && (
                      <p className="text-sm text-muted-foreground">{talent.location}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <AdminEditTalentDialog talent={talent} />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(talent.userId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Talent?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the talent profile and associated user account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => talentToDelete && deleteMutation.mutate(talentToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function AdminPanel() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated && user?.role === 'admin',
  });

  if (authLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <AdminLoginCard />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Admin Panel
            </h1>
            <p className="text-muted-foreground">
              Manage jobs, companies, talents and platform settings
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.totalJobs || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.totalCompanies || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.totalUsers || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Management Tabs */}
          <Tabs defaultValue="companies" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="companies">Companies</TabsTrigger>
              <TabsTrigger value="jobs">Jobs</TabsTrigger>
              <TabsTrigger value="talents">Talents</TabsTrigger>
            </TabsList>

            <TabsContent value="companies">
              <CompaniesManagement />
            </TabsContent>

            <TabsContent value="jobs">
              <JobsManagement />
            </TabsContent>

            <TabsContent value="talents">
              <TalentsManagement />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}
