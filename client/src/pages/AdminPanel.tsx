import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Eye, Users, Briefcase, Building2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Job, Company } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

type AdminStats = {
  totalJobs: number;
  totalCompanies: number;
  totalUsers: number;
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

export default function AdminPanel() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: pendingJobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/admin/jobs/pending"],
    enabled: isAuthenticated && user?.role === 'admin',
  });

  const { data: pendingCompanies = [] } = useQuery<Company[]>({
    queryKey: ["/api/admin/companies/pending"],
    enabled: isAuthenticated && user?.role === 'admin',
  });

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated && user?.role === 'admin',
  });

  const approveJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      await apiRequest("POST", `/api/admin/jobs/${jobId}/approve`, {});
    },
    onSuccess: () => {
      toast({ title: "Job Approved" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/jobs/pending"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const rejectJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      await apiRequest("POST", `/api/admin/jobs/${jobId}/reject`, {});
    },
    onSuccess: () => {
      toast({ title: "Job Rejected" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/jobs/pending"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const approveCompanyMutation = useMutation({
    mutationFn: async (companyId: string) => {
      await apiRequest("POST", `/api/admin/companies/${companyId}/approve`, {});
    },
    onSuccess: () => {
      toast({ title: "Company Approved" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies/pending"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const rejectCompanyMutation = useMutation({
    mutationFn: async (companyId: string) => {
      await apiRequest("POST", `/api/admin/companies/${companyId}/reject`, {});
    },
    onSuccess: () => {
      toast({ title: "Company Rejected" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies/pending"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
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
            <h1 className="text-3xl md:text-4xl font-bold mb-2" data-testid="text-page-title">
              Admin Panel
            </h1>
            <p className="text-muted-foreground">
              Manage jobs, companies, and platform settings
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-jobs">
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
                <div className="text-2xl font-bold" data-testid="text-total-companies">
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
                <div className="text-2xl font-bold" data-testid="text-total-users">
                  {stats?.totalUsers || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-pending-approvals">
                  {pendingJobs.length + pendingCompanies.length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="jobs" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="jobs" data-testid="tab-jobs">
                Pending Jobs ({pendingJobs.length})
              </TabsTrigger>
              <TabsTrigger value="companies" data-testid="tab-companies">
                Pending Companies ({pendingCompanies.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="jobs">
              <Card>
                <CardHeader>
                  <CardTitle>Jobs Awaiting Approval</CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingJobs.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Company ID</TableHead>
                          <TableHead>Tier</TableHead>
                          <TableHead>Posted</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingJobs.map((job) => (
                          <TableRow key={job.id}>
                            <TableCell className="font-medium">{job.title}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {job.companyId.slice(0, 8)}...
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{job.tier}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(job.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => approveJobMutation.mutate(job.id)}
                                  data-testid={`button-approve-${job.id}`}
                                  className="gap-1"
                                >
                                  <Check className="w-4 h-4" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => rejectJobMutation.mutate(job.id)}
                                  data-testid={`button-reject-${job.id}`}
                                  className="gap-1"
                                >
                                  <X className="w-4 h-4" />
                                  Reject
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      No pending jobs
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="companies">
              <Card>
                <CardHeader>
                  <CardTitle>Companies Awaiting Approval</CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingCompanies.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Website</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingCompanies.map((company) => (
                          <TableRow key={company.id}>
                            <TableCell className="font-medium">{company.name}</TableCell>
                            <TableCell>{company.location || 'N/A'}</TableCell>
                            <TableCell>
                              {company.website ? (
                                <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                                  Visit
                                </a>
                              ) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(company.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => approveCompanyMutation.mutate(company.id)}
                                  data-testid={`button-approve-${company.id}`}
                                  className="gap-1"
                                >
                                  <Check className="w-4 h-4" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => rejectCompanyMutation.mutate(company.id)}
                                  data-testid={`button-reject-${company.id}`}
                                  className="gap-1"
                                >
                                  <X className="w-4 h-4" />
                                  Reject
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      No pending companies
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}
