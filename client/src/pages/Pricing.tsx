import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Zap } from "lucide-react";
import type { Plan } from "@shared/schema";

export default function Pricing() {
  const { data: plans = [], isLoading } = useQuery<Plan[]>({
    queryKey: ["/api/plans"],
  });

  const activePlans = plans.filter(p => p.isActive);
  const normalPlans = activePlans.filter(p => p.tier === 'normal');
  const featuredPlans = activePlans.filter(p => p.tier === 'featured');
  const premiumPlans = activePlans.filter(p => p.tier === 'premium');

  const tierFeatures = {
    normal: [
      'Job listing visible for selected duration',
      'Appears in standard search results',
      'Basic applicant tracking',
      'Email notifications',
    ],
    featured: [
      'All Normal features',
      'Highlighted with star badge',
      'Priority in search results',
      'Featured on homepage',
      'Enhanced visibility',
    ],
    premium: [
      'All Featured features',
      'Top priority in all listings',
      'Purple gradient border',
      'Social media promotion',
      'Newsletter feature',
      'Premium support',
    ],
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
                  <div className="h-full bg-muted"></div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Normal Tier */}
              <Card className="border-2">
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl mb-2">Normal</CardTitle>
                  <CardDescription>Great for standard positions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    {normalPlans.map((plan) => (
                      <div key={plan.id} className="flex flex-col">
                        <div className="flex items-baseline justify-center mb-2">
                          <span className="text-4xl font-bold">${(plan.price / 100).toFixed(0)}</span>
                          <span className="text-muted-foreground ml-2">/ {plan.visibilityDays} days</span>
                        </div>
                        <Link href={`/checkout?planId=${plan.id}`}>
                          <Button variant="outline" className="w-full" data-testid={`button-buy-${plan.id}`}>
                            Post for {plan.visibilityDays} days
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    {tierFeatures.normal.map((feature, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-chart-2 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Featured Tier */}
              <Card className="border-2 border-chart-4 relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-chart-4 text-white px-4 py-1">Most Popular</Badge>
                </div>
                <CardHeader className="text-center pb-8">
                  <div className="flex justify-center mb-2">
                    <Star className="w-6 h-6 text-chart-4 fill-chart-4" />
                  </div>
                  <CardTitle className="text-2xl mb-2">Featured</CardTitle>
                  <CardDescription>Stand out from the crowd</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    {featuredPlans.map((plan) => (
                      <div key={plan.id} className="flex flex-col">
                        <div className="flex items-baseline justify-center mb-2">
                          <span className="text-4xl font-bold">${(plan.price / 100).toFixed(0)}</span>
                          <span className="text-muted-foreground ml-2">/ {plan.visibilityDays} days</span>
                        </div>
                        <Link href={`/checkout?planId=${plan.id}`}>
                          <Button className="w-full bg-chart-4 hover:bg-chart-4/90" data-testid={`button-buy-${plan.id}`}>
                            Post for {plan.visibilityDays} days
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    {tierFeatures.featured.map((feature, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-chart-2 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Premium Tier */}
              <Card className="border-2 border-chart-3 relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-chart-3 to-primary text-white px-4 py-1">Premium</Badge>
                </div>
                <CardHeader className="text-center pb-8">
                  <div className="flex justify-center mb-2">
                    <Zap className="w-6 h-6 text-chart-3" />
                  </div>
                  <CardTitle className="text-2xl mb-2">Premium</CardTitle>
                  <CardDescription>Maximum visibility</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    {premiumPlans.map((plan) => (
                      <div key={plan.id} className="flex flex-col">
                        <div className="flex items-baseline justify-center mb-2">
                          <span className="text-4xl font-bold">${(plan.price / 100).toFixed(0)}</span>
                          <span className="text-muted-foreground ml-2">/ {plan.visibilityDays} days</span>
                        </div>
                        <Link href={`/checkout?planId=${plan.id}`}>
                          <Button className="w-full bg-gradient-to-r from-chart-3 to-primary" data-testid={`button-buy-${plan.id}`}>
                            Post for {plan.visibilityDays} days
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    {tierFeatures.premium.map((feature, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-chart-2 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
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
    </div>
  );
}
