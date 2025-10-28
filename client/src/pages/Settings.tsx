import { useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FileUpload } from "@/components/FileUpload";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PublicUser, TalentProfile, Company } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { TIMEZONES } from "@/lib/timezones";

const profileFormSchema = z.object({
  firstName: z.string().max(100, "First name must be 100 characters or less").optional(),
  lastName: z.string().max(100, "Last name must be 100 characters or less").optional(),
  profileImageUrl: z.string().max(500, "Profile image URL is too long").optional(),
  // shown only for employers but safe to include in schema
  companyDescription: z.string().max(2000, "Description is too long").optional(),
  currentSize: z.string().optional(),
  paymentInCrypto: z.boolean().optional(),
  remoteWorking: z.boolean().optional(),
  website: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  twitter: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  discord: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  telegram: z.string().optional().or(z.literal("")),
});

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, "Please enter your current password"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

const talentProfileFormSchema = z.object({
  title: z.string().max(255, "Title is too long").optional().or(z.literal("")),
  story: z.string().max(2000, "Story is too long").optional().or(z.literal("")),
  location: z.string().max(255, "Location is too long").optional().or(z.literal("")),
  timezone: z.string().max(100).optional().or(z.literal("UTC")),
  hourlyRate: z.string().optional().or(z.literal("")),
  monthlyRate: z.string().optional().or(z.literal("")),
  skills: z.string().optional().or(z.literal("")),
  languages: z.string().optional().or(z.literal("")),
  linkedinUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  telegram: z.string().optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;
type TalentProfileFormValues = z.infer<typeof talentProfileFormSchema>;

const EMPTY_PROFILE_VALUES: ProfileFormValues = {
  firstName: "",
  lastName: "",
  profileImageUrl: "",
  companyDescription: "",
};

const EMPTY_PASSWORD_VALUES: PasswordFormValues = {
  currentPassword: "",
  newPassword: "",
};

const EMPTY_TALENT_PROFILE_VALUES: TalentProfileFormValues = {
  title: "",
  story: "",
  location: "",
  timezone: "UTC",
  hourlyRate: "",
  monthlyRate: "",
  skills: "",
  languages: "",
  linkedinUrl: "",
  telegram: "",
};

export default function Settings() {
  const { user } = useAuth();
  const isTalent = user?.role === "talent";
  const isEmployer = user?.role === "employer";
  const settingsTitle = isTalent ? "Profile Settings" : "Company Settings";
  const { toast } = useToast();

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: EMPTY_PROFILE_VALUES,
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: EMPTY_PASSWORD_VALUES,
  });

  const talentProfileForm = useForm<TalentProfileFormValues>({
    resolver: zodResolver(talentProfileFormSchema),
    defaultValues: EMPTY_TALENT_PROFILE_VALUES,
  });

  // Employer: load the single company
  const { data: companies = [], isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ["/api/employer/companies"],
    enabled: isEmployer,
  });
  const myCompany = companies?.[0];

  const { data: talentProfile, isLoading: talentProfileLoading } = useQuery<TalentProfile | null>({
    queryKey: ["/api/talent/profile"],
    enabled: isTalent,
  });

  // prime defaults
  useEffect(() => {
    profileForm.reset(buildProfileDefaults(user));
  }, [user, profileForm]);

  // when company arrives, set description into the same form block
  useEffect(() => {
    if (isEmployer && myCompany) {
      profileForm.setValue("companyDescription", myCompany.description ?? "", { shouldDirty: false });
      profileForm.setValue("currentSize", myCompany.currentSize ?? "", { shouldDirty: false });
      profileForm.setValue("paymentInCrypto", myCompany.paymentInCrypto ?? false, { shouldDirty: false });
      profileForm.setValue("remoteWorking", myCompany.remoteWorking ?? false, { shouldDirty: false });
      profileForm.setValue("website", myCompany.website ?? "", { shouldDirty: false });
      profileForm.setValue("twitter", myCompany.twitter ?? "", { shouldDirty: false });
      profileForm.setValue("discord", myCompany.discord ?? "", { shouldDirty: false });
      profileForm.setValue("telegram", myCompany.telegram ?? "", { shouldDirty: false });
      if (!profileForm.getValues("profileImageUrl") && myCompany.logo) {
        profileForm.setValue("profileImageUrl", myCompany.logo, { shouldDirty: false });
      }
    }
  }, [isEmployer, myCompany, profileForm]);

  useEffect(() => {
    if (isTalent) {
      talentProfileForm.reset(buildTalentProfileDefaults(talentProfile));
    }
  }, [isTalent, talentProfile, talentProfileForm]);

  const profileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      const response = await apiRequest("PUT", "/api/auth/profile", {
        firstName: values.firstName ?? "",
        lastName: values.lastName ?? "",
        profileImageUrl: values.profileImageUrl ?? "",
      });
      return (await response.json()) as PublicUser;
    },
    onSuccess: async (updatedUser) => {
      toast({ title: "Profile updated", description: "Your account details have been saved." });
      profileForm.reset({
        ...buildProfileDefaults(updatedUser),
        companyDescription: profileForm.getValues("companyDescription") ?? "",
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: Error) => {
      toast({ title: "Unable to update profile", description: error.message, variant: "destructive" });
    },
  });

  // separate mutation for company description/logo (called from the same Save button)
  const companyMutation = useMutation({
    mutationFn: async ({
      id,
      description,
      logo,
      currentSize,
      paymentInCrypto,
      remoteWorking,
      website,
      twitter,
      discord,
      telegram,
    }: {
      id: string;
      description: string;
      logo?: string | null;
      currentSize?: string;
      paymentInCrypto?: boolean;
      remoteWorking?: boolean;
      website?: string;
      twitter?: string;
      discord?: string;
      telegram?: string;
    }) => {
      await apiRequest("PUT", `/api/companies/${id}`, { 
        description, 
        logo,
        currentSize: currentSize || undefined,
        paymentInCrypto,
        remoteWorking,
        website: website || undefined,
        twitter: twitter || undefined,
        discord: discord || undefined,
        telegram: telegram || undefined,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/employer/companies"] });
      toast({ title: "Company updated", description: "Company information saved." });
    },
    onError: (error: Error) => {
      toast({ title: "Unable to update company", description: error.message, variant: "destructive" });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async (values: PasswordFormValues) => {
      await apiRequest("PUT", "/api/auth/password", values);
    },
    onSuccess: () => {
      toast({ title: "Password updated", description: "Use your new password next time you sign in." });
      passwordForm.reset(EMPTY_PASSWORD_VALUES);
    },
    onError: (error: Error) => {
      toast({ title: "Unable to update password", description: error.message, variant: "destructive" });
    },
  });

  const talentProfileMutation = useMutation({
    mutationFn: async (values: TalentProfileFormValues) => {
      await apiRequest("PUT", "/api/talent/profile", {
        title: values.title,
        story: values.story,
        location: values.location,
        timezone: values.timezone,
        hourlyRate: values.hourlyRate ?? "",
        monthlyRate: values.monthlyRate ?? "",
        skills: values.skills ?? "",
        languages: values.languages ?? "",
        linkedinUrl: values.linkedinUrl,
        telegram: values.telegram,
      });
    },
    onSuccess: async () => {
      toast({ title: "Talent profile updated", description: "Your story and rates are up to date." });
      await queryClient.invalidateQueries({ queryKey: ["/api/talent/profile"] });
    },
    onError: (error: Error) => {
      toast({ title: "Unable to update talent profile", description: error.message, variant: "destructive" });
    },
  });

  const talentFormDisabled = talentProfileLoading || talentProfileMutation.isPending;
  const savingProfile = profileMutation.isPending || companyMutation.isPending;
  const canSubmitProfile = profileForm.formState.isDirty && !savingProfile && (!isEmployer || !companiesLoading);

  const handleProfileSubmit = (values: ProfileFormValues) => {
    // update user profile
    profileMutation.mutate({
      firstName: values.firstName ?? "",
      lastName: values.lastName ?? "",
      profileImageUrl: values.profileImageUrl ?? "",
    });
    // also update company description/logo if employer
    if (isEmployer && myCompany) {
      companyMutation.mutate({
        id: String(myCompany.id),
        description: values.companyDescription ?? "",
        logo: values.profileImageUrl || null,
        currentSize: values.currentSize,
        paymentInCrypto: values.paymentInCrypto,
        remoteWorking: values.remoteWorking,
        website: values.website,
        twitter: values.twitter,
        discord: values.discord,
        telegram: values.telegram,
      });
    }
  };

  const handlePasswordSubmit = (values: PasswordFormValues) => {
    passwordMutation.mutate(values);
  };

  const handleTalentProfileSubmit = (values: TalentProfileFormValues) => {
    talentProfileMutation.mutate(values);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-10 max-w-4xl">
          <div className="mb-10 space-y-2">
            <p className="text-sm font-medium text-primary">Account</p>
            <h1 className="text-3xl md:text-4xl font-bold">{settingsTitle}</h1>
            <p className="text-muted-foreground max-w-2xl">
              Update how your profile appears across Web3 Jobs and keep your account secure with a stronger password.
            </p>
          </div>

          <div className="grid gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Profile information</CardTitle>
                <CardDescription>
                  Personal details that are visible on your profile and in the navigation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form className="space-y-6" onSubmit={profileForm.handleSubmit(handleProfileSubmit)}>
                    <div className="grid gap-6 md:grid-cols-[260px,1fr]">
                      <FormField
                        control={profileForm.control}
                        name="profileImageUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Profile photo</FormLabel>
                            <FormControl>
                              <div className="max-w-xs">
                                <FileUpload
                                  type="avatar"
                                  currentFile={field.value || undefined}
                                  onUploadComplete={(url) => field.onChange(url)}
                                />
                              </div>
                            </FormControl>
                            <FormDescription>Square images (400x400px+) look best.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid gap-6">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField
                            control={profileForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Satoshi" {...field} value={field.value ?? ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={profileForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Last name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Nakamoto" {...field} value={field.value ?? ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                          {user?.email ? (
                            <>
                              <p className="text-foreground font-medium">Primary email</p>
                              <p>{user.email}</p>
                            </>
                          ) : (
                            <p>Add a name to personalize your account.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Employer-only: company description in the SAME block */}
                    {isEmployer && (
                      <>
                        <FormField
                          control={profileForm.control}
                          name="companyDescription"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company description</FormLabel>
                              <FormControl>
                                <Textarea
                                  rows={4}
                                  placeholder="Tell candidates about your mission, culture, and products."
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>This appears on your company page.</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid gap-6 md:grid-cols-2">
                          <FormField
                            control={profileForm.control}
                            name="currentSize"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Current Size (Optional)</FormLabel>
                                <FormControl>
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select company size" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="1-10">1-10</SelectItem>
                                      <SelectItem value="11-50">11-50</SelectItem>
                                      <SelectItem value="51-100">51-100</SelectItem>
                                      <SelectItem value="101-500">101-500</SelectItem>
                                      <SelectItem value="500+">500+</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="space-y-4">
                            <FormField
                              control={profileForm.control}
                              name="paymentInCrypto"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                  <div className="space-y-0.5">
                                    <FormLabel>Payment in Crypto</FormLabel>
                                  </div>
                                  <FormControl>
                                    <input
                                      type="checkbox"
                                      checked={field.value || false}
                                      onChange={field.onChange}
                                      className="h-4 w-4"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={profileForm.control}
                              name="remoteWorking"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                  <div className="space-y-0.5">
                                    <FormLabel>Remote Working</FormLabel>
                                  </div>
                                  <FormControl>
                                    <input
                                      type="checkbox"
                                      checked={field.value || false}
                                      onChange={field.onChange}
                                      className="h-4 w-4"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                          <FormField
                            control={profileForm.control}
                            name="website"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Website (Optional)</FormLabel>
                                <FormControl>
                                  <Input placeholder="https://yourcompany.com" {...field} value={field.value ?? ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={profileForm.control}
                            name="twitter"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Twitter / X (Optional)</FormLabel>
                                <FormControl>
                                  <Input placeholder="https://twitter.com/yourcompany" {...field} value={field.value ?? ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                          <FormField
                            control={profileForm.control}
                            name="discord"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Discord (Optional)</FormLabel>
                                <FormControl>
                                  <Input placeholder="https://discord.gg/yourserver" {...field} value={field.value ?? ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={profileForm.control}
                            name="telegram"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Telegram (Optional)</FormLabel>
                                <FormControl>
                                  <Input placeholder="@yourcompany or https://t.me/yourgroup" {...field} value={field.value ?? ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </>
                    )}

                    <div className="flex flex-wrap justify-end gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={!profileForm.formState.isDirty || savingProfile}
                        onClick={() =>
                          profileForm.reset({
                            ...buildProfileDefaults(user ?? null),
                            companyDescription: myCompany?.description ?? "",
                          })
                        }
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={!canSubmitProfile}>
                        {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {savingProfile ? "Saving" : "Save changes"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {isTalent && (
              <Card>
                <CardHeader>
                  <CardTitle>Talent profile</CardTitle>
                  <CardDescription>Share your story, rates, and skills with employers.</CardDescription>
                </CardHeader>
                <CardContent>
                  {talentProfileLoading && !talentProfile ? (
                    <div className="flex min-h-[120px] items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <Form {...talentProfileForm}>
                      <form className="space-y-5" onSubmit={talentProfileForm.handleSubmit(handleTalentProfileSubmit)}>
                        <FormField
                          control={talentProfileForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input placeholder="Senior Smart Contract Engineer" {...field} disabled={talentFormDisabled} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={talentProfileForm.control}
                          name="story"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>What's your story?</FormLabel>
                              <FormControl>
                                <Textarea rows={4} placeholder="Talk about what makes you great" {...field} disabled={talentFormDisabled} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField
                            control={talentProfileForm.control}
                            name="location"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Location</FormLabel>
                                <FormControl>
                                  <Input placeholder="Remote or City, Country" {...field} disabled={talentFormDisabled} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={talentProfileForm.control}
                            name="timezone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Timezone</FormLabel>
                                <FormControl>
                                  <Select value={field.value} onValueChange={field.onChange} disabled={talentFormDisabled}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select timezone" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
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

                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField
                            control={talentProfileForm.control}
                            name="hourlyRate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Hourly rate (USD)</FormLabel>
                                <FormControl>
                                  <Input type="number" min="0" placeholder="120" {...field} disabled={talentFormDisabled} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={talentProfileForm.control}
                            name="monthlyRate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Monthly rate (USD)</FormLabel>
                                <FormControl>
                                  <Input type="number" min="0" placeholder="18000" {...field} disabled={talentFormDisabled} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={talentProfileForm.control}
                          name="skills"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Skills (comma separated)</FormLabel>
                              <FormControl>
                                <Textarea rows={2} placeholder="Solidity, Rust, Tokenomics" {...field} disabled={talentFormDisabled} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={talentProfileForm.control}
                          name="languages"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Languages</FormLabel>
                              <FormControl>
                                <Input placeholder="English, Spanish" {...field} disabled={talentFormDisabled} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField
                            control={talentProfileForm.control}
                            name="linkedinUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>LinkedIn</FormLabel>
                                <FormControl>
                                  <Input placeholder="https://linkedin.com/in/you" {...field} disabled={talentFormDisabled} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={talentProfileForm.control}
                            name="telegram"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Telegram</FormLabel>
                                <FormControl>
                                  <Input placeholder="@yourhandle" {...field} disabled={talentFormDisabled} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex justify-end gap-3">
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={talentFormDisabled || !talentProfileForm.formState.isDirty}
                            onClick={() => talentProfileForm.reset(buildTalentProfileDefaults(talentProfile))}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" disabled={talentFormDisabled}>
                            {talentProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {talentProfileMutation.isPending ? "Saving" : "Save talent profile"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Password</CardTitle>
                <CardDescription>Enter your current password before setting a new one.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form className="space-y-5" onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}>
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current password</FormLabel>
                          <FormControl>
                            <Input type="password" autoComplete="current-password" placeholder="********" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New password</FormLabel>
                          <FormControl>
                            <Input type="password" autoComplete="new-password" placeholder="At least 8 characters" {...field} />
                          </FormControl>
                          <FormDescription>Choose a unique password you are not using elsewhere.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end">
                      <Button type="submit" disabled={passwordMutation.isPending}>
                        {passwordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {passwordMutation.isPending ? "Updating" : "Update password"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sign out</CardTitle>
                <CardDescription>End your current session on this device.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-muted-foreground">
                  You can sign back in at any time with your email and password.
                </p>
                <Button variant="outline" asChild>
                  <a href="/api/logout">Sign out</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function buildProfileDefaults(user: PublicUser | null): ProfileFormValues {
  return {
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    profileImageUrl: user?.profileImageUrl ?? "",
    companyDescription: "",
  };
}

function buildTalentProfileDefaults(profile: TalentProfile | null | undefined): TalentProfileFormValues {
  if (!profile) return EMPTY_TALENT_PROFILE_VALUES;
  return {
    title: profile.headline ?? "",
    story: profile.bio ?? "",
    location: profile.location ?? "",
    timezone: profile.timezone ?? "UTC",
    hourlyRate: profile.hourlyRate ? String(profile.hourlyRate) : "",
    monthlyRate: profile.monthlyRate ? String(profile.monthlyRate) : "",
    skills: profile.skills?.join(", ") ?? "",
    languages: profile.languages?.join(", ") ?? "",
    linkedinUrl: profile.linkedinUrl ?? "",
    telegram: profile.telegram ?? "",
  };
}
