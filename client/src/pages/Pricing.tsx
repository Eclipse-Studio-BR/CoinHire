import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import type { Plan } from "@shared/schema";
import { BASE_PRICE_USD } from "@/lib/currencies";

const features = [
  "Job post is live for 30 days",
  "Top placement on the front page",
  "Top placement on filtered search results",
  "Highlighted to stand out",
  "Branded with your company logo",
  "Featured in our newsletter",
  "Multiple social media posts",
  "Volume discounts: up to 20% off",
  "No account or sign-up required",
  "Crypto payment accepted",
  "Dedicated support",
  "Support a bootstrapped, independent company",
];

export default function Pricing() {
  const { data: plans = [], isLoading } = useQuery<Plan[]>({
    queryKey: ["/api/plans"],
  });

  const activePlan = plans.find(plan => plan.isActive);
  const priceValue = activePlan ? activePlan.price / 100 : BASE_PRICE_USD / 100;
  const formattedPrice = priceValue.toLocaleString("en-US", {
    minimumFractionDigits: priceValue % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 bg-muted/30">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Simple, transparent pricing
            </h1>
            <p className="text-xl text-muted-foreground">
              Includes every feature we offer all-in-one, fixed price.
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              {/* Left side - Features */}
              <div>
                <h2 className="text-2xl font-bold mb-8">What's included</h2>
                <div className="space-y-4">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-base">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right side - Price Card */}
              <div className="lg:sticky lg:top-8">
                <Card className="p-8 shadow-lg">
                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-2 mb-2">
                      <span className="text-6xl font-bold">${formattedPrice}</span>
                      <span className="text-2xl text-muted-foreground">USD</span>
                    </div>
                  </div>
                  
                  <div className="text-center mb-8">
                    <p className="text-muted-foreground mb-2">
                      Hiring is the most important thing you do.
                    </p>
                    <p className="text-muted-foreground mb-2">
                      With 150,000+ monthly crypto job seekers,
                    </p>
                    <p className="text-muted-foreground">
                      let us help you find your next great hire.
                    </p>
                  </div>

                  {isLoading ? (
                    <Button className="w-full text-lg py-6" size="lg" disabled>
                      Loading...
                    </Button>
                  ) : activePlan ? (
                    <Link href={`/checkout?planId=${activePlan.id}`}>
                      <Button className="w-full text-lg py-6" size="lg">
                        Get started
                      </Button>
                    </Link>
                  ) : (
                    <Button className="w-full text-lg py-6" size="lg" disabled>
                      Plan unavailable
                    </Button>
                  )}
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
