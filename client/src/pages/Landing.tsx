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
        {/* ===== Hero (full-color image, bolt style) ===== */}
        <section
          className="
            relative overflow-hidden border-b
            min-h-[640px] md:min-h-[780px] lg:min-h-[860px]
            flex items-center
          "
        >
          {/* Full-color background image */}
          <div className="absolute inset-0 -z-20 bg-[url('/images/hero-image.png')] bg-cover bg-bottom opacity-100" />

          <div className="container mx-auto px-4 py-16 md:py-24">
            <div className="mx-auto max-w-4xl text-center">
              {/* Bolt-style translucent badge, slightly raised */}
              <Badge
                variant="secondary"
                className="
                  relative -top-2 md:-top-4
                  mb-6 inline-flex items-center gap-2 rounded-full
                  px-4 md:px-5 py-1.5 md:py-2 text-sm md:text-base font-medium
                  bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40
                  border border-white/10
                  shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_24px_rgba(0,0,0,0.35)]
                  text-foreground/90
                "
              >
                <Sparkles className="h-4 w-4 opacity-90" />
                Trusted Web3 &amp; Crypto Jobs
              </Badge>

              {/* Title with gradient on 'Crypto' */}
              <h1
                className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight"
                style={{ textShadow: "0 1px 2px rgba(0,0,0,.5)" }}
              >
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, #4F86FF 0%, #7AA2FF 45%, #B8CCFF 100%)",
                  }}
                >
                  Crypto
                </span>{" "}
                Jobs Portal
              </h1>

              {/* Subtitle */}
              <p
                className="mt-3 text-lg md:text-xl text-muted-foreground"
                style={{ textShadow: "0 1px 1px rgba(0,0,0,.45)" }}
              >
                For Talents and Companies
              </p>
            </div>

            {/* Search */}
            <div className="mx-auto mt-8 max-w-5xl">
              <LandingSearch />
            </div>

            {/* Trust bar — animated carousel, placed further down to avoid crowding */}
            <div className="mx-auto max-w-6xl text-center mt-24 md:mt-36">
              <div className="text-[13px] md:text-xs tracking-[0.18em] text-foreground/70">
                CRYPTO JOBS PORTAL TRUSTED BY
              </div>

              {/* extra space between title and logos */}
              <div className="mt-8 md:mt-12">
                <LogoCarousel />
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
