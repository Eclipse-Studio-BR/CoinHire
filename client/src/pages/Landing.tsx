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
import LogoCarousel from "@/components/LogoCarousel";

export default function Landing() {
  const { data: featuredJobs = [], isLoading: loadingFeatured } =
    useQuery<(Job & { company?: Company })[]>({
      queryKey: ["/api/jobs", { tier: "featured", status: "active" }],
      queryFn: async () => {
        const res = await apiRequest("GET", "/api/jobs?tier=featured&status=active");
        return res.json();
      },
      staleTime: 0,
      refetchOnMount: "always",
      refetchOnReconnect: "always",
      refetchOnWindowFocus: "always",
    });

  const { data: latestJobs = [] } =
    useQuery<(Job & { company?: Company })[]>({
      queryKey: ["/api/jobs", { latest: true, status: "active" }],
      queryFn: async () => {
        const res = await apiRequest("GET", "/api/jobs?status=active");
        const all = await res.json();
        return all.slice(0, 12);
      },
      staleTime: 0,
      refetchOnMount: "always",
      refetchOnReconnect: "always",
      refetchOnWindowFocus: "always",
    });

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* ===== Hero (bolt.new inspired gradient background) ===== */}
        <section
          className="
            hero-bg
            relative overflow-hidden border-b border-[var(--border-soft)]
            min-h-[640px] md:min-h-[780px] lg:min-h-[860px]
            flex items-center
          "
        >

          <div className="container mx-auto px-4 py-16 md:py-24">
            <div className="mx-auto max-w-4xl text-center">
              {/* Glass badge */}
              <Badge
                variant="glass"
                className="
                  relative -top-2 md:-top-4
                  mb-6 inline-flex items-center gap-2 rounded-full
                  px-4 md:px-5 py-1.5 md:py-2 text-sm md:text-base font-medium
                "
              >
                <Sparkles className="h-4 w-4 opacity-90" />
                Trusted Web3 &amp; Crypto Jobs
              </Badge>

              {/* Title with gradient using new accent colors */}
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]">
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, var(--accent-1) 0%, var(--accent-2) 50%, var(--accent-3) 100%)",
                  }}
                >
                  Crypto Jobs
                </span>{" "}
                <span className="text-[var(--text-primary)]">Portal</span>
              </h1>

              {/* Subtitle */}
              <p className="mt-4 text-lg md:text-xl text-[var(--text-secondary)]">
                For Talents and Companies
              </p>
            </div>

            {/* Search */}
            <div className="mx-auto mt-8 max-w-5xl">
              <LandingSearch />
            </div>

            {/* Dual CTAs - glass styled */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="default" asChild className="min-w-[160px]">
                <Link href="/jobs">Browse Jobs</Link>
              </Button>
              <Button size="lg" variant="secondary" asChild className="min-w-[160px]">
                <Link href="/post-job">Post a Job</Link>
              </Button>
            </div>

            {/* Trust bar */}
            <div className="mx-auto max-w-6xl text-center mt-20 md:mt-28">
              <div className="text-xs tracking-[0.18em] text-[var(--text-secondary)] uppercase mb-8">
                Trusted by Leading Web3 Companies
              </div>
              <LogoCarousel />
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
                <Card key={i}>
                  <CardContent className="h-32 animate-pulse" />
                </Card>
              ))}
            </div>
          )}

          {!loadingFeatured && featuredJobs.length > 0 && (
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
