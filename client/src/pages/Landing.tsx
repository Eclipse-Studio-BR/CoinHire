import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import LandingSearch from "@/components/LandingSearch";
import { JobCard } from "@/components/JobCard";
import type { Job, Company } from "@shared/schema";
import { Star, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function Landing() {
  const { data: featuredJobs = [], isLoading: loadingFeatured } =
    useQuery<(Job & { company?: Company })[]>({
      queryKey: ["/api/jobs", { tier: "featured", status: "active" }],
      queryFn: async () => {
        const res = await apiRequest("GET", "/api/jobs?tier=featured&status=active");
        return res.json();
      },
      staleTime: 60_000,
    });

  const { data: latestJobs = [] } =
    useQuery<(Job & { company?: Company })[]>({
      queryKey: ["/api/jobs", { latest: true }],
      queryFn: async () => {
        const res = await apiRequest("GET", "/api/jobs?status=active");
        const all = await res.json();
        return all.slice(0, 12);
      },
      staleTime: 60_000,
    });

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* ===== Hero ===== */}
        <section className="relative overflow-hidden border-b">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background to-muted" />
          <div className="container mx-auto px-4 py-12 md:py-16">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="secondary" className="mb-4 inline-flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" />
                Trusted Web3 & Crypto Jobs
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                Find your next role in crypto
              </h1>
              <p className="mt-3 text-muted-foreground">
                Search thousands of curated jobs from leading exchanges, L1/L2s, DeFi, wallets &amp; more.
              </p>
            </div>

            <div className="mx-auto mt-6 max-w-5xl">
              <LandingSearch />
              <div className="mt-3 text-center text-sm text-muted-foreground">
                Popular: Solidity, Rust, Product Manager, Growth, Security, Research
              </div>
            </div>
          </div>
        </section>

        {/* ===== Featured Jobs ===== */}
        <section className="container mx-auto px-4 py-10 md:py-14">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Star className="h-6 w-6 text-yellow-500" />
              Featured Jobs
            </h2>
            <Link href="/pricing">
              <Button variant="outline">Get Featured</Button>
            </Link>
          </div>

          {loadingFeatured && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card className="h-32 animate-pulse" key={i}><CardContent className="h-32" /></Card>
              ))}
            </div>
          )}

          {!loadingFeatured && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {featuredJobs.slice(0, 6).map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </section>

        {/* ===== Latest Jobs ===== */}
        <section className="container mx-auto px-4 py-10 md:py-14">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Latest Jobs</h2>
            <Link href="/jobs">
              <Button variant="outline">Browse all jobs</Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {latestJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link href="/jobs">
              <Button size="lg">See all openings</Button>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
