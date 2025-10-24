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
import { Briefcase, Eye, Users, DollarSign, FileText, Bookmark, Plus, Pencil, Building2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Application, Job, Company, SavedJob } from "@shared/schema";
import { formatTimeAgo } from "@/lib/utils";
import { APPLICATION_STATUSES } from "@/lib/constants";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/FileUpload";
import { CompanyFormDialog } from "@/components/CompanyFormDialog";

type ApplicationWithJob = Application & { job?: Job & { company?: Company } };
type SavedJobWithDetails = SavedJob & { job?: Job & { company?: Company } };
type CompanyWithStats = Company & { jobCount?: number };
type DashboardStats = {
  applicationsCount?: number;
  savedJobsCount?: number;
  activeJobsCount?: number;
  totalViews?: number;
  totalApplications?: number;
  creditsBalance?: number;
};

export default function Dashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [jobBeingDeleted, setJobBeingDeleted] = useState<string | null>(null);
  const [companyBeingDeleted, setCompanyBeingDeleted] = useState<string | null>(null);
  const [isCreateCompanyOpen, setIsCreateCompanyOpen] = useState(false);
  const [isEditCompanyOpen, setIsEditCompanyOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyWithStats | null>(null);
  const [editCompanyData, setEditCompanyData] = useState({
    name: "",
    description: "",
    website: "",
    location: "",
    size: "",
    logo: "",
  });

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

  const { data: stats } = useQuery<DashboardStats | null>({
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
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnReconnect: "always",
    refetchOnWindowFocus: "always",
  });
  const { data: employerCompanies = [] } = useQuery<CompanyWithStats[]>({
    queryKey: ["/api/employer/companies"],
    enabled: isAuthenticated && (user?.role === 'employer' || user?.role === 'recruiter'),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnReconnect: "always",
    refetchOnWindowFocus: "always",
  });

  const canCreateCompany = (user?.role === 'admin') || employerCompanies.length === 0;

  const deleteJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      await apiRequest("DELETE", `/api/jobs/${jobId}`);
    },
    onMutate: async (jobId: string) => {
      setJobBeingDeleted(jobId);
      await queryClient.cancelQueries({ queryKey: ["/api/employer/jobs"] });
      await queryClient.cancelQueries({ queryKey: ["/api/companies"] });

      const previousEmployerJobs = queryClient.getQueryData<Job[]>(["/api/employer/jobs"]);
      const jobToDelete = previousEmployerJobs?.find((job) => job.id === jobId);

      if (previousEmployerJobs) {
        queryClient.setQueryData<Job[]>(["/api/employer/jobs"], previousEmployerJobs.filter((job) => job.id !== jobId));
      }

      const previousEmployerCompanies = queryClient.getQueryData<CompanyWithStats[]>(["/api/employer/companies"]);
      const previousPublicCompanies = queryClient.getQueryData<CompanyWithStats[]>(["/api/companies"]);

      if (jobToDelete) {
        if (previousEmployerCompanies) {
          queryClient.setQueryData<CompanyWithStats[]>(["/api/employer/companies"], previousEmployerCompanies.map((company) => {
            if (company.id === jobToDelete.companyId) {
              const nextCount = Math.max(0, (company.jobCount ?? companyJobCounts[company.id] ?? 0) - 1);
              return { ...company, jobCount: nextCount };
            }
            return company;
          }));
        }

        if (previousPublicCompanies) {
          queryClient.setQueryData<CompanyWithStats[]>(["/api/companies"], previousPublicCompanies.map((company) => {
            if (company.id === jobToDelete.companyId) {
              const nextCount = Math.max(0, (company.jobCount ?? 0) - 1);
              return { ...company, jobCount: nextCount };
            }
            return company;
          }));
        }
      }

      return { previousEmployerJobs, previousEmployerCompanies, previousPublicCompanies };
    },
    onSuccess: (_, __, context) => {
      toast({
        title: "Job removed",
        description: "The job listing has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/employer/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      queryClient.refetchQueries({ queryKey: ["/api/employer/jobs"], type: "active" });
      queryClient.refetchQueries({ queryKey: ["/api/jobs"], type: "active" });
      queryClient.refetchQueries({ queryKey: ["/api/companies"], type: "active" });
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
      if (context?.previousEmployerCompanies) {
        queryClient.setQueryData(["/api/employer/companies"], context.previousEmployerCompanies);
      }
      if (context?.previousPublicCompanies) {
        queryClient.setQueryData(["/api/companies"], context.previousPublicCompanies);
      }
    },
    onSettled: () => {
      setJobBeingDeleted(null);
    },
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async (companyId: string) => {
      await apiRequest("DELETE", `/api/companies/${companyId}`);
    },
    onMutate: async (companyId: string) => {
      setCompanyBeingDeleted(companyId);
      await queryClient.cancelQueries({ queryKey: ["/api/employer/companies"] });
      await queryClient.cancelQueries({ queryKey: ["/api/companies"] });

      const previousEmployerCompanies = queryClient.getQueryData<CompanyWithStats[]>(["/api/employer/companies"]);
      if (previousEmployerCompanies) {
        queryClient.setQueryData<CompanyWithStats[]>(["/api/employer/companies"], previousEmployerCompanies.filter((company) => company.id !== companyId));
      }

      const previousPublicCompanies = queryClient.getQueryData<CompanyWithStats[]>(["/api/companies"]);
      if (previousPublicCompanies) {
        queryClient.setQueryData<CompanyWithStats[]>(["/api/companies"], previousPublicCompanies.filter((company) => company.id !== companyId));
      }

      return { previousEmployerCompanies, previousPublicCompanies };
    },
    onSuccess: () => {
      toast({
        title: "Company deleted",
        description: "The company has been removed.",
      });
      if (editingCompany && companyBeingDeleted === editingCompany.id) {
        closeEditCompany();
      }
      queryClient.invalidateQueries({ queryKey: ["/api/employer/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employer/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.refetchQueries({ queryKey: ["/api/employer/companies"], type: "active" });
      queryClient.refetchQueries({ queryKey: ["/api/companies"], type: "active" });
      queryClient.refetchQueries({ queryKey: ["/api/employer/jobs"], type: "active" });
      queryClient.refetchQueries({ queryKey: ["/api/jobs"], type: "active" });
    },
    onError: (error: Error, _companyId, context) => {
      toast({
        title: "Unable to delete company",
        description: error.message,
        variant: "destructive",
      });
      if (context?.previousEmployerCompanies) {
        queryClient.setQueryData(["/api/employer/companies"], context.previousEmployerCompanies);
      }
      if (context?.previousPublicCompanies) {
        queryClient.setQueryData(["/api/companies"], context.previousPublicCompanies);
      }
    },
    onSettled: () => {
      setCompanyBeingDeleted(null);
    },
  });

  const companyJobCounts = employerJobs.reduce<Record<string, number>>((acc, job) => {
    if (job.status === 'active') {
      acc[job.companyId] = (acc[job.companyId] || 0) + 1;
    }
    return acc;
  }, {});

  const openEditCompany = (company: CompanyWithStats) => {
    setEditingCompany(company);
    setEditCompanyData({
      name: company.name ?? "",
      description: company.description ?? "",
      website: company.website ?? "",
      location: company.location ?? "",
      size: company.size ?? "",
      logo: company.logo ?? "",
    });
    setIsEditCompanyOpen(true);
  };

  const closeEditCompany = () => {
    setIsEditCompanyOpen(false);
    setEditingCompany(null);
    setEditCompanyData({
      name: "",
      description: "",
      website: "",
      location: "",
      size: "",
      logo: "",
    });
  };

  const handleEditFieldChange = (field: keyof typeof editCompanyData, value: string) => {
    setEditCompanyData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEditCompanySubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingCompany) return;
    updateCompanyMutation.mutate(editCompanyData);
  };

  const updateCompanyMutation = useMutation({
    mutationFn: async (payload: typeof editCompanyData) => {
      if (!editingCompany) {
        throw new Error("No company selected");
      }
      const response = await apiRequest("PUT", `/api/companies/${editingCompany.id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Company updated",
        description: "Your company information has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/employer/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employer/jobs"] });
      closeEditCompany();
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to update company",
        description: error.message,
        variant: "destructive",
      });
    },
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
            <div className="flex items-center gap-2">
              {isEmployer && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => setIsCreateCompanyOpen(true)}
                    disabled={!canCreateCompany}
                    title={!canCreateCompany ? "You already created a company" : undefined}
                    data-testid="button-add-company"
                  >
                    <Building2 className="h-4 w-4" />
                    Add Company
                  </Button>
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
                  <CardContent className="space-y-3">
                    <div className="text-2xl font-bold" data-testid="text-total-applications">
                      {stats?.totalApplications || employerJobs.reduce((sum, j) => sum + j.applyCount, 0)}
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
                          <div className="flex gap-2">
                            <Link href={`/jobs/${job.id}`}>
                              <Button variant="ghost" size="sm">View</Button>
                            </Link>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteJobMutation.mutate(job.id)}
                              disabled={deleteJobMutation.isPending && jobBeingDeleted === job.id}
                            >
                              {deleteJobMutation.isPending && jobBeingDeleted === job.id ? 'Deleting...' : 'Delete'}
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

          {isEmployer && employerCompanies.length > 0 && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Your Company</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Open Roles</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employerCompanies.map((company) => {
                      const jobCount = company.jobCount ?? companyJobCounts[company.id] ?? 0;
                      return (
                        <TableRow key={company.id}>
                          <TableCell className="font-medium">{company.name}</TableCell>
                          <TableCell>{company.location || '—'}</TableCell>
                          <TableCell>{jobCount}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Link href={`/companies/${company.slug}`}>
                                <Button variant="ghost" size="sm">View</Button>
                              </Link>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditCompany(company)}
                              >
                                <Pencil className="mr-1 h-3 w-3" />
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteCompanyMutation.mutate(company.id)}
                                disabled={deleteCompanyMutation.isPending && companyBeingDeleted === company.id}
                              >
                                {deleteCompanyMutation.isPending && companyBeingDeleted === company.id ? 'Deleting...' : 'Delete'}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />

      <CompanyFormDialog
        open={isCreateCompanyOpen}
        onOpenChange={setIsCreateCompanyOpen}
        onSuccess={() => setIsCreateCompanyOpen(false)}
        title="Add Company"
        description="Add your company information to start posting jobs."
        submitLabel="Create Company"
      />

      <Dialog
        open={isEditCompanyOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeEditCompany();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>
              Update your company information. Changes go live immediately.
            </DialogDescription>
          </DialogHeader>

          {editingCompany && (
            <form onSubmit={handleEditCompanySubmit} className="space-y-4">
              <div>
                <Label htmlFor="edit-company-name">Company Name *</Label>
                <Input
                  id="edit-company-name"
                  value={editCompanyData.name}
                  onChange={(event) => handleEditFieldChange("name", event.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-company-description">Description *</Label>
                <Textarea
                  id="edit-company-description"
                  value={editCompanyData.description}
                  onChange={(event) => handleEditFieldChange("description", event.target.value)}
                  required
                  className="min-h-[120px]"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="edit-company-website">Website</Label>
                  <Input
                    id="edit-company-website"
                    type="url"
                    value={editCompanyData.website}
                    onChange={(event) => handleEditFieldChange("website", event.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-company-location">Location</Label>
                  <Input
                    id="edit-company-location"
                    value={editCompanyData.location}
                    onChange={(event) => handleEditFieldChange("location", event.target.value)}
                    placeholder="e.g. San Francisco, CA"
                  />
                </div>
              </div>

              <FileUpload
                type="logo"
                label="Company Logo"
                currentFile={editCompanyData.logo}
                onUploadComplete={(url) => handleEditFieldChange("logo", url)}
              />

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={closeEditCompany}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateCompanyMutation.isPending}>
                  {updateCompanyMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
