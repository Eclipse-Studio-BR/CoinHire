import { useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Star, Zap } from "lucide-react";
import type { Plan } from "@shared/schema";

type Tier = Plan["tier"];

const tierFeatures: Record<Tier, string[]> = {
  normal: [
    "Job listing visible for selected duration",
    "Appears in standard search results",
    "Basic applicant tracking",
    "Email notifications",
  ],
  featured: [
    "All Normal features",
    "Highlighted with star badge",
    "Priority in search results",
    "Featured on homepage",
    "Enhanced visibility",
  ],
  premium: [
    "All Featured features",
    "Top priority in all listings",
    "Purple gradient border",
    "Social media promotion",
    "Newsletter feature",
    "Premium support",
  ],
};

const tierMeta: Record<
  Tier,
  {
    label: string;
    description: string;
    cardClass?: string;
    badge?: { text: string; className: string };
    icon?: ReactNode;
    buttonClassName?: string;
  }
> = {
  normal: {
    label: "Normal",
    description: "Great for standard positions",
    cardClass: "border-2",
    buttonClassName: "",
  },
  featured: {
    label: "Featured",
    description: "Stand out from the crowd",
    cardClass: "border-2 border-chart-4 relative",
    badge: { text: "Most Popular", className: "bg-chart-4 text-white px-4 py-1" },
    icon: <Star className="w-6 h-6 text-chart-4 fill-chart-4" />,
    buttonClassName: "bg-chart-4 hover:bg-chart-4/90 text-white border-transparent",
  },
  premium: {
    label: "Premium",
    description: "Maximum visibility",
    cardClass: "border-2 border-chart-3 relative",
    badge: { text: "Premium", className: "bg-gradient-to-r from-chart-3 to-primary text-white px-4 py-1" },
    icon: <Zap className="w-6 h-6 text-chart-3" />,
    buttonClassName:
      "bg-gradient-to-r from-chart-3 to-primary text-white hover:from-chart-3/90 hover:to-primary/90 border-transparent",
  },
};

const tierOrder: Tier[] = ["normal", "featured", "premium"];

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export default function Pricing() {
  const { data: plans = [], isLoading } = useQuery<Plan[]>({
    queryKey: ["/api/plans"],
  });

  const activePlans = useMemo(() => plans.filter((plan) => plan.isActive), [plans]);

  const tierPlans = useMemo(
    () =>
      tierOrder.reduce(
        (acc, tier) => {
          acc[tier] = activePlans.filter((plan) => plan.tier === tier);
          return acc;
        },
        {} as Record<Tier, Plan[]>,
      ),
    [activePlans],
  );

  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const selectedPlans = selectedTier ? tierPlans[selectedTier] ?? [] : [];
  const selectedTierMeta = selectedTier ? tierMeta[selectedTier] : null;

  const handleSelectTier = (tier: Tier) => {
    if (!tierPlans[tier] || tierPlans[tier].length === 0) {
      return;
    }
    setSelectedTier(tier);
    setIsDialogOpen(true);
  };

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setSelectedTier(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4" data-testid="text-page-title">
              Post Your Web3 Job
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the perfect package to reach thousands of qualified blockchain professionals
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="h-96 animate-pulse">
                  <div className="h-full bg-muted" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {tierOrder.map((tier) => {
                const plansForTier = tierPlans[tier];
                const meta = tierMeta[tier];
                const startingPlan = plansForTier[0];

                return (
                  <Card key={tier} className={meta.cardClass}>
                    {meta.badge ? (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <Badge className={meta.badge.className}>{meta.badge.text}</Badge>
                      </div>
                    ) : null}
                    <CardHeader className="text-center pb-6">
                      {meta.icon ? <div className="flex justify-center mb-2">{meta.icon}</div> : null}
                      <CardTitle className="text-2xl mb-2">{meta.label}</CardTitle>
                      <CardDescription>{meta.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="text-center">
                        {startingPlan ? (
                          <>
                            <p className="text-sm uppercase tracking-wide text-muted-foreground mb-1">
                              Starting from
                            </p>
                            <div className="text-4xl font-bold">
                              {formatPrice(startingPlan.price)}
                            </div>
                          </>
                        ) : (
                          <p className="text-muted-foreground">Plans currently unavailable</p>
                        )}
                      </div>

                      <div className="space-y-3 border-t pt-4">
                        {tierFeatures[tier].map((feature, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <Check className="w-5 h-5 text-chart-2 flex-shrink-0 mt-0.5" />
                            <span className="text-sm">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        className={`w-full ${meta.buttonClassName ?? ""}`}
                        onClick={() => handleSelectTier(tier)}
                        disabled={!startingPlan}
                        data-testid={`button-select-${tier}`}
                      >
                        Select {meta.label} Plan
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}

          {/* FAQ */}
          <div className="mt-20 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">How long will my job be visible?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Your job will be visible for the number of days you select when purchasing (7, 14, or 30 days). After expiration, you can renew or repost.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">What's the difference between tiers?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Normal jobs appear in standard listings. Featured jobs get a star badge and priority placement. Premium jobs get top placement, gradient border, and are included in newsletters and social media.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Can I edit my job after posting?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Yes! You can edit your job posting at any time from your employer dashboard.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedTierMeta ? `Select a ${selectedTierMeta.label} timeframe` : "Select timeframe"}
            </DialogTitle>
            <DialogDescription>
              Choose how long you’d like your job listing to stay live. You’ll complete checkout on the next step.
            </DialogDescription>
          </DialogHeader>

          {selectedPlans.length > 0 ? (
            <div className="space-y-4">
              {selectedPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-xl font-semibold">{formatPrice(plan.price)}</p>
                    <p className="text-sm text-muted-foreground">
                      Visibility for {plan.visibilityDays} days • {plan.credits} job credit{plan.credits > 1 ? "s" : ""}
                    </p>
                  </div>
                  <Link href={`/checkout?planId=${plan.id}`}>
                    <Button
                      className={`w-full sm:w-auto ${selectedTier ? tierMeta[selectedTier].buttonClassName ?? "" : ""}`}
                      onClick={() => setIsDialogOpen(false)}
                      data-testid={`button-buy-${plan.id}`}
                    >
                      Continue with {plan.visibilityDays}-day plan
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              We’re refreshing these plans right now. Please check back soon.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
