import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { JOB_CATEGORIES, JOB_TYPES, EXPERIENCE_LEVELS } from "@/lib/constants";
import { type Company } from "@shared/schema";
import { Plus } from "lucide-react";
import { CompanyFormDialog } from "@/components/CompanyFormDialog";
import { RichTextEditor } from "@/components/RichTextEditor";

export default function PostJob() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  // ---- Edit mode detection ---------------------------------------------------
  const [match, params] = useRoute('/jobs/:id/edit');
  const isEdit = Boolean(match && params?.id);
  const editJobId = isEdit ? String(params!.id) : null;

  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    responsibilities: '',
    benefits: '',
    category: '',
    location: '',
    isRemote: false,
    salaryMin: '',
    salaryMax: '',
    jobType: 'full_time',
    experienceLevel: 'mid',
    tier: 'featured',
    externalUrl: '',
    tags: '',
    visibilityDays: 30,
    salaryCurrency: 'USD',
    salaryPeriod: 'month',
    applicationMethod: 'email' as 'email' | 'external',
    applicationEmail: '',
    applicationUrl: '',
  });

  useEffect(() => {
    if (
      !authLoading &&
      (!isAuthenticated || (user?.role !== 'employer' && user?.role !== 'recruiter'))
    ) {
      toast({
        title: "Unauthorized",
        description: "Only employers can post or edit jobs.",
        variant: "destructive",
      });
      setTimeout(() => {
        setLocation("/");
      }, 500);
    }
  }, [isAuthenticated, authLoading, user, toast, setLocation]);

  // ---- Employer companies (for create flow) ---------------------------------
  type EmployerCompany = Company & { jobCount?: number };
  const { data: companies = [] } = useQuery<EmployerCompany[]>({
    queryKey: ["/api/employer/companies"],
    enabled: isAuthenticated,
  });

  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const hasAnyCompany = companies.length > 0;
  const hasSingleCompany = companies.length === 1;
  const primaryCompany = hasSingleCompany ? companies[0] : null;

  useEffect(() => {
    if (primaryCompany) {
      setSelectedCompanyId(primaryCompany.id);
    } else {
      setSelectedCompanyId("");
    }
  }, [primaryCompany]);

  useEffect(() => {
    if (companies.length > 1 && !selectedCompanyId) {
      setSelectedCompanyId(companies[0]!.id);
    }
  }, [companies, selectedCompanyId]);

  // ---- Load existing job on edit --------------------------------------------
  const { data: existingJob, isLoading: loadingJob } = useQuery<any>({
    queryKey: ['/api/jobs', editJobId],
    enabled: !!editJobId,
    queryFn: async () => (await apiRequest("GET", `/api/jobs/${editJobId}`)).json(),
  });

  // Prefill the form once the job is loaded
  useEffect(() => {
    if (isEdit && existingJob) {
      // lock company to the job's company
      setSelectedCompanyId(existingJob.companyId);

      setFormData((prev) => ({
        ...prev,
        title: existingJob.title ?? '',
        description: existingJob.description ?? '',
        requirements: existingJob.requirements ?? '',
        responsibilities: existingJob.responsibilities ?? '',
        benefits: existingJob.benefits ?? '',
        category: existingJob.category ?? '',
        location: existingJob.location ?? '',
        isRemote: !!existingJob.isRemote,
        salaryMin: existingJob.salaryMin != null ? String(existingJob.salaryMin) : '',
        salaryMax: existingJob.salaryMax != null ? String(existingJob.salaryMax) : '',
        jobType: existingJob.jobType ?? prev.jobType,
        experienceLevel: existingJob.experienceLevel ?? prev.experienceLevel,
        tier: existingJob.tier ?? prev.tier,
        externalUrl: existingJob.externalUrl ?? '',
        tags: Array.isArray(existingJob.tags) ? existingJob.tags.join(', ') : '',
        visibilityDays: existingJob.visibilityDays ?? prev.visibilityDays,
        salaryCurrency: existingJob.salaryCurrency ?? prev.salaryCurrency,
        salaryPeriod: existingJob.salaryPeriod ?? prev.salaryPeriod,
        applicationMethod: existingJob.applicationMethod ?? prev.applicationMethod,
        applicationEmail: existingJob.applicationEmail ?? '',
        applicationUrl:
          existingJob.applicationMethod === 'external'
            ? (existingJob.externalUrl ?? '')
            : '',
      }));
    }
  }, [isEdit, existingJob]);

  // ---- Mutations -------------------------------------------------------------
  const postJobMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/jobs", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Job Posted", description: "Your job has been published." });
      setLocation(`/jobs/${data.id}`);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please sign in to post jobs.", variant: "destructive" });
        setTimeout(() => setLocation("/login"), 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateJobMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", `/api/jobs/${editJobId}`, data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Job Updated", description: "Your changes have been saved." });
      setLocation(`/jobs/${data.id}`);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please sign in to update jobs.", variant: "destructive" });
        setTimeout(() => setLocation("/login"), 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // In create flow, ensure a company exists/selected
    if (!isEdit && !primaryCompany && !selectedCompanyId) {
      toast({
        title: "Select a company",
        description: "Create your company before posting a job.",
        variant: "destructive",
      });
      return;
    }

    if (formData.applicationMethod === 'email' && !formData.applicationEmail.trim()) {
      toast({
        title: "Application email required",
        description: "Provide an email for candidates to contact.",
        variant: "destructive",
      });
      return;
    }

    if (formData.applicationMethod === 'external' && !formData.applicationUrl.trim()) {
      toast({
        title: "Application link required",
        description: "Provide a valid URL where candidates should apply.",
        variant: "destructive",
      });
      return;
    }

    const jobData = {
      companyId: isEdit ? existingJob?.companyId : (primaryCompany ? primaryCompany.id : selectedCompanyId),
      title: formData.title,
      description: formData.description,
      requirements: formData.requirements || undefined,
      responsibilities: formData.responsibilities || undefined,
      benefits: formData.benefits || undefined,
      category: formData.category || undefined,
      location: formData.location || undefined,
      isRemote: formData.isRemote,
      salaryMin: formData.salaryMin ? parseInt(formData.salaryMin) : undefined,
      salaryMax: formData.salaryMax ? parseInt(formData.salaryMax) : undefined,
      salaryCurrency: formData.salaryCurrency,
      salaryPeriod: formData.salaryPeriod,
      jobType: formData.jobType,
      experienceLevel: formData.experienceLevel,
      tier: formData.tier,
      applicationMethod: formData.applicationMethod,
      applicationEmail: formData.applicationMethod === 'email' ? formData.applicationEmail.trim() : undefined,
      externalUrl:
        formData.applicationMethod === 'external'
          ? formData.applicationUrl.trim()
          : formData.externalUrl || undefined,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      visibilityDays: formData.visibilityDays,
    };

    if (isEdit) {
      updateJobMutation.mutate(jobData);
    } else {
      postJobMutation.mutate(jobData);
    }
  };

  if (authLoading || !isAuthenticated || (isEdit && loadingJob)) {
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

  const isSaving = postJobMutation.isPending || updateJobMutation.isPending;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2" data-testid="text-page-title">
              {isEdit ? "Edit Job" : "Post a Job Listing"}
            </h1>
            <p className="text-muted-foreground">
              {isEdit ? "Update your job listing details" : "Fill in the details below to post your job"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company</CardTitle>
                <CardDescription>
                  {isEdit
                    ? "This job is tied to the company below."
                    : hasSingleCompany && primaryCompany
                      ? "Jobs will be posted under your company."
                      : "Create your company before posting jobs"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEdit && existingJob?.company ? (
                  <div className="rounded-md border bg-muted/30 p-4">
                    <p className="text-sm font-medium">{existingJob.company.name}</p>
                    {existingJob.company.location && (
                      <p className="text-xs text-muted-foreground">{existingJob.company.location}</p>
                    )}
                  </div>
                ) : companies.length === 0 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Create your company before posting a job.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => setShowCreateCompany(true)}
                      data-testid="button-create-company"
                    >
                      <Plus className="h-4 w-4" />
                      Create Company
                    </Button>
                  </div>
                ) : companies.length === 1 && primaryCompany ? (
                  <div className="rounded-md border bg-muted/30 p-4">
                    <p className="text-sm font-medium">{primaryCompany.name}</p>
                    {primaryCompany.location && (
                      <p className="text-xs text-muted-foreground">
                        {primaryCompany.location}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <Select
                      value={selectedCompanyId}
                      onValueChange={setSelectedCompanyId}
                      required
                    >
                      <SelectTrigger data-testid="select-company">
                        <SelectValue placeholder="Select a company" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}

                {!isEdit && (
                  <CompanyFormDialog
                    open={showCreateCompany}
                    onOpenChange={setShowCreateCompany}
                    onSuccess={(company) => {
                      setSelectedCompanyId(company.id);
                    }}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Job Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Job Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Senior Solidity Developer"
                    required
                    data-testid="input-title"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger id="category" data-testid="select-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {JOB_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="jobType">Job Type *</Label>
                    <Select value={formData.jobType} onValueChange={(value) => setFormData({ ...formData, jobType: value })} required>
                      <SelectTrigger id="jobType" data-testid="select-job-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(JOB_TYPES).map(([key, value]) => (
                          <SelectItem key={key} value={key}>{value}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="experienceLevel">Experience Level *</Label>
                    <Select value={formData.experienceLevel} onValueChange={(value) => setFormData({ ...formData, experienceLevel: value })} required>
                      <SelectTrigger id="experienceLevel" data-testid="select-experience-level">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(EXPERIENCE_LEVELS).map(([key, value]) => (
                          <SelectItem key={key} value={key}>{value}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g. San Francisco, CA"
                      data-testid="input-location"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remote"
                    checked={formData.isRemote}
                    onCheckedChange={(checked) => setFormData({ ...formData, isRemote: checked as boolean })}
                    data-testid="checkbox-remote"
                  />
                  <Label htmlFor="remote" className="cursor-pointer">Remote position</Label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="salaryMin">Salary Min</Label>
                    <Input
                      id="salaryMin"
                      type="number"
                      value={formData.salaryMin}
                      onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value })}
                      placeholder="80000"
                      data-testid="input-salary-min"
                    />
                  </div>

                  <div>
                    <Label htmlFor="salaryMax">Salary Max</Label>
                    <Input
                      id="salaryMax"
                      type="number"
                      value={formData.salaryMax}
                      onChange={(e) => setFormData({ ...formData, salaryMax: e.target.value })}
                      placeholder="120000"
                      data-testid="input-salary-max"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Currency</Label>
                    <Select
                      value={formData.salaryCurrency}
                      onValueChange={(value) => setFormData({ ...formData, salaryCurrency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['USD', 'EUR', 'CAD', 'GBP'].map((currency) => (
                          <SelectItem key={currency} value={currency}>
                            {currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Period</Label>
                    <Select
                      value={formData.salaryPeriod}
                      onValueChange={(value) => setFormData({ ...formData, salaryPeriod: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['year', 'month', 'week', 'hour'].map((period) => (
                          <SelectItem key={period} value={period}>
                            {period.charAt(0).toUpperCase() + period.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Job Description *</Label>
                  <RichTextEditor
                    value={formData.description}
                    onChange={(value) => setFormData({ ...formData, description: value })}
                    placeholder="Describe the role, what the candidate will be working on..."
                  />
                </div>

                <div>
                  <Label htmlFor="requirements">Requirements</Label>
                  <RichTextEditor
                    value={formData.requirements}
                    onChange={(value) => setFormData({ ...formData, requirements: value })}
                    placeholder="Required skills, experience, qualifications..."
                  />
                </div>

                <div>
                  <Label htmlFor="responsibilities">Responsibilities</Label>
                  <RichTextEditor
                    value={formData.responsibilities}
                    onChange={(value) => setFormData({ ...formData, responsibilities: value })}
                    placeholder="What will the candidate be responsible for..."
                  />
                </div>

                <div>
                  <Label htmlFor="benefits">Benefits</Label>
                  <RichTextEditor
                    value={formData.benefits}
                    onChange={(value) => setFormData({ ...formData, benefits: value })}
                    placeholder="Health insurance, 401k, remote work, flexible hours..."
                  />
                </div>

                <div>
                  <Label htmlFor="tags">Skills/Tags (comma-separated)</Label>
                <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="Solidity, React, TypeScript, DeFi"
                    data-testid="input-tags"
                  />
                </div>

                <div className="space-y-3">
                  <Label>Application method</Label>
                  <RadioGroup
                    value={formData.applicationMethod}
                    onValueChange={(value) =>
                      setFormData({ ...formData, applicationMethod: value as 'email' | 'external' })
                    }
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="email" id="method-email" />
                      <Label htmlFor="method-email" className="cursor-pointer">
                        Email
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="external" id="method-external" />
                      <Label htmlFor="method-external" className="cursor-pointer">
                        External link
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {formData.applicationMethod === 'email' ? (
                  <div>
                    <Label htmlFor="applicationEmail">Application email</Label>
                    <Input
                      id="applicationEmail"
                      type="email"
                      value={formData.applicationEmail}
                      onChange={(e) => setFormData({ ...formData, applicationEmail: e.target.value })}
                      placeholder="jobs@yourcompany.com"
                    />
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="applicationUrl">Application link</Label>
                    <Input
                      id="applicationUrl"
                      type="url"
                      value={formData.applicationUrl}
                      onChange={(e) => setFormData({ ...formData, applicationUrl: e.target.value })}
                      placeholder="https://yourcompany.com/apply"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button type="submit" disabled={isSaving} data-testid="button-submit" className="flex-1">
                {isEdit
                  ? (updateJobMutation.isPending ? 'Saving...' : 'Save Changes')
                  : (postJobMutation.isPending ? 'Posting...' : 'Post Job')}
              </Button>
              <Button type="button" variant="outline" onClick={() => setLocation('/dashboard')} data-testid="button-cancel">
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
