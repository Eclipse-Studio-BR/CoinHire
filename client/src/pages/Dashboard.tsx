import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Briefcase,
  Eye,
  Users,
  DollarSign,
  FileText,
  Bookmark,
  Plus,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Application, Job, Company, SavedJob } from "@shared/schema";
import { formatTimeAgo } from "@/lib/utils";
import { APPLICATION_STATUSES } from "@/lib/constants";
import { apiRequest, queryClient } from "@/lib/queryClient";

// --------- Local helper types ----------
type ApplicationWithJob = Application & { job?: Job & { company?: Company } };
type SavedJobWithDetails = SavedJob & { job?: Job & { company?: Company } };
type DashboardStats = {
  applicationsCount?: number;
  savedJobsCount?: number;
  activeJobsCount?: number;
  totalViews?: number;
  totalApplications?: number;
  creditsBalance?: number;
};

// Extend the Job type with optional counters the employer jobs API returns
type EmployerJobWithCounts = Job & {
  viewCount?: number;
  applicationCount?: number; // new field name in some builds
  applyCount?: number;       // legacy field name in older builds
};

export default function Dashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [jobBeingDeleted, setJobBeingDeleted] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "Please sign in to view your dashboard.",
        variant: "destructive",
      });
      setTimeout(() => setLocation("/login"), 500);
    }
  }, [isAuthenticated, authLoading, toast, setLocation]);

  // ---------- Queries ----------
  const { data: stats } = useQuery<DashboardStats | null>({
    queryKey: ["/api/dashboard/stats"],
    enabled: isAuthenticated,
  });

  const { data: applications = [] } = useQuery<ApplicationWithJob[]>({
    queryKey: ["/api/applications"],
    enabled: isAuthenticated && user?.role === "talent",
  });

  const { data: savedJobs = [] } = useQuery<SavedJobWithDetails[]>({
    queryKey: ["/api/saved-jobs"],
    enabled: isAuthenticated && user?.role === "talent",
  });

  const { data: employerJobs = [] } = useQuery<EmployerJobWithCounts[]>({
    queryKey: ["/api/employer/jobs"],
    enabled: isAuthenticated && (user?.role === "employer" || user?.role === "recruiter"),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnReconnect: "always",
    refetchOnWindowFocus: "always",
  });

  // ---------- Mutations ----------
  const deleteJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      await apiRequest("DELETE", `/api/jobs/${jobId}`);
    },
    onMutate: async (jobId: string) => {
      setJobBeingDeleted(jobId);
      await queryClient.cancelQueries({ queryKey: ["/api/employer/jobs"] });

      const previousEmployerJobs =
        queryClient.getQueryData<EmployerJobWithCounts[]>(["/api/employer/jobs"]);

      if (previousEmployerJobs) {
        queryClient.setQueryData<EmployerJobWithCounts[]>(
          ["/api/employer/jobs"],
          previousEmployerJobs.filter((job) => job.id !== jobId),
        );
      }

      return { previousEmployerJobs };
    },
    onSuccess: () => {
      toast({
        title: "Job removed",
        description: "The job listing has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/employer/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
    onError: (error: Error, _jobId, context) => {
      toast({
        title: "Unable to delete job",
        description: error.message,
        variant: "destructive",
      });
      if (context?.previousEmployerJobs) {
        queryClient.setQueryData(["/api/employer/jobs"], context.previousEmployerJobs);
      }
    },
    onSettled: () => setJobBeingDeleted(null),
  });

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
        <Footer />
      </div>
    );
  }

  const isTalent = user?.role === "talent";
  const isEmployer = user?.role === "employer" || user?.role === "recruiter";
  const isAdmin = user?.role === "admin";

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2" data-testid="text-page-title">
                Dashboard
              </h1>
              <p className="text-muted-foreground">
                Welcome back, {user?.firstName || user?.email || "User"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isEmployer && (
                <>
                  {/* Add Company removed — single company per profile */}
                  <Link href="/post-job">
                    <Button data-testid="button-post-job" className="gap-2">
                      <Plus className="w-4 h-4" />
                      Post a Job
                    </Button>
                  </Link>
                </>
              )}
              {isAdmin && (
                <Link href="/admin">
                  <Button data-testid="button-admin-panel">Admin Panel</Button>
                </Link>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {isTalent && (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Applications</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-applications-count">
                      {stats?.applicationsCount ?? applications.length}
                    </div>
                    <p className="text-xs text-muted-foreground">Total submitted</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Saved Jobs</CardTitle>
                    <Bookmark className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-saved-count">
                      {stats?.savedJobsCount ?? savedJobs.length}
                    </div>
                    <p className="text-xs text-muted-foreground">For later review</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">In Review</CardTitle>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-reviewing-count">
                      {applications.filter(
                        (a) => a.status === "reviewing" || a.status === "shortlisted",
                      ).length}
                    </div>
                    <p className="text-xs text-muted-foreground">Being reviewed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Interviews</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-interviews-count">
                      {applications.filter((a) => a.status === "interview").length}
                    </div>
                    <p className="text-xs text-muted-foreground">Scheduled/pending</p>
                  </CardContent>
                </Card>
              </>
            )}

            {isEmployer && (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-active-jobs-count">
                      {stats?.activeJobsCount ?? employerJobs.filter((j) => j.status === "active").length}
                    </div>
                    <p className="text-xs text-muted-foreground">Currently posted</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-views">
                      {stats?.totalViews ??
                        employerJobs.reduce((sum, j) => sum + (j.viewCount ?? 0), 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">Across all jobs</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Applications</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-2xl font-bold" data-testid="text-total-applications">
                      {stats?.totalApplications ??
                        employerJobs.reduce(
                          (sum, j) => sum + (j.applicationCount ?? j.applyCount ?? 0),
                          0,
                        )}
                    </div>
                    <Button asChild variant="outline" className="w-full" data-testid="button-view-applications">
                      <Link href="/employer/applications">See Applications</Link>
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Credits</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-credits-balance">
                      {stats?.creditsBalance ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <Link href="/pricing">
                        <a className="hover:underline text-primary">Buy more</a>
                      </Link>
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Talent: Applications Table */}
          {isTalent && applications.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Recent Applications</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job Title</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Applied</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.slice(0, 10).map((application) => (
                      <TableRow key={application.id}>
                        <TableCell className="font-medium">
                          <Link href={`/jobs/${application.jobId}`}>
                            <a
                              className="hover:text-primary"
                              data-testid={`link-job-${application.jobId}`}
                            >
                              {application.job?.title || "Job"}
                            </a>
                          </Link>
                        </TableCell>
                        <TableCell>{application.job?.company?.name || "Company"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              application.status === "offered"
                                ? "default"
                                : application.status === "rejected"
                                ? "destructive"
                                : application.status === "interview"
                                ? "default"
                                : "secondary"
                            }
                            data-testid={`badge-status-${application.id}`}
                          >
                            {APPLICATION_STATUSES[application.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatTimeAgo(application.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Link href={`/jobs/${application.jobId}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`button-view-${application.id}`}
                            >
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Employer: Jobs Table */}
          {isEmployer && employerJobs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Your Job Postings</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead>Applications</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employerJobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium">
                          <Link href={`/jobs/${job.id}`}>
                            <a className="hover:text-primary">{job.title}</a>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              job.status === "active"
                                ? "default"
                                : job.status === "expired"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{job.tier}</Badge>
                        </TableCell>
                        <TableCell>{job.viewCount ?? 0}</TableCell>
                        <TableCell>{job.applicationCount ?? job.applyCount ?? 0}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Link href={`/jobs/${job.id}`}>
                              <Button variant="ghost" size="sm">
                                View
                              </Button>
                            </Link>
                            {/* Keep editing from the dashboard */}
                            <Link href={`/jobs/${job.id}/edit`}>
                              <Button variant="outline" size="sm">
                                Edit
                              </Button>
                            </Link>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteJobMutation.mutate(job.id)}
                              disabled={
                                deleteJobMutation.isPending && jobBeingDeleted === job.id
                              }
                            >
                              {deleteJobMutation.isPending &&
                              jobBeingDeleted === job.id
                                ? "Deleting..."
                                : "Delete"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
