import { useState, useMemo, useEffect } from "react";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, CreditCard, Wallet } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { detectUserCurrency, getPriceInCurrency, formatPrice, BASE_PRICE_USD } from "@/lib/currencies";
import { CryptoPayment } from "@/components/CryptoPayment";
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
  const [userCurrency, setUserCurrency] = useState("USD");
  const [detectedPrice, setDetectedPrice] = useState(BASE_PRICE_USD);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "crypto">("card");
  const stripePromiseValue = useMemo(() => getStripePromise(), []);
  const { toast } = useToast();

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ["/api/plans"],
    enabled: open,
  });

  const activePlan = plans.find(plan => plan.isActive);
  const isCreditPurchase = jobId === 'buy-credits';

  // Detect user's currency when dialog opens
  useEffect(() => {
    if (open) {
      detectUserCurrency().then(currency => {
        setUserCurrency(currency);
        const price = getPriceInCurrency(currency);
        setDetectedPrice(price);
        console.log(`Detected currency: ${currency}, Price: ${price}`);
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open || !activePlan || !jobId || !userCurrency || paymentMethod !== 'card') return;

    // Only pass jobId if it's an actual job (not 'buy-credits')
    const requestData: any = {
      planId: activePlan.id,
      amount: detectedPrice,
      currency: userCurrency,
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
  }, [open, activePlan, jobId, userCurrency, detectedPrice, paymentMethod]);

  const handlePaymentSuccess = () => {
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
  };

  if ((!clientSecret && paymentMethod === 'card') || !activePlan) {
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
                    <span className="text-4xl font-bold">{formatPrice(detectedPrice, userCurrency)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    30-day featured listing • {userCurrency}
                  </p>
                </div>

                <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "card" | "crypto")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="card" className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Card
                    </TabsTrigger>
                    <TabsTrigger value="crypto" className="flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      Crypto
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="card" className="space-y-6 mt-6">
                    {clientSecret && (
                      <Elements 
                        stripe={stripePromiseValue} 
                        options={{ 
                          clientSecret,
                          locale: 'en',
                          appearance: {
                            theme: 'night',
                            variables: {
                              colorPrimary: '#3b82f6',
                            },
                          },
                        }}
                      >
                        <CheckoutForm 
                          jobId={isCreditPurchase ? '' : jobId} 
                          onSuccess={handlePaymentSuccess}
                        />
                      </Elements>
                    )}

                    {/* Powered by Stripe */}
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <span>Secured by</span>
                      <svg className="h-5" viewBox="0 0 60 25" fill="currentColor">
                        <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 0 0-4.1-1.06c-.86 0-1.44.25-1.44.9 0 1.85 6.29.97 6.29 5.88z" />
                      </svg>
                    </div>
                  </TabsContent>

                  <TabsContent value="crypto" className="mt-6">
                    <CryptoPayment
                      amount={detectedPrice}
                      currency={userCurrency}
                      jobId={isCreditPurchase ? undefined : jobId}
                      onSuccess={handlePaymentSuccess}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
