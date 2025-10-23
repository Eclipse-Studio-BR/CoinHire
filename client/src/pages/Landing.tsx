import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Briefcase, Building2, Users, TrendingUp, Star, Zap } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function Landing() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 bg-gradient-to-b from-background to-card">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:14px_24px]"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight" data-testid="text-hero-title">
                Find Your Next{" "}
                <span className="bg-gradient-to-r from-primary to-chart-3 bg-clip-text text-transparent">
                  Web3 Role
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto" data-testid="text-hero-subtitle">
                Discover opportunities in blockchain, DeFi, NFTs, and the decentralized future. Connect with top crypto companies hiring now.
              </p>

              <div className="max-w-2xl mx-auto">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search for jobs, skills, companies..."
                      className="pl-10 h-12"
                      data-testid="input-job-search"
                    />
                  </div>
                  <Link href="/jobs">
                    <Button size="lg" className="h-12 px-8" data-testid="button-search-jobs">
                      Search Jobs
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                <span>Popular:</span>
                {['Smart Contracts', 'DeFi', 'Frontend', 'Security'].map((tag) => (
                  <Link key={tag} href={`/jobs?category=${tag}`}>
                    <button className="hover:text-foreground transition-colors" data-testid={`link-popular-${tag.toLowerCase()}`}>
                      {tag}
                    </button>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 border-y bg-card/50">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center space-y-2">
                <div className="text-4xl font-bold text-primary" data-testid="text-stat-jobs">1,200+</div>
                <div className="text-sm text-muted-foreground">Active Jobs</div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-4xl font-bold text-primary" data-testid="text-stat-companies">350+</div>
                <div className="text-sm text-muted-foreground">Companies Hiring</div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-4xl font-bold text-primary" data-testid="text-stat-developers">50,000+</div>
                <div className="text-sm text-muted-foreground">Web3 Professionals</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Web3 Jobs?</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                The leading platform connecting Web3 talent with innovative blockchain companies
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <Card className="border-2">
                <CardContent className="pt-6 space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Curated Opportunities</h3>
                  <p className="text-muted-foreground">
                    Hand-picked roles from legitimate Web3 projects and established blockchain companies.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardContent className="pt-6 space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-chart-2/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-chart-2" />
                  </div>
                  <h3 className="text-xl font-semibold">Direct Applications</h3>
                  <p className="text-muted-foreground">
                    Apply directly to companies with your profile and get noticed by hiring managers.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardContent className="pt-6 space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-chart-3/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-chart-3" />
                  </div>
                  <h3 className="text-xl font-semibold">Career Growth</h3>
                  <p className="text-muted-foreground">
                    Join the fastest-growing industry with competitive salaries and remote opportunities.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* For Employers CTA */}
        <section className="py-20 bg-gradient-to-b from-card to-background">
          <div className="container mx-auto px-4">
            <Card className="max-w-4xl mx-auto border-2 bg-gradient-to-br from-card to-accent/20">
              <CardContent className="p-12 text-center space-y-6">
                <div className="flex justify-center gap-2">
                  <Star className="w-8 h-8 text-chart-4 fill-chart-4" />
                  <Zap className="w-8 h-8 text-primary" />
                  <Star className="w-8 h-8 text-chart-4 fill-chart-4" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold">Hiring Web3 Talent?</h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  Post your jobs to reach thousands of qualified blockchain developers, designers, and professionals.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/post-job">
                    <Button size="lg" data-testid="button-post-job">
                      <Building2 className="w-5 h-5 mr-2" />
                      Post a Job
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button size="lg" variant="outline" data-testid="button-view-pricing">
                      View Pricing
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
