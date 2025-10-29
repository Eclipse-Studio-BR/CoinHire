import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ExternalLink, Wallet, Loader2 } from "lucide-react";

interface CryptoPaymentProps {
  amount: number;
  currency: string;
  jobId?: string;
  onSuccess: () => void;
}

export function CryptoPayment({ amount, currency, jobId, onSuccess }: CryptoPaymentProps) {
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const { toast } = useToast();

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
        // Open NOWPayments hosted invoice page in a new window
        const paymentWindow = window.open(data.invoiceUrl, '_blank', 'width=800,height=900');
        
        if (paymentWindow) {
          toast({
            title: "Payment Window Opened",
            description: "Complete your payment in the new window. We'll update your account automatically.",
          });
          
          // Poll for payment completion
          const checkInterval = setInterval(async () => {
            try {
              // Check if job was upgraded or credits were added
              // This is a simple check - in production you'd want to poll the invoice status
              if (jobId) {
                const jobResponse = await apiRequest("GET", `/api/jobs/${jobId}`);
                const jobData = await jobResponse.json();
                if (jobData.tier === 'featured') {
                  clearInterval(checkInterval);
                  toast({
                    title: "✅ Payment Successful!",
                    description: "Your job has been upgraded to Featured status.",
                    className: "bg-green-600 text-white",
                  });
                  onSuccess();
                }
              }
            } catch (error) {
              // Payment not complete yet, continue polling
            }
          }, 5000); // Check every 5 seconds
          
          // Stop checking after 30 minutes
          setTimeout(() => {
            clearInterval(checkInterval);
          }, 30 * 60 * 1000);
        } else {
          toast({
            title: "Popup Blocked",
            description: "Please allow popups and try again.",
            variant: "destructive",
          });
        }
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
          You'll be able to choose your preferred cryptocurrency on the next page
        </p>
      </div>

      <div className="space-y-3 text-sm text-muted-foreground">
        <div className="flex items-start gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
          <p>Choose from 150+ cryptocurrencies including BTC, ETH, USDT, and more</p>
        </div>
        <div className="flex items-start gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
          <p>Secure payment processed by NOWPayments</p>
        </div>
        <div className="flex items-start gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
          <p>Your job will be automatically upgraded when payment is confirmed</p>
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
            Creating Payment...
          </>
        ) : (
          <>
            <ExternalLink className="h-4 w-4 mr-2" />
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
