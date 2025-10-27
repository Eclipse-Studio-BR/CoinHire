import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Download, Mail, X } from "lucide-react";
import { formatTimeAgo, getInitials } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Job, Company, TalentProfile } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface EmployerApplicationsResponse {
  job: Job & { company?: Company };
  applications: Array<{
    id: string;
    status: string;
    coverLetter: string | null;
    resumeUrl: string | null;
    createdAt: string;
    applicant: {
      id?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      profileImageUrl?: string;
    };
    applicantProfile?: TalentProfile | null;
  }>;
}

function getApplicantName(applicant: EmployerApplicationsResponse["applications"][number]["applicant"]) {
  if (applicant.firstName || applicant.lastName) {
    return `${applicant.firstName ?? ""} ${applicant.lastName ?? ""}`.trim();
  }
  if (applicant.email) {
    return applicant.email;
  }
  return "Unknown applicant";
}

export default function EmployerApplications() {
  const { data = [], isLoading } = useQuery<EmployerApplicationsResponse[]>({
    queryKey: ["/api/employer/applications"],
  });
  const rejectMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      await apiRequest("DELETE", `/api/applications/${applicationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employer/applications"] });
    },
  });

  const totalApplications = useMemo(
    () => data.reduce((sum, item) => sum + item.applications.length, 0),
    [data],
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 space-y-2">
            <h1 className="text-3xl font-bold">Applications</h1>
            <p className="text-muted-foreground">
              Review applicants for your job postings. Total applications received: {totalApplications}
            </p>
          </div>

          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : data.length === 0 ? (
            <Card className="p-12 text-center">
              <CardTitle>No Applications Yet</CardTitle>
              <CardDescription className="mt-2">
                Once candidates apply to your jobs, you\'ll see them listed here.
              </CardDescription>
            </Card>
          ) : (
            <div className="space-y-6">
              {data.map(({ job, applications }) => (
                <Card key={job.id}>
                  <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle>{job.title}</CardTitle>
                      <CardDescription>{job.company?.name}</CardDescription>
                    </div>
                    <Badge variant={applications.length > 0 ? "default" : "secondary"}>
                      {applications.length} {applications.length === 1 ? "Applicant" : "Applicants"}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    {applications.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No applications received yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {applications.map((application) => {
                          const applicantName = getApplicantName(application.applicant);
                          const appliedAt = formatTimeAgo(application.createdAt);
                          const profile = application.applicantProfile;
                          const skillList = profile?.skills?.join(", ");
                          const languageList = profile?.languages?.join(", ");
                          const resumeLink = application.resumeUrl;
                          const avatarSrc = (profile as any)?.profileImageUrl || application.applicant.profileImageUrl;
                          const applicantInitials = getInitials(
                            application.applicant.firstName,
                            application.applicant.lastName,
                            application.applicant.email,
                          );
                          const statusBadgeClass =
                            application.status === "rejected"
                              ? "bg-red-100 text-red-700 border-transparent"
                              : application.status === "submitted"
                              ? "bg-green-100 text-green-700 border-transparent"
                              : "";
                          return (
                            <div key={application.id} className="rounded-lg border p-4">
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div className="flex items-start gap-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage src={avatarSrc || undefined} alt={applicantName} />
                                    <AvatarFallback>{applicantInitials}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{applicantName}</p>
                                    {application.applicant.email && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Mail className="h-3 w-3" />
                                        <a
                                          href={`mailto:${application.applicant.email}`}
                                          className="hover:underline"
                                        >
                                          {application.applicant.email}
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2 md:flex-row md:items-center md:gap-3">
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Badge variant="outline" className={`capitalize ${statusBadgeClass}`}>
                                      {application.status}
                                    </Badge>
                                    <span>Applied {appliedAt}</span>
                                  </div>
                                  {resumeLink && (
                                    <Button variant="outline" size="sm" asChild>
                                      <a href={resumeLink} target="_blank" rel="noreferrer" className="flex items-center gap-1">
                                        <Download className="w-4 h-4" />
                                        View Resume
                                      </a>
                                    </Button>
                                  )}
                                </div>
                              </div>

                              <Separator className="my-4" />

                              <div className="space-y-3 text-sm">
                                <div className="space-y-2">
                                  <div>
                                    <p className="mb-1 font-medium">Cover Letter</p>
                                    <p className="whitespace-pre-wrap text-muted-foreground">
                                      {application.coverLetter?.trim() || "No cover letter provided."}
                                    </p>
                                  </div>

                                  {!resumeLink && (
                                    <p className="text-xs text-muted-foreground">No resume was attached to this application.</p>
                                  )}
                                </div>

                                {profile && (
                                  <div className="rounded-lg border bg-muted/30 p-4">
                                    <p className="mb-3 font-medium">Talent Profile Details</p>
                                    <div className="grid gap-4 md:grid-cols-2">
                                      <div>
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Title</p>
                                        <p className="font-medium">{profile.headline || "Not provided"}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Location • Timezone</p>
                                        <p className="font-medium">{[profile.location, profile.timezone].filter(Boolean).join(" • ") || "Not provided"}</p>
                                      </div>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2 mt-4">
                                      <div>
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Hourly Rate</p>
                                        <p className="font-medium">{profile.hourlyRate ? `$${profile.hourlyRate}/hr` : "Not listed"}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Monthly Rate</p>
                                        <p className="font-medium">{profile.monthlyRate ? `$${profile.monthlyRate}/mo` : "Not listed"}</p>
                                      </div>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2 mt-4">
                                      <div>
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Skills</p>
                                        <p>{skillList || "Not provided"}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Languages</p>
                                        <p>{languageList || "Not provided"}</p>
                                      </div>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2 mt-4">
                                      <div>
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">LinkedIn</p>
                                        {profile.linkedinUrl ? (
                                          <a href={profile.linkedinUrl} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                                            {profile.linkedinUrl}
                                          </a>
                                        ) : (
                                          <p>Not provided</p>
                                        )}
                                      </div>
                                      <div>
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Telegram</p>
                                        <p>{profile.telegram || "Not provided"}</p>
                                      </div>
                                    </div>
                                    {profile.bio && (
                                      <div className="mt-4">
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Story</p>
                                        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{profile.bio}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="mt-4 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:justify-end">
                                {application.applicant.email && (
                                  <Button asChild variant="outline">
                                    <a
                                      href={`mailto:${application.applicant.email}`}
                                      className="flex items-center gap-2"
                                      target="_blank"
                                      rel="noreferrer noopener"
                                    >
                                      <Mail className="h-4 w-4" />
                                      Contact Applicant
                                    </a>
                                  </Button>
                                )}
                                <Button
                                  variant="destructive"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to reject this applicant?")) {
                                      rejectMutation.mutate(application.id);
                                    }
                                  }}
                                  className="flex items-center gap-2"
                                  disabled={rejectMutation.isPending}
                                >
                                  <X className="h-4 w-4" />
                                  Reject Application
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
