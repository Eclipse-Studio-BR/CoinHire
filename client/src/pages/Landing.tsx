import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, ArrowRight, Sparkles, Star, Users, Briefcase, Building2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
// ⛔️ Removed: StatsRow
import { LogoCarousel } from "@/components/LogoCarousel";

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 rounded-full bg-primary/10 p-1">
        <Check className="h-4 w-4 text-primary" />
      </div>
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-muted-foreground text-sm">{desc}</div>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        {/* ===== Hero (Workze-style) ===== */}
        <section className="relative overflow-hidden">
          {/* gradient blobs */}
          <div className="pointer-events-none absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -right-20 h-[420px] w-[420px] rounded-full bg-purple-500/10 blur-3xl" />

          <div className="container mx-auto px-4 py-20 md:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <Badge className="mb-4 inline-flex items-center gap-2" variant="secondary">
                <Sparkles className="h-3.5 w-3.5" />
                New: AI-assisted job matching
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                Land your next Web3 job <span className="text-primary">faster</span>
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Discover curated crypto roles, verified companies, and smart matching to get you hired without the noise.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/jobs">
                  <Button size="lg" className="w-full sm:w-auto">
                    Explore jobs <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/post-job">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Post a job
                  </Button>
                </Link>
              </div>

              {/* ⛔️ Removed numeric stats */}

              {/* Trusted by + animated logo carousel */}
              <div className="mt-12 text-center text-sm text-muted-foreground">
                Trusted by teams building on
              </div>
              <LogoCarousel />
            </div>

            {/* hero mockup cards */}
            <div className="relative mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
              <Card className="border-primary/20 shadow-lg shadow-primary/10">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Briefcase className="h-4 w-4" /> Featured role
                  </div>
                  <div className="mt-2 font-semibold">Senior Protocol Engineer</div>
                  <div className="text-sm text-muted-foreground">Remote · $180k–$220k</div>
                </CardContent>
              </Card>
              <Card className="border-muted shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4" /> Top company
                  </div>
                  <div className="mt-2 font-semibold">Chain Labs</div>
                  <div className="text-sm text-muted-foreground">13 open roles</div>
                </CardContent>
              </Card>
              <Card className="border-muted shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" /> Talent spotlight
                  </div>
                  <div className="mt-2 font-semibold">Smart matching</div>
                  <div className="text-sm text-muted-foreground">AI suggests roles based on your profile</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* ===== Benefits / Features ===== */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 md:grid-cols-2">
            <div className="space-y-4">
              <Badge variant="outline">Why choose us</Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Built for Web3 talent & teams
              </h2>
              <p className="text-muted-foreground">
                We remove the spam and focus on signal—showing verified companies, salary bands, and applicant fit.
              </p>
              <div className="mt-6 space-y-4">
                <Feature title="Curated roles only" desc="All listings are vetted, remote-friendly, and pay in fiat or crypto." />
                <Feature title="Verified companies" desc="Real teams with transparent profiles, stacks, and funding." />
                <Feature title="AI-assisted matching" desc="Get ranked matches as a candidate or surface best-fit applicants as an employer." />
              </div>

              <div className="mt-8 flex gap-3">
                <Link href="/jobs">
                  <Button>Browse jobs</Button>
                </Link>
                <Link href="/companies">
                  <Button variant="ghost">View companies</Button>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="col-span-2 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Star className="h-4 w-4" /> Spotlight
                  </div>
                  <div className="mt-2 font-semibold">Top remote roles</div>
                  <div className="text-sm text-muted-foreground">Solidity · Rust · Frontend · DevRel</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="font-semibold">Salary transparency</div>
                  <div className="text-sm text-muted-foreground mt-1">$80k–$250k + tokens</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="font-semibold">Instant apply</div>
                  <div className="text-sm text-muted-foreground mt-1">Use your profile & portfolio</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* ===== Testimonials ===== */}
        <section className="bg-muted/30">
          <div className="container mx-auto px-4 py-16 md:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Loved by builders</h2>
              <p className="mt-2 text-muted-foreground">
                Thousands of candidates and teams have hired through our marketplace.
              </p>
            </div>

            <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
              {[
                { quote: "We filled 3 critical roles in under a month.", author: "Maya — CTO, L2 Labs" },
                { quote: "Quality candidates. Smooth process. 10/10.", author: "Diego — Head of Eng, DEXCo" },
                { quote: "The only crypto job board that actually works.", author: "Anya — Recruiter, Walletly" },
              ].map((t) => (
                <Card key={t.author}>
                  <CardContent className="p-6">
                    <div className="text-sm">{t.quote}</div>
                    <div className="mt-3 text-xs text-muted-foreground">{t.author}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ===== CTA ===== */}
        <section className="relative">
          <div className="container mx-auto px-4 py-16 md:py-24">
            <div className="mx-auto max-w-5xl rounded-2xl border bg-card p-8 md:p-12 text-center">
              <div className="mx-auto inline-flex items-center gap-2 rounded-full border bg-background px-4 py-1 text-sm">
                <Star className="h-3.5 w-3.5 text-primary" />
                Free for candidates
              </div>
              <h3 className="mt-4 text-2xl md:text-3xl font-bold tracking-tight">Hire faster. Get hired smarter.</h3>
              <p className="mt-2 text-muted-foreground">
                Join today and access curated roles, verified companies, and AI-assisted matching.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/jobs">
                  <Button size="lg">Start searching</Button>
                </Link>
                <Link href="/pricing">
                  <Button size="lg" variant="outline">See employer pricing</Button>
                </Link>
              </div>
            </div>

            {/* FAQ (compact) */}
            <div className="mx-auto mt-12 max-w-3xl">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>Is it really curated?</AccordionTrigger>
                  <AccordionContent>
                    Yes. We verify companies and only accept high-signal roles to keep quality high.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>Do candidates pay anything?</AccordionTrigger>
                  <AccordionContent>
                    No—candidates use the platform for free. Employers can choose from flexible plans.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
