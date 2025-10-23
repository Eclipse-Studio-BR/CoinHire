import { useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  MapPin,
  Briefcase,
  Clock,
  DollarSign,
  Eye,
  Users,
  Bookmark,
  Share2,
  ExternalLink,
  Star,
} from "lucide-react";
import type { Job, Company } from "@shared/schema";
import { formatTimeAgo, formatSalary } from "@/lib/utils";
import { JOB_TYPES, EXPERIENCE_LEVELS } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { cn } from "@/lib/utils";

type JobWithCompany = Job & { company?: Company };

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: job, isLoading } = useQuery<JobWithCompany>({
    queryKey: [`/api/jobs/${id}`],
  });

  const incrementViewMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/jobs/${id}/view`, {});
    },
  });

  useEffect(() => {
    if (job && id) {
      incrementViewMutation.mutate();
    }
  }, [id, job]);

  const applyMutation = useMutation({
    mutationFn: async (data: { coverLetter: string; resumeUrl?: string }) => {
      await apiRequest("POST", `/api/jobs/${id}/apply`, data);
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted",
        description: "Your application has been sent to the employer.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${id}`] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Please sign in to apply for jobs.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Application Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/saved-jobs`, { jobId: id });
    },
    onSuccess: () => {
      toast({
        title: "Job Saved",
        description: "Added to your saved jobs.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Please sign in to save jobs.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    },
  });

  const isPremium = job?.tier === 'premium';
  const isFeatured = job?.tier === 'featured';

  if (isLoading) {
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

  if (!job) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-12 max-w-md text-center">
            <h2 className="text-2xl font-bold mb-4">Job Not Found</h2>
            <p className="text-muted-foreground mb-6">This job posting doesn't exist or has been removed.</p>
            <Link href="/jobs">
              <Button>Browse All Jobs</Button>
            </Link>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <Card className={cn(isPremium && "border-l-4 border-l-chart-3")}>
                <CardHeader className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold mb-2" data-testid="text-job-title">{job.title}</h1>
                      <Link href={`/companies/${job.company?.slug || job.companyId}`}>
                        <div className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={job.company?.logo || undefined} className="object-cover" />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {job.company?.name?.slice(0, 2).toUpperCase() || 'CO'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-lg" data-testid="text-company-name">{job.company?.name}</p>
                            {job.company?.location && (
                              <p className="text-sm flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {job.company.location}
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    </div>
                    {isFeatured && (
                      <Star className="w-6 h-6 fill-chart-4 text-chart-4" />
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default" data-testid="badge-job-type">{JOB_TYPES[job.jobType]}</Badge>
                    <Badge variant="secondary" data-testid="badge-experience-level">{EXPERIENCE_LEVELS[job.experienceLevel]}</Badge>
                    {job.category && <Badge variant="outline">{job.category}</Badge>}
                    {isPremium && <Badge className="bg-chart-3 text-white">Premium</Badge>}
                    {isFeatured && <Badge className="bg-chart-4 text-white">Featured</Badge>}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span data-testid="text-location">{job.isRemote ? 'Remote' : job.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span data-testid="text-salary">{formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span data-testid="text-posted">{formatTimeAgo(job.publishedAt || job.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                      <span data-testid="text-views">{job.viewCount} views</span>
                    </div>
                  </div>
                </CardHeader>

                <Separator />

                <CardContent className="pt-6 space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-3">Description</h2>
                    <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap" data-testid="text-description">
                      {job.description}
                    </div>
                  </div>

                  {job.requirements && (
                    <div>
                      <h2 className="text-xl font-semibold mb-3">Requirements</h2>
                      <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap" data-testid="text-requirements">
                        {job.requirements}
                      </div>
                    </div>
                  )}

                  {job.responsibilities && (
                    <div>
                      <h2 className="text-xl font-semibold mb-3">Responsibilities</h2>
                      <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap" data-testid="text-responsibilities">
                        {job.responsibilities}
                      </div>
                    </div>
                  )}

                  {job.tags && job.tags.length > 0 && (
                    <div>
                      <h2 className="text-xl font-semibold mb-3">Skills</h2>
                      <div className="flex flex-wrap gap-2">
                        {job.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="sticky top-24">
                <CardContent className="pt-6 space-y-4">
                  {job.externalUrl ? (
                    <Button asChild className="w-full" size="lg" data-testid="button-apply-external">
                      <a href={job.externalUrl} target="_blank" rel="noopener noreferrer">
                        Apply on Company Site
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </a>
                    </Button>
                  ) : (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="w-full" size="lg" data-testid="button-apply">
                          Apply for this Job
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Apply for {job.title}</DialogTitle>
                          <DialogDescription>
                            Submit your application to {job.company?.name}
                          </DialogDescription>
                        </DialogHeader>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            applyMutation.mutate({
                              coverLetter: formData.get('coverLetter') as string,
                            });
                          }}
                          className="space-y-4"
                        >
                          <div>
                            <Label htmlFor="coverLetter">Cover Letter</Label>
                            <Textarea
                              id="coverLetter"
                              name="coverLetter"
                              placeholder="Tell us why you're a great fit for this role..."
                              className="min-h-[200px] mt-2"
                              data-testid="textarea-cover-letter"
                              required
                            />
                          </div>
                          <Button type="submit" className="w-full" disabled={applyMutation.isPending} data-testid="button-submit-application">
                            {applyMutation.isPending ? 'Submitting...' : 'Submit Application'}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => saveMutation.mutate()}
                      disabled={saveMutation.isPending}
                      data-testid="button-save"
                      className="gap-2"
                    >
                      <Bookmark className="w-4 h-4" />
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.share?.({ title: job.title, url: window.location.href }) ||
                          navigator.clipboard.writeText(window.location.href).then(() => {
                            toast({ title: "Link copied to clipboard" });
                          });
                      }}
                      data-testid="button-share"
                      className="gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Applicants</span>
                      <span className="font-medium" data-testid="text-applicant-count">
                        {job.applyCount}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Views</span>
                      <span className="font-medium">{job.viewCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Posted</span>
                      <span className="font-medium">{formatTimeAgo(job.publishedAt || job.createdAt)}</span>
                    </div>
                    {job.expiresAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Expires</span>
                        <span className="font-medium">{formatTimeAgo(job.expiresAt)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
