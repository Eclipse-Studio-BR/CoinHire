import { db } from "./db";
import { plans } from "@shared/schema";
import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";

async function updatePlans() {
  console.log("🔄 Updating pricing plans...");

  // Delete all existing plans
  await db.delete(plans);
  console.log("✅ Cleared existing plans");

  // Create new single plan
  const newPlan = {
    id: randomUUID(),
    name: "Job Posting - 30 Days",
    tier: "normal" as const,
    price: 15, // $0.15 (for testing Stripe)
    visibilityDays: 30,
    credits: 1,
    isActive: true,
  };

  await db.insert(plans).values(newPlan);
  console.log("✅ Created new pricing plan:", newPlan);

  console.log("🎉 Plans update complete!");
}

updatePlans()
  .catch((error) => {
    console.error("❌ Update failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
