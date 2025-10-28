import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { JobCard } from "@/components/JobCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, ExternalLink, Users, Briefcase, Bitcoin, Home, MessageCircle } from "lucide-react";
import { FaDiscord, FaTelegram, FaTwitter } from "react-icons/fa";
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

                <div className="flex flex-wrap gap-3">
                  {company.website && (
                    <Button asChild variant="outline" data-testid="button-website">
                      <a href={company.website} target="_blank" rel="noopener noreferrer" className="gap-2">
                        Visit Website
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                  {company.twitter && (
                    <Button asChild variant="outline" size="icon" data-testid="button-twitter">
                      <a href={company.twitter} target="_blank" rel="noopener noreferrer" title="Twitter">
                        <FaTwitter className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                  {company.discord && (
                    <Button asChild variant="outline" size="icon" data-testid="button-discord">
                      <a href={company.discord} target="_blank" rel="noopener noreferrer" title="Discord">
                        <FaDiscord className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                  {company.telegram && (
                    <Button asChild variant="outline" size="icon" data-testid="button-telegram">
                      <a href={company.telegram} target="_blank" rel="noopener noreferrer" title="Telegram">
                        <FaTelegram className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Company Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - About & Company Info */}
            <div className="lg:col-span-1 space-y-6">
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

              {/* Company Info Card */}
              <Card>
                <CardHeader>
                  <h3 className="text-xl font-semibold">Company Info</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  {company.currentSize && (
                    <div className="flex items-start gap-3">
                      <Users className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Company Size</p>
                        <p className="text-muted-foreground">{company.currentSize}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <Bitcoin className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Payment in Crypto</p>
                      <p className="text-muted-foreground">{company.paymentInCrypto ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Home className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Remote Working</p>
                      <p className="text-muted-foreground">{company.remoteWorking ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Jobs */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h2 className="text-2xl font-semibold mb-4">Open Positions ({activeJobs.length})</h2>
                {activeJobs.length > 0 ? (
                  <div className="space-y-4">
                    {activeJobs.map((job) => (
                      <JobCard key={job.id} job={{ ...job, company }} />
                    ))}
                  </div>
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
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
