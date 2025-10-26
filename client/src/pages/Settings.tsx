import { useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FileUpload } from "@/components/FileUpload";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PublicUser } from "@shared/schema";
import { Loader2 } from "lucide-react";

const profileFormSchema = z.object({
  firstName: z.string().max(100, "First name must be 100 characters or less").optional(),
  lastName: z.string().max(100, "Last name must be 100 characters or less").optional(),
  profileImageUrl: z.string().max(500, "Profile image URL is too long").optional(),
});

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, "Please enter your current password"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

const EMPTY_PROFILE_VALUES: ProfileFormValues = {
  firstName: "",
  lastName: "",
  profileImageUrl: "",
};

const EMPTY_PASSWORD_VALUES: PasswordFormValues = {
  currentPassword: "",
  newPassword: "",
};

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: EMPTY_PROFILE_VALUES,
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: EMPTY_PASSWORD_VALUES,
  });

  useEffect(() => {
    profileForm.reset(buildProfileDefaults(user));
  }, [user, profileForm]);

  const profileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      const response = await apiRequest("PUT", "/api/auth/profile", values);
      return (await response.json()) as PublicUser;
    },
    onSuccess: async (updatedUser) => {
      toast({
        title: "Profile updated",
        description: "Your account details have been saved.",
      });
      profileForm.reset(buildProfileDefaults(updatedUser));
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to update profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async (values: PasswordFormValues) => {
      await apiRequest("PUT", "/api/auth/password", values);
    },
    onSuccess: () => {
      toast({
        title: "Password updated",
        description: "Use your new password next time you sign in.",
      });
      passwordForm.reset(EMPTY_PASSWORD_VALUES);
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to update password",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleProfileSubmit = (values: ProfileFormValues) => {
    profileMutation.mutate({
      firstName: values.firstName ?? "",
      lastName: values.lastName ?? "",
      profileImageUrl: values.profileImageUrl ?? "",
    });
  };

  const handlePasswordSubmit = (values: PasswordFormValues) => {
    passwordMutation.mutate(values);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-10 max-w-4xl">
          <div className="mb-10 space-y-2">
            <p className="text-sm font-medium text-primary">Account</p>
            <h1 className="text-3xl md:text-4xl font-bold">Settings</h1>
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

                    <div className="flex flex-wrap justify-end gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={!profileForm.formState.isDirty || profileMutation.isPending}
                        onClick={() => profileForm.reset(buildProfileDefaults(user ?? null))}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={!profileForm.formState.isDirty || profileMutation.isPending}>
                        {profileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {profileMutation.isPending ? "Saving" : "Save changes"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

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
  };
}
