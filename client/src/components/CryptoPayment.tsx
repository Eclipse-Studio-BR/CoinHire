import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Wallet, Loader2, CheckCircle2 } from "lucide-react";

interface CryptoPaymentProps {
  amount: number;
  currency: string;
  jobId?: string;
  onSuccess: () => void;
}

export function CryptoPayment({ amount, currency, jobId, onSuccess }: CryptoPaymentProps) {
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!invoiceUrl) return;

    let initialBalance: number | null = null;

    // Get initial balance for credit purchases
    const getInitialBalance = async () => {
      if (!jobId) {
        try {
          const statsResponse = await apiRequest("GET", "/api/dashboard/stats");
          const stats = await statsResponse.json();
          initialBalance = stats.creditsBalance || 0;
          console.log("Initial credit balance:", initialBalance);
        } catch (error) {
          console.error("Error getting initial balance:", error);
        }
      }
    };

    getInitialBalance();

    // Poll for payment completion
    setIsCheckingPayment(true);
    const checkInterval = setInterval(async () => {
      try {
        if (jobId) {
          // Check if job was upgraded
          const jobResponse = await apiRequest("GET", `/api/jobs/${jobId}`);
          const jobData = await jobResponse.json();
          if (jobData.tier === 'featured') {
            clearInterval(checkInterval);
            setIsCheckingPayment(false);
            toast({
              title: "✅ Payment Successful!",
              description: "Your job has been upgraded to Featured status.",
              className: "bg-green-600 text-white border-0",
              duration: 4000,
            });
            setTimeout(() => onSuccess(), 2000);
          }
        } else {
          // Check if credits were added
          const statsResponse = await apiRequest("GET", "/api/dashboard/stats");
          const stats = await statsResponse.json();
          const currentBalance = stats.creditsBalance || 0;
          
          if (initialBalance !== null && currentBalance > initialBalance) {
            clearInterval(checkInterval);
            setIsCheckingPayment(false);
            toast({
              title: "✅ Payment Successful!",
              description: `Credit added to your account! New balance: ${currentBalance}`,
              className: "bg-green-600 text-white border-0",
              duration: 4000,
            });
            setTimeout(() => onSuccess(), 2000);
          }
        }
      } catch (error) {
        // Payment not complete yet, continue polling
      }
    }, 3000); // Check every 3 seconds

    // Stop checking after 30 minutes
    const timeout = setTimeout(() => {
      clearInterval(checkInterval);
      setIsCheckingPayment(false);
    }, 30 * 60 * 1000);

    return () => {
      clearInterval(checkInterval);
      clearTimeout(timeout);
    };
  }, [invoiceUrl, jobId, onSuccess, toast]);

  const handlePayWithCrypto = async () => {
    setIsCreatingInvoice(true);

    try {
      // Convert amount from cents to major currency unit
      const amountInMajorUnit = amount / 100;
      
      const response = await apiRequest("POST", "/api/crypto/create-payment", {
        priceAmount: amountInMajorUnit,
        priceCurrency: currency,
        jobId: jobId || undefined,
      });

      const data = await response.json();
      
      if (data.invoiceUrl) {
        setInvoiceUrl(data.invoiceUrl);
        toast({
          title: "Payment Ready",
          description: "Complete your payment below. We'll automatically detect when it's complete.",
        });
      }
    } catch (error: any) {
      console.error("Error creating crypto invoice:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  // Show embedded iframe if invoice URL is available
  if (invoiceUrl) {
    return (
      <div className="space-y-4">
        {isCheckingPayment && (
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Waiting for payment...
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  We'll automatically detect when your payment is complete
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="relative w-full" style={{ height: '600px' }}>
          <iframe
            src={invoiceUrl}
            className="w-full h-full border-0 rounded-lg"
            title="NOWPayments Checkout"
            allow="payment"
          />
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Complete your payment above • Powered by NOWPayments
          </p>
        </div>
      </div>
    );
  }

  // Show initial payment screen
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Wallet className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h3 className="text-lg font-semibold mb-2">Pay with Cryptocurrency</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Accept Bitcoin, Ethereum, USDT, and 150+ other cryptocurrencies
        </p>
      </div>

      <div className="bg-muted p-6 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Payment Amount:</span>
          <span className="text-2xl font-bold">
            ${(amount / 100).toFixed(2)} {currency}
          </span>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Choose your preferred cryptocurrency and complete payment
        </p>
      </div>

      <div className="space-y-3 text-sm text-muted-foreground">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <p>Choose from 150+ cryptocurrencies including BTC, ETH, USDT, and more</p>
        </div>
        <div className="flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <p>Secure payment processed by NOWPayments</p>
        </div>
        <div className="flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <p>Automatic upgrade when payment is confirmed</p>
        </div>
      </div>

      <Button
        onClick={handlePayWithCrypto}
        disabled={isCreatingInvoice}
        className="w-full"
        size="lg"
      >
        {isCreatingInvoice ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Loading Payment...
          </>
        ) : (
          <>
            <Wallet className="h-4 w-4 mr-2" />
            Continue to Payment
          </>
        )}
      </Button>

      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          Powered by NOWPayments • Secure crypto payment processing
        </p>
      </div>
    </div>
  );
}
