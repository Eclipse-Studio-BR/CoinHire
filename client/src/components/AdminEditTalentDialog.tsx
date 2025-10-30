import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MultiSelect } from "@/components/MultiSelect";
import { FileUpload } from "@/components/FileUpload";
import { SKILLS, TOOLS, LANGUAGES } from "@/lib/skillsAndTools";

const adminTalentSchema = z.object({
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  profileImageUrl: z.string().optional(),
  headline: z.string().min(2, "Headline is required"),
  bio: z.string().min(20, "Bio should be at least 20 characters"),
  location: z.string().optional(),
  hourlyRate: z.string().optional(),
  skills: z.array(z.string()).optional(),
  tools: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  linkedinUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  telegram: z.string().optional(),
  isPublic: z.boolean().optional(),
  preferredJobTypes: z.array(z.string()).optional(),
  jobAvailability: z.string().optional(),
  workFlexibility: z.array(z.string()).optional(),
});

type AdminTalentValues = z.infer<typeof adminTalentSchema>;

type TalentProfile = {
  userId: string;
  headline: string;
  bio: string;
  location: string;
  hourlyRate: number | null;
  skills: string[];
  tools: string[];
  languages: string[];
  linkedinUrl: string | null;
  telegram: string | null;
  isPublic?: boolean;
  preferredJobTypes?: string[] | null;
  jobAvailability?: string | null;
  workFlexibility?: string[] | null;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    profileImageUrl: string | null;
  };
};

interface AdminEditTalentDialogProps {
  talent: TalentProfile;
}

export function AdminEditTalentDialog({ talent }: AdminEditTalentDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<AdminTalentValues>({
    resolver: zodResolver(adminTalentSchema),
    defaultValues: {
      firstName: talent.user.firstName,
      lastName: talent.user.lastName,
      profileImageUrl: talent.user.profileImageUrl || "",
      headline: talent.headline,
      bio: talent.bio,
      location: talent.location || "",
      hourlyRate: talent.hourlyRate ? talent.hourlyRate.toString() : "",
      skills: talent.skills || [],
      tools: talent.tools || [],
      languages: talent.languages || [],
      linkedinUrl: talent.linkedinUrl || "",
      telegram: talent.telegram || "",
      isPublic: talent.isPublic ?? true,
      preferredJobTypes: talent.preferredJobTypes || [],
      jobAvailability: talent.jobAvailability || "",
      workFlexibility: talent.workFlexibility || [],
    },
  });

  const updateTalentMutation = useMutation({
    mutationFn: async (data: AdminTalentValues) => {
      // Update user info
      await apiRequest("PUT", `/api/users/${talent.userId}`, {
        firstName: data.firstName,
        lastName: data.lastName,
        profileImageUrl: data.profileImageUrl || undefined,
      });

      // Update talent profile using admin endpoint
      const profilePayload = {
        userId: talent.userId,
        title: data.headline,
        story: data.bio,
        location: data.location || undefined,
        hourlyRate: data.hourlyRate ? parseInt(data.hourlyRate) : undefined,
        skills: data.skills && data.skills.length > 0 ? data.skills : undefined,
        tools: data.tools && data.tools.length > 0 ? data.tools : undefined,
        languages: data.languages && data.languages.length > 0 ? data.languages : undefined,
        linkedinUrl: data.linkedinUrl || undefined,
        telegram: data.telegram || undefined,
        isPublic: data.isPublic !== undefined ? data.isPublic : true,
        preferredJobTypes: data.preferredJobTypes && data.preferredJobTypes.length > 0 ? data.preferredJobTypes : undefined,
        jobAvailability: data.jobAvailability || undefined,
        workFlexibility: data.workFlexibility && data.workFlexibility.length > 0 ? data.workFlexibility : undefined,
      };
      const response = await apiRequest("PUT", `/api/admin/talents/${talent.userId}`, profilePayload);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Talent profile updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/talents/public"] });
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Talent Profile</DialogTitle>
          <DialogDescription>
            Update talent profile information
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => updateTalentMutation.mutate(data))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="profileImageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profile Picture</FormLabel>
                  <FormControl>
                    <FileUpload
                      type="avatar"
                      currentFile={field.value}
                      onUploadComplete={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="headline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Headline *</FormLabel>
                  <FormControl>
                    <Input placeholder="Senior Smart Contract Engineer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Professional experience and background..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
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
              <FormField
                control={form.control}
                name="hourlyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hourly Rate (USD)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="120" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="skills"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Skills</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={SKILLS}
                      selected={field.value || []}
                      onChange={field.onChange}
                      placeholder="Select skills..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tools"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tools</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={TOOLS}
                      selected={field.value || []}
                      onChange={field.onChange}
                      placeholder="Select tools..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="languages"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Languages</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={LANGUAGES}
                      selected={field.value || []}
                      onChange={field.onChange}
                      placeholder="Select languages..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="linkedinUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LinkedIn URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://linkedin.com/in/..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telegram"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telegram</FormLabel>
                    <FormControl>
                      <Input placeholder="@username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold mb-4">Profile Visibility & Job Preferences</h3>

              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mb-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Make profile public</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Allow companies to discover this profile on the Talents page
                      </div>
                    </div>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value || false}
                        onChange={field.onChange}
                        className="h-9 w-16"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferredJobTypes"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Preferred Job Type</FormLabel>
                    <div className="grid grid-cols-2 gap-4">
                      {['Full-Time', 'Part-Time', 'Internship', 'Contract'].map((type) => (
                        <div key={type} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`edit-jobType-${type}`}
                            checked={(field.value || []).includes(type)}
                            onChange={(e) => {
                              const current = field.value || [];
                              if (e.target.checked) {
                                field.onChange([...current, type]);
                              } else {
                                field.onChange(current.filter((t) => t !== type));
                              }
                            }}
                          />
                          <label htmlFor={`edit-jobType-${type}`} className="text-sm">
                            {type}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="jobAvailability"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Job Availability Type</FormLabel>
                    <div className="space-y-2">
                      {[
                        { value: 'actively-looking', label: 'Actively Looking' },
                        { value: 'open-to-offers', label: 'Open To Offers' },
                        { value: 'not-available', label: 'Not Available' },
                      ].map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id={`edit-availability-${option.value}`}
                            value={option.value}
                            checked={field.value === option.value}
                            onChange={() => field.onChange(option.value)}
                          />
                          <label htmlFor={`edit-availability-${option.value}`} className="text-sm">
                            {option.label}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="workFlexibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Work Flexibility</FormLabel>
                    <div className="flex gap-4">
                      {['Onsite', 'Remote'].map((type) => (
                        <div key={type} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`edit-flexibility-${type}`}
                            checked={(field.value || []).includes(type)}
                            onChange={(e) => {
                              const current = field.value || [];
                              if (e.target.checked) {
                                field.onChange([...current, type]);
                              } else {
                                field.onChange(current.filter((t) => t !== type));
                              }
                            }}
                          />
                          <label htmlFor={`edit-flexibility-${type}`} className="text-sm">
                            {type}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateTalentMutation.isPending}>
                {updateTalentMutation.isPending ? "Updating..." : "Update Talent"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
