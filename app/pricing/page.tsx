import { ProfessorPricingClient } from "@/components/billing/ProfessorPricingClient";
import { createV2Client } from "@/lib/supabase/server";
import type {
  ProfessorPlanKey,
  SubscriptionBillingInterval,
} from "@/lib/subscriptions";

type PriceRow = {
  amount: number | null;
  currency: string;
  interval: "one_time" | "month" | "year" | "manual";
  products: { slug: string };
};

const slugToPlan: Record<string, ProfessorPlanKey> = {
  "professor-lab-standard": "professor_lab_standard",
  "professor-lab-plus": "professor_lab_plus",
};

export default async function PricingPage() {
  const supabase = await createV2Client();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: lab }, { data: prices }, { data: trial }, { data: subscription }] =
    user
      ? await Promise.all([
          supabase
            .from("labs")
            .select("id,name")
            .eq("owner_professor_id", user.id)
            .eq("status", "active")
            .maybeSingle(),
          supabase
            .from("product_prices")
            .select("amount,currency,interval,products!inner(slug)")
            .eq("provider", "ecpay")
            .eq("is_active", true)
            .in("interval", ["month", "year"])
            .returns<PriceRow[]>(),
          supabase
            .from("professor_subscription_trials")
            .select("id")
            .eq("payer_user_id", user.id)
            .maybeSingle(),
          supabase
            .from("subscriptions")
            .select("id,status,plan_key,billing_interval")
            .eq("payer_user_id", user.id)
            .in("status", ["incomplete", "trialing", "active", "past_due", "unpaid"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ])
      : [
          { data: null },
          await supabase
            .from("product_prices")
            .select("amount,currency,interval,products!inner(slug)")
            .eq("provider", "ecpay")
            .eq("is_active", true)
            .in("interval", ["month", "year"])
            .returns<PriceRow[]>(),
          { data: null },
          { data: null },
        ];

  const priceMap: Partial<
    Record<`${ProfessorPlanKey}:${SubscriptionBillingInterval}`, number>
  > = {};
  for (const price of prices ?? []) {
    const plan = slugToPlan[price.products.slug];
    if (
      plan &&
      (price.interval === "month" || price.interval === "year") &&
      price.amount !== null &&
      price.amount > 0
    ) {
      priceMap[`${plan}:${price.interval}`] = price.amount;
    }
  }

  return (
    <ProfessorPricingClient
      isAuthenticated={Boolean(user)}
      lab={lab ? { id: lab.id, name: lab.name } : null}
      trialAlreadyUsed={Boolean(trial)}
      currentSubscription={subscription ?? null}
      prices={priceMap}
    />
  );
}
