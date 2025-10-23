import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
import { Briefcase, Eye, Users, DollarSign, FileText, Bookmark, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Application, Job, Company, SavedJob } from "@shared/schema";
import { formatTimeAgo } from "@/lib/utils";
import { APPLICATION_STATUSES } from "@/lib/constants";

type ApplicationWithJob = Application & { job?: Job & { company?: Company } };
type SavedJobWithDetails = SavedJob & { job?: Job & { company?: Company } };

export default function Dashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "Please sign in to view your dashboard.",
        variant: "destructive",
      });
      setTimeout(() => {
        setLocation("/login");
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast, setLocation]);

  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    enabled: isAuthenticated,
  });

  const { data: applications = [] } = useQuery<ApplicationWithJob[]>({
    queryKey: ["/api/applications"],
    enabled: isAuthenticated && user?.role === 'talent',
  });

  const { data: savedJobs = [] } = useQuery<SavedJobWithDetails[]>({
    queryKey: ["/api/saved-jobs"],
    enabled: isAuthenticated && user?.role === 'talent',
  });

  const { data: employerJobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/employer/jobs"],
    enabled: isAuthenticated && (user?.role === 'employer' || user?.role === 'recruiter'),
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

  const isTalent = user?.role === 'talent';
  const isEmployer = user?.role === 'employer' || user?.role === 'recruiter';
  const isAdmin = user?.role === 'admin';

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
                Welcome back, {user?.firstName || user?.email || 'User'}
              </p>
            </div>
            {isEmployer && (
              <Link href="/post-job">
                <Button data-testid="button-post-job" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Post a Job
                </Button>
              </Link>
            )}
            {isAdmin && (
              <Link href="/admin">
                <Button data-testid="button-admin-panel">Admin Panel</Button>
              </Link>
            )}
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
                      {stats?.applicationsCount || applications.length}
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
                      {stats?.savedJobsCount || savedJobs.length}
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
                      {applications.filter(a => a.status === 'reviewing' || a.status === 'shortlisted').length}
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
                      {applications.filter(a => a.status === 'interview').length}
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
                      {stats?.activeJobsCount || employerJobs.filter(j => j.status === 'active').length}
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
                      {stats?.totalViews || employerJobs.reduce((sum, j) => sum + j.viewCount, 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">Across all jobs</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Applications</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-applications">
                      {stats?.totalApplications || employerJobs.reduce((sum, j) => sum + j.applyCount, 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">Total received</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Credits</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-credits-balance">
                      {stats?.creditsBalance || 0}
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
                            <a className="hover:text-primary" data-testid={`link-job-${application.jobId}`}>
                              {application.job?.title || 'Job'}
                            </a>
                          </Link>
                        </TableCell>
                        <TableCell>{application.job?.company?.name || 'Company'}</TableCell>
                        <TableCell>
                          <Badge variant={
                            application.status === 'offered' ? 'default' :
                            application.status === 'rejected' ? 'destructive' :
                            application.status === 'interview' ? 'default' :
                            'secondary'
                          } data-testid={`badge-status-${application.id}`}>
                            {APPLICATION_STATUSES[application.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatTimeAgo(application.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Link href={`/jobs/${application.jobId}`}>
                            <Button variant="ghost" size="sm" data-testid={`button-view-${application.id}`}>
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

          {/* Talent: Saved Jobs */}
          {isTalent && savedJobs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Saved Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job Title</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Saved</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {savedJobs.slice(0, 10).map((saved) => (
                      <TableRow key={saved.id}>
                        <TableCell className="font-medium">
                          <Link href={`/jobs/${saved.jobId}`}>
                            <a className="hover:text-primary">
                              {saved.job?.title || 'Job'}
                            </a>
                          </Link>
                        </TableCell>
                        <TableCell>{saved.job?.company?.name || 'Company'}</TableCell>
                        <TableCell>{saved.job?.isRemote ? 'Remote' : saved.job?.location}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatTimeAgo(saved.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Link href={`/jobs/${saved.jobId}`}>
                            <Button variant="ghost" size="sm">View</Button>
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
                          <Badge variant={
                            job.status === 'active' ? 'default' :
                            job.status === 'expired' ? 'destructive' :
                            'secondary'
                          }>
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{job.tier}</Badge>
                        </TableCell>
                        <TableCell>{job.viewCount}</TableCell>
                        <TableCell>{job.applyCount}</TableCell>
                        <TableCell>
                          <Link href={`/employer/jobs/${job.id}`}>
                            <Button variant="ghost" size="sm">Manage</Button>
                          </Link>
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
