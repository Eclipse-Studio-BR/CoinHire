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
  MessageSquare,
  Star,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { FeatureJobDialog } from "@/components/FeatureJobDialog";
import type { Application, Job, Company, SavedJob } from "@shared/schema";
import { formatTimeAgo } from "@/lib/utils";
import { APPLICATION_STATUSES } from "@/lib/constants";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Message } from "@shared/schema";

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
  const [location, setLocation] = useLocation();
  const [jobBeingDeleted, setJobBeingDeleted] = useState<string | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [featureJobId, setFeatureJobId] = useState<string | null>(null);
  const [confirmFeatureJobId, setConfirmFeatureJobId] = useState<string | null>(null);

  // Check for successful payment redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const featuredJobId = params.get('featured');
    const paymentStatus = params.get('redirect_status');
    
    if (featuredJobId && paymentStatus === 'succeeded') {
      toast({
        title: "✅ Payment Successful!",
        description: "Your job has been upgraded to Featured status.",
        className: "bg-green-600 text-white",
      });
      
      // Invalidate queries to refresh job list
      queryClient.invalidateQueries({ queryKey: ["/api/employer/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [toast]);

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
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnReconnect: "always",
    refetchOnWindowFocus: "always",
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

  const { data: messagesList = [], refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ["/api/applications/messages", selectedApplicationId],
    queryFn: async () => {
      if (!selectedApplicationId) return [];
      console.log("Fetching messages for application:", selectedApplicationId);
      const response = await fetch(`/api/applications/${selectedApplicationId}/messages`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.statusText}`);
      }
      const messages = await response.json();
      console.log("Messages received:", messages, "Count:", messages.length);
      return messages as Message[];
    },
    enabled: !!selectedApplicationId,
    refetchInterval: 3000, // Refetch every 3 seconds when dialog is open
  });

  // ---------- Mutations ----------
  const sendReplyMutation = useMutation({
    mutationFn: async ({ applicationId, message }: { applicationId: string; message: string }) => {
      await apiRequest("POST", `/api/applications/${applicationId}/messages`, { message });
    },
    onSuccess: () => {
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["/api/applications/messages", selectedApplicationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      await apiRequest("PUT", `/api/applications/${applicationId}/messages/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications/messages"] });
    },
  });

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
                  <CardContent className="space-y-3">
                    <div className="text-2xl font-bold" data-testid="text-credits-balance">
                      {stats?.creditsBalance ?? 0}
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => setFeatureJobId('buy-credits')}
                    >
                      Buy More
                    </Button>
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
                      <TableHead>Messages</TableHead>
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
                          <Dialog 
                            open={selectedApplicationId === application.id} 
                            onOpenChange={(open) => {
                              if (open) {
                                setSelectedApplicationId(application.id);
                                markAsReadMutation.mutate(application.id);
                              } else {
                                setSelectedApplicationId(null);
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <MessageSquare className="h-4 w-4 mr-2" />
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Messages - {application.job?.title}</DialogTitle>
                              </DialogHeader>
                              <ScrollArea className="h-96 pr-4">
                                {messagesList && messagesList.length > 0 ? (
                                  <div className="space-y-6">
                                    {messagesList.map((msg) => {
                                      const isTalent = msg.senderId === user?.id;
                                      const senderName = isTalent ? "You" : (application.job?.company?.name || "Company");
                                      const senderInitials = isTalent 
                                        ? (user?.firstName?.[0] || user?.email?.[0] || "Y")
                                        : (application.job?.company?.name?.[0] || "C");
                                      const senderAvatar = isTalent ? user?.profileImageUrl : application.job?.company?.logo;
                                      
                                      return (
                                        <div 
                                          key={msg.id} 
                                          className="flex gap-3 items-start"
                                        >
                                          <Avatar className="h-8 w-8 flex-shrink-0">
                                            <AvatarImage src={senderAvatar || undefined} />
                                            <AvatarFallback>{senderInitials}</AvatarFallback>
                                          </Avatar>
                                          <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                              <span className="font-semibold text-sm">{senderName}</span>
                                              <span className="text-xs text-muted-foreground">
                                                {new Date(msg.createdAt).toLocaleDateString()} {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                              </span>
                                            </div>
                                            <div className="rounded-lg p-3 bg-muted max-w-[80%]">
                                              <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-center text-muted-foreground py-8">No messages from the company yet. They will contact you if they're interested.</p>
                                )}
                              </ScrollArea>
                              {messagesList && messagesList.length > 0 && messagesList.some(msg => msg.senderId !== user?.id) ? (
                                <div className="flex gap-2 mt-4">
                                  <Textarea 
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Type your reply..."
                                    rows={3}
                                    className="flex-1"
                                  />
                                  <Button 
                                    onClick={() => sendReplyMutation.mutate({ 
                                      applicationId: application.id, 
                                      message: replyText 
                                    })}
                                    disabled={!replyText.trim() || sendReplyMutation.isPending}
                                  >
                                    {sendReplyMutation.isPending ? "Sending..." : "Send"}
                                  </Button>
                                </div>
                              ) : messagesList && messagesList.length === 0 ? null : (
                                <div className="mt-4 text-center text-sm text-muted-foreground">
                                  Waiting for the company to start the conversation...
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                        <TableCell>
                          <Link href={`/jobs/${application.jobId}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`button-view-${application.id}`}
                            >
                              View Job
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
                            className={
                              job.status === "active"
                                ? "bg-green-600 hover:bg-green-700 text-white"
                                : ""
                            }
                          >
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={
                              job.tier === 'featured'
                                ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                                : ""
                            }
                          >
                            {job.tier === 'featured' ? 'Featured' : 'Free'}
                          </Badge>
                        </TableCell>
                        <TableCell>{job.viewCount ?? 0}</TableCell>
                        <TableCell>{job.applicationCount ?? job.applyCount ?? 0}</TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <div className="flex gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Link href={`/jobs/${job.id}`}>
                                    <Button variant="ghost" size="icon">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                </TooltipTrigger>
                                <TooltipContent>View Job</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Link href={`/jobs/${job.id}/edit`}>
                                    <Button variant="outline" size="icon">
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                </TooltipTrigger>
                                <TooltipContent>Edit Job</TooltipContent>
                              </Tooltip>

                              {job.tier !== 'featured' && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="default" 
                                      size="icon"
                                      onClick={() => {
                                        const creditsBalance = stats?.creditsBalance ?? 0;
                                        
                                        if (creditsBalance > 0) {
                                          // Show confirmation dialog
                                          setConfirmFeatureJobId(job.id);
                                        } else {
                                          // Show payment dialog
                                          setFeatureJobId(job.id);
                                        }
                                      }}
                                    >
                                      <Star className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Feature Job</TooltipContent>
                                </Tooltip>
                              )}

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => deleteJobMutation.mutate(job.id)}
                                    disabled={
                                      deleteJobMutation.isPending && jobBeingDeleted === job.id
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {deleteJobMutation.isPending && jobBeingDeleted === job.id
                                    ? "Deleting..."
                                    : "Delete Job"}
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </TooltipProvider>
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
      
      <FeatureJobDialog 
        open={!!featureJobId} 
        onOpenChange={(open) => !open && setFeatureJobId(null)}
        jobId={featureJobId || ""}
      />

      <AlertDialog open={!!confirmFeatureJobId} onOpenChange={(open) => !open && setConfirmFeatureJobId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Feature this job?</AlertDialogTitle>
            <AlertDialogDescription>
              This will use 1 credit from your balance to feature this job for 30 days. 
              The job will appear at the top of search results and on the homepage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await apiRequest("POST", `/api/jobs/${confirmFeatureJobId}/upgrade-featured`);
                  toast({
                    title: "✅ Job Featured!",
                    description: "1 credit has been deducted from your balance.",
                    className: "bg-green-600 text-white",
                  });
                  queryClient.invalidateQueries({ queryKey: ["/api/employer/jobs"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
                  setConfirmFeatureJobId(null);
                } catch (error: any) {
                  toast({
                    title: "Error",
                    description: error.message || "Failed to feature job",
                    variant: "destructive",
                  });
                }
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
