import { useState, useMemo, useEffect } from "react";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Plan } from "@shared/schema";

let stripePromise: ReturnType<typeof loadStripe> | null = null;
function getStripePromise() {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
    if (!publishableKey) {
      throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
    }
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

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

const CheckoutForm = ({ jobId, onSuccess }: { jobId: string; onSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // Submit payment without redirecting
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // Payment succeeded
      if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('Payment succeeded');
        
        if (jobId) {
          // Job-specific purchase: upgrade the job
          console.log('Upgrading job...');
          await apiRequest("POST", `/api/jobs/${jobId}/upgrade-featured`);
          console.log('Job upgraded successfully');
        } else {
          // Credit purchase: add credits to balance
          console.log('Adding credits to balance...');
          await apiRequest("POST", "/api/credits/add");
          console.log('Credits added successfully');
        }
        
        onSuccess();
      }
    } catch (err: any) {
      console.error("Error in payment process:", err);
      toast({
        title: "Error",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
      setIsProcessing(false);
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
      >
        {isProcessing ? 'Processing...' : (jobId ? 'Feature This Job' : 'Purchase 1 Credit')}
      </Button>
    </form>
  );
};

interface FeatureJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
}

export function FeatureJobDialog({ open, onOpenChange, jobId }: FeatureJobDialogProps) {
  const [clientSecret, setClientSecret] = useState("");
  const stripePromiseValue = useMemo(() => getStripePromise(), []);
  const { toast } = useToast();

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ["/api/plans"],
    enabled: open,
  });

  const activePlan = plans.find(plan => plan.isActive);
  const isCreditPurchase = jobId === 'buy-credits';

  useEffect(() => {
    if (!open || !activePlan || !jobId) return;

    // Only pass jobId if it's an actual job (not 'buy-credits')
    const requestData: any = {
      planId: activePlan.id,
      amount: activePlan.price,
    };
    
    if (!isCreditPurchase) {
      requestData.jobId = jobId;
    }

    apiRequest("POST", "/api/create-payment-intent", requestData)
      .then((res) => res.json())
      .then((data) => {
        setClientSecret(data.clientSecret);
      })
      .catch((error) => {
        console.error("Error creating payment intent:", error);
      });
  }, [open, activePlan, jobId]);

  if (!clientSecret || !activePlan) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isCreditPurchase ? "Buy More Credits" : "Feature This Job"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
          {/* Left side - Benefits */}
          <div>
            {isCreditPurchase && (
              <p className="text-sm text-muted-foreground mb-4">
                Credits can be used to feature any job listing. Each credit features one job for 30 days with top placement on the homepage and search results. Credits never expire and can be used anytime.
              </p>
            )}
            <p className="text-lg font-semibold mb-4">What's included</p>
            <div className="space-y-3">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Payment */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Complete Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-4xl font-bold">${(activePlan.price / 100).toFixed(2)}</span>
                    <span className="text-lg text-muted-foreground">USD</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    30-day featured listing
                  </p>
                </div>

                <Elements stripe={stripePromiseValue} options={{ clientSecret }}>
                  <CheckoutForm 
                    jobId={isCreditPurchase ? '' : jobId} 
                    onSuccess={() => {
                      const message = isCreditPurchase
                        ? "Credits added to your balance!"
                        : "Your job has been upgraded to Featured status.";
                      
                      toast({
                        title: "✅ Payment Successful!",
                        description: message,
                        className: "bg-green-600 text-white",
                      });
                      queryClient.invalidateQueries({ queryKey: ["/api/employer/jobs"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
                      onOpenChange(false);
                    }}
                  />
                </Elements>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
