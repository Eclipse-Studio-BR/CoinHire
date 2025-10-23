import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Plan } from "@shared/schema";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ planId }: { planId: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/post-job`,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    } else {
      toast({
        title: "Payment Successful",
        description: "Credits added to your account!",
      });
      setLocation("/dashboard");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full"
        size="lg"
        data-testid="button-submit-payment"
      >
        {isProcessing ? 'Processing...' : 'Complete Payment'}
      </Button>
    </form>
  );
};

export default function Checkout() {
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  const planId = searchParams.get('planId');
  const [clientSecret, setClientSecret] = useState("");

  const { data: plan } = useQuery<Plan>({
    queryKey: ["/api/plans", planId],
    enabled: !!planId,
  });

  useEffect(() => {
    if (!planId) return;

    apiRequest("POST", "/api/create-payment-intent", { planId, amount: plan?.price || 0 })
      .then((res) => res.json())
      .then((data) => {
        setClientSecret(data.clientSecret);
      })
      .catch((error) => {
        console.error("Error creating payment intent:", error);
      });
  }, [planId, plan]);

  if (!planId) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-12 max-w-md text-center">
            <h2 className="text-2xl font-bold mb-4">Invalid Plan</h2>
            <p className="text-muted-foreground mb-6">Please select a plan from the pricing page.</p>
            <Button asChild>
              <a href="/pricing">View Pricing</a>
            </Button>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"></div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Complete Your Purchase</h1>
            <p className="text-muted-foreground">
              Secure payment powered by Stripe
            </p>
          </div>

          {plan && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium">{plan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tier</span>
                  <span className="font-medium capitalize">{plan.tier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Visibility</span>
                  <span className="font-medium">{plan.visibilityDays} days</span>
                </div>
                <div className="flex justify-between pt-4 border-t">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-lg">${(plan.price / 100).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
              <CardDescription>Enter your payment details below</CardDescription>
            </CardHeader>
            <CardContent>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm planId={planId} />
              </Elements>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
