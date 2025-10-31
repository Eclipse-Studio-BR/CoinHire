import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Company } from "@shared/schema";
import { JOB_CATEGORIES, JOB_TYPES, EXPERIENCE_LEVELS } from "@/lib/constants";
import { RichTextEditor } from "@/components/RichTextEditor";

  const adminJobSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  title: z.string().min(1, "Job title is required"),
  description: z.string().min(1, "Description is required"),
  requirements: z.string().optional(),
  responsibilities: z.string().optional(),
  benefits: z.string().optional(),
  category: z.string().optional(),
  location: z.string().optional(),
  isRemote: z.boolean().default(false),
  salaryMin: z.string().optional(),
  salaryMax: z.string().optional(),
  salaryCurrency: z.string().default("USD"),
  salaryPeriod: z.enum(["year", "month", "week", "hour"]).default("month"),
  jobType: z.enum(["full_time", "part_time", "contract", "internship"]).default("full_time"),
  experienceLevel: z.enum(["entry", "mid", "senior", "lead", "executive"]).default("mid"),
  tags: z.string().optional(),
  applicationMethod: z.enum(["email", "external"]).default("email"),
  applicationEmail: z.string().email().optional(),
  externalUrl: z.string().url().optional().or(z.literal("")),
});

type AdminJobValues = z.infer<typeof adminJobSchema>;

export function AdminCreateJobDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const form = useForm<AdminJobValues>({
    resolver: zodResolver(adminJobSchema),
    defaultValues: {
      companyId: "",
      title: "",
      description: "",
      requirements: "",
      responsibilities: "",
      category: "",
      location: "",
      isRemote: false,
      salaryMin: "",
      salaryMax: "",
      salaryCurrency: "USD",
      salaryPeriod: "month",
      jobType: "full_time",
      experienceLevel: "mid",
      tags: "",
      applicationMethod: "email",
      applicationEmail: "",
      externalUrl: "",
    },
  });

  const createJobMutation = useMutation({
    mutationFn: async (data: AdminJobValues) => {
      const jobData = {
        companyId: data.companyId,
        title: data.title,
        description: data.description,
        requirements: data.requirements || undefined,
        responsibilities: data.responsibilities || undefined,
        benefits: data.benefits || undefined,
        category: data.category || undefined,
        location: data.location || undefined,
        isRemote: data.isRemote,
        salaryMin: data.salaryMin ? parseInt(data.salaryMin) : undefined,
        salaryMax: data.salaryMax ? parseInt(data.salaryMax) : undefined,
        salaryCurrency: data.salaryCurrency,
        salaryPeriod: data.salaryPeriod,
        jobType: data.jobType,
        experienceLevel: data.experienceLevel,
        applicationMethod: data.applicationMethod,
        applicationEmail: data.applicationMethod === 'email' ? data.applicationEmail : undefined,
        externalUrl: data.applicationMethod === 'external' ? data.externalUrl : undefined,
        tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      };
      const response = await apiRequest("POST", "/api/admin/jobs", jobData);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Job created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const applicationMethod = form.watch("applicationMethod");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Job
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Job Listing</DialogTitle>
          <DialogDescription>
            Add a curated job listing to the platform.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createJobMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="companyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a company" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Senior Blockchain Developer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {JOB_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="jobType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(JOB_TYPES).map(([key, value]) => (
                          <SelectItem key={key} value={key}>{value}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="experienceLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Experience Level *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(EXPERIENCE_LEVELS).map(([key, value]) => (
                          <SelectItem key={key} value={key}>{value}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="San Francisco, CA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isRemote"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Remote position</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="salaryMin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salary Min</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="80000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="salaryMax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salary Max</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="120000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <RichTextEditor
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Job description..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requirements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Requirements</FormLabel>
                  <FormControl>
                    <RichTextEditor
                      value={field.value || ''}
                      onChange={field.onChange}
                      placeholder="Required skills and experience..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="benefits"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Benefits</FormLabel>
                  <FormControl>
                    <RichTextEditor
                      value={field.value || ''}
                      onChange={field.onChange}
                      placeholder="Health insurance, stock options, remote work..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Skills/Tags</FormLabel>
                  <FormControl>
                    <Input placeholder="Solidity, React, TypeScript" {...field} />
                  </FormControl>
                  <FormDescription>Comma-separated</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="applicationMethod"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Application Method *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex gap-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="email" />
                        </FormControl>
                        <FormLabel className="font-normal">Email</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="external" />
                        </FormControl>
                        <FormLabel className="font-normal">External Link</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {applicationMethod === "email" ? (
              <FormField
                control={form.control}
                name="applicationEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Application Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="jobs@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="externalUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Application URL *</FormLabel>
                    <FormControl>
                      <Input placeholder="https://company.com/careers/apply" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createJobMutation.isPending}>
                {createJobMutation.isPending ? "Creating..." : "Create Job"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
