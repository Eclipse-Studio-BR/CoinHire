import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PublicFileUpload } from "@/components/PublicFileUpload";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { TIMEZONES } from "@/lib/timezones";
import { Check, Building2, UserRound } from "lucide-react";

const passwordSchema = z
  .string()
  .min(8, "Password must contain at least 8 characters")
  .regex(/[A-Z]/, "Include at least one uppercase letter")
  .regex(/[a-z]/, "Include at least one lowercase letter")
  .regex(/[0-9]/, "Include at least one number");

const talentFormSchema = z
  .object({
    email: z.string().email("Enter a valid email"),
    username: z.string().min(3, "At least 3 characters").optional().or(z.literal("")),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
    firstName: z.string().optional().or(z.literal("")),
    lastName: z.string().optional().or(z.literal("")),
    avatarPath: z.string().optional().or(z.literal("")),
    title: z.string().min(2, "Title is required"),
    story: z.string().min(20, "Tell us more about you"),
    hourlyRate: z.string().optional().or(z.literal("")),
    monthlyRate: z.string().optional().or(z.literal("")),
    location: z.string().min(2, "Location is required"),
    timezone: z.string().min(2, "Timezone is required"),
    skills: z.string().min(1, "List at least one skill"),
    languages: z.string().optional().or(z.literal("")),
    linkedin: z.string().url("Enter a valid URL").optional().or(z.literal("")),
    telegram: z.string().optional().or(z.literal("")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type TalentFormValues = z.infer<typeof talentFormSchema>;

const currencyOptions = [
  { label: "USD", value: "USD" },
  { label: "EUR", value: "EUR" },
  { label: "CAD", value: "CAD" },
  { label: "GBP", value: "GBP" },
];

const periodOptions = [
  { label: "Year", value: "year" },
  { label: "Month", value: "month" },
  { label: "Week", value: "week" },
  { label: "Hour", value: "hour" },
];

const companyFormSchema = z
  .object({
    email: z.string().email("Enter a valid email"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
    companyName: z.string().min(2, "Company name is required"),
    companyLogoPath: z.string().optional().or(z.literal("")),
    companyDescription: z.string().min(20, "Tell us about your company"),
    jobTitle: z.string().min(2, "Job title is required"),
    jobDescription: z.string().min(50, "Provide a detailed job description"),
    jobLocation: z.string().min(2, "Location is required"),
    salaryMin: z.string().optional().or(z.literal("")),
    salaryMax: z.string().optional().or(z.literal("")),
    salaryCurrency: z.string().default("USD"),
    salaryPeriod: z.string().default("month"),
    applicationMethod: z.enum(["email", "external"]),
    applicationEmail: z.string().email("Enter a valid email").optional().or(z.literal("")),
    applicationUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
    website: z.string().url("Enter a valid URL").optional().or(z.literal("")),
    twitter: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
    }
    if (data.applicationMethod === "email" && !data.applicationEmail?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["applicationEmail"],
        message: "Application email is required",
      });
    }
    if (data.applicationMethod === "external" && !data.applicationUrl?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["applicationUrl"],
        message: "Application link is required",
      });
    }
    if (data.salaryMin && data.salaryMax) {
      const min = Number(data.salaryMin);
      const max = Number(data.salaryMax);
      if (!Number.isNaN(min) && !Number.isNaN(max) && min > max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["salaryMax"],
          message: "Maximum must be greater than minimum",
        });
      }
    }
  });

type CompanyFormValues = z.infer<typeof companyFormSchema>;

const roleCards = [
  {
    id: "talent" as const,
    title: "Talent",
    description: "Showcase your profile and get in front of top Web3 companies.",
    icon: UserRound,
    features: ["Craft a rich profile", "Share your story", "Highlight skills & rates"],
  },
  {
    id: "company" as const,
    title: "Company",
    description: "Publish a job as you register and start attracting applicants.",
    icon: Building2,
    features: ["Create your company", "Post a job instantly", "Collect applications"],
  },
];

function RoleSelect({ onSelect }: { onSelect: (role: "talent" | "company") => void }) {
  return (
    <Card className="p-8">
      <CardHeader className="text-center space-y-3">
        <CardTitle className="text-3xl">Welcome to CryptoJobBoard</CardTitle>
        <CardDescription>Choose the path that best describes you to get started.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          {roleCards.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => onSelect(role.id)}
              className="rounded-xl border p-6 text-left hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="rounded-full bg-primary/10 p-3 text-primary">
                  <role.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-lg font-semibold">{role.title}</p>
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {role.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
        <p className="text-center text-sm mt-6 text-muted-foreground">
          Already have an account? <Link href="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </CardContent>
    </Card>
  );
}

function TalentRegisterForm({ onBack }: { onBack: () => void }) {
  const talentForm = useForm<TalentFormValues>({
    resolver: zodResolver(talentFormSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      avatarPath: "",
      title: "",
      story: "",
      hourlyRate: "",
      monthlyRate: "",
      location: "",
      timezone: "UTC",
      skills: "",
      languages: "",
      linkedin: "",
      telegram: "",
    },
  });
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleSubmit = async (values: TalentFormValues) => {
    const payload = {
      email: values.email,
      username: values.username?.trim() || undefined,
      password: values.password,
      confirmPassword: values.confirmPassword,
      firstName: values.firstName?.trim() || undefined,
      lastName: values.lastName?.trim() || undefined,
      avatarPath: values.avatarPath || undefined,
      title: values.title,
      story: values.story,
      hourlyRate: values.hourlyRate ? Number(values.hourlyRate) : undefined,
      monthlyRate: values.monthlyRate ? Number(values.monthlyRate) : undefined,
      location: values.location,
      timezone: values.timezone,
      skills: values.skills,
      languages: values.languages,
      linkedin: values.linkedin?.trim() || undefined,
      telegram: values.telegram?.trim() || undefined,
    };

    try {
      await apiRequest("POST", "/api/auth/register/talent", payload);
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Welcome!", description: "Your talent profile is ready." });
      setLocation("/dashboard");
    } catch (error) {
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Please review your details and try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-6">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            &larr; Back
          </Button>
          <div>
            <CardTitle>Create your talent profile</CardTitle>
            <CardDescription>Share your story, your rates, and the skills that set you apart.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...talentForm}>
          <form className="space-y-6" onSubmit={talentForm.handleSubmit(handleSubmit)}>
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={talentForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Personal email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={talentForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="your-handle" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={talentForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Choose password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="********" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={talentForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="********" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={talentForm.control}
              name="avatarPath"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Upload your PFP</FormLabel>
                  <FormControl>
                    <PublicFileUpload
                      type="avatar"
                      value={field.value || undefined}
                      onChange={(val) => field.onChange(val ?? "")}
                      helperText="Square images (400x400px+) look best."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={talentForm.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First name</FormLabel>
                    <FormControl>
                      <Input placeholder="Satoshi" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={talentForm.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last name</FormLabel>
                    <FormControl>
                      <Input placeholder="Nakamoto" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={talentForm.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Senior Smart Contract Engineer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={talentForm.control}
              name="story"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What's your story?</FormLabel>
                  <FormControl>
                    <Textarea rows={5} placeholder="Share what makes you great" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={talentForm.control}
                name="hourlyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hourly rate (USD)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="120" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={talentForm.control}
                name="monthlyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly rate (USD)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="18000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={talentForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current location</FormLabel>
                    <FormControl>
                      <Input placeholder="Lisbon, Portugal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={talentForm.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                          {TIMEZONES.map((tz) => (
                            <SelectItem key={tz} value={tz}>
                              {tz}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={talentForm.control}
              name="skills"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Skills (comma separated)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Solidity, Rust, Tokenomics, Leadership" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={talentForm.control}
              name="languages"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Languages (comma separated)</FormLabel>
                  <FormControl>
                    <Input placeholder="English, Spanish" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={talentForm.control}
                name="linkedin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LinkedIn</FormLabel>
                    <FormControl>
                      <Input placeholder="https://linkedin.com/in/you" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={talentForm.control}
                name="telegram"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telegram</FormLabel>
                    <FormControl>
                      <Input placeholder="@yourhandle" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full" disabled={talentForm.formState.isSubmitting}>
              {talentForm.formState.isSubmitting ? "Creating profile..." : "Create profile"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function CompanyRegisterForm({ onBack }: { onBack: () => void }) {
  const companyForm = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      companyName: "",
      companyLogoPath: "",
      companyDescription: "",
      jobTitle: "",
      jobDescription: "",
      jobLocation: "",
      salaryMin: "",
      salaryMax: "",
      salaryCurrency: "USD",
      salaryPeriod: "month",
      applicationMethod: "email",
      applicationEmail: "",
      applicationUrl: "",
      website: "",
      twitter: "",
    },
  });
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleSubmit = async (values: CompanyFormValues) => {
    const payload = {
      email: values.email,
      password: values.password,
      confirmPassword: values.confirmPassword,
      companyName: values.companyName,
      companyLogoPath: values.companyLogoPath || undefined,
      companyDescription: values.companyDescription,
      jobTitle: values.jobTitle,
      jobDescription: values.jobDescription,
      jobLocation: values.jobLocation,
      salaryMin: values.salaryMin ? Number(values.salaryMin) : undefined,
      salaryMax: values.salaryMax ? Number(values.salaryMax) : undefined,
      salaryCurrency: values.salaryCurrency,
      salaryPeriod: values.salaryPeriod,
      applicationMethod: values.applicationMethod,
      applicationEmail: values.applicationMethod === "email" ? values.applicationEmail : undefined,
      applicationUrl: values.applicationMethod === "external" ? values.applicationUrl : undefined,
      website: values.website || undefined,
      twitter: values.twitter || undefined,
    };

    try {
      await apiRequest("POST", "/api/auth/register/company", payload);
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Company created", description: "Your first job listing is live in review." });
      setLocation("/dashboard");
    } catch (error) {
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Please review your details and try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-6">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            &larr; Back
          </Button>
          <div>
            <CardTitle>Register your company</CardTitle>
            <CardDescription>Tell us about your company and publish your first job at the same time.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...companyForm}>
          <form className="space-y-6" onSubmit={companyForm.handleSubmit(handleSubmit)}>
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={companyForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="talent@yourcompany.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={companyForm.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company name</FormLabel>
                    <FormControl>
                      <Input placeholder="Crypto Labs" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={companyForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Choose password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="********" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={companyForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="********" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={companyForm.control}
              name="companyLogoPath"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company logo</FormLabel>
                  <FormControl>
                    <PublicFileUpload
                      type="logo"
                      value={field.value || undefined}
                      onChange={(val) => field.onChange(val ?? "")}
                      helperText="SVG or PNG works great."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={companyForm.control}
              name="companyDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company description</FormLabel>
                  <FormControl>
                    <Textarea rows={5} placeholder="Tell candidates about your mission, team, and culture." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={companyForm.control}
              name="jobTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job title</FormLabel>
                  <FormControl>
                    <Input placeholder="Lead Protocol Engineer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={companyForm.control}
              name="jobDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job description</FormLabel>
                  <FormControl>
                    <Textarea rows={6} placeholder="Describe the role, responsibilities and impact" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={companyForm.control}
              name="jobLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job location</FormLabel>
                  <FormControl>
                    <Input placeholder="Remote or City, Country" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={companyForm.control}
                name="salaryMin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salary min</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="80000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={companyForm.control}
                name="salaryMax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salary max</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="140000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={companyForm.control}
                name="salaryCurrency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Currency" />
                        </SelectTrigger>
                        <SelectContent>
                          {currencyOptions.map((currency) => (
                            <SelectItem key={currency.value} value={currency.value}>
                              {currency.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={companyForm.control}
                name="salaryPeriod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                          {periodOptions.map((period) => (
                            <SelectItem key={period.value} value={period.value}>
                              {period.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={companyForm.control}
              name="applicationMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Application method</FormLabel>
                  <FormControl>
                    <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-4">
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
                        <FormLabel className="font-normal">External link</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {companyForm.watch("applicationMethod") === "email" ? (
              <FormField
                control={companyForm.control}
                name="applicationEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Application email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="jobs@yourcompany.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={companyForm.control}
                name="applicationUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Application link</FormLabel>
                    <FormControl>
                      <Input placeholder="https://yourcompany.com/careers/apply" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={companyForm.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://yourcompany.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={companyForm.control}
                name="twitter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Twitter / X</FormLabel>
                    <FormControl>
                      <Input placeholder="https://twitter.com/yourcompany" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full" disabled={companyForm.formState.isSubmitting}>
              {companyForm.formState.isSubmitting ? "Creating company..." : "Create company & post job"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function Register() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<"talent" | "company" | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      toast({ title: "Already signed in", description: "You're already logged in." });
      setLocation("/dashboard");
    }
  }, [isAuthenticated, setLocation, toast]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 bg-muted/10">
        <div className="container mx-auto px-4 py-12 max-w-5xl space-y-8">
          {selectedRole === null && <RoleSelect onSelect={setSelectedRole} />}
          {selectedRole === "talent" && <TalentRegisterForm onBack={() => setSelectedRole(null)} />}
          {selectedRole === "company" && <CompanyRegisterForm onBack={() => setSelectedRole(null)} />}
        </div>
      </main>
      <Footer />
    </div>
  );
}
