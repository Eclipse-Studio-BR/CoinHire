import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { JobCard } from "@/components/JobCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, ExternalLink, Users, Briefcase } from "lucide-react";
import type { Company, Job } from "@shared/schema";

type CompanyWithJobs = Company & { jobs?: Job[] };

export default function CompanyDetail() {
  const { slug } = useParams<{ slug: string }>();

  const { data: company, isLoading } = useQuery<CompanyWithJobs>({
    queryKey: [`/api/companies/${slug}`],
  });

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

  if (!company) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-12 max-w-md text-center">
            <h2 className="text-2xl font-bold mb-4">Company Not Found</h2>
            <p className="text-muted-foreground mb-6">This company doesn't exist or has been removed.</p>
            <Link href="/companies">
              <Button>Browse All Companies</Button>
            </Link>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const activeJobs = company.jobs?.filter(j => j.status === 'active') || [];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        {/* Company Header */}
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 py-12">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <Avatar className="h-24 w-24" data-testid="avatar-company">
                <AvatarImage src={company.logo || undefined} alt={company.name} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-3xl">
                  {company.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2" data-testid="text-company-name">
                      {company.name}
                    </h1>
                    {company.location && (
                      <p className="text-muted-foreground flex items-center gap-2" data-testid="text-location">
                        <MapPin className="w-4 h-4" />
                        {company.location}
                      </p>
                    )}
                  </div>
                  {company.isHiring && (
                    <Badge variant="default" className="text-sm" data-testid="badge-hiring">
                      Currently Hiring
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                  {company.size && (
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{company.size}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Briefcase className="w-4 h-4" />
                    <span>{activeJobs.length} open {activeJobs.length === 1 ? 'position' : 'positions'}</span>
                  </div>
                </div>

                {company.website && (
                  <Button asChild variant="outline" data-testid="button-website">
                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="gap-2">
                      Visit Website
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Company Content */}
        <div className="container mx-auto px-4 py-8">
          <Tabs defaultValue="about" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="about" data-testid="tab-about">About</TabsTrigger>
              <TabsTrigger value="jobs" data-testid="tab-jobs">
                Open Positions ({activeJobs.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="about" className="space-y-6">
              <Card>
                <CardHeader>
                  <h2 className="text-2xl font-semibold">About {company.name}</h2>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-description">
                    {company.description || 'No description available.'}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="jobs" className="space-y-4">
              {activeJobs.length > 0 ? (
                activeJobs.map((job) => (
                  <JobCard key={job.id} job={{ ...job, company }} />
                ))
              ) : (
                <Card className="p-12 text-center">
                  <div className="max-w-md mx-auto space-y-4">
                    <div className="text-6xl">💼</div>
                    <h3 className="text-xl font-semibold">No open positions</h3>
                    <p className="text-muted-foreground">
                      {company.name} doesn't have any open positions at the moment. Check back later!
                    </p>
                  </div>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}
