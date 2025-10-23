import { useEffect, useState } from "react";
import { useLocation } from "wouter";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileUpload } from "@/components/FileUpload";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { JOB_CATEGORIES, JOB_TYPES, EXPERIENCE_LEVELS } from "@/lib/constants";
import { insertJobSchema } from "@shared/schema";
import { Plus } from "lucide-react";

export default function PostJob() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    responsibilities: '',
    category: '',
    location: '',
    isRemote: false,
    salaryMin: '',
    salaryMax: '',
    jobType: 'full_time',
    experienceLevel: 'mid',
    tier: 'normal',
    externalUrl: '',
    tags: '',
    visibilityDays: 30,
  });

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || (user?.role !== 'employer' && user?.role !== 'recruiter'))) {
      toast({
        title: "Unauthorized",
        description: "Only employers can post jobs.",
        variant: "destructive",
      });
      setTimeout(() => {
        setLocation("/");
      }, 500);
    }
  }, [isAuthenticated, authLoading, user, toast, setLocation]);

  const { data: companies = [] } = useQuery({
    queryKey: ["/api/employer/companies"],
    enabled: isAuthenticated,
  });

  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [companyData, setCompanyData] = useState({
    name: '',
    description: '',
    website: '',
    location: '',
    logo: '',
  });

  const createCompanyMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/companies", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Company Created",
        description: "Your company has been submitted for approval.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/employer/companies"] });
      setSelectedCompanyId(data.id);
      setShowCreateCompany(false);
      setCompanyData({ name: '', description: '', website: '', location: '', logo: '' });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const postJobMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/jobs", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Job Posted",
        description: "Your job has been submitted for review.",
      });
      setLocation(`/jobs/${data.id}`);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Please sign in to post jobs.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const jobData = {
      companyId: selectedCompanyId,
      title: formData.title,
      description: formData.description,
      requirements: formData.requirements || undefined,
      responsibilities: formData.responsibilities || undefined,
      category: formData.category || undefined,
      location: formData.location || undefined,
      isRemote: formData.isRemote,
      salaryMin: formData.salaryMin ? parseInt(formData.salaryMin) : undefined,
      salaryMax: formData.salaryMax ? parseInt(formData.salaryMax) : undefined,
      jobType: formData.jobType,
      experienceLevel: formData.experienceLevel,
      tier: formData.tier,
      externalUrl: formData.externalUrl || undefined,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      visibilityDays: formData.visibilityDays,
      status: 'pending',
    };

    postJobMutation.mutate(jobData);
  };

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

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2" data-testid="text-page-title">
              Post a Job
            </h1>
            <p className="text-muted-foreground">
              Fill out the form below to post your job opportunity
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company</CardTitle>
                <CardDescription>Select the company for this job posting</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId} required>
                  <SelectTrigger data-testid="select-company">
                    <SelectValue placeholder="Select a company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company: any) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Dialog open={showCreateCompany} onOpenChange={setShowCreateCompany}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" className="w-full gap-2" data-testid="button-create-company">
                      <Plus className="w-4 h-4" />
                      Create New Company
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create Company</DialogTitle>
                      <DialogDescription>
                        Add your company information. It will be reviewed before appearing on the platform.
                      </DialogDescription>
                    </DialogHeader>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        createCompanyMutation.mutate(companyData);
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <Label htmlFor="companyName">Company Name *</Label>
                        <Input
                          id="companyName"
                          value={companyData.name}
                          onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                          placeholder="e.g. Acme Corp"
                          required
                          data-testid="input-company-name"
                        />
                      </div>

                      <div>
                        <Label htmlFor="companyDescription">Description *</Label>
                        <Textarea
                          id="companyDescription"
                          value={companyData.description}
                          onChange={(e) => setCompanyData({ ...companyData, description: e.target.value })}
                          placeholder="Tell us about your company..."
                          className="min-h-[100px]"
                          required
                          data-testid="textarea-company-description"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="companyWebsite">Website</Label>
                          <Input
                            id="companyWebsite"
                            type="url"
                            value={companyData.website}
                            onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })}
                            placeholder="https://example.com"
                            data-testid="input-company-website"
                          />
                        </div>

                        <div>
                          <Label htmlFor="companyLocation">Location</Label>
                          <Input
                            id="companyLocation"
                            value={companyData.location}
                            onChange={(e) => setCompanyData({ ...companyData, location: e.target.value })}
                            placeholder="e.g. San Francisco, CA"
                            data-testid="input-company-location"
                          />
                        </div>
                      </div>

                      <FileUpload
                        type="logo"
                        onUploadComplete={(url) => setCompanyData({ ...companyData, logo: url })}
                        label="Company Logo (Optional)"
                      />

                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowCreateCompany(false)}
                          className="flex-1"
                          data-testid="button-cancel-company"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={createCompanyMutation.isPending}
                          className="flex-1"
                          data-testid="button-submit-company"
                        >
                          {createCompanyMutation.isPending ? 'Creating...' : 'Create Company'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
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
                    <Label htmlFor="salaryMin">Salary Min (USD)</Label>
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
                    <Label htmlFor="salaryMax">Salary Max (USD)</Label>
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

                <div>
                  <Label htmlFor="description">Job Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the role, what the candidate will be working on..."
                    className="min-h-[150px]"
                    required
                    data-testid="textarea-description"
                  />
                </div>

                <div>
                  <Label htmlFor="requirements">Requirements</Label>
                  <Textarea
                    id="requirements"
                    value={formData.requirements}
                    onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                    placeholder="Required skills, experience, qualifications..."
                    className="min-h-[100px]"
                    data-testid="textarea-requirements"
                  />
                </div>

                <div>
                  <Label htmlFor="responsibilities">Responsibilities</Label>
                  <Textarea
                    id="responsibilities"
                    value={formData.responsibilities}
                    onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                    placeholder="What will the candidate be responsible for..."
                    className="min-h-[100px]"
                    data-testid="textarea-responsibilities"
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

                <div>
                  <Label htmlFor="externalUrl">External Application URL (optional)</Label>
                  <Input
                    id="externalUrl"
                    type="url"
                    value={formData.externalUrl}
                    onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
                    placeholder="https://yourcompany.com/apply"
                    data-testid="input-external-url"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    If provided, applicants will be redirected to this URL instead of applying through the platform
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button type="submit" disabled={postJobMutation.isPending} data-testid="button-submit" className="flex-1">
                {postJobMutation.isPending ? 'Posting...' : 'Post Job'}
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
