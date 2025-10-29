import { Request, Response } from "express";

const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY || "";
const NOWPAYMENTS_API_URL = "https://api.nowpayments.io/v1";

interface CreatePaymentRequest {
  priceAmount: number;
  priceCurrency: string;
  payCurrency: string;
  ipnCallbackUrl?: string;
  orderDescription?: string;
  jobId?: string;
}

interface PaymentResponse {
  paymentId: string;
  paymentStatus: string;
  payAddress: string;
  payAmount: number;
  payCurrency: string;
  priceAmount: number;
  priceCurrency: string;
  orderDescription: string;
  networkFee?: number;
  expirationEstimateDate?: string;
}

// Create a crypto payment invoice (for widget)
export async function createCryptoPayment(req: Request, res: Response) {
  try {
    const { priceAmount, priceCurrency, jobId } = req.body;

    if (!NOWPAYMENTS_API_KEY) {
      return res.status(500).json({ 
        error: "NOWPayments API key not configured" 
      });
    }

    if (!priceAmount || !priceCurrency) {
      return res.status(400).json({ 
        error: "Missing required payment parameters" 
      });
    }

    // Get user ID from session
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Create order description and ID
    const orderId = jobId || `credit-${userId}-${Date.now()}`;
    const orderDescription = jobId 
      ? `Featured Job - ${jobId}`
      : `Credit Purchase - User ${userId}`;

    console.log("Creating NOWPayments invoice:", {
      price_amount: priceAmount,
      price_currency: priceCurrency,
      order_id: orderId,
    });

    // Create invoice using NOWPayments API
    const response = await fetch(`${NOWPAYMENTS_API_URL}/invoice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": NOWPAYMENTS_API_KEY,
      },
      body: JSON.stringify({
        price_amount: priceAmount,
        price_currency: priceCurrency.toLowerCase(),
        order_id: orderId,
        order_description: orderDescription,
        ipn_callback_url: `${process.env.APP_URL || "http://localhost:5000"}/api/crypto/webhook`,
        success_url: `${process.env.APP_URL || "http://localhost:5000"}`,
        cancel_url: `${process.env.APP_URL || "http://localhost:5000"}`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("NOWPayments API error:", errorData);
      return res.status(response.status).json({ 
        error: errorData.message || "Failed to create invoice" 
      });
    }

    const invoiceData = await response.json();
    console.log("Invoice created successfully:", invoiceData.id);

    // Return invoice URL and ID
    res.json({
      invoiceId: invoiceData.id,
      invoiceUrl: invoiceData.invoice_url,
      orderId: orderId,
    });
  } catch (error: any) {
    console.error("Error creating crypto invoice:", error);
    res.status(500).json({ 
      error: error.message || "Internal server error" 
    });
  }
}

// Get payment status
export async function getPaymentStatus(req: Request, res: Response) {
  try {
    const { paymentId } = req.params;

    if (!NOWPAYMENTS_API_KEY) {
      return res.status(500).json({ 
        error: "NOWPayments API key not configured" 
      });
    }

    const response = await fetch(
      `${NOWPAYMENTS_API_URL}/payment/${paymentId}`,
      {
        headers: {
          "x-api-key": NOWPAYMENTS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("NOWPayments API error:", errorData);
      return res.status(response.status).json({ 
        error: errorData.message || "Failed to fetch payment status" 
      });
    }

    const paymentData = await response.json();

    res.json({
      paymentId: paymentData.payment_id,
      status: paymentData.payment_status,
      payAddress: paymentData.pay_address,
      payAmount: paymentData.pay_amount,
      payCurrency: paymentData.pay_currency?.toUpperCase(),
      actuallyPaid: paymentData.actually_paid,
      outcomeAmount: paymentData.outcome_amount,
      outcomeCurrency: paymentData.outcome_currency?.toUpperCase(),
    });
  } catch (error: any) {
    console.error("Error fetching payment status:", error);
    res.status(500).json({ 
      error: error.message || "Internal server error" 
    });
  }
}

// Webhook handler for payment notifications
export async function handleWebhook(req: Request, res: Response) {
  try {
    const payload = req.body;

    console.log("✅ Received NOWPayments webhook:", payload);

    // Verify the webhook signature if configured
    // const signature = req.headers['x-nowpayments-sig'];
    // TODO: Implement signature verification for production

    const { payment_status, order_id, payment_id, price_amount, price_currency } = payload;

    // Handle different payment statuses
    if (payment_status === "finished" || payment_status === "confirmed") {
      console.log(`🎉 Payment ${payment_id} confirmed for order ${order_id}`);
      
      // Import storage dynamically to avoid circular dependencies
      const { storage } = await import("../storage");
      
      // Check if this is a credit purchase
      if (order_id.startsWith('credit-')) {
        console.log(`💰 Processing credit purchase for order ${order_id}`);
        
        // Extract user ID from order_id format: credit-{userId(UUID)}-{timestamp}
        // Remove 'credit-' prefix and last timestamp part
        const withoutPrefix = order_id.substring(7); // Remove 'credit-'
        const parts = withoutPrefix.split('-');
        
        // User ID is a UUID (5 parts), timestamp is the last part
        // So userId is all parts except the last one, rejoined with '-'
        if (parts.length >= 6) { // UUID has 5 parts + timestamp = 6 parts minimum
          const userId = parts.slice(0, 5).join('-'); // Reconstruct UUID from first 5 parts
          
          console.log(`📋 Extracted user ID: ${userId}`);
          
          try {
            // Get current user stats
            const user = await storage.getUser(userId);
            if (user) {
              const stats = await storage.getDashboardStats(userId, user.role);
              const currentBalance = stats.creditsBalance || 0;
              
              // Add 1 credit
              await storage.addCredits({
                userId: userId,
                amount: 1,
                tier: 'normal',
                balance: currentBalance + 1,
                reason: 'Crypto payment - Featured Job Credit',
              });
              
              console.log(`✅ Added 1 credit to user ${userId} via crypto payment ${payment_id}`);
            } else {
              console.error(`❌ User ${userId} not found for credit purchase`);
            }
          } catch (error) {
            console.error(`❌ Error adding credits for user ${userId}:`, error);
          }
        } else {
          console.error(`❌ Could not parse user ID from order_id: ${order_id}`);
        }
      } else {
        // This is a job upgrade payment
        console.log(`⬆️ Upgrading job ${order_id} to featured`);
        
        try {
          const now = new Date();
          const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          
          await storage.updateJob(order_id, {
            tier: 'featured',
            expiresAt,
            visibilityDays: 30,
          });
          
          console.log(`✅ Job ${order_id} successfully upgraded to featured via crypto payment`);
        } catch (error) {
          console.error(`❌ Error upgrading job ${order_id}:`, error);
        }
      }
    } else if (payment_status === "failed" || payment_status === "expired") {
      console.log(`❌ Payment ${payment_id} failed/expired for order ${order_id}`);
    } else {
      console.log(`⏳ Payment ${payment_id} status: ${payment_status}`);
    }

    // Always respond with 200 to acknowledge receipt
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("❌ Error handling webhook:", error);
    res.status(500).json({ 
      error: error.message || "Internal server error" 
    });
  }
}

// Get available currencies
export async function getAvailableCurrencies(req: Request, res: Response) {
  try {
    if (!NOWPAYMENTS_API_KEY) {
      return res.status(500).json({ 
        error: "NOWPayments API key not configured" 
      });
    }

    const response = await fetch(
      `${NOWPAYMENTS_API_URL}/currencies`,
      {
        headers: {
          "x-api-key": NOWPAYMENTS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ 
        error: errorData.message || "Failed to fetch currencies" 
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("Error fetching currencies:", error);
    res.status(500).json({ 
      error: error.message || "Internal server error" 
    });
  }
}
