import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Download, Mail } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import type { Job, Company } from "@shared/schema";

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
    };
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
                          return (
                            <div key={application.id} className="rounded-lg border p-4">
                              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
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
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Badge variant="outline" className="capitalize">
                                    {application.status}
                                  </Badge>
                                  <span>Applied {appliedAt}</span>
                                </div>
                              </div>

                              <Separator className="my-4" />

                              <div className="space-y-3 text-sm">
                                <div>
                                  <p className="mb-1 font-medium">Cover Letter</p>
                                  <p className="whitespace-pre-wrap text-muted-foreground">
                                    {application.coverLetter?.trim() || "No cover letter provided."}
                                  </p>
                                </div>

                                {application.resumeUrl && (
                                  <div>
                                    <p className="mb-1 font-medium">Resume</p>
                                    <Button variant="outline" size="sm" asChild>
                                      <a href={application.resumeUrl} target="_blank" rel="noreferrer">
                                        <Download className="mr-2 h-4 w-4" />
                                        View Resume
                                      </a>
                                    </Button>
                                  </div>
                                )}
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
